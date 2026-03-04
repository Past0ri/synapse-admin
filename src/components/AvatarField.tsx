import { Avatar } from "@mui/material";
import { get } from "lodash";
import { useEffect, useState } from "react";
import { useRecordContext } from "react-admin";

import storage from "../storage";

const avatarLoadingEnabled = import.meta.env.VITE_ENABLE_AVATARS !== "false";
const avatarFallbacksEnabled = import.meta.env.VITE_AVATAR_FALLBACKS === "true";

const buildAvatarCandidates = (url: string): string[] => {
  const candidates = [url];
  const directDomainCandidates = (() => {
    try {
      const parsed = new URL(url, window.location.origin);
      const match = parsed.pathname.match(
        /\/_matrix\/(?:media\/(?:r0|v1|v3)|client\/v[13]\/media)\/(thumbnail|download)\/([^/]+)\/([^/]+)/
      );
      if (!match) {
        return [] as string[];
      }

      const [, kind, serverName, mediaId] = match;
      const query = kind === "thumbnail" ? "?width=24&height=24&method=scale" : "?allow_redirect=true";
      return [
        `https://${serverName}/_matrix/media/v3/${kind}/${serverName}/${mediaId}${query}`,
        `https://${serverName}/_matrix/media/r0/${kind}/${serverName}/${mediaId}${query}`,
        `https://${serverName}/_matrix/client/v3/media/${kind}/${serverName}/${mediaId}${query}`,
        `https://${serverName}/_matrix/client/v1/media/${kind}/${serverName}/${mediaId}${query}`,
        `http://${serverName}/_matrix/media/v3/${kind}/${serverName}/${mediaId}${query}`,
        `http://${serverName}/_matrix/media/r0/${kind}/${serverName}/${mediaId}${query}`,
        `http://${serverName}/_matrix/client/v3/media/${kind}/${serverName}/${mediaId}${query}`,
        `http://${serverName}/_matrix/client/v1/media/${kind}/${serverName}/${mediaId}${query}`,
      ];
    } catch {
      return [] as string[];
    }
  })();

  const swaps = [
    ["/_matrix/media/r0/", "/_matrix/media/v3/"],
    ["/_matrix/media/r0/", "/_matrix/media/v1/"],
    ["/_matrix/media/r0/", "/_matrix/client/v1/media/"],
    ["/_matrix/media/r0/", "/_matrix/client/v3/media/"],
    ["/_matrix/media/v3/", "/_matrix/media/r0/"],
    ["/_matrix/media/v3/", "/_matrix/media/v1/"],
    ["/_matrix/media/v3/", "/_matrix/client/v1/media/"],
    ["/_matrix/media/v3/", "/_matrix/client/v3/media/"],
    ["/_matrix/media/v1/", "/_matrix/media/r0/"],
    ["/_matrix/media/v1/", "/_matrix/media/v3/"],
    ["/_matrix/media/v1/", "/_matrix/client/v1/media/"],
    ["/_matrix/media/v1/", "/_matrix/client/v3/media/"],
    ["/_matrix/client/v1/media/", "/_matrix/media/r0/"],
    ["/_matrix/client/v1/media/", "/_matrix/media/v3/"],
    ["/_matrix/client/v1/media/", "/_matrix/media/v1/"],
    ["/_matrix/client/v1/media/", "/_matrix/client/v3/media/"],
    ["/_matrix/client/v3/media/", "/_matrix/media/r0/"],
    ["/_matrix/client/v3/media/", "/_matrix/media/v3/"],
    ["/_matrix/client/v3/media/", "/_matrix/media/v1/"],
    ["/_matrix/client/v3/media/", "/_matrix/client/v1/media/"],
  ] as const;

  for (const [from, to] of swaps) {
    if (url.includes(from)) {
      candidates.push(url.replace(from, to));
    }
  }

  // Some deployments expose download but not thumbnail for certain media.
  for (const candidate of [...candidates]) {
    if (candidate.includes("/thumbnail/")) {
      const downloadCandidate = candidate.replace("/thumbnail/", "/download/");
      const parsed = new URL(downloadCandidate, window.location.origin);
      parsed.search = "";
      parsed.searchParams.set("allow_redirect", "true");
      candidates.push(parsed.toString());
    }
  }

  candidates.push(...directDomainCandidates);
  return [...new Set(candidates)];
};

const AvatarField = ({ source, ...rest }) => {
  const record = useRecordContext(rest);
  const src = get(record, source)?.toString();
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(avatarLoadingEnabled ? src : undefined);

  useEffect(() => {
    if (!avatarLoadingEnabled) {
      setResolvedSrc(undefined);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    const loadAvatar = async () => {
      if (!src || !/^https?:\/\//.test(src)) {
        setResolvedSrc(src);
        return;
      }

      const token = storage.getItem("access_token");
      const candidates = avatarFallbacksEnabled ? buildAvatarCandidates(src) : [src];
      setResolvedSrc(undefined);

      for (const candidate of candidates) {
        try {
          const response = await fetch(candidate, {
            headers: token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : undefined,
          });
          if (!response.ok) {
            continue;
          }

          const blob = await response.blob();
          objectUrl = URL.createObjectURL(blob);
          if (!cancelled) {
            setResolvedSrc(objectUrl);
          }
          return;
        } catch {
          // Continue trying candidate URLs.
        }
      }

      // As a last resort, let the browser attempt the original URL directly.
      if (!cancelled) {
        setResolvedSrc(undefined);
      }
    };

    loadAvatar();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  const { alt, classes, sizes, sx, variant } = rest;
  return <Avatar alt={alt} classes={classes} sizes={sizes} src={resolvedSrc} sx={sx} variant={variant} />;
};

export default AvatarField;
