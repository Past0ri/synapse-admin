import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { Chip, Tooltip } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { fetchUtils } from "react-admin";

import storage from "../storage";

const ServerHealthIndicator = () => {
  const [status, setStatus] = useState<"online" | "offline" | "unknown">("unknown");

  const checkStatus = useCallback(async () => {
    const baseUrl = (storage.getItem("base_url") ?? "").replace(/\/+$/g, "");
    if (!baseUrl) {
      setStatus("unknown");
      return;
    }

    const token = storage.getItem("access_token");
    try {
      await fetchUtils.fetchJson(`${baseUrl}/_synapse/admin/v1/server_version`, {
        method: "GET",
        user: token
          ? {
              authenticated: true,
              token: `Bearer ${token}`,
            }
          : undefined,
      });
      setStatus("online");
    } catch {
      setStatus("offline");
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = window.setInterval(checkStatus, 30000);
    return () => window.clearInterval(interval);
  }, [checkStatus]);

  if (status === "online") {
    return (
      <Tooltip title="Server status: online">
        <Chip size="small" icon={<CheckCircleIcon />} label="Online" color="success" sx={{ mr: 1 }} />
      </Tooltip>
    );
  }

  if (status === "offline") {
    return (
      <Tooltip title="Server status: offline">
        <Chip size="small" icon={<ErrorIcon />} label="Offline" color="error" sx={{ mr: 1 }} />
      </Tooltip>
    );
  }

  return (
    <Tooltip title="Server status: unknown">
      <Chip size="small" icon={<HelpOutlineIcon />} label="Unknown" color="default" sx={{ mr: 1 }} />
    </Tooltip>
  );
};

export default ServerHealthIndicator;
