import { API_BASE_URL } from "../config/api";

const ADMIN_STORAGE_KEY = "admin_session";
const ADMIN_API = API_BASE_URL;

export const getAdminSession = () => {
  const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

export const setAdminSession = (user, token) => {
  localStorage.setItem(
    ADMIN_STORAGE_KEY,
    JSON.stringify({
      token,
      user,
    })
  );
};

export const clearAdminSession = () => {
  localStorage.removeItem(ADMIN_STORAGE_KEY);
};

export const isAdminLoggedIn = () => Boolean(getAdminSession()?.token);

export const getAdminToken = () => getAdminSession()?.token || "";

export const redirectToLogin = () => {
  clearAdminSession();
  window.location.href = "/admin/login";
};

export const adminFetch = async (endpoint, options = {}) => {
  const token = getAdminToken();
  const response = await fetch(`${ADMIN_API}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (response.status === 401 || response.status === 403) {
    clearAdminSession();
    redirectToLogin();
    throw new Error("Session expired. Redirecting to login.");
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || `Request failed: ${response.status}`);
  }

  return response.headers.get("content-type")?.includes("application/json")
    ? response.json()
    : response.text();
};

export function ProtectedAdminRoute({ children }) {
  const session = getAdminSession();

  if (!session?.token) {
    window.location.href = "/admin/login";
    return null;
  }

  return children;
}
