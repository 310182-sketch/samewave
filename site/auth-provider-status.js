(() => {
  "use strict";

  window.SAMEWAVE_AUTH_PROVIDER_STATUS = {
    async load() {
      const config = window.SAMEWAVE_SUPABASE_CONFIG || {};
      if (!config.url || !config.anonKey) {
        throw new Error("Supabase public configuration is unavailable.");
      }

      const endpoint = new URL("/auth/v1/settings", config.url);
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(endpoint, {
          method: "GET",
          headers: { apikey: config.anonKey },
          cache: "no-store",
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error("Supabase Auth settings request failed.");
        }

        const settings = await response.json();
        const external = settings?.external;
        if (!external || typeof external !== "object") {
          throw new Error("Supabase Auth provider settings are missing.");
        }
        return {
          google: external.google === true,
          facebook: external.facebook === true,
          x: external.twitter === true
        };
      } finally {
        window.clearTimeout(timeout);
      }
    }
  };
})();
