"use client";

import { useEffect, useState } from "react";

type SiteLogoPayload = {
  logoUrl?: string;
  updatedAt?: number | null;
};

const FALLBACK_LOGO_URL = "/default-logo.svg";

export function useSiteLogo() {
  const [logoUrl, setLogoUrl] = useState(FALLBACK_LOGO_URL);

  useEffect(() => {
    let active = true;

    const applyLogo = (url?: string | null) => {
      if (!active) return;
      if (!url) {
        setLogoUrl(FALLBACK_LOGO_URL);
        return;
      }
      setLogoUrl(url);
    };

    const loadLogo = async () => {
      try {
        const response = await fetch("/api/admin/logo", { cache: "no-store" });
        if (!response.ok) {
          applyLogo(FALLBACK_LOGO_URL);
          return;
        }
        const payload = (await response.json()) as SiteLogoPayload;
        applyLogo(payload.logoUrl ?? FALLBACK_LOGO_URL);
      } catch {
        applyLogo(FALLBACK_LOGO_URL);
      }
    };

    const handleLogoUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ logoUrl?: string }>;
      applyLogo(customEvent.detail?.logoUrl ?? FALLBACK_LOGO_URL);
    };

    void loadLogo();
    window.addEventListener("site-logo-updated", handleLogoUpdated as EventListener);
    return () => {
      active = false;
      window.removeEventListener("site-logo-updated", handleLogoUpdated as EventListener);
    };
  }, []);

  return {
    logoUrl,
    fallbackLogoUrl: FALLBACK_LOGO_URL,
  };
}
