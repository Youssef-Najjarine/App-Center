import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";

const AuthUserContext = createContext(null);

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

export const AuthUserProvider = ({ children }) => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);         // { firstName, lastName, email, username, bio }
  const [loading, setLoading] = useState(true);   // initial boot ONLY
  const [error, setError] = useState("");
  const [authBusy, setAuthBusy] = useState(false); // logout / auth transitions

  const refresh = useCallback(async () => {
    setError("");

    try {
      const response = await fetch("/api/user-account-details", {
        method: "GET",
        credentials: "include",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      const data = await safeJson(response);

      // server down / proxy HTML / non-json
      if (!data) {
        setUser(null);
        setError("Error - Unable to connect to the server.");
        return null;
      }

      // unauthorized => logged out state (do NOT navigate here)
      if (response.status === 401) {
        setUser(null);
        return null;
      }

      if (response.ok && data.success && data.user) {
        setUser(data.user);
        return data.user;
      }

      setUser(null);
      setError(data.error || "Unable to load user.");
      return null;
    } catch (e) {
      console.error("refresh error:", e);
      setUser(null);
      setError("Error - Unable to connect to the server.");
      return null;
    }
  }, []);

  const logout = useCallback(
    async ({ redirectTo = "/auth/sign-in" } = {}) => {
      setAuthBusy(true);
      setError("");

      // immediately remove member UI to avoid “half-second member navbar”
      setUser(null);

      try {
        await fetch("/api/logout", {
          method: "POST",
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });
      } catch (e) {
        console.error("logout error:", e);
        // still proceed to logged-out UI
      } finally {
        setAuthBusy(false);
        navigate(redirectTo, { replace: true });
      }
    },
    [navigate]
  );

  // Boot once
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
      user,
      loading,
      error,
      authBusy,
      refresh,
      logout,
      setUser,
      setAuthBusy,
      isSignedIn: !!user,
    }),
    [user, loading, error, authBusy, refresh, logout]
  );

  return (
    <AuthUserContext.Provider value={value}>
      {children}
    </AuthUserContext.Provider>
  );
};

export const useAuthUser = () => {
  const ctx = useContext(AuthUserContext);
  if (!ctx) throw new Error("useAuthUser must be used within AuthUserProvider");
  return ctx;
};
