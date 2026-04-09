import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";

const AdminAuthContext = createContext(null);

const safeJson = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  if (!text) return null;
  if (!contentType.includes("application/json")) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const AdminAuthProvider = ({ children }) => {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const refresh = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/me", {
        method: "GET",
        credentials: "include",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });

      const data = await safeJson(response);

      if (!data) {
        setAdmin(null);
        return null;
      }

      if (response.status === 401) {
        setAdmin(null);
        return null;
      }

      if (response.ok && data.success && data.admin) {
        setAdmin(data.admin);
        return data.admin;
      }

      setAdmin(null);
      return null;
    } catch (e) {
      console.error("admin refresh error:", e);
      setAdmin(null);
      setError("Unable to connect to the server.");
      return null;
    }
  }, []);

  const logout = useCallback(
    async ({ redirectTo = "/admin/sign-in" } = {}) => {
      setAuthBusy(true);
      setError("");
      setAdmin(null);
      try {
        await fetch("/api/admin/logout", {
          method: "POST",
          credentials: "include",
        });
      } catch (e) {
        console.error("admin logout error:", e);
      } finally {
        setAuthBusy(false);
        navigate(redirectTo, { replace: true });
      }
    },
    [navigate]
  );

  useEffect(() => {
    const boot = async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    };
    boot();
  }, [refresh]);

  const value = useMemo(
    () => ({
      admin,
      loading,
      error,
      authBusy,
      refresh,
      logout,
      setAdmin,
      setAuthBusy,
      isAdminSignedIn: !!admin,
    }),
    [admin, loading, error, authBusy, refresh, logout]
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
};