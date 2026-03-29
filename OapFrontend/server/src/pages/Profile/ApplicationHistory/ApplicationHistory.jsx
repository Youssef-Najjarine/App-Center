import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import ApplicationDetailModal from "@pages/Home/Applications/ApplicationDetailModal";
import ConfirmationModal from "@pages/ConfirmationModal/ConfirmationModal";
import ProcessingModal from "@pages/ProcessingModal/ProcessingModal";
import calendarIcon from "@assets/calendar-icon.svg";
import arrowIcon from "@assets/down-arrow-icon.svg";
import appSoldIcon from "@assets/purple-outline-phone-icon.svg";
import disputedIcon from "@assets/danger-outline.svg";
import searchIcon from "@assets/magnifying-glass-icon.svg";
import githubIcon from "@assets/github-icon.png";
import expandIcon from "@assets/three-dots-expand-icon.svg";
import detailIcon from "@assets/purple-view-details-icon.svg";
import resendIcon from "@assets/purple-outline-paper-plane-icon.svg";
import inquiryIssueIcon from "@assets/purple-exclamation-triangle-icon.svg";
import refundIcon from "@assets/red-give-refund-icon.svg";
import buyerIcon from "@assets/purple-outline-profile-icon.svg";
import emailIcon from "@assets/purple-outline-email-icon.svg";
import priceIcon from "@assets/purple-dollar-circle-icon.svg";
import sortIcon from "@assets/sort-by-icon.svg";
import playIcon from "@assets/purple-filled-play-icon.svg";
import noImageUploadedPlaceholder from "@assets/no-image-uploaded.jpg";
import { useAuthUser } from "@context/AuthUserContext";
import "./ApplicationHistory.css";

const STATUS_MAP = {
  0: { label: "Sold", className: "sold" },
  1: { label: "Refunded", className: "refunded" },
  2: { label: "Request Refund", className: "request-refund" },
  3: { label: "Under Processing", className: "under-processing" },
};

const normalizeSale = (apiItem) => {
  const transactionId = apiItem?.transactionId ?? apiItem?.TransactionId;
  const id = apiItem?.userApplicationId ?? apiItem?.UserApplicationId;
  const versionId = apiItem?.userApplicationVersionId ?? apiItem?.UserApplicationVersionId;
  const name = apiItem?.name ?? apiItem?.Name ?? "";
  const description = apiItem?.description ?? apiItem?.Description ?? "";
  const repositoryUrl = apiItem?.repositoryUrl ?? apiItem?.RepositoryUrl ?? "";
  const amount = apiItem?.amount ?? apiItem?.Amount ?? 0;
  const status = apiItem?.status ?? apiItem?.Status ?? 0;
  const purchasedAt = apiItem?.purchasedAt ?? apiItem?.PurchasedAt ?? null;
  const buyerName = apiItem?.buyerName ?? apiItem?.BuyerName ?? "";
  const buyerEmail = apiItem?.buyerEmail ?? apiItem?.BuyerEmail ?? "";
  const previewUrl = (apiItem?.defaultPresentationUrl ?? apiItem?.DefaultPresentationUrl ?? "").replace("/api/store/file/", "/api/transaction/file/");
  const thumbnailUrl = (apiItem?.defaultPresentationThumbnailUrl ?? apiItem?.DefaultPresentationThumbnailUrl ?? "").replace("/api/store/file/", "/api/transaction/file/");
  const fileCategory = Number(apiItem?.defaultPresentationFileCategory ?? apiItem?.DefaultPresentationFileCategory ?? 0);
  const contentType = String(apiItem?.defaultPresentationContentType ?? apiItem?.DefaultPresentationContentType ?? "").toLowerCase();
  const isVideo = fileCategory === 3 || contentType.startsWith("video/");
  const presentationFilesJson = apiItem?.presentationFilesJson ?? apiItem?.PresentationFilesJson ?? null;

  const dateStr = purchasedAt ? new Date(purchasedAt).toLocaleDateString("en-US", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  }) : "";

  const statusInfo = STATUS_MAP[status] ?? STATUS_MAP[0];

  return {
    transactionId, id, versionId,
    title: name, description,
    github: repositoryUrl,
    amount, status, purchasedAt, dateStr,
    buyerName, buyerEmail,
    previewUrl, thumbnailUrl, isVideo, presentationFilesJson,
    statusLabel: statusInfo.label,
    statusClass: statusInfo.className,
    cost: amount > 0 ? `$${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Free",
  };
};

const formatRevenue = (n) => {
  if (n == null || n === 0) return "$0";
  return `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const SaleCardImage = ({ sale }) => {
  const hasThumbnail = !!sale.thumbnailUrl;
  const hasPreview = !!sale.previewUrl;

  const handleImgError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = noImageUploadedPlaceholder;
  };

  if (sale.isVideo && hasThumbnail) {
    return (
      <div className="appHistory-video-thumb-wrapper">
        <img src={sale.thumbnailUrl} alt={sale.title} onError={handleImgError} />
        <div className="appHistory-video-overlay">
          <img src={playIcon} alt="Play" className="appHistory-play-icon" />
          <span className="appHistory-video-label">Video</span>
        </div>
      </div>
    );
  }

  if (sale.isVideo && hasPreview) {
    return (
      <div className="appHistory-video-thumb-wrapper">
        <video src={sale.previewUrl} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
        <div className="appHistory-video-overlay">
          <img src={playIcon} alt="Play" className="appHistory-play-icon" />
          <span className="appHistory-video-label">Video</span>
        </div>
      </div>
    );
  }

  if (hasPreview) {
    return <img src={sale.previewUrl} alt={sale.title} onError={handleImgError} />;
  }

  return <img src={noImageUploadedPlaceholder} alt="No media" />;
};

