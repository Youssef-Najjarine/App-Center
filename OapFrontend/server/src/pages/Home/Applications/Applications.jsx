import React, { useState, useEffect, useRef, useMemo, useCallback, forwardRef } from "react";
import ApplicationDetailModal from "./ApplicationDetailModal";
import useAnalyticsTracker from "@hooks/useAnalyticsTracker";
import searchIcon from "@assets/magnifying-glass-icon.svg";
import githubIcon from "@assets/github-icon.png";
import playIcon from "@assets/purple-filled-play-icon.svg";
import noImageUploadedPlaceholder from "@assets/no-image-uploaded.jpg";
import { useAuthUser } from "@context/AuthUserContext";
import ContactUs from "@components/ContactUs/ContactUs";
import Footer from "@components/Footer/Footer";
import "./Applications.css";

const normalizeStoreCard = (apiItem) => {
  const id = apiItem?.userApplicationId ?? apiItem?.UserApplicationId;
  const versionId = apiItem?.userApplicationVersionId ?? apiItem?.UserApplicationVersionId;
  const ownerUserId = apiItem?.ownerUserId ?? apiItem?.OwnerUserId ?? null;
  const name = apiItem?.name ?? apiItem?.Name ?? "";
  const description = apiItem?.description ?? apiItem?.Description ?? "";
  const repositoryUrl = apiItem?.repositoryUrl ?? apiItem?.RepositoryUrl ?? "";
  const price = apiItem?.price ?? apiItem?.Price ?? null;
  const createdAt = apiItem?.createdAt ?? apiItem?.CreatedAt ?? null;
  const previewUrl = apiItem?.defaultPresentationUrl ?? apiItem?.DefaultPresentationUrl ?? "";
  const thumbnailUrl = apiItem?.defaultPresentationThumbnailUrl ?? apiItem?.DefaultPresentationThumbnailUrl ?? "";
  const fileCategory = Number(apiItem?.defaultPresentationFileCategory ?? apiItem?.DefaultPresentationFileCategory ?? 0);
  const contentTypeRaw = apiItem?.defaultPresentationContentType ?? apiItem?.DefaultPresentationContentType ?? "";
  const contentType = String(contentTypeRaw).toLowerCase();
  const isVideo = fileCategory === 3 || contentType.startsWith("video/");

  return {
    id, versionId, ownerUserId,
    title: name, description, price,
    github: repositoryUrl,
    previewUrl, thumbnailUrl, isVideo,
    technologies: apiItem?.technologies ?? apiItem?.Technologies ?? [],
    raw: { ...apiItem, createdAt },
  };
};

const TECH_VISIBLE_COUNT = 3;

