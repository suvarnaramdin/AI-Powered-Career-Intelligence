const DEFAULT_LOCAL_API = "http://127.0.0.1:8000";
const DEFAULT_RENDER_API = "https://ai-powered-career-intelligence.onrender.com";

export const API_BASE_URL = (() => {
  const configuredUrl = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");

  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window !== "undefined" && window.location.hostname.endsWith(".vercel.app")) {
    return DEFAULT_RENDER_API;
  }

  return DEFAULT_LOCAL_API;
})();
