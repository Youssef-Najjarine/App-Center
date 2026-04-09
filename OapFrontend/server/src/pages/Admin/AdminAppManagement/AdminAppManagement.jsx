import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@context/AdminAuthContext";
import "./AdminAppManagement.css";

const PAGE_SIZE = 15;

const AdminAppManagement = () => {
  const navigate = useNavigate();
  const { logout } = useAdminAuth();

  const [stats, setStats] = useState(null);
  const [topApps, setTopApps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/apps/stats", { credentials: "include" });
      const data = await res.json();
      if (res.ok && data?.stats) setStats(data.stats);
    } catch {}
  }, []);

  const loadTopApps = useCallback(async (pageNum) => {
    setTableLoading(true);
    try {
      const res = await fetch(`/api/admin/apps/top-apps?page=${pageNum}&pageSize=${PAGE_SIZE}`, { credentials: "include" });
      const data = await res.json();
      if (res.ok && data?.apps) {
        setTopApps(data.apps);
        setTotalPages(data.totalPages ?? 1);
        setTotalCount(data.totalCount ?? 0);
      }
    } catch {}
    finally { setTableLoading(false); }
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([loadStats(), loadTopApps(1)]);
      setIsLoading(false);
    };
    load();
  }, [loadStats, loadTopApps]);

  const handlePageChange = useCallback((newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    loadTopApps(newPage);
  }, [totalPages, loadTopApps]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val || 0);
  };

  const formatNumber = (val) => {
    return new Intl.NumberFormat("en-US").format(val || 0);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

    for (let i = start; i <= end; i++) pages.push(i);

    return (
      <div className="admin-app-mgmt-pagination">
        <button
          className="admin-app-mgmt-page-btn"
          disabled={page === 1}
          onClick={() => handlePageChange(page - 1)}
        >
          Prev
        </button>
        {start > 1 && (
          <>
            <button className="admin-app-mgmt-page-btn" onClick={() => handlePageChange(1)}>1</button>
            {start > 2 && <span className="admin-app-mgmt-page-ellipsis">...</span>}
          </>
        )}
        {pages.map((p) => (
          <button
            key={p}
            className={`admin-app-mgmt-page-btn ${p === page ? "active" : ""}`}
            onClick={() => handlePageChange(p)}
          >
            {p}
          </button>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="admin-app-mgmt-page-ellipsis">...</span>}
            <button className="admin-app-mgmt-page-btn" onClick={() => handlePageChange(totalPages)}>{totalPages}</button>
          </>
        )}
        <button
          className="admin-app-mgmt-page-btn"
          disabled={page === totalPages}
          onClick={() => handlePageChange(page + 1)}
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="admin-app-mgmt">
      <div className="admin-app-mgmt-header">
        <div className="admin-app-mgmt-header-left">
          <h1>App Management</h1>
          <button className="admin-app-mgmt-back" onClick={() => navigate("/admin/dashboard")}>Dashboard</button>
          <button className="admin-app-mgmt-logout" onClick={() => logout()}>Logout</button>
        </div>
      </div>

      {isLoading && <div className="admin-app-mgmt-loading">Loading analytics...</div>}

      {stats && (
        <div className="admin-app-mgmt-stats-grid">
          <div className="admin-app-mgmt-stat-card">
            <span className="admin-app-mgmt-stat-value">{formatNumber(stats.totalApps)}</span>
            <span className="admin-app-mgmt-stat-label">Total Apps</span>
          </div>
          <div className="admin-app-mgmt-stat-card">
            <span className="admin-app-mgmt-stat-value">{formatNumber(stats.publishedVersions)}</span>
            <span className="admin-app-mgmt-stat-label">Published</span>
          </div>
          <div className="admin-app-mgmt-stat-card">
            <span className="admin-app-mgmt-stat-value">{formatNumber(stats.draftVersions)}</span>
            <span className="admin-app-mgmt-stat-label">Drafts</span>
          </div>
          <div className="admin-app-mgmt-stat-card">
            <span className="admin-app-mgmt-stat-value">{formatNumber(stats.totalUsers)}</span>
            <span className="admin-app-mgmt-stat-label">Users</span>
          </div>
          <div className="admin-app-mgmt-stat-card highlight">
            <span className="admin-app-mgmt-stat-value">{formatNumber(stats.totalSales)}</span>
            <span className="admin-app-mgmt-stat-label">Total Sales</span>
          </div>
          <div className="admin-app-mgmt-stat-card highlight">
            <span className="admin-app-mgmt-stat-value">{formatCurrency(stats.totalRevenue)}</span>
            <span className="admin-app-mgmt-stat-label">Total Revenue</span>
          </div>
          <div className="admin-app-mgmt-stat-card">
            <span className="admin-app-mgmt-stat-value">{formatNumber(stats.totalRefunds)}</span>
            <span className="admin-app-mgmt-stat-label">Refunds</span>
          </div>
          <div className="admin-app-mgmt-stat-card">
            <span className="admin-app-mgmt-stat-value">{formatNumber(stats.totalDisputes)}</span>
            <span className="admin-app-mgmt-stat-label">Disputes</span>
          </div>
          <div className="admin-app-mgmt-stat-card">
            <span className="admin-app-mgmt-stat-value">{formatNumber(stats.totalImpressions)}</span>
            <span className="admin-app-mgmt-stat-label">Impressions</span>
          </div>
        </div>
      )}

      {(topApps.length > 0 || tableLoading) && (
        <div className="admin-app-mgmt-top-section">
          <div className="admin-app-mgmt-top-header">
            <h2>All Apps by Revenue</h2>
            {totalCount > 0 && <span className="admin-app-mgmt-top-count">{totalCount} total</span>}
          </div>
          <div className="admin-app-mgmt-table-wrapper">
            <table className="admin-app-mgmt-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>App Name</th>
                  <th>Owner</th>
                  <th>Impressions</th>
                  <th>Sales</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {tableLoading ? (
                  <tr><td colSpan={6} className="admin-app-mgmt-table-loading">Loading...</td></tr>
                ) : topApps.map((app, i) => (
                  <tr key={app.appId} className={app.isDeleted ? "deleted-row" : ""}>
                    <td className="admin-app-mgmt-rank">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="admin-app-mgmt-app-name">
                      {app.name}
                      {app.isDeleted && <span className="admin-app-mgmt-deleted-badge">Deleted</span>}
                    </td>
                    <td className="admin-app-mgmt-owner">{app.ownerName}</td>
                    <td>{formatNumber(app.impressions)}</td>
                    <td>{formatNumber(app.sales)}</td>
                    <td>{formatCurrency(app.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {renderPagination()}
        </div>
      )}
    </div>
  );
};

export default AdminAppManagement;