const StoreAppCard = React.memo(
  forwardRef(({ app, canLoadMedia, showShimmer, isExpanded, onCardClick, onImageLoad, onToggleTech }, ref) => {
    const shimmerTimerRef = useRef(null);
    useEffect(() => {
      if (showShimmer) {
        shimmerTimerRef.current = setTimeout(() => onImageLoad(), 5000);
      } else {
        if (shimmerTimerRef.current) { clearTimeout(shimmerTimerRef.current); shimmerTimerRef.current = null; }
      }
      return () => { if (shimmerTimerRef.current) clearTimeout(shimmerTimerRef.current); };
    }, [showShimmer, onImageLoad]);

    const showVideoOverlay = app.isVideo && app.previewUrl;
    const techs = app.technologies || [];
    const visibleTech = isExpanded ? techs : techs.slice(0, TECH_VISIBLE_COUNT);
    const remaining = techs.length - TECH_VISIBLE_COUNT;
    const hasThumbnail = !!app.thumbnailUrl;
    const hasPreview = !!app.previewUrl;

    return (
      <div className="homeApp" onClick={onCardClick} ref={ref}>
        <div className={`homeApp-image-div ${showShimmer ? "is-loading-media" : ""}`}>
          {showShimmer && <div className="homeApp-shimmer" />}

          {!canLoadMedia ? (
            <div className="homeApp-media-slot" />
          ) : (hasThumbnail && app.isVideo) ? (
            <img src={app.thumbnailUrl} alt={app.title} loading="lazy" decoding="async" onLoad={onImageLoad} onError={onImageLoad} />
          ) : hasPreview ? (
            app.isVideo ? (
              <video src={app.previewUrl} muted playsInline preload="metadata"
                onLoadedMetadata={onImageLoad} onLoadedData={onImageLoad} onError={onImageLoad} />
            ) : (
              <img src={app.previewUrl} alt={app.title} loading="lazy" decoding="async" onLoad={onImageLoad} onError={onImageLoad} />
            )
          ) : (
            <img src={noImageUploadedPlaceholder} alt="No media" onLoad={onImageLoad} onError={onImageLoad} />
          )}

          {showVideoOverlay && (
            <div className="homeApp-video-overlay">
              <img src={playIcon} alt="Play" className="homeApp-play-icon" />
              <span className="homeApp-video-duration">Video</span>
            </div>
          )}
        </div>

        <div className="homeApp-gitHub-div">
          <div>
            {app.github ? (
              <a href={app.github} target="_blank" rel="noopener noreferrer">
                <img src={githubIcon} alt="GitHub icon" />
              </a>
            ) : (
              <img src={githubIcon} alt="GitHub icon" style={{ opacity: 0.35 }} />
            )}
          </div>
          <div className="homeApp-github-anchor-div">
            {app.github ? (
              <a href={app.github} target="_blank" rel="noopener noreferrer">{app.github}</a>
            ) : (
              <span style={{ opacity: 0.6 }}>No repository link</span>
            )}
          </div>
        </div>
        <div className="homeApp-app-header">
            <h6 className="homeApp-app-title">{app.title}</h6>
        </div>
        <div className="homeApp-app-description-div">
            <p className="homeApp-app-description">{app.description}</p>
        </div>

        {techs.length > 0 && (
          <ul className="homeApp-app-tech-stack">
            {visibleTech.map((t, i) => <li key={`${app.id}-tech-${i}`}>{t}</li>)}
            {!isExpanded && remaining > 0 && (
              <li className="expand-tech" onClick={(e) => { e.stopPropagation(); onToggleTech(); }}>+{remaining}</li>
            )}
            {isExpanded && remaining > 0 && (
              <li className="collapse-tech" onClick={(e) => { e.stopPropagation(); onToggleTech(); }}>Show less</li>
            )}
          </ul>
        )}
      </div>
    );
  })
);

const Applications = () => {
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  const { user } = useAuthUser();
  const isSignedIn = !!user;

  const [displayApps, setDisplayApps] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [hasAppsInStore, setHasAppsInStore] = useState(true);

  const { trackImpression, trackClick } = useAnalyticsTracker(currentUserId);

  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [appsError, setAppsError] = useState("");

  const [showAll, setShowAll] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [sortOption, setSortOption] = useState("Latest");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [expandedTechStacks, setExpandedTechStacks] = useState({});

  const [modalOpen, setModalOpen] = useState(false);
  const [modalApp, setModalApp] = useState(null);
  const [modalDetail, setModalDetail] = useState(null);
  const [modalDetailLoading, setModalDetailLoading] = useState(false);

  const [mediaLoadedMap, setMediaLoadedMap] = useState({});
  const [shouldLoadMedia, setShouldLoadMedia] = useState({});

  const cardNodesRef = useRef({});
  const observerRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const displayAppsRef = useRef([]);
  const sortOptionRef = useRef("Latest");
  const searchInputRef = useRef("");

  useEffect(() => { displayAppsRef.current = displayApps; }, [displayApps]);
  useEffect(() => { sortOptionRef.current = sortOption; }, [sortOption]);
  useEffect(() => { searchInputRef.current = searchInput; }, [searchInput]);

  const markMediaLoaded = useCallback((appId) => {
    setMediaLoadedMap((prev) => prev[appId] ? prev : { ...prev, [appId]: true });
  }, []);

  const toggleTechStack = useCallback((id) => {
    setExpandedTechStacks((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target?.dataset?.appid;
          if (!id || !entry.isIntersecting) return;
          setShouldLoadMedia((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
          const app = displayAppsRef.current.find((a) => String(a.id) === id);
          if (app) trackImpression(app.id, app.ownerUserId);
          observerRef.current?.unobserve(entry.target);
        });
      },
      { root: null, rootMargin: "250px", threshold: 0.01 }
    );
    Object.values(cardNodesRef.current).forEach((node) => {
      if (node) observerRef.current.observe(node);
    });
    return () => observerRef.current?.disconnect();
  }, [displayApps]);

  const setCardNode = useCallback((appId, node) => {
    if (!appId) return;
    if (node) {
      cardNodesRef.current[appId] = node;
      node.dataset.appid = String(appId);
      observerRef.current?.observe(node);
    } else {
      delete cardNodesRef.current[appId];
    }
  }, []);

  const loadStoreApps = useCallback(async (sort, query) => {
    setIsLoadingApps(true);
    setAppsError("");
    try {
      const params = new URLSearchParams();
      if (sort && sort !== "Latest") params.set("sort", sort);
      if (query?.trim()) params.set("q", query.trim());
      const qs = params.toString();
      const url = qs ? `/api/store/search-cards?${qs}` : "/api/store/search-cards";

      const res = await fetch(url, { method: "GET", credentials: "include" });
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }

      if (!res.ok) { setAppsError("Unable to load applications."); setDisplayApps([]); return; }

      const items = Array.isArray(data?.applications) ? data.applications : [];
      const normalized = items.map(normalizeStoreCard).filter((x) => !!x?.id);

      setDisplayApps(normalized);
      displayAppsRef.current = normalized;

      if (data?.currentUserId) setCurrentUserId(data.currentUserId);

      if (!query?.trim() && (!sort || sort === "Latest")) {
        setHasAppsInStore(normalized.length > 0);
      }
    } catch (e) {
      console.error(e);
      setAppsError("Unable to connect to the server.");
      setDisplayApps([]);
    } finally {
      setIsLoadingApps(false);
    }
  }, []);

  useEffect(() => { loadStoreApps("Latest", ""); }, [loadStoreApps]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadStoreApps(sortOptionRef.current, searchInputRef.current);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [loadStoreApps]);

  const handleSearchInputChange = useCallback((e) => {
    const val = e.target.value;
    setSearchInput(val);
    searchInputRef.current = val;
    setIsSearchMode(!!val.trim() || sortOptionRef.current !== "Latest");
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setShowAll(false);
      loadStoreApps(sortOptionRef.current, val);
    }, 300);
  }, [loadStoreApps]);

  const handleSearchSubmit = useCallback(() => {
    clearTimeout(searchDebounceRef.current);
    setShowAll(false);
    setIsSearchMode(!!searchInputRef.current.trim() || sortOptionRef.current !== "Latest");
    loadStoreApps(sortOptionRef.current, searchInputRef.current);
  }, [loadStoreApps]);

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === "Enter") handleSearchSubmit();
  }, [handleSearchSubmit]);

  const handleSortChange = useCallback((option) => {
    setSortOption(option);
    sortOptionRef.current = option;
    setSortDropdownOpen(false);
    setShowAll(false);
    setIsSearchMode(!!searchInputRef.current.trim() || option !== "Latest");
    loadStoreApps(option, searchInputRef.current);
  }, [loadStoreApps]);

  const openDetailModal = useCallback(async (app) => {
    trackClick(app.id, app.ownerUserId);
    setModalApp(app);
    setModalDetail(null);
    setModalDetailLoading(true);
    setModalOpen(true);

    try {
      const res = await fetch(`/api/store/get-application-details/${app.id}`, { method: "GET", credentials: "include" });
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }
      if (res.ok && data?.application) {
        setModalDetail(data.application);
        if (data?.currentUserId) setCurrentUserId(data.currentUserId);
      }
    } catch (e) {
      console.error("Failed to load app details:", e);
    } finally {
      setModalDetailLoading(false);
    }
  }, [trackClick]);

  const closeDetailModal = useCallback(() => {
    setModalOpen(false);
    setModalApp(null);
    setModalDetail(null);
    setModalDetailLoading(false);
  }, []);

  const visibleApps = useMemo(
    () => (showAll ? displayApps : displayApps.slice(0, 12)),
    [displayApps, showAll]
  );

  const hasNoAppsAtAll = !isLoadingApps && !appsError && !hasAppsInStore;
  const hasAppsButNoResults = !isLoadingApps && !appsError && hasAppsInStore && displayApps.length === 0 && isSearchMode;

  return (
    <>
      <section id="applications" className={`${isSignedIn ? "signed-in" : "signed-out"}`}>
        <div className="applications-title-div">
          <h2 className="applications-title">Applications</h2>
          <h3 className="applications-sub-header">
            Explore the best applications in world available to own.
          </h3>
          <div className="applications-search-div">
            <input
              className="applications-search"
              placeholder="Search..."
              value={searchInput}
              onChange={handleSearchInputChange}
              onKeyDown={handleSearchKeyDown}
            />
            <img
              src={searchIcon}
              alt="Applications Search"
              className="applications-search-icon"
              onClick={handleSearchSubmit}
            />
          </div>
        </div>

        {isLoadingApps && (
          <div style={{ padding: "12px 0", opacity: 0.8, textAlign: "center" }}>Loading applications…</div>
        )}
        {!isLoadingApps && appsError && (
          <div style={{ padding: "12px 0", textAlign: "center" }}>{appsError}</div>
        )}

        {hasNoAppsAtAll && (
          <div className="storeApps-emptyState">
            <div className="storeApps-emptyState-card">
              <div className="storeApps-emptyState-icon" aria-hidden="true">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h3 className="storeApps-emptyState-title">No applications yet</h3>
              <p className="storeApps-emptyState-subtitle">
                There are no published applications available at the moment.
                New apps are being added regularly — check back soon!
              </p>
            </div>
          </div>
        )}

        {hasAppsButNoResults && (
          <div className="storeApps-emptyState">
            <div className="storeApps-emptyState-card">
              <div className="storeApps-emptyState-icon" aria-hidden="true">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </div>
              <h3 className="storeApps-emptyState-title">No results found</h3>
              <p className="storeApps-emptyState-subtitle">
                No apps matched{" "}
                {searchInput.trim() ? (
                  <>&ldquo;<strong>{searchInput.trim()}</strong>&rdquo;</>
                ) : (
                  "your current search"
                )}
                . Try adjusting your keywords.
              </p>
              <button
                type="button"
                className="storeApps-emptyState-cta"
                onClick={() => {
                  setSearchInput(""); searchInputRef.current = "";
                  setSortOption("Latest"); sortOptionRef.current = "Latest";
                  setIsSearchMode(false); setShowAll(false);
                  loadStoreApps("Latest", "");
                }}
              >
                Clear search
              </button>
            </div>
          </div>
        )}

        <div className="applications-grid">
          {visibleApps.map((app) => {
            const idStr = String(app.id);
            const canLoadMedia = !!shouldLoadMedia[idStr];
            const hasMedia = !!(app.thumbnailUrl || app.previewUrl);
            const showShimmer = canLoadMedia && hasMedia && !mediaLoadedMap[idStr];

            return (
              <StoreAppCard
                key={app.id}
                ref={(node) => setCardNode(app.id, node)}
                app={app}
                canLoadMedia={canLoadMedia}
                showShimmer={showShimmer}
                isExpanded={!!expandedTechStacks[app.id]}
                onCardClick={(e) => {
                  if (
                    e.target.closest("a") ||
                    e.target.classList.contains("expand-tech") ||
                    e.target.classList.contains("collapse-tech")
                  ) return;
                  openDetailModal(app);
                }}
                onImageLoad={() => markMediaLoaded(app.id)}
                onToggleTech={() => toggleTechStack(app.id)}
              />
            );
          })}
        </div>

        {displayApps.length > 12 && (
          <div className="applications-load-more-div">
            <button className="applications-load-more" onClick={() => setShowAll((s) => !s)}>
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
            currentUserId={currentUserId}
          />
        )}
      </section>
      <ContactUs />
      <Footer />
    </>
  );
};

export default Applications;