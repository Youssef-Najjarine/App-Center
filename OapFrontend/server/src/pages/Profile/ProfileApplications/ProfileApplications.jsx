import React, { useState, useEffect, useRef, useMemo, useCallback, forwardRef } from "react";
import { Link } from "react-router-dom";
import ProfileApplicationDetailModal from "@profile/ProfileApplicationDetailModal/ProfileApplicationDetailModal";
import ProfileUploadEditAppModal from "@profile/ProfileUploadEditAppModal/ProfileUploadEditAppModal";
import DeleteConfirmationModal from "@pages/DeleteConfirmationModal/DeleteConfirmationModal";
import ProcessingModal from "@pages/ProcessingModal/ProcessingModal";
import searchIcon from "@assets/magnifying-glass-icon.svg";
import githubIcon from "@assets/github-icon.png";
import expandIcon from "@assets/three-dots-expand-icon.svg";
import detailsIcon from "@assets/purple-details-icon.svg";
import editIcon from "@assets/purple-edit-icon.svg";
import trashIcon from "@assets/red-outline-trash-icon.svg";
import addIcon from "@assets/add-circle-icon.svg";
import sortIcon from "@assets/sort-by-icon.svg";
import playIcon from "@assets/purple-filled-play-icon.svg";
import draftIcon from "@assets/draft-icon.svg";
import noImageUploadedPlaceholder from "@assets/no-image-uploaded.jpg";
import "./ProfileApplications.css";

const normalizeCardToUiApp = (apiItem) => {
  const id = apiItem?.userApplicationId ?? apiItem?.UserApplicationId;
  const versionId = apiItem?.userApplicationVersionId ?? apiItem?.UserApplicationVersionId;
  const name = apiItem?.name ?? apiItem?.Name ?? "";
  const description = apiItem?.description ?? apiItem?.Description ?? "";
  const repositoryUrl = apiItem?.repositoryUrl ?? apiItem?.RepositoryUrl ?? "";
  const createdAt = apiItem?.createdAt ?? apiItem?.CreatedAt ?? null;
  const previewUrl = apiItem?.defaultPresentationUrl ?? apiItem?.DefaultPresentationUrl ?? "";
  const thumbnailUrl = apiItem?.defaultPresentationThumbnailUrl ?? apiItem?.DefaultPresentationThumbnailUrl ?? "";
  const fileCategory = Number(apiItem?.defaultPresentationFileCategory ?? apiItem?.DefaultPresentationFileCategory ?? 0);
  const contentTypeRaw = apiItem?.defaultPresentationContentType ?? apiItem?.DefaultPresentationContentType ?? "";
  const contentType = String(contentTypeRaw).toLowerCase();
  const isGif = contentType === "image/gif";
  const isVideo = !isGif && (fileCategory === 3 || contentType.startsWith("video/"));

  return {
    id, versionId, title: name, description,
    github: repositoryUrl, previewUrl, thumbnailUrl, isVideo, isGif,
    technologies: apiItem?.technologies ?? apiItem?.Technologies ?? [],
    raw: { ...apiItem, createdAt },
  };
};

const TECH_VISIBLE_COUNT = 5;

