import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@context/AdminAuthContext";
import "./AdminSignIn.css";

const AdminSignIn = () => {
  const navigate = useNavigate();
  const { admin, refresh, loading: contextLoading } = useAdminAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!contextLoading && admin) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [admin, contextLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/sign-in", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data?.error || "Invalid credentials.");
        return;
      }

      await refresh();
      navigate("/admin/dashboard", { replace: true });
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  if (contextLoading) return null;

  return (
    <div className="admin-signin-page">
      <div className="admin-signin-card">
        <h1 className="admin-signin-title">Admin Access</h1>
        <form onSubmit={handleSubmit} className="admin-signin-form">
          <div className="admin-signin-field">
            <label htmlFor="admin-username">Username</label>
            <input
              id="admin-username"
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); if (error) setError(""); }}
              placeholder="Admin username..."
              autoComplete="username"
              disabled={isLoading}
            />
          </div>
          <div className="admin-signin-field">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
              placeholder="Password..."
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>
          {error && <p className="admin-signin-error">{error}</p>}
          <button type="submit" className="admin-signin-button" disabled={isLoading || !username.trim() || !password.trim()}>
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminSignIn;