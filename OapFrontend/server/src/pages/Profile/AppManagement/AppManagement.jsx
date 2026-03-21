import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import ProfileUploadEditAppModal from "@profile/ProfileUploadEditAppModal/ProfileUploadEditAppModal";
import ProfileApplicationDetailModal from "@profile/ProfileApplicationDetailModal/ProfileApplicationDetailModal";
import DeleteConfirmationModal from "@pages/DeleteConfirmationModal/DeleteConfirmationModal";
import ProcessingModal from "@pages/ProcessingModal/ProcessingModal";
import ManageBoostModal from "./ManageBoostModal/ManageBoostModal";
import searchIcon from "@assets/magnifying-glass-icon.svg";
import detailsIcon from "@assets/purple-details-icon.svg";
import editIcon from "@assets/purple-edit-icon.svg";
import trashIcon from "@assets/red-outline-trash-icon.svg";
import addIcon from "@assets/add-circle-icon.svg";
import sortIcon from "@assets/sort-by-icon.svg";
import expandIcon from "@assets/three-dots-expand-icon.svg";
import boostIcon from "@assets/filled-purple-boost-icon.png";
import playIcon from "@assets/purple-filled-play-icon.svg";
import noImageUploadedPlaceholder from "@assets/no-image-uploaded.jpg";
import "./AppManagement.css";

const PERIOD_OPTIONS = [
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "6 months", value: "6m" },
  { label: "1 year", value: "1y" },
];

const formatNumber = (n) => {
  if (n == null) return "0";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
};

const normalizeCard = (apiItem) => {
  const id = apiItem?.userApplicationId ?? apiItem?.UserApplicationId;
  const versionId = apiItem?.userApplicationVersionId ?? apiItem?.UserApplicationVersionId;
  const name = apiItem?.name ?? apiItem?.Name ?? "";
  const description = apiItem?.description ?? apiItem?.Description ?? "";
  const repositoryUrl = apiItem?.repositoryUrl ?? apiItem?.RepositoryUrl ?? "";
  const previewUrl = apiItem?.defaultPresentationUrl ?? apiItem?.DefaultPresentationUrl ?? "";
  const thumbnailUrl = apiItem?.defaultPresentationThumbnailUrl ?? apiItem?.DefaultPresentationThumbnailUrl ?? "";
  const fileCategory = Number(apiItem?.defaultPresentationFileCategory ?? apiItem?.DefaultPresentationFileCategory ?? 0);
  const contentType = String(apiItem?.defaultPresentationContentType ?? apiItem?.DefaultPresentationContentType ?? "").toLowerCase();
  const isVideo = fileCategory === 3 || contentType.startsWith("video/");
  const createdAt = apiItem?.createdAt ?? apiItem?.CreatedAt ?? null;

  return {
    id, versionId, title: name, description, github: repositoryUrl,
    previewUrl, thumbnailUrl, isVideo,
    totalImpressions: apiItem?.totalImpressions ?? 0,
    totalClicks: apiItem?.totalClicks ?? 0,
    price: apiItem?.price ?? apiItem?.Price ?? null,
    technologies: apiItem?.technologies ?? [],
    raw: { ...apiItem, createdAt },
  };
};


const buildFullTimeline = (dataPoints, period) => {
  const now = new Date();
  const labels = [];

  if (period === "7d") {
    for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); labels.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" })); }
  } else if (period === "30d") {
    for (let i = 29; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); labels.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" })); }
  } else if (period === "6m") {
    for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); labels.push(d.toLocaleDateString("en-US", { month: "short" })); }
  } else if (period === "1y") {
    for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); labels.push(d.toLocaleDateString("en-US", { month: "short" })); }
  }

  if (labels.length === 0) return dataPoints;
  const dataMap = {};
  for (const pt of dataPoints) dataMap[pt.label] = pt;
  return labels.map((label) => dataMap[label] ?? { label, impressions: 0, clicks: 0 });
};