const ProfileAppCard = React.memo(
  forwardRef(({
    app, canLoadMedia, showShimmer, expandedDropdownId, dropdownRef, isExpanded,
    onCardClick, onExpandDropdown, onDetailsClick, onEditClick, onDeleteClick, onImageLoad, onToggleTech,
  }, ref) => {
    const shimmerTimerRef = useRef(null);
    useEffect(() => {
      if (showShimmer) { shimmerTimerRef.current = setTimeout(() => onImageLoad(), 5000); }
      else { if (shimmerTimerRef.current) { clearTimeout(shimmerTimerRef.current); shimmerTimerRef.current = null; } }
      return () => { if (shimmerTimerRef.current) clearTimeout(shimmerTimerRef.current); };
    }, [showShimmer, onImageLoad]);

    const showVideoOverlay = app.isVideo && app.previewUrl;
    const showGifOverlay = app.isGif && app.previewUrl;
    const techs = app.technologies || [];
    const visibleTech = isExpanded ? techs : techs.slice(0, TECH_VISIBLE_COUNT);
    const remaining = techs.length - TECH_VISIBLE_COUNT;
    const hasThumbnail = !!app.thumbnailUrl;
    const hasPreview = !!app.previewUrl;

    return (
      <div className="profileApp" onClick={onCardClick} ref={ref}>
        <div className={`profileApp-image-div ${showShimmer ? "is-loading-media" : ""}`}>
          {showShimmer && <div className="profileApp-shimmer" />}

          {!canLoadMedia ? (
            <div className="profileApp-preview-img profileApp-media-slot" />
          ) : (hasThumbnail && app.isVideo) ? (
            <img src={app.thumbnailUrl} alt={app.title} className="profileApp-preview-img" loading="lazy" decoding="async" onLoad={onImageLoad} onError={onImageLoad} />
          ) : hasPreview ? (
            app.isGif ? (
              <img src={app.previewUrl} alt={app.title} className="profileApp-preview-img" loading="lazy" decoding="async" onLoad={onImageLoad} onError={onImageLoad} />
            ) : app.isVideo ? (
              <video src={app.previewUrl} className="profileApp-preview-img" muted playsInline preload="metadata" onLoadedMetadata={onImageLoad} onLoadedData={onImageLoad} onError={onImageLoad} />
            ) : (
              <img src={app.previewUrl} alt={app.title} className="profileApp-preview-img" loading="lazy" decoding="async" onLoad={onImageLoad} onError={onImageLoad} />
            )
          ) : (
            <img src={noImageUploadedPlaceholder} alt="No media uploaded" className="profileApp-preview-img" onLoad={onImageLoad} onError={onImageLoad} />
          )}

          {showVideoOverlay && (
            <div className="profileApp-video-overlay">
              <img src={playIcon} alt="Play" className="profileApp-play-icon" />
              <span className="profileApp-video-duration">Video</span>
            </div>
          )}
          {showGifOverlay && (
            <div className="profileApp-video-overlay">
              <img src={playIcon} alt="Play" className="profileApp-play-icon" />
              <span className="profileApp-video-duration">GIF</span>
            </div>
          )}

          <div className="profileApp-expand-div" ref={dropdownRef} onClick={onExpandDropdown}>
            <button type="button"><img src={expandIcon} className="profileApp-expand-icon" alt="More" /></button>
            {expandedDropdownId === app.id && (
              <div className="profileApp-dropdown">
                <div className="profileApp-dropdown-item details" onClick={onDetailsClick}><img src={detailsIcon} alt="Details" /><span>Details</span></div>
                <div className="profileApp-dropdown-item edit" onClick={onEditClick}><img src={editIcon} alt="Edit" /><span>Edit</span></div>
                <div className="profileApp-dropdown-item delete" onClick={onDeleteClick}><img src={trashIcon} alt="Delete" /><span>Delete</span></div>
              </div>
            )}
          </div>
        </div>

        <div className="profileApp-gitHub-div">
          <div>
            {app.github ? (
              <a href={app.github} target="_blank" rel="noopener noreferrer"><img src={githubIcon} alt="GitHub icon" /></a>
            ) : (
              <img src={githubIcon} alt="GitHub icon" style={{ opacity: 0.35 }} />
            )}
          </div>
          <div className="profileApp-gitHub-anchor-div">
            {app.github ? (
              <a href={app.github} target="_blank" rel="noopener noreferrer">{app.github}</a>
            ) : (
              <span style={{ opacity: 0.6 }}>No repository link</span>
            )}
          </div>
        </div>

        <div className="profileApp-app-header">
            <h6 className="profileApp-app-title">{app.title}</h6>
        </div>
        <div className="profileApp-app-description-div">
            <p className="profileApp-app-description">{app.description}</p>
        </div>

        {techs.length > 0 && (
          <ul className="profileApp-app-tech-stack">
            {visibleTech.map((techItem, index) => <li key={`${app.id}-tech-${index}`}>{techItem}</li>)}
            {!isExpanded && remaining > 0 && (
              <li className="expand-tech" onClick={(e) => { e.stopPropagation(); onToggleTech(); }}>+{remaining}</li>
            )}
            {isExpanded && remaining > 0 && (
              <li className="profileApp-collapse-tech" onClick={(e) => { e.stopPropagation(); onToggleTech(); }}>Show less</li>
            )}
          </ul>
        )}
      </div>
    );
  })
);

