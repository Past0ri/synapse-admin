import CloudDoneIcon from "@mui/icons-material/CloudDone";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { ResourceProps, fetchUtils } from "react-admin";

import storage from "../storage";

interface StatusData {
  baseUrl: string;
  serverVersion: string | null;
  matrixVersions: string[];
  totalUsers: number | null;
  totalRooms: number | null;
  federationDestinations: number | null;
  federationRetrying: number | null;
  dbHealth: string | null;
  loadedAt: string | null;
}

const ServerStatusPage = () => {
  const [data, setData] = useState<StatusData>({
    baseUrl: "",
    serverVersion: null,
    matrixVersions: [],
    totalUsers: null,
    totalRooms: null,
    federationDestinations: null,
    federationRetrying: null,
    dbHealth: null,
    loadedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJsonWithToken = useCallback(async (url: string) => {
    const token = storage.getItem("access_token");
    return fetchUtils.fetchJson(url, {
      method: "GET",
      user: token
        ? {
            authenticated: true,
            token: `Bearer ${token}`,
          }
        : undefined,
    });
  }, []);

  const probeDbHealth = useCallback(
    async (baseUrl: string): Promise<string> => {
      const healthEndpoints = [
        "/_synapse/admin/v1/health",
        "/_synapse/admin/v1/database/status",
        "/_synapse/admin/v1/background_updates/status",
      ];

      for (const endpoint of healthEndpoints) {
        try {
          const response = await fetchJsonWithToken(`${baseUrl}${endpoint}`);
          if (endpoint.includes("background_updates")) {
            const enabled = response.json.enabled;
            const current = response.json.current_updates;
            return `Background updates: ${enabled ? "enabled" : "disabled"}${
              typeof current === "number" ? ` (${current} running)` : ""
            }`;
          }
          return `Available (${endpoint})`;
        } catch {
          // Try the next known endpoint.
        }
      }

      return "Not exposed by this Synapse deployment";
    },
    [fetchJsonWithToken]
  );

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    const baseUrl = (storage.getItem("base_url") ?? "").replace(/\/+$/g, "");
    if (!baseUrl) {
      setError("No homeserver base URL found in session.");
      setLoading(false);
      return;
    }

    try {
      const [
        serverVersionResponse,
        matrixVersionsResponse,
        usersResponse,
        roomsResponse,
        federationResponse,
        dbHealth,
      ] = await Promise.all([
        fetchJsonWithToken(`${baseUrl}/_synapse/admin/v1/server_version`),
        fetchJsonWithToken(`${baseUrl}/_matrix/client/versions`),
        fetchJsonWithToken(`${baseUrl}/_synapse/admin/v2/users?from=0&limit=1`),
        fetchJsonWithToken(`${baseUrl}/_synapse/admin/v1/rooms?from=0&limit=1`),
        fetchJsonWithToken(`${baseUrl}/_synapse/admin/v1/federation/destinations?from=0&limit=100`),
        probeDbHealth(baseUrl),
      ]);

      const federationDestinations = federationResponse.json.destinations ?? [];
      const federationRetrying = federationDestinations.filter(d => Number(d.retry_interval ?? 0) > 0).length;

      setData({
        baseUrl,
        serverVersion: serverVersionResponse.json.server_version ?? null,
        matrixVersions: matrixVersionsResponse.json.versions ?? [],
        totalUsers: usersResponse.json.total ?? null,
        totalRooms: roomsResponse.json.total_rooms ?? null,
        federationDestinations: federationResponse.json.total ?? null,
        federationRetrying,
        dbHealth,
        loadedAt: new Date().toISOString(),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to fetch server status.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [fetchJsonWithToken, probeDbHealth]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const online = !loading && !error;

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Server Status</Typography>
        <Chip
          icon={online ? <CloudDoneIcon /> : <ErrorOutlineIcon />}
          label={online ? "Online" : "Unavailable"}
          color={online ? "success" : "error"}
          size="small"
        />
        <Button onClick={loadStatus} startIcon={<RefreshIcon />} variant="outlined" size="small">
          Refresh
        </Button>
      </Stack>

      <Card>
        <CardContent>
          {loading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={18} />
              <Typography>Loading server status...</Typography>
            </Stack>
          ) : null}

          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}

          <Stack spacing={1.5}>
            <Typography variant="body2">
              <b>Base URL:</b> {data.baseUrl || "-"}
            </Typography>
            <Typography variant="body2">
              <b>Synapse version:</b> {data.serverVersion || "-"}
            </Typography>
            <Typography variant="body2">
              <b>Supported Matrix spec versions:</b>{" "}
              {data.matrixVersions.length > 0 ? data.matrixVersions.join(", ") : "-"}
            </Typography>
            <Divider />
            <Typography variant="body2">
              <b>Total users:</b> {data.totalUsers ?? "-"}
            </Typography>
            <Typography variant="body2">
              <b>Total rooms:</b> {data.totalRooms ?? "-"}
            </Typography>
            <Typography variant="body2">
              <b>Federation destinations:</b> {data.federationDestinations ?? "-"}
            </Typography>
            <Typography variant="body2">
              <b>Federation retrying:</b> {data.federationRetrying ?? "-"}
            </Typography>
            <Typography variant="body2">
              <b>DB health:</b> {data.dbHealth ?? "-"}
            </Typography>
            <Divider />
            <Typography variant="caption" color="text.secondary">
              Last checked: {data.loadedAt ? new Date(data.loadedAt).toLocaleString() : "-"}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

const resource: ResourceProps = {
  name: "server_status",
  icon: CloudDoneIcon,
  list: ServerStatusPage,
  options: { label: "Server status" },
};

export default resource;
