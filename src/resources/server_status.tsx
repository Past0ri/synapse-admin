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
import { useCallback, useEffect, useMemo, useState } from "react";
import { ResourceProps, fetchUtils } from "react-admin";

import storage from "../storage";

interface TelemetrySnapshot {
  timestamp: string;
  totalUsers: number | null;
  totalRooms: number | null;
  federationDestinations: number | null;
  federationRetrying: number | null;
  backgroundUpdatesRunning: number | null;
  apiLatencyMs: number | null;
}

interface StatusData {
  baseUrl: string;
  serverVersion: string | null;
  matrixVersions: string[];
  dbHealth: string | null;
  loadedAt: string | null;
}

const MAX_POINTS = 40;
const REFRESH_MS = 15000;

const toMetricNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value).length;
  return null;
};

const Sparkline = ({ values, color }: { values: number[]; color: string }) => {
  if (values.length === 0) return <Typography variant="caption">No data</Typography>;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width="100%" height="48" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polyline fill="none" stroke={color} strokeWidth="4" points={points} />
    </svg>
  );
};

interface MetricCardProps {
  title: string;
  value: number | null;
  history: number[];
  color: string;
  subtitle?: string;
}

const MetricCard = ({ title, value, history, color, subtitle }: MetricCardProps) => (
  <Card>
    <CardContent>
      <Typography variant="overline" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h4" sx={{ mt: 0.5, mb: 1 }}>
        {typeof value === "number" ? value : "-"}
      </Typography>
      {subtitle ? (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      ) : null}
      <Box sx={{ mt: 1 }}>
        <Sparkline values={history} color={color} />
      </Box>
    </CardContent>
  </Card>
);

const ServerStatusPage = () => {
  const [data, setData] = useState<StatusData>({
    baseUrl: "",
    serverVersion: null,
    matrixVersions: [],
    dbHealth: null,
    loadedAt: null,
  });
  const [history, setHistory] = useState<TelemetrySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const loadStatus = useCallback(async () => {
    const initialLoad = history.length === 0;
    setError(null);
    if (initialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    const baseUrl = (storage.getItem("base_url") ?? "").replace(/\/+$/g, "");
    if (!baseUrl) {
      setError("No homeserver base URL found in session.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const start = performance.now();

    try {
      const [
        serverVersionResponse,
        matrixVersionsResponse,
        usersResponse,
        roomsResponse,
        federationResponse,
        backgroundUpdatesResponse,
      ] = await Promise.all([
        fetchJsonWithToken(`${baseUrl}/_synapse/admin/v1/server_version`),
        fetchJsonWithToken(`${baseUrl}/_matrix/client/versions`),
        fetchJsonWithToken(`${baseUrl}/_synapse/admin/v2/users?from=0&limit=1`),
        fetchJsonWithToken(`${baseUrl}/_synapse/admin/v1/rooms?from=0&limit=1`),
        fetchJsonWithToken(`${baseUrl}/_synapse/admin/v1/federation/destinations?from=0&limit=100`),
        fetchJsonWithToken(`${baseUrl}/_synapse/admin/v1/background_updates/status`).catch(() => null),
      ]);

      const federationDestinations = federationResponse.json.destinations ?? [];
      const federationRetrying = federationDestinations.filter(
        destination => Number(destination.retry_interval ?? 0) > 0
      ).length;
      const apiLatencyMs = Math.round(performance.now() - start);
      const backgroundUpdatesRunning = backgroundUpdatesResponse?.json?.current_updates ?? null;
      const backgroundUpdatesEnabled = backgroundUpdatesResponse?.json?.enabled;
      const dbHealth =
        backgroundUpdatesResponse === null
          ? "Not exposed by this Synapse deployment"
          : `Background updates: ${backgroundUpdatesEnabled ? "enabled" : "disabled"}${
              typeof backgroundUpdatesRunning === "number" ? ` (${backgroundUpdatesRunning} running)` : ""
            }`;

      const snapshot: TelemetrySnapshot = {
        timestamp: new Date().toISOString(),
        totalUsers: toMetricNumber(usersResponse.json.total),
        totalRooms: toMetricNumber(roomsResponse.json.total_rooms),
        federationDestinations: toMetricNumber(federationResponse.json.total),
        federationRetrying,
        backgroundUpdatesRunning: toMetricNumber(backgroundUpdatesRunning),
        apiLatencyMs,
      };

      setData({
        baseUrl,
        serverVersion: serverVersionResponse.json.server_version ?? null,
        matrixVersions: matrixVersionsResponse.json.versions ?? [],
        dbHealth,
        loadedAt: snapshot.timestamp,
      });
      setHistory(prev => [...prev, snapshot].slice(-MAX_POINTS));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to fetch telemetry.";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchJsonWithToken, history.length]);

  useEffect(() => {
    loadStatus();
    const interval = window.setInterval(loadStatus, REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [loadStatus]);

  const current = history.length > 0 ? history[history.length - 1] : null;
  const online = !error && !!current;

  const series = useMemo(
    () => ({
      users: history.map(point => point.totalUsers ?? 0),
      rooms: history.map(point => point.totalRooms ?? 0),
      federationRetrying: history.map(point => point.federationRetrying ?? 0),
      backgroundUpdates: history.map(point => point.backgroundUpdatesRunning ?? 0),
      latency: history.map(point => point.apiLatencyMs ?? 0),
    }),
    [history]
  );

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Server Telemetry</Typography>
        <Chip
          icon={online ? <CloudDoneIcon /> : <ErrorOutlineIcon />}
          label={online ? "Online" : "Unavailable"}
          color={online ? "success" : "error"}
          size="small"
        />
        <Chip label={`Auto refresh ${REFRESH_MS / 1000}s`} size="small" variant="outlined" />
        <Button onClick={loadStatus} startIcon={<RefreshIcon />} variant="outlined" size="small" disabled={refreshing}>
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </Stack>

      {loading ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <CircularProgress size={18} />
          <Typography>Loading telemetry...</Typography>
        </Stack>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Box
        sx={{
          mb: 2,
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(3, minmax(0, 1fr))",
          },
          gap: 2,
        }}
      >
        <Box>
          <MetricCard
            title="Total users"
            value={current?.totalUsers ?? null}
            history={series.users}
            color="#42a5f5"
            subtitle="from /_synapse/admin/v2/users"
          />
        </Box>
        <Box>
          <MetricCard
            title="Total rooms"
            value={current?.totalRooms ?? null}
            history={series.rooms}
            color="#66bb6a"
            subtitle="from /_synapse/admin/v1/rooms"
          />
        </Box>
        <Box>
          <MetricCard
            title="Federation retrying"
            value={current?.federationRetrying ?? null}
            history={series.federationRetrying}
            color="#ffa726"
            subtitle={`of ${current?.federationDestinations ?? "-"} destinations`}
          />
        </Box>
        <Box>
          <MetricCard
            title="Background updates"
            value={current?.backgroundUpdatesRunning ?? null}
            history={series.backgroundUpdates}
            color="#ab47bc"
            subtitle="currently running"
          />
        </Box>
        <Box>
          <MetricCard
            title="API latency"
            value={current?.apiLatencyMs ?? null}
            history={series.latency}
            color="#ef5350"
            subtitle="combined fetch time (ms)"
          />
        </Box>
      </Box>

      <Card>
        <CardContent>
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