const ApplicationChart = ({ appId, initialPeriod = "6m" }) => {
  const [chartData, setChartData] = useState(null);
  const [period, setPeriod] = useState(initialPeriod);
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/app-management/chart/${appId}?period=${period}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (!cancelled && data?.chart) setChartData(data.chart); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [appId, period]);

  const rawPoints = chartData?.dataPoints ?? [];
  const dataPoints = useMemo(() => buildFullTimeline(rawPoints, period), [rawPoints, period]);

  const renderDot = (color) => (props) => {
    const { cx, cy, payload } = props;
    if ((payload.impressions || 0) + (payload.clicks || 0) === 0) return null;
    return <circle cx={cx} cy={cy} r={5} fill="#fff" stroke={color} strokeWidth={2.5} />;
  };

  return (
    <div className="app-management-chart">
      <div className="app-management-chart-header">
        <span className="app-management-chart-title">Analytics</span>
        <div className="app-management-chart-controls">
          <div className="app-management-period-dropdown" onClick={() => setPeriodDropdownOpen((o) => !o)}>
            <span>Period: {PERIOD_OPTIONS.find((p) => p.value === period)?.label}</span>
            {periodDropdownOpen && (
              <ul className="app-management-period-list">
                {PERIOD_OPTIONS.map((opt) => (
                  <li key={opt.value} className={period === opt.value ? "active" : ""}
                    onClick={(e) => { e.stopPropagation(); setPeriod(opt.value); setPeriodDropdownOpen(false); }}>
                    {opt.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      {loading && <div className="app-management-chart-skeleton" />}
      {!loading && dataPoints.length === 0 && <div className="app-management-chart-empty">No data yet for this period</div>}
      {!loading && dataPoints.length > 0 && (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={dataPoints} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`impressionFill-${appId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5541D7" stopOpacity={0.35} /><stop offset="100%" stopColor="#5541D7" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id={`clickFill-${appId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.25} /><stop offset="100%" stopColor="#A78BFA" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#999" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#999" }} axisLine={false} tickLine={false} tickFormatter={formatNumber} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #eee", fontSize: 13, fontFamily: "Poppins" }}
              formatter={(value, name) => [formatNumber(value), name === "impressions" ? "Impressions" : "Clicks"]} />
            <Area type="monotone" dataKey="impressions" stroke="#5541D7" strokeWidth={2.5}
              fill={`url(#impressionFill-${appId})`} fillOpacity={1} dot={renderDot("#5541D7")}
              activeDot={{ r: 7, fill: "#5541D7", stroke: "#fff", strokeWidth: 2 }} />
            <Area type="monotone" dataKey="clicks" stroke="#A78BFA" strokeWidth={2}
              fill={`url(#clickFill-${appId})`} fillOpacity={1} dot={renderDot("#A78BFA")}
              activeDot={{ r: 6, fill: "#A78BFA", stroke: "#fff", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

const AppManagement = () => {
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  const [displayApps, setDisplayApps] = useState([]);
  const [hasAppsAtAll, setHasAppsAtAll] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [showAll, setShowAll] = useState(false);
  const [sortOption, setSortOption] = useState("Latest");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [expandedDropdownId, setExpandedDropdownId] = useState(null);

  const [showUploadEditModal, setShowUploadEditModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [appToDelete, setAppToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showManageBoostModal, setShowManageBoostModal] = useState(false);
  const [boostApp, setBoostApp] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalApp, setModalApp] = useState(null);
  const [modalDetail, setModalDetail] = useState(null);
  const [modalDetailLoading, setModalDetailLoading] = useState(false);

  const dropdownRefs = useRef({});
  const sortByRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const sortOptionRef = useRef("Latest");
  const searchInputRef = useRef("");

  useEffect(() => { sortOptionRef.current = sortOption; }, [sortOption]);
  useEffect(() => { searchInputRef.current = searchInput; }, [searchInput]);

  useEffect(() => {
    const handler = (e) => {
      if (expandedDropdownId && dropdownRefs.current[expandedDropdownId]?.current &&
        !dropdownRefs.current[expandedDropdownId].current.contains(e.target))
        setExpandedDropdownId(null);
      if (sortDropdownOpen && sortByRef.current && !sortByRef.current.contains(e.target))
        setSortDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expandedDropdownId, sortDropdownOpen]);


  const loadCards = useCallback(async (sort, query) => {
    setIsLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (sort && sort !== "Latest") params.set("sort", sort);
      if (query?.trim()) params.set("q", query.trim());
      const qs = params.toString();
      const url = qs ? `/api/app-management/cards?${qs}` : "/api/app-management/cards";

      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) { setError("Unable to load management data."); setDisplayApps([]); return; }

      const items = (data?.applications ?? []).map(normalizeCard).filter((x) => !!x.id);
      setDisplayApps(items);

      if (!query?.trim() && (!sort || sort === "Latest")) {
        setHasAppsAtAll(items.length > 0);
      }
    } catch { setError("Unable to connect to the server."); setDisplayApps([]); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadCards("Latest", ""); }, [loadCards]);


  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setSearchInput(val); searchInputRef.current = val;
    setIsSearchMode(!!val.trim() || sortOptionRef.current !== "Latest");
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setShowAll(false);
      loadCards(sortOptionRef.current, val);
    }, 300);
  }, [loadCards]);

  const handleSortChange = useCallback((option) => {
    setSortOption(option); sortOptionRef.current = option; setSortDropdownOpen(false);
    setShowAll(false);
    setIsSearchMode(!!searchInputRef.current.trim() || option !== "Latest");
    loadCards(option, searchInputRef.current);
  }, [loadCards]);


  const openDetailModal = useCallback(async (app) => {
    setModalApp(app); setModalDetail(null); setModalDetailLoading(true); setModalOpen(true);
    try {
      const res = await fetch(`/api/user-application/get-user-application-details/${app.id}`, { credentials: "include" });
      const data = await res.json();
      if (res.ok && data?.application) setModalDetail(data.application);
    } catch { }
    finally { setModalDetailLoading(false); }
  }, []);

  const closeDetailModal = useCallback(() => { setModalOpen(false); setModalApp(null); setModalDetail(null); }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!appToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/user-application/delete-user-application/${appToDelete.id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setDisplayApps((prev) => prev.filter((a) => a.id !== appToDelete.id));
        closeDetailModal();
      }
    } catch { }
    finally { setIsDeleting(false); setShowDeleteModal(false); setAppToDelete(null); }
  }, [appToDelete, closeDetailModal]);

  const handleCloseUploadModal = useCallback((returnedCard) => {
    setShowUploadEditModal(false); setSelectedApp(null);
    if (returnedCard && returnedCard.__isDraft) return;
    loadCards(sortOptionRef.current, searchInputRef.current);
  }, [loadCards]);

  const visibleApps = useMemo(() => (showAll ? displayApps : displayApps.slice(0, 3)), [displayApps, showAll]);
  const hasNoApps = !isLoading && !error && !hasAppsAtAll;
  const hasNoResults = !isLoading && !error && hasAppsAtAll && displayApps.length === 0 && isSearchMode;

  return (
    <section id="app-management-applications">
      <div className="app-management-title-div">
        <h2 className="app-management-title">App Management</h2>
        <div className="app-management-search-filter-add-div">
          <div className="app-management-search-div">
            <input className="app-management-search" placeholder="Search..." value={searchInput} onChange={handleSearchChange}
              onKeyDown={(e) => { if (e.key === "Enter") { clearTimeout(searchDebounceRef.current); setShowAll(false); loadCards(sortOption, searchInput); } }} />
            <img src={searchIcon} alt="Search" className="app-management-search-icon" />
          </div>
          <div className="app-management-sortby-upload-div">
            <div className="app-management-sortby-div" ref={sortByRef}>
              <div className="app-management-sortby-toggle" onClick={() => setSortDropdownOpen((o) => !o)}>
                <img src={sortIcon} alt="Sort" /><span>Sort By: {sortOption}</span>
              </div>
              {sortDropdownOpen && (
                <ul className="sortby-dropdown">
                  {["Popular", "Latest", "A-Z", "Z-A"].map((option) => (
                    <li key={option} className={sortOption === option ? "active" : ""}
                      onClick={(e) => { e.stopPropagation(); handleSortChange(option); }}>{option}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="app-management-header-right-border"></div>
            <div className="app-management-upload-new-div">
              <div className="app-management-upload-new-btn" onClick={() => setShowUploadEditModal(true)}>
                <img src={addIcon} alt="Add" /><span>Upload New App</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLoading && <div style={{ padding: "12px 0", opacity: 0.8 }}>Loading management data…</div>}
      {!isLoading && error && <div style={{ padding: "12px 0" }}>{error}</div>}

      {hasNoApps && (
        <div className="applicationMgmt-emptyState">
          <div className="applicationMgmt-emptyState-card">
            <div className="applicationMgmt-emptyState-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <h3 className="applicationMgmt-emptyState-title">No published apps to manage</h3>
            <p className="applicationMgmt-emptyState-subtitle">Publish an app first to see analytics, impressions, and clicks here.</p>
            <button className="applicationMgmt-emptyState-cta" onClick={() => setShowUploadEditModal(true)}>
              <img src={addIcon} alt="" />Upload New App
            </button>
          </div>
        </div>
      )}

      {hasNoResults && (
        <div className="applicationMgmt-emptyState">
          <div className="applicationMgmt-emptyState-card">
            <div className="applicationMgmt-emptyState-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>
            <h3 className="applicationMgmt-emptyState-title">No results found</h3>
            <p className="applicationMgmt-emptyState-subtitle">Try adjusting your search or sort options.</p>
            <button className="applicationMgmt-emptyState-cta applicationMgmt-emptyState-cta--ghost" onClick={() => {
              setSearchInput(""); searchInputRef.current = "";
              setSortOption("Latest"); sortOptionRef.current = "Latest";
              setIsSearchMode(false); setShowAll(false);
              loadCards("Latest", "");
            }}>Clear search</button>
          </div>
        </div>
      )}

      <div className="app-management-apps">
        {visibleApps.map((app) => {
          if (!dropdownRefs.current[app.id]) dropdownRefs.current[app.id] = React.createRef();
          const hasThumbnail = !!app.thumbnailUrl;
          const hasPreview = !!app.previewUrl;

          return (
            <div key={app.id} className="app-management-card">
              <div className="app-management-display-image">
                {(hasThumbnail && app.isVideo) ? (
                  <img src={app.thumbnailUrl} alt={app.title} />
                ) : hasPreview ? (
                  app.isVideo ? (<video src={app.previewUrl} muted playsInline preload="metadata" />) : (<img src={app.previewUrl} alt={app.title} />)
                ) : (
                  <img src={noImageUploadedPlaceholder} alt="No media" />
                )}
                {app.isVideo && hasPreview && (
                  <div className="app-management-video-overlay">
                    <img src={playIcon} alt="Play" className="app-management-play-icon" />
                    <span className="app-management-video-duration">Video</span>
                  </div>
                )}
              </div>

              <div className="app-management-info">
                <div className="app-management-app-title">
                  <div className="app-management-app-header"><h4>{app.title}</h4></div>
                  <div className="app-management-expand-div" ref={dropdownRefs.current[app.id]}
                    onClick={(e) => { e.stopPropagation(); setExpandedDropdownId((prev) => (prev === app.id ? null : app.id)); }}>
                    <button className="app-management-expand-button"><img src={expandIcon} alt="More" /></button>
                    {expandedDropdownId === app.id && (
                      <div className="app-management-dropdown">
                        <div className="app-management-dropdown-item details" onClick={(e) => {
                          e.stopPropagation(); openDetailModal(app); setExpandedDropdownId(null);
                        }}><img src={detailsIcon} alt="Details" /><span>Details</span></div>
                        <div className="app-management-dropdown-item edit" onClick={(e) => {
                          e.stopPropagation(); setSelectedApp(app); setShowUploadEditModal(true); setExpandedDropdownId(null);
                        }}><img src={editIcon} alt="Edit" /><span>Edit</span></div>
                        <div className="app-management-dropdown-item delete" onClick={(e) => {
                          e.stopPropagation(); setAppToDelete(app); setShowDeleteModal(true); setExpandedDropdownId(null);
                        }}><img src={trashIcon} alt="Delete" /><span>Delete</span></div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="app-management-description"><p>{app.description}</p></div>

                <div className="app-management-chart-metrics">
                  <ApplicationChart appId={app.id} />
                  <div className="app-management-metrics-boosts">
                    <div className="app-management-metrics">
                      <div><span className="app-management-metric-label">Impressions:</span><span className="app-management-metric-amount">{formatNumber(app.totalImpressions)}</span></div>
                      <div><span className="app-management-metric-label">Clicks:</span><span className="app-management-metric-amount">{formatNumber(app.totalClicks)}</span></div>
                      <div><span className="app-management-metric-label">Spent:</span><span className="app-management-metric-amount">$0</span></div>
                      <div><span className="app-management-metric-label">PPC:</span><span className="app-management-metric-amount">$0</span></div>
                    </div>
                    <div className="app-management-boosts">
                      <div><button><img src={boostIcon} alt="" /><span>Boost Now</span></button></div>
                      <div><button onClick={() => { setBoostApp(app); setShowManageBoostModal(true); }}>
                        <img src={boostIcon} alt="" /><span>Manage <span className="app-management-boost-txt">Boost</span></span>
                      </button></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {displayApps.length > 3 && (
        <div className="app-management-load-more-div">
          <button className="app-management-load-more" onClick={() => setShowAll((s) => !s)}>
            {showAll ? "Show Less" : "Load More"}
          </button>
        </div>
      )}

      {modalOpen && (
        <ProfileApplicationDetailModal modalOpenState={modalOpen}
          onClose={() => { if (showDeleteModal) return; closeDetailModal(); }}
          app={modalApp} detail={modalDetail} detailLoading={modalDetailLoading}
          onEditClick={() => { closeDetailModal(); setSelectedApp(modalApp); setShowUploadEditModal(true); }}
          onDeleteClick={() => { setAppToDelete(modalApp); setShowDeleteModal(true); }}
        />
      )}

      {showUploadEditModal && (
        <ProfileUploadEditAppModal modalOpenState={showUploadEditModal} onClose={handleCloseUploadModal} selected={selectedApp} />
      )}

      {showDeleteModal && appToDelete && (
        <DeleteConfirmationModal modalOpenState={showDeleteModal}
          onClose={() => { if (isDeleting) return; setShowDeleteModal(false); setAppToDelete(null); }}
          app={appToDelete} onConfirmDelete={handleConfirmDelete} />
      )}
      {isDeleting && <ProcessingModal modalOpenState={isDeleting} message="Deleting app…" />}

      {showManageBoostModal && boostApp && (
        <ManageBoostModal modalOpenState={showManageBoostModal}
          onClose={() => { setShowManageBoostModal(false); setBoostApp(null); }}
          title={boostApp.title} preview={boostApp.previewUrl || noImageUploadedPlaceholder}
          impressions={formatNumber(boostApp.totalImpressions)} clicks={formatNumber(boostApp.totalClicks)}
          spent="$0" ppc="$0" dailyBudget={0} cpcCap={0} />
      )}
    </section>
  );
};

export default AppManagement;