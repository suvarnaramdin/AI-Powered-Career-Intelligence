import axios from "axios";

const DEFAULT_RENDER_BACKEND = "https://ai-career-backend-7ipm.onrender.com";

export const USER_STORAGE_KEYS = [
  "user", "email", "token", "selectedEmail", "editing", "resume_id",
  "selectedJob", "skillGapAnalysis", "resumeImprovementResult", "resumeBuilderProfile",
];

export const clearUserSession = () => {
  USER_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
};

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && !config.headers?.Authorization) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const normalizeOrigin = (value) => {
  if (!value) return "";
  try {
    return new URL(value).origin.replace(/\/$/, "");
  } catch {
    return value.replace(/\/$/, "");
  }
};

export const API_BASE_URL = (() => {
  const configured = (import.meta.env.VITE_API_URL || "").trim();
  const currentHost = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";

  if (configured) {
    const configuredOrigin = normalizeOrigin(configured).toLowerCase();
    let configuredHost = configuredOrigin;

    try {
      configuredHost = new URL(configured).hostname.toLowerCase();
    } catch {
      configuredHost = configured.toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
    }

    if (configuredHost.endsWith(".vercel.app") || configuredOrigin.includes("vercel.app")) {
      return DEFAULT_RENDER_BACKEND;
    }

    if (configuredHost === currentHost && configuredOrigin === window.location.origin.toLowerCase()) {
      return DEFAULT_RENDER_BACKEND;
    }

    return configuredOrigin || configured.replace(/\/$/, "");
  }

  if (typeof window !== "undefined" && currentHost.endsWith(".vercel.app")) {
    return DEFAULT_RENDER_BACKEND;
  }

  return "http://127.0.0.1:8000";
})();
