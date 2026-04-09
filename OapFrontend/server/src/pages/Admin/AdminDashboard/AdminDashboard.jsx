import React from "react";
import { Link } from "react-router-dom";
import { useAdminAuth } from "@context/AdminAuthContext";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const { admin, logout } = useAdminAuth();

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-dashboard-header-actions">
          <span className="admin-dashboard-welcome">Welcome, {admin?.displayName || admin?.username || "Admin"}</span>
          <button className="admin-dashboard-logout" onClick={() => logout()}>Logout</button>
        </div>
      </div>
      <div className="admin-dashboard-grid">
        <Link to="/admin/apps" className="admin-dashboard-card">
        <h3>All Applications</h3>
        <p>View and manage all apps</p>
        </Link>
        <Link to="/admin/app-management" className="admin-dashboard-card">
          <h3>App Management</h3>
          <p>View analytics and stats</p>
        </Link>
        <Link to="/admin/blogs" className="admin-dashboard-card">
          <h3>Blog Management</h3>
          <p>Create and manage blog posts</p>
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;