const ProfileApplications = () => {
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  const [displayApps, setDisplayApps] = useState([]);
  const [hasAppsAtAll, setHasAppsAtAll] = useState(true);

  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [appsError, setAppsError] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);

  const [showAll, setShowAll] = useState(false);
  const [sortOption, setSortOption] = useState("Latest");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [expandedTechStacks, setExpandedTechStacks] = useState({});
  const [expandedDropdownId, setExpandedDropdownId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalApp, setModalApp] = useState(null);
  const [modalDetail, setModalDetail] = useState(null);
  const [modalDetailLoading, setModalDetailLoading] = useState(false);

  const [showUploadEditModal, setShowUploadEditModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [appToDelete, setAppToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [mediaLoadedMap, setMediaLoadedMap] = useState({});
  const [shouldLoadMedia, setShouldLoadMedia] = useState({});

  const dropdownRefs = useRef({});
  const cardNodesRef = useRef({});
  const observerRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const displayAppsRef = useRef([]);
  const sortOptionRef = useRef("Latest");
  const searchInputRef = useRef("");

  useEffect(() => { displayAppsRef.current = displayApps; }, [displayApps]);
  useEffect(() => { sortOptionRef.current = sortOption; }, [sortOption]);
  useEffect(() => { searchInputRef.current = searchInput; }, [searchInput]);

  useEffect(() => {
    const handler = (e) => {
      if (expandedDropdownId && dropdownRefs.current[expandedDropdownId]?.current &&
        !dropdownRefs.current[expandedDropdownId].current.contains(e.target))
        setExpandedDropdownId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expandedDropdownId]);

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
    if (node) { cardNodesRef.current[appId] = node; node.dataset.appid = String(appId); observerRef.current?.observe(node); }
    else delete cardNodesRef.current[appId];
  }, []);

  const loadMyApps = useCallback(async (sort, query) => {
    setIsLoadingApps(true);
    setAppsError("");
    try {
      const params = new URLSearchParams();
      if (sort && sort !== "Latest") params.set("sort", sort);
      if (query?.trim()) params.set("q", query.trim());
      const qs = params.toString();
      const url = qs
        ? `/api/user-application/search-user-application-cards?${qs}`
        : "/api/user-application/search-user-application-cards";

      const res = await fetch(url, { method: "GET", credentials: "include" });
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }

      if (!res.ok) { setAppsError("Error – Unable to load your apps."); setDisplayApps([]); return; }

      const items = Array.isArray(data?.applications) ? data.applications : [];
      const normalized = items.map(normalizeCardToUiApp).filter((x) => !!x?.id);

      setDisplayApps(normalized);
      displayAppsRef.current = normalized;

      if (!query?.trim() && (!sort || sort === "Latest")) {
        setHasAppsAtAll(normalized.length > 0);
      }
    } catch (e) {
      console.error(e);
      setAppsError("Error – Unable to connect to the server.");
      setDisplayApps([]);
    } finally {
      setIsLoadingApps(false);
    }
  }, []);

  useEffect(() => { loadMyApps("Latest", ""); }, [loadMyApps]);

  const handleSearchInputChange = useCallback((e) => {
    const val = e.target.value;
    setSearchInput(val); searchInputRef.current = val;
    setIsSearchMode(!!val.trim() || sortOptionRef.current !== "Latest");
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setShowAll(false);
      loadMyApps(sortOptionRef.current, val);
    }, 300);
  }, [loadMyApps]);

  const handleSearchSubmit = useCallback(() => {
    clearTimeout(searchDebounceRef.current);
    setShowAll(false);
    setIsSearchMode(!!searchInputRef.current.trim() || sortOptionRef.current !== "Latest");
    loadMyApps(sortOptionRef.current, searchInputRef.current);
  }, [loadMyApps]);

  const handleSearchKeyDown = useCallback((e) => { if (e.key === "Enter") handleSearchSubmit(); }, [handleSearchSubmit]);

  const handleSortChange = useCallback((option) => {
    setSortOption(option); sortOptionRef.current = option; setSortDropdownOpen(false);
    setShowAll(false);
    setIsSearchMode(!!searchInputRef.current.trim() || option !== "Latest");
    loadMyApps(option, searchInputRef.current);
  }, [loadMyApps]);

  const clearSearchAndReload = useCallback(() => {
    setSearchInput(""); searchInputRef.current = "";
    setSortOption("Latest"); sortOptionRef.current = "Latest";
    setIsSearchMode(false); setShowAll(false);
    loadMyApps("Latest", "");
  }, [loadMyApps]);

  const openDetailModal = useCallback(async (app) => {
    setModalApp(app); setModalDetail(null); setModalDetailLoading(true); setModalOpen(true);
    try {
      const res = await fetch(`/api/user-application/get-user-application-details/${app.id}`, { method: "GET", credentials: "include" });
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }
      if (res.ok && data?.application) setModalDetail(data.application);
    } catch (e) { console.error("Failed to load app details:", e); }
    finally { setModalDetailLoading(false); }
  }, []);

  const closeDetailModal = useCallback(() => {
    setModalOpen(false); setModalApp(null); setModalDetail(null); setModalDetailLoading(false);
  }, []);

  const handleCloseUploadModal = useCallback((returnedCard) => {
    setShowUploadEditModal(false); setSelectedApp(null);

    if (returnedCard && returnedCard.__isDraft) return;

    if (returnedCard && returnedCard.userApplicationId) {
      loadMyApps(sortOptionRef.current, searchInputRef.current);
      return;
    }

    if (!returnedCard) return;

    loadMyApps(sortOptionRef.current, searchInputRef.current);
  }, [loadMyApps]);


  const handleConfirmDelete = useCallback(async () => {
    if (!appToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/user-application/delete-user-application/${appToDelete.id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setDisplayApps((prev) => prev.filter((a) => a.id !== appToDelete.id));
        closeDetailModal();
      }
    } catch (e) { console.error(e); }
    finally { setIsDeleting(false); setShowDeleteModal(false); setAppToDelete(null); }
  }, [appToDelete, closeDetailModal]);

  const visibleApps = useMemo(() => (showAll ? displayApps : displayApps.slice(0, 12)), [displayApps, showAll]);
  const hasNoApps = !isLoadingApps && !appsError && !hasAppsAtAll;
  const hasAppsButNoResults = !isLoadingApps && !appsError && hasAppsAtAll && displayApps.length === 0 && isSearchMode;

  return (
    <section id="profile-applications">
      <div className="profile-applications-title-div">
        <h2 className="profile-applications-title">My Apps</h2>
        <div className="profile-applications-search-filter-add-div">
          <div className="profile-applications-search-div">
            <input className="profile-applications-search" placeholder="Search..." value={searchInput}
              onChange={handleSearchInputChange} onKeyDown={handleSearchKeyDown} />
            <img src={searchIcon} alt="Search" className="profile-applications-search-icon" onClick={handleSearchSubmit} />
          </div>
          <div className="profile-applications-sortby-upload-div">
            <div className="profile-applications-sortby-div">
              <div onClick={() => setSortDropdownOpen((o) => !o)}>
                <img src={sortIcon} alt="Sort" /><span>Sort By: {sortOption}</span>
              </div>
              {sortDropdownOpen && (
                <ul className="sortby-dropdown">
                  {["Popular", "Latest", "A-Z", "Z-A"].map((option) => (
                    <li key={option} className={sortOption === option ? "active" : ""} onClick={() => handleSortChange(option)}>{option}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="profileapplications-header-right-border"></div>
            <div className="profile-applications-drafts-div">
              <Link to="/profile/drafts"><img src={draftIcon} alt="Drafts" /><span>Drafts</span></Link>
            </div>
            <div className="profile-applications-upload-new-div">
              <div className="profile-applications-upload-new-btn" onClick={() => setShowUploadEditModal(true)}>
                <img src={addIcon} alt="Add" /><span>Upload New App</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLoadingApps && <div style={{ padding: "12px 0", opacity: 0.8 }}>Loading your apps…</div>}
      {!isLoadingApps && appsError && <div style={{ padding: "12px 0" }}>{appsError}</div>}

      {hasNoApps && (
        <div className="profileApps-emptyState">
          <div className="profileApps-emptyState-card">
            <div className="profileApps-emptyState-icon" aria-hidden="true">+</div>
            <h3 className="profileApps-emptyState-title">No apps yet</h3>
            <p className="profileApps-emptyState-subtitle">Upload your first app to start building your portfolio.</p>
            <button type="button" className="profileApps-emptyState-cta" onClick={() => setShowUploadEditModal(true)}>
              <img src={addIcon} alt="" />Upload New App
            </button>
          </div>
        </div>
      )}

      {hasAppsButNoResults && (
        <div className="profileApps-emptyState">
          <div className="profileApps-emptyState-card">
            <div className="profileApps-emptyState-icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>
            <h3 className="profileApps-emptyState-title">No results found</h3>
            <p className="profileApps-emptyState-subtitle">
              No apps matched{" "}{searchInput.trim() ? (<>&ldquo;<strong>{searchInput.trim()}</strong>&rdquo;</>) : "your current filters"}.
              Try adjusting your search or sort options.
            </p>
            <button type="button" className="profileApps-emptyState-cta profileApps-emptyState-cta--ghost" onClick={clearSearchAndReload}>Clear search</button>
          </div>
        </div>
      )}

      <div className="profile-applications-grid">
        {visibleApps.map((app) => {
          if (!dropdownRefs.current[app.id]) dropdownRefs.current[app.id] = React.createRef();
          const idStr = String(app.id);
          const canLoadMedia = !!shouldLoadMedia[idStr];
          const hasMedia = !!(app.thumbnailUrl || app.previewUrl);
          const showShimmer = canLoadMedia && hasMedia && !mediaLoadedMap[idStr];

          return (
            <ProfileAppCard key={app.id} ref={(node) => setCardNode(app.id, node)} app={app}
              canLoadMedia={canLoadMedia} showShimmer={showShimmer} expandedDropdownId={expandedDropdownId}
              dropdownRef={dropdownRefs.current[app.id]} isExpanded={!!expandedTechStacks[app.id]}
              onCardClick={(e) => {
                if (e.target.closest("a") || e.target.closest(".profileApp-expand-div") ||
                  e.target.classList.contains("expand-tech") || e.target.classList.contains("profileApp-collapse-tech")) return;
                openDetailModal(app);
              }}
              onExpandDropdown={(e) => { e.stopPropagation(); setExpandedDropdownId((prev) => (prev === app.id ? null : app.id)); }}
              onDetailsClick={(e) => { e.stopPropagation(); setExpandedDropdownId(null); openDetailModal(app); }}
              onEditClick={(e) => { e.stopPropagation(); setSelectedApp(app); setShowUploadEditModal(true); setExpandedDropdownId(null); }}
              onDeleteClick={(e) => { e.stopPropagation(); setAppToDelete(app); setShowDeleteModal(true); setSelectedApp(null); setExpandedDropdownId(null); }}
              onImageLoad={() => markMediaLoaded(app.id)}
              onToggleTech={() => toggleTechStack(app.id)}
            />
          );
        })}
      </div>

      {displayApps.length > 12 && (
        <div className="profile-applications-load-more-div">
          <button className="profile-applications-load-more" onClick={() => setShowAll((s) => !s)}>
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
    </section>
  );
};

export default ProfileApplications;