const ApplicationHistory = () => {
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  const { user } = useAuthUser();

  const [displaySales, setDisplaySales] = useState([]);
  const [hasSalesAtAll, setHasSalesAtAll] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [summary, setSummary] = useState({ totalRevenue: 0, applicationsSold: 0, disputedApplications: 0 });

  const [showAll, setShowAll] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [sortOption, setSortOption] = useState("Latest");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [calendarSortOption, setCalendarSortOption] = useState("This Month");
  const [calendarDropdownOpen, setCalendarDropdownOpen] = useState(false);
  const [isHoveringCalendarItem, setIsHoveringCalendarItem] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [expandedDropdownId, setExpandedDropdownId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalApp, setModalApp] = useState(null);
  const [modalDetail, setModalDetail] = useState(null);
  const [modalDetailLoading, setModalDetailLoading] = useState(false);

  const [confirmAction, setConfirmAction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");

  const sortByRef = useRef(null);
  const dropdownRefs = useRef({});
  const searchDebounceRef = useRef(null);
  const sortOptionRef = useRef("Latest");
  const searchInputRef = useRef("");
  const calendarRef = useRef("This Month");

  useEffect(() => { sortOptionRef.current = sortOption; }, [sortOption]);
  useEffect(() => { searchInputRef.current = searchInput; }, [searchInput]);
  useEffect(() => { calendarRef.current = calendarSortOption; }, [calendarSortOption]);

  useEffect(() => {
    const handler = (e) => {
      if (expandedDropdownId && dropdownRefs.current[expandedDropdownId]?.current &&
        !dropdownRefs.current[expandedDropdownId].current.contains(e.target))
        setExpandedDropdownId(null);
      if (calendarDropdownOpen && !e.target.closest(".profile-application-history-calendar-sort-div"))
        setCalendarDropdownOpen(false);
      if (sortDropdownOpen && sortByRef.current && !sortByRef.current.contains(e.target))
        setSortDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expandedDropdownId, calendarDropdownOpen, sortDropdownOpen]);

  const loadSales = useCallback(async (sort, query, period) => {
    setIsLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (sort && sort !== "Latest") params.set("sort", sort);
      if (query?.trim()) params.set("q", query.trim());
      if (period && period !== "All Time") params.set("period", period);
      const qs = params.toString();
      const url = qs ? `/api/app-history/my-sales?${qs}` : "/api/app-history/my-sales";

      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) { setError("Unable to load sales history."); setDisplaySales([]); return; }

      const items = (data?.sales ?? []).map(normalizeSale).filter((x) => !!x.id);
      setDisplaySales(items);

      if (!query?.trim() && (!sort || sort === "Latest")) {
        setHasSalesAtAll(items.length > 0);
      }
    } catch { setError("Unable to connect to the server."); setDisplaySales([]); }
    finally { setIsLoading(false); }
  }, []);

  const loadSummary = useCallback(async (period) => {
    try {
      const params = new URLSearchParams();
      if (period && period !== "All Time") params.set("period", period);
      const qs = params.toString();
      const url = qs ? `/api/app-history/sales-summary?${qs}` : "/api/app-history/sales-summary";

      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (res.ok && data?.summary) setSummary(data.summary);
    } catch {}
  }, []);

  useEffect(() => {
    loadSales("Latest", "", calendarSortOption);
    loadSummary(calendarSortOption);
  }, []);

  const handleCalendarChange = useCallback((option) => {
    setCalendarSortOption(option); calendarRef.current = option; setCalendarDropdownOpen(false);
    setShowAll(false);
    loadSales(sortOptionRef.current, searchInputRef.current, option);
    loadSummary(option);
  }, [loadSales, loadSummary]);

  const handleSortChange = useCallback((option) => {
    setSortOption(option); sortOptionRef.current = option; setSortDropdownOpen(false);
    setShowAll(false);
    setIsSearchMode(!!searchInputRef.current.trim() || option !== "Latest");
    loadSales(option, searchInputRef.current, calendarRef.current);
  }, [loadSales]);

  const handleSearchInputChange = useCallback((e) => {
    const val = e.target.value;
    setSearchInput(val); searchInputRef.current = val;
    setIsSearchMode(!!val.trim() || sortOptionRef.current !== "Latest");
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setShowAll(false);
      loadSales(sortOptionRef.current, val, calendarRef.current);
    }, 300);
  }, [loadSales]);

  const handleSearchSubmit = useCallback(() => {
    clearTimeout(searchDebounceRef.current);
    setShowAll(false);
    loadSales(sortOptionRef.current, searchInputRef.current, calendarRef.current);
  }, [loadSales]);

  const handleSearchKeyDown = useCallback((e) => { if (e.key === "Enter") handleSearchSubmit(); }, [handleSearchSubmit]);

  const openDetailModal = useCallback(async (sale) => {
    setModalApp(sale); setModalDetail(null); setModalDetailLoading(true); setModalOpen(true);

    let fetched = false;
    try {
      const res = await fetch(`/api/store/get-application-details/${sale.id}`, { credentials: "include" });
      const data = await res.json();
      if (res.ok && data?.application) {
        setModalDetail(data.application);
        fetched = true;
      }
    } catch {}

    if (!fetched) {
      let fallbackFiles = [];

      if (sale.presentationFilesJson) {
        try {
          const parsed = JSON.parse(sale.presentationFilesJson);
          if (Array.isArray(parsed)) {
            fallbackFiles = parsed.map((f) => ({
              fileId: f.fileId,
              url: (f.url || "").replace("/api/store/file/", "/api/transaction/file/"),
              fileCategory: f.fileCategory,
              contentType: f.contentType ?? "",
              orderIndex: f.orderIndex ?? 0,
            }));
          }
        } catch {}
      }

      if (fallbackFiles.length === 0) {
        if (sale.previewUrl) {
          fallbackFiles.push({
            fileId: "snapshot-pres",
            url: sale.previewUrl,
            fileCategory: sale.isVideo ? 3 : 2,
            orderIndex: 0,
          });
        }
        if (sale.thumbnailUrl && sale.isVideo) {
          fallbackFiles.push({
            fileId: "snapshot-thumb",
            url: sale.thumbnailUrl,
            fileCategory: 4,
            orderIndex: 0,
          });
        }
      }

      setModalDetail({
        name: sale.title,
        description: sale.description,
        repositoryUrl: sale.github,
        technologies: [],
        price: sale.amount,
        files: fallbackFiles,
      });
    }

    setModalDetailLoading(false);
  }, []);

  const closeDetailModal = useCallback(() => {
    setModalOpen(false); setModalApp(null); setModalDetail(null); setModalDetailLoading(false);
  }, []);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmAction) return;
    const { type, app } = confirmAction;

    if (type === "resend") {
      setConfirmAction(null);
      setIsProcessing(true);
      setProcessingMessage("Resending details…");
      setTimeout(() => { setIsProcessing(false); setProcessingMessage(""); }, 1500);
    }

    if (type === "inquiry") {
      setConfirmAction(null);
      setIsProcessing(true);
      setProcessingMessage("Submitting inquiry…");
      setTimeout(() => { setIsProcessing(false); setProcessingMessage(""); }, 1500);
    }

    if (type === "refund") {
      setConfirmAction(null);
      setIsProcessing(true);
      setProcessingMessage("Processing refund…");
      try {
        const res = await fetch(`/api/app-history/give-refund/${app.transactionId}`, {
          method: "POST", credentials: "include",
        });
        if (res.ok) {
          loadSales(sortOptionRef.current, searchInputRef.current, calendarRef.current);
          loadSummary(calendarRef.current);
        }
      } catch {}
      finally { setIsProcessing(false); setProcessingMessage(""); }
    }
  }, [confirmAction, loadSales, loadSummary]);

  const visibleApps = useMemo(() => (showAll ? displaySales : displaySales.slice(0, 12)), [displaySales, showAll]);
  const hasNoSales = !isLoading && !error && !hasSalesAtAll;
  const hasNoResults = !isLoading && !error && hasSalesAtAll && displaySales.length === 0 && isSearchMode;

  return (
    <section id="profile-application-history">
      <div className="profile-application-history-title1-div">
        <h2 className="profile-application-history-title">Applications</h2>
        <div className="profile-application-history-calendar-sort-div"
          onClick={() => setCalendarDropdownOpen(!calendarDropdownOpen)}>
          <img src={calendarIcon} alt="Calendar" />
          <span>{calendarSortOption}</span>
          <div className={`app-history-arrow-div ${calendarDropdownOpen ? "arrow-open" : ""} ${isHoveringCalendarItem ? "arrow-hover" : ""}`}>
            <img src={arrowIcon} alt="Arrow" />
          </div>
          {calendarDropdownOpen && (
            <ul className="profile-application-history-calendar-sortby-dropdown">
              {["All Time", "This Week", "This Month", "Last Month", "Last 6 Months", "This Year"].map((option) => (
                <li key={option} className={calendarSortOption === option ? "active" : ""}
                  onClick={(e) => { e.stopPropagation(); handleCalendarChange(option); }}
                  onMouseEnter={() => setIsHoveringCalendarItem(true)}
                  onMouseLeave={() => setIsHoveringCalendarItem(false)}>
                  {option}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="profile-application-history-totals">
        <div className="profile-application-history-total">
          <div className="profile-application-history-revenue">
            <div className="profile-application-history-image"><img src={priceIcon} alt="" /></div>
            <div className="profile-application-history-details">
              <p className="profile-application-history-total-amount">{formatRevenue(summary.totalRevenue)}</p>
              <p className="profile-application-history-label">Total Revenue</p>
            </div>
          </div>
          <div className="profile-application-history-total-up"><span>{summary.applicationsSold > 0 ? `${summary.applicationsSold} sold` : "No sales yet"}</span></div>
        </div>
        <div className="profile-application-history-total">
          <div className="profile-application-history-sold">
            <div className="profile-application-history-image"><img src={appSoldIcon} alt="" /></div>
            <div className="profile-application-history-details">
              <p className="profile-application-history-total-amount">{summary.applicationsSold}</p>
              <p className="profile-application-history-label">No. of Applications Sold</p>
            </div>
          </div>
          <div className="profile-application-history-total-up"><span>{calendarSortOption}</span></div>
        </div>
        <div className="profile-application-history-total">
          <div className="profile-application-history-disputed">
            <div className="profile-application-history-image"><img src={disputedIcon} alt="" /></div>
            <div className="profile-application-history-details">
              <p className="profile-application-history-total-amount">{summary.disputedApplications}</p>
              <p className="profile-application-history-label">Disputed Applications</p>
            </div>
          </div>
          <div className={summary.disputedApplications > 0 ? "profile-application-history-total-down" : "profile-application-history-total-up"}>
            <span>{summary.disputedApplications > 0 ? `${summary.disputedApplications} active` : "None"}</span>
          </div>
        </div>
      </div>

      <div className="profile-application-history-title2-div">
        <h2 className="profile-application-history-title">History</h2>
        <div className="profile-application-history-search-filter-div">
          <div className="profile-application-history-search-div">
            <input className="profile-application-history-search" placeholder="Search..." value={searchInput}
              onChange={handleSearchInputChange} onKeyDown={handleSearchKeyDown} />
            <img src={searchIcon} alt="Search" className="profile-application-history-search-icon" onClick={handleSearchSubmit} />
          </div>
          <div className="profile-application-history-sortby-div" ref={sortByRef}
            onClick={(e) => { e.stopPropagation(); setSortDropdownOpen((prev) => !prev); }}>
            <img src={sortIcon} alt="Sort" />
            <span>Sort By: {sortOption}</span>
            {sortDropdownOpen && (
              <ul className="profile-application-history-sortby-dropdown">
                {["Popular", "Recent Sold", "Latest", "A-Z", "Z-A"].map((option) => (
                  <li key={option} className={sortOption === option ? "active" : ""}
                    onClick={(e) => { e.stopPropagation(); handleSortChange(option); }}>
                    {option}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {isLoading && <div style={{ padding: "12px 0", opacity: 0.8 }}>Loading sales history…</div>}
      {!isLoading && error && <div style={{ padding: "12px 0" }}>{error}</div>}

      {hasNoSales && (
        <div className="appHistory-emptyState">
          <div className="appHistory-emptyState-card">
            <div className="appHistory-emptyState-icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <h3 className="appHistory-emptyState-title">No sales yet</h3>
            <p className="appHistory-emptyState-subtitle">When someone purchases one of your apps, it will appear here.</p>
          </div>
        </div>
      )}

      {hasNoResults && (
        <div className="appHistory-emptyState">
          <div className="appHistory-emptyState-card">
            <div className="appHistory-emptyState-icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>
            <h3 className="appHistory-emptyState-title">No results found</h3>
            <p className="appHistory-emptyState-subtitle">
              No sales matched{" "}{searchInput.trim() ? (<>&ldquo;<strong>{searchInput.trim()}</strong>&rdquo;</>) : "your current filters"}. Try adjusting your search.
            </p>
            <button type="button" className="appHistory-emptyState-cta" onClick={() => {
              setSearchInput(""); searchInputRef.current = "";
              setSortOption("Latest"); sortOptionRef.current = "Latest";
              setIsSearchMode(false); setShowAll(false);
              loadSales("Latest", "", calendarRef.current);
            }}>Clear search</button>
          </div>
        </div>
      )}

      <div className="profile-application-history-grid">
        {visibleApps.map((sale) => {
          if (!dropdownRefs.current[sale.transactionId]) dropdownRefs.current[sale.transactionId] = React.createRef();

          return (
            <div className="profile-app-history" key={sale.transactionId}>
              <div className="profile-app-history-row">
                <div className="profile-app-history-placeholder-image">
                  <SaleCardImage sale={sale} />
                </div>
                <div className="profile-app-history-body">
                  <div className="profile-app-history-header">
                    <div className="app-history-title">
                      <div className="app-history-title-header">
                        <h3>{sale.title}</h3>
                      </div>
                      <div className={`app-history-status ${sale.statusClass}`}>{sale.statusLabel}</div>
                    </div>
                    <div className="app-history-date-expand">
                      <p className="app-history-date">{sale.dateStr}</p>
                      <div className="profile-app-history-expand-div" ref={dropdownRefs.current[sale.transactionId]}
                        onClick={(e) => { e.stopPropagation(); setExpandedDropdownId((prev) => (prev === sale.transactionId ? null : sale.transactionId)); }}>
                        <button><img src={expandIcon} className="profile-app-history-expand-icon" alt="More" /></button>
                        {expandedDropdownId === sale.transactionId && (
                          <div className="profile-app-history-dropdown">
                            <div className="profile-app-history-dropdown-item details" onClick={(e) => {
                              e.stopPropagation(); openDetailModal(sale); setExpandedDropdownId(null);
                            }}>
                              <img src={detailIcon} alt="Details" /><span>Details</span>
                            </div>
                            <div className="profile-app-history-dropdown-item details" onClick={(e) => {
                              e.stopPropagation(); setExpandedDropdownId(null);
                              setConfirmAction({ type: "resend", app: sale, title: "Resend Details?", subtitle: `Resend the purchase details for "${sale.title}" to the buyer.` });
                            }}>
                              <img src={resendIcon} alt="Resend" /><span>Resend Details</span>
                            </div>
                            <div className="profile-app-history-dropdown-item details" onClick={(e) => {
                              e.stopPropagation(); setExpandedDropdownId(null);
                              setConfirmAction({ type: "inquiry", app: sale, title: "Inquiry Issue?", subtitle: `Submit an inquiry about "${sale.title}". Our team will investigate.` });
                            }}>
                              <img src={inquiryIssueIcon} alt="Inquiry" /><span>Inquiry Issue</span>
                            </div>
                            {sale.status !== 1 && (
                              <div className="profile-app-history-dropdown-item refund" onClick={(e) => {
                                e.stopPropagation(); setExpandedDropdownId(null);
                                setConfirmAction({ type: "refund", app: sale, title: `Refund "${sale.title}"?`, subtitle: `This will refund ${sale.cost} to the buyer. This action cannot be undone.` });
                              }}>
                                <img src={refundIcon} alt="Refund" /><span>Give Refund</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="profile-app-history-description"><p>{sale.description}</p></div>
                  <div className="profile-app-history-gitHub-div">
                    {sale.github ? (
                      <>
                        <a href={sale.github} target="_blank" rel="noopener noreferrer"><img src={githubIcon} alt="GitHub" /></a>
                        <div className="profile-app-history-github-anchor-div">
                          <a href={sale.github} target="_blank" rel="noopener noreferrer">{sale.github}</a>
                        </div>
                      </>
                    ) : (
                      <>
                        <img src={githubIcon} alt="GitHub" style={{ opacity: 0.35 }} />
                        <div className="profile-app-history-github-anchor-div">
                          <span style={{ opacity: 0.6 }}>No repository link</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="profile-app-history-buyer-info">
                    <div className="profile-app-history-buyer-info-buyer">
                      <div><img src={buyerIcon} alt="" /><label>Buyer Name:</label></div>
                      <p>{sale.buyerName}</p>
                    </div>
                    <div className="profile-app-history-buyer-info-email">
                      <div><img src={emailIcon} alt="" /><label>Email Address:</label></div>
                      <p>{sale.buyerEmail}</p>
                    </div>
                    <div className="profile-app-history-buyer-info-price">
                      <div><img src={priceIcon} alt="" /><label>Price:</label></div>
                      <p>{sale.cost}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {displaySales.length > 12 && (
        <div className="profile-applications-history-load-more-div">
          <button className="profile-applications-history-load-more" onClick={() => setShowAll((s) => !s)}>
            {showAll ? "Show Less" : "Load More"}
          </button>
        </div>
      )}

      {modalOpen && (
        <ApplicationDetailModal
          modalOpenState={modalOpen}
          onClose={closeDetailModal}
          app={modalApp}
          detail={modalDetail}
          detailLoading={modalDetailLoading}
          currentUserId={user?.id ?? user?.Id ?? null}
          hidePurchaseButton={true}
        />
      )}

      {confirmAction && (
        <ConfirmationModal
          modalOpenState={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
          title={confirmAction.title}
          subtitle={confirmAction.subtitle}
        />
      )}

      {isProcessing && <ProcessingModal modalOpenState={isProcessing} message={processingMessage} />}
    </section>
  );
};

export default ApplicationHistory;