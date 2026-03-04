import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { AppContext } from "./AppContext";
import storage from "./storage";

interface AppConfig {
  restrictBaseUrl?: string | string[];
}

const baseUrl = import.meta.env.BASE_URL;
const configJSON = "config.json";
const configLocalJSON = "config.local.json";
// if import.meta.env.BASE_URL have a trailing slash, remove it
// load config.json from relative path if import.meta.env.BASE_URL is None or empty
const configJSONUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/${configJSON}` : configJSON;
const configLocalJSONUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/${configLocalJSON}` : configLocalJSON;
const appVersion = (globalThis as { __SYNAPSE_ADMIN_VERSION__?: string }).__SYNAPSE_ADMIN_VERSION__ ?? "";

const versionEl = document.getElementById("version");
if (versionEl) {
  versionEl.textContent = appVersion;
}

const loadConfig = async (): Promise<AppConfig> => {
  const baseConfig = await fetch(configJSONUrl).then(res => res.json());
  const localConfig = await fetch(configLocalJSONUrl)
    .then(res => (res.ok ? res.json() : {}))
    .catch(() => ({}));

  return {
    ...baseConfig,
    ...localConfig,
  };
};

loadConfig()
  .then(props => {
    // Force a configured homeserver at startup so stale localStorage values
    // (for example a previous public domain) cannot bypass the restriction.
    if (typeof props.restrictBaseUrl === "string") {
      storage.setItem("base_url", props.restrictBaseUrl);
    } else if (Array.isArray(props.restrictBaseUrl) && props.restrictBaseUrl.length > 0) {
      const currentBaseUrl = storage.getItem("base_url");
      if (!currentBaseUrl || !props.restrictBaseUrl.includes(currentBaseUrl)) {
        storage.setItem("base_url", props.restrictBaseUrl[0]);
      }
    }

    return createRoot(document.getElementById("root")).render(
      <React.StrictMode>
        <AppContext.Provider value={props}>
          <App />
        </AppContext.Provider>
      </React.StrictMode>
    );
  });
