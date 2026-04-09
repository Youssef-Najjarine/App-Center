import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAdminAuth } from "@context/AdminAuthContext";
import ProcessingModal from "@pages/ProcessingModal/ProcessingModal";

const AdminLayout = () => {
  const { isAdminSignedIn, loading, authBusy } = useAdminAuth();

  if (loading || authBusy) {
    return <ProcessingModal />;
  }

  if (!isAdminSignedIn) {
    return <Navigate to="/admin/sign-in" replace />;
  }

  return (
    <section className="container">
      <Outlet />
    </section>
  );
};

export default AdminLayout;