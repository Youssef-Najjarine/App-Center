import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuthUser } from "@context/AuthUserContext";
import ApplicationDetailModal from "@pages/Home/Applications/ApplicationDetailModal";
import ConfirmationModal from "@pages/ConfirmationModal/ConfirmationModal";
import ProcessingModal from "@pages/ProcessingModal/ProcessingModal";
import githubIcon from "@assets/github-icon.png";
import expandIcon from "@assets/three-dots-expand-icon.svg";
import viewDetailsIcon from "@assets/purple-view-details-icon.svg";
import downloadIcon from "@assets/purple-download-icon.svg";
import reportIcon from "@assets/danger-outline.svg";
import sellerIcon from "@assets/purple-outline-profile-icon.svg";
import emailIcon from "@assets/purple-outline-email-icon.svg";
import spentIcon from "@assets/purple-dollar-circle-icon.svg";
import addIcon from "@assets/add-circle-icon.svg";
import sortIcon from "@assets/sort-by-icon.svg";
import playIcon from "@assets/purple-filled-play-icon.svg";
import noImageUploadedPlaceholder from "@assets/no-image-uploaded.jpg";
import "./MyPurchases.css";

const normalizePurchase = (apiItem) => {
  const transactionId = apiItem?.transactionId ?? apiItem?.TransactionId;
  const id = apiItem?.userApplicationId ?? apiItem?.UserApplicationId;
  const versionId = apiItem?.userApplicationVersionId ?? apiItem?.UserApplicationVersionId;
  const name = apiItem?.name ?? apiItem?.Name ?? "";
  const description = apiItem?.description ?? apiItem?.Description ?? "";
  const repositoryUrl = apiItem?.repositoryUrl ?? apiItem?.RepositoryUrl ?? "";
  const amount = apiItem?.amount ?? apiItem?.Amount ?? 0;
  const status = apiItem?.status ?? apiItem?.Status ?? 0;
  const purchasedAt = apiItem?.purchasedAt ?? apiItem?.PurchasedAt ?? null;
  const sellerName = apiItem?.sellerName ?? apiItem?.SellerName ?? "";
  const sellerEmail = apiItem?.sellerEmail ?? apiItem?.SellerEmail ?? "";
  const previewUrl = apiItem?.defaultPresentationUrl ?? apiItem?.DefaultPresentationUrl ?? "";
  const thumbnailUrl = apiItem?.defaultPresentationThumbnailUrl ?? apiItem?.DefaultPresentationThumbnailUrl ?? "";
  const fileCategory = Number(apiItem?.defaultPresentationFileCategory ?? apiItem?.DefaultPresentationFileCategory ?? 0);
  const contentType = String(apiItem?.defaultPresentationContentType ?? apiItem?.DefaultPresentationContentType ?? "").toLowerCase();
  const isVideo = fileCategory === 3 || contentType.startsWith("video/");

  const dateStr = purchasedAt ? new Date(purchasedAt).toLocaleDateString("en-US", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  }) : "";

  return {
    transactionId, id, versionId,
    title: name, description,
    github: repositoryUrl,
    amount, status, purchasedAt, dateStr,
    sellerName, sellerEmail,
    previewUrl, thumbnailUrl, isVideo,
    spent: amount > 0 ? `$${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Free",
  };
};

const MyPurchases = () => {
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  const { user } = useAuthUser();

  const [allPurchases, setAllPurchases] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [sortOption, setSortOption] = useState("Latest");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [expandedDropdownId, setExpandedDropdownId] = useState(null);

  // Detail modal (using Store's ApplicationDetailModal)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalApp, setModalApp] = useState(null);
  const [modalDetail, setModalDetail] = useState(null);
  const [modalDetailLoading, setModalDetailLoading] = useState(false);

  // Confirmation modals
  const [confirmAction, setConfirmAction] = useState(null); // { type, app, title, subtitle }
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");

  const sortByRef = useRef(null);
  const dropdownRefs = useRef({});

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

  // ── Load purchases from backend (with sort) ───────────────────────────

  const loadPurchases = useCallback(async (sort) => {
    setIsLoading(true); setError("");
    try {
      const res = await fetch(`/api/transaction/my-purchases?sort=${encodeURIComponent(sort || "Latest")}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) { setError("Unable to load your purchases."); setAllPurchases([]); return; }
      const items = (data?.purchases ?? []).map(normalizePurchase).filter((x) => !!x.id);
      setAllPurchases(items);
    } catch { setError("Unable to connect to the server."); setAllPurchases([]); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadPurchases(sortOption); }, []);

  const handleSortChange = useCallback((option) => {
    setSortOption(option);
    setSortDropdownOpen(false);
    setShowAll(false);
    loadPurchases(option);
  }, [loadPurchases]);

  // ── Detail modal (Store version) ──────────────────────────────────────

  const openDetailModal = useCallback(async (purchase) => {
    setModalApp(purchase);
    setModalDetail(null);
    setModalDetailLoading(true);
    setModalOpen(true);

    try {
      const res = await fetch(`/api/store/get-application-details/${purchase.id}`, { credentials: "include" });
      const data = await res.json();
      if (res.ok && data?.application) setModalDetail(data.application);
    } catch { }
    finally { setModalDetailLoading(false); }
  }, []);

  const closeDetailModal = useCallback(() => {
    setModalOpen(false); setModalApp(null); setModalDetail(null); setModalDetailLoading(false);
  }, []);

  // ── Confirmation actions ──────────────────────────────────────────────

  const handleConfirmAction = useCallback(async () => {
    if (!confirmAction) return;
    const { type, app } = confirmAction;

    if (type === "download") {
      setConfirmAction(null);
      setIsProcessing(true);
      setProcessingMessage("Preparing download…");
      try {
        const res = await fetch(`/api/transaction/download/${app.id}`, { credentials: "include" });
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          const disposition = res.headers.get("content-disposition");
          const match = disposition?.match(/filename="?(.+?)"?$/);
          a.download = match?.[1] || `${app.title || "application"}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } catch { }
      finally { setIsProcessing(false); setProcessingMessage(""); }
    }

    if (type === "report") {
      setConfirmAction(null);
      setIsProcessing(true);
      setProcessingMessage("Reporting issue…");
      try {
        await fetch(`/api/transaction/report-issue/${app.transactionId}`, {
          method: "POST", credentials: "include",
        });
        loadPurchases(sortOption);
      } catch { }
      finally { setIsProcessing(false); setProcessingMessage(""); }
    }

    if (type === "refund") {
      setConfirmAction(null);
      setIsProcessing(true);
      setProcessingMessage("Requesting refund…");
      try {
        const res = await fetch(`/api/transaction/request-refund/${app.transactionId}`, {
          method: "POST", credentials: "include",
        });
        if (res.ok) loadPurchases(sortOption);
      } catch { }
      finally { setIsProcessing(false); setProcessingMessage(""); }
    }
  }, [confirmAction, loadPurchases, sortOption]);

  const visibleApps = useMemo(() => (showAll ? allPurchases : allPurchases.slice(0, 12)), [allPurchases, showAll]);
  const hasNoPurchases = !isLoading && !error && allPurchases.length === 0;

  return (
    <section id="profile-my-purchases">
      <div className="profile-my-purchases-title-div">
        <h2 className="profile-my-purchases-title">My Purchases</h2>
        <div className="profile-my-purchases-sortby-buy-more-div">
          <div className="profile-my-purchases-sortby-div" ref={sortByRef}>
            <div onClick={(e) => { e.stopPropagation(); setSortDropdownOpen((prev) => !prev); }} className="profile-my-purchases-sortby-button">
              <img src={sortIcon} alt="Sort" />
              <span className="profile-my-purchases-sort-option">Sort By: {sortOption}</span>
            </div>
            {sortDropdownOpen && (
              <ul className="profile-my-purchases-sortby-dropdown">
                {["Latest", "A-Z", "Z-A"].map((option) => (
                  <li key={option} className={sortOption === option ? "active" : ""}
                    onClick={(e) => { e.stopPropagation(); handleSortChange(option); }}>
                    {option}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="profile-my-purchases-header-right-border"></div>
          <div className="profile-my-purchases-buy-more-div">
            <div className="profile-my-purchases-buy-more-btn">
              <Link to="/applications">
                <img src={addIcon} alt="Buy" />
                <span>Buy more Applications</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {isLoading && <div style={{ padding: "12px 0", opacity: 0.8 }}>Loading your purchases…</div>}
      {!isLoading && error && <div style={{ padding: "12px 0" }}>{error}</div>}

      {hasNoPurchases && (
        <div className="myPurchases-emptyState">
          <div className="myPurchases-emptyState-card">
            <div className="myPurchases-emptyState-icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
            <h3 className="myPurchases-emptyState-title">No purchases yet</h3>
            <p className="myPurchases-emptyState-subtitle">
              Browse the store to find and purchase applications.
            </p>
            <Link to="/applications" className="myPurchases-emptyState-cta">
              <img src={addIcon} alt="" />Browse Store
            </Link>
          </div>
        </div>
      )}

      <div className="profile-my-purchases-grid">
        {visibleApps.map((app) => {
          if (!dropdownRefs.current[app.id]) dropdownRefs.current[app.id] = React.createRef();
          const hasThumbnail = !!app.thumbnailUrl;
          const hasPreview = !!app.previewUrl;

          return (
            <div className="profile-my-purchases-app" key={app.transactionId}>
              <div className="profile-my-purchases-body-part1">
                <div className="profile-my-purchases-image-div">
                  {(hasThumbnail && app.isVideo) ? (
                    <img src={app.thumbnailUrl} alt={app.title} className="profile-my-purchases-placeholder-img" />
                  ) : hasPreview ? (
                    app.isVideo ? (
                      <video src={app.previewUrl} className="profile-my-purchases-placeholder-img" muted playsInline preload="metadata" />
                    ) : (
                      <img src={app.previewUrl} alt={app.title} className="profile-my-purchases-placeholder-img" />
                    )
                  ) : (
                    <img src={noImageUploadedPlaceholder} alt="No media" className="profile-my-purchases-placeholder-img" />
                  )}
                </div>
                <div className="profile-my-purchases-body-part1-details">
                  <div className="profile-my-purchases-body-part1-details-header">
                    <div className="profile-my-purchases-body-part1-details-sub-header">
                      <h3>{app.title}</h3>
                      <p>{app.dateStr}</p>
                    </div>
                    <div className="profile-my-purchases-expand-div" ref={dropdownRefs.current[app.id]}
                      onClick={(e) => { e.stopPropagation(); setExpandedDropdownId((prev) => (prev === app.id ? null : app.id)); }}>
                      <button><img src={expandIcon} className="profile-my-purchases-expand-icon" alt="More" /></button>
                      {expandedDropdownId === app.id && (
                        <div className="profile-my-purchases-dropdown">
                          <div className="profile-my-purchases-dropdown-item details" onClick={(e) => {
                            e.stopPropagation(); openDetailModal(app); setExpandedDropdownId(null);
                          }}>
                            <img src={viewDetailsIcon} alt="Details" /><span>View Details</span>
                          </div>
                          <div className="profile-my-purchases-dropdown-item download" onClick={(e) => {
                            e.stopPropagation(); setExpandedDropdownId(null);
                            setConfirmAction({
                              type: "download", app,
                              title: "Download Again?",
                              subtitle: `Re-download the ZIP file for "${app.title}". This will start a download.`,
                            });
                          }}>
                            <img src={downloadIcon} alt="Download" /><span>Download Again</span>
                          </div>
                          <div className="profile-my-purchases-dropdown-item report" onClick={(e) => {
                            e.stopPropagation(); setExpandedDropdownId(null);
                            setConfirmAction({
                              type: "report", app,
                              title: "Report an Issue?",
                              subtitle: `Report a problem with "${app.title}". Our team will review your report.`,
                            });
                          }}>
                            <img src={reportIcon} alt="Report" /><span>Report Issue</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="profile-my-purchases-description">
                    <p>{app.description}</p>
                  </div>
                  <div className="profile-my-purchases-gitHub-div">
                    {app.github ? (
                      <>
                        <a href={app.github} target="_blank" rel="noopener noreferrer"><img src={githubIcon} alt="GitHub" /></a>
                        <div className="profile-my-purchases-github-anchor-div">
                          <a href={app.github} target="_blank" rel="noopener noreferrer">{app.github}</a>
                        </div>
                      </>
                    ) : (
                      <>
                        <img src={githubIcon} alt="GitHub" style={{ opacity: 0.35 }} />
                        <div className="profile-my-purchases-github-anchor-div">
                          <span style={{ opacity: 0.6 }}>No repository link</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="profile-my-purchases-body-part2">
                <div className="profile-my-purchases-seller-info">
                  <div className="profile-my-purchases-seller-name">
                    <div className="profile-my-purchases-seller-image-label">
                      <img src={sellerIcon} alt="" /><label>Seller Name:</label>
                    </div>
                    <div className="profile-my-purchases-seller-value">{app.sellerName}</div>
                  </div>
                  <div className="profile-my-purchases-seller-email">
                    <div className="profile-my-purchases-seller-image-label">
                      <img src={emailIcon} alt="" /><label>Email Address:</label>
                    </div>
                    <div className="profile-my-purchases-seller-value">{app.sellerEmail}</div>
                  </div>
                  <div className="profile-my-purchases-seller-amount">
                    <div className="profile-my-purchases-seller-image-label">
                      <img src={spentIcon} alt="" /><label>Spent:</label>
                    </div>
                    <div className="profile-my-purchases-seller-value">{app.spent}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {allPurchases.length > 12 && (
        <div className="profile-my-purchases-load-more-div">
          <button className="profile-my-purchases-load-more" onClick={() => setShowAll((s) => !s)}>
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
          alreadyPurchased={true}
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

export default MyPurchases;