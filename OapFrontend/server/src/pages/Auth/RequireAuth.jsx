// RequireAuth.jsx
import React, { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import ProcessingModal from "@pages/ProcessingModal/ProcessingModal";
import { useAuthUser } from "@context/AuthUserContext";

export default function RequireAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuthUser();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const from = location.pathname + location.search;
      navigate("/auth/sign-in", { replace: true, state: { from } });
    }
  }, [user, loading, navigate, location.pathname, location.search]);

  if (loading) return <ProcessingModal />;
  if (!user) return null;

  return <Outlet />;
}
