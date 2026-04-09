import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@context/AdminAuthContext";
import ConfirmationModal from "@pages/ConfirmationModal/ConfirmationModal";
import ProcessingModal from "@pages/ProcessingModal/ProcessingModal";
import searchIcon from "@assets/magnifying-glass-icon.svg";
import sortIcon from "@assets/sort-by-icon.svg";
import expandIcon from "@assets/three-dots-expand-icon.svg";
import viewIcon from "@assets/purple-view-details-icon.svg";
import trashIcon from "@assets/red-give-refund-icon.svg";
import noImagePlaceholder from "@assets/no-image-uploaded.jpg";
import "./AdminApps.css";

const AdminApps = () => {
  const navigate = useNavigate();
  const { logout } = useAdminAuth();

  const [apps, setApps] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortOption, setSortOption] = useState("Latest");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const sortByRef = useRef(null);
  const dropdownRefs = useRef({});
  const debounceRef = useRef(null);
  const sortRef = useRef("Latest");
  const statusRef = useRef("All");
  const searchRef = useRef("");

  useEffect(() => { sortRef.current = sortOption; }, [sortOption]);
  useEffect(() => { statusRef.current = statusFilter; }, [statusFilter]);
  useEffect(() => { searchRef.current = searchInput; }, [searchInput]);

  useEffect(() => {
    const handler = (e) => {
      if (expandedId && dropdownRefs.current[expandedId]?.current && !dropdownRefs.current[expandedId].current.contains(e.target))
        setExpandedId(null);
      if (sortDropdownOpen && sortByRef.current && !sortByRef.current.contains(e.target))
        setSortDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expandedId, sortDropdownOpen]);

  const loadApps = useCallback(async (sort, query, status) => {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (sort && sort !== "Latest") params.set("sort", sort);
      if (query?.trim()) params.set("q", query.trim());
      if (status && status !== "All") params.set("status", status);
      const qs = params.toString();
      const url = qs ? `/api/admin/apps/list?${qs}` : "/api/admin/apps/list";
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (res.ok && data?.apps) setApps(data.apps);
      else setError("Unable to load apps.");
    } catch { setError("Unable to connect to the server."); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadApps("Latest", "", "All"); }, [loadApps]);

  const handleSearch = useCallback((e) => {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadApps(sortRef.current, val, statusRef.current), 300);
  }, [loadApps]);

  const handleSortChange = useCallback((option) => {
    setSortOption(option);
    setSortDropdownOpen(false);
    loadApps(option, searchRef.current, statusRef.current);
  }, [loadApps]);

  const handleStatusChange = useCallback((status) => {
    setStatusFilter(status);
    loadApps(sortRef.current, searchRef.current, status);
  }, [loadApps]);

  const handleDelete = useCallback(async () => {
    if (!confirmAction) return;
    setConfirmAction(null);
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/apps/${confirmAction.appId}`, { method: "DELETE", credentials: "include" });
      if (res.ok) loadApps(sortRef.current, searchRef.current, statusRef.current);
    } catch {}
    finally { setIsProcessing(false); }
  }, [confirmAction, loadApps]);

  const handleImgError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = noImagePlaceholder;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="admin-apps">
      <div className="admin-apps-header">
        <div className="admin-apps-header-left">
          <h1>All Applications</h1>
          <button className="admin-apps-back" onClick={() => navigate("/admin/dashboard")}>Dashboard</button>
          <button className="admin-apps-logout" onClick={() => logout()}>Logout</button>
        </div>
        <div className="admin-apps-count">{apps.length} app{apps.length !== 1 ? "s" : ""}</div>
      </div>

      <div className="admin-apps-filters">
        <div className="admin-apps-search-div">
          <input className="admin-apps-search" placeholder="Search by name, owner..." value={searchInput} onChange={handleSearch} />
          <img src={searchIcon} alt="Search" className="admin-apps-search-icon" />
        </div>

        <div className="admin-apps-filter-row">
          <div className="admin-apps-status-tabs">
            {["All", "Published", "Draft"].map((s) => (
              <button key={s} className={`admin-apps-status-tab ${statusFilter === s ? "active" : ""}`} onClick={() => handleStatusChange(s)}>{s}</button>
            ))}
          </div>
          <div className="admin-apps-sort-div" ref={sortByRef} onClick={() => setSortDropdownOpen((p) => !p)}>
            <img src={sortIcon} alt="Sort" />
            <span>Sort: {sortOption}</span>
            {sortDropdownOpen && (
              <ul className="admin-apps-sort-dropdown">
                {["Latest", "Popular", "A-Z", "Z-A", "Price-High", "Price-Low"].map((opt) => (
                  <li key={opt} className={sortOption === opt ? "active" : ""} onClick={(e) => { e.stopPropagation(); handleSortChange(opt); }}>{opt}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {isLoading && <div className="admin-apps-loading">Loading applications...</div>}
      {error && <div className="admin-apps-loading">{error}</div>}

      {!isLoading && !error && apps.length === 0 && (
        <div className="admin-apps-empty">
          <h3>No applications found</h3>
          <p>{searchInput.trim() ? "Try adjusting your search." : "No apps have been uploaded yet."}</p>
        </div>
      )}

      <div className="admin-apps-grid">
        {apps.map((app) => {
          if (!dropdownRefs.current[app.appId]) dropdownRefs.current[app.appId] = React.createRef();

          return (
            <div className="admin-apps-card" key={app.appId}>
              <div className="admin-apps-card-image">
                <img src={app.imageUrl || noImagePlaceholder} alt={app.name} onError={handleImgError} />
              </div>
              <div className="admin-apps-card-body">
                <div className="admin-apps-card-top">
                  <div className="admin-apps-card-meta">
                    <span className={`admin-apps-status-badge ${app.isDraft ? "draft" : "published"}`}>{app.isDraft ? "Draft" : "Published"}</span>
                    <span className="admin-apps-price">{app.price > 0 ? `$${app.price.toFixed(2)}` : "Free"}</span>
                  </div>
                  <div className="admin-apps-expand" ref={dropdownRefs.current[app.appId]}
                    onClick={(e) => { e.stopPropagation(); setExpandedId((p) => p === app.appId ? null : app.appId); }}>
                    <button><img src={expandIcon} alt="More" /></button>
                    {expandedId === app.appId && (
                      <div className="admin-apps-dropdown">
                        <div className="admin-apps-dropdown-item view" onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/applications?view=${app.appId}`, "_blank");
                          setExpandedId(null);
                        }}>
                          <img src={viewIcon} alt="View" /><span>View in Store</span>
                        </div>
                        <div className="admin-apps-dropdown-item delete" onClick={(e) => {
                          e.stopPropagation(); setExpandedId(null);
                          setConfirmAction({ appId: app.appId, title: `Delete "${app.name}"?`, subtitle: `This will permanently delete this app, its versions, and analytics. Owner: ${app.ownerName}. Existing purchases will be preserved.` });
                        }}>
                          <img src={trashIcon} alt="Delete" /><span>Delete</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <h3 className="admin-apps-card-title" style={{ WebkitBoxOrient: 'vertical' }}>{app.name}</h3>
                <p className="admin-apps-card-desc" style={{ WebkitBoxOrient: 'vertical' }}>{app.description}</p>
                <div className="admin-apps-card-owner">
                  <span className="admin-apps-owner-name">{app.ownerName}</span>
                  <span className="admin-apps-owner-email">{app.ownerEmail}</span>
                </div>
                <div className="admin-apps-card-stats">
                  <span>{app.popularity} views</span>
                  <span>{app.totalSales} sales</span>
                  <span>{formatDate(app.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {confirmAction && (
        <ConfirmationModal
          modalOpenState={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleDelete}
          title={confirmAction.title}
          subtitle={confirmAction.subtitle}
        />
      )}
      {isProcessing && <ProcessingModal modalOpenState={isProcessing} message="Deleting app..." />}
    </div>
  );
};

export default AdminApps;