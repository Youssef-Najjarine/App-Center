import React, { useState, useEffect, useRef, useMemo, useCallback, forwardRef } from "react";
import { Link } from "react-router-dom";
import ProfileApplicationDetailModal from "@profile/ProfileApplicationDetailModal/ProfileApplicationDetailModal";
import ProfileUploadEditAppModal from "@profile/ProfileUploadEditAppModal/ProfileUploadEditAppModal";
import DeleteConfirmationModal from "@pages/DeleteConfirmationModal/DeleteConfirmationModal";
import ProcessingModal from "@pages/ProcessingModal/ProcessingModal";
import searchIcon from "@assets/magnifying-glass-icon.svg";
import githubIcon from "@assets/github-icon.png";
import expandIcon from "@assets/three-dots-expand-icon.svg";
import editIcon from "@assets/purple-edit-icon.svg";
import trashIcon from "@assets/red-outline-trash-icon.svg";
import addIcon from "@assets/add-circle-icon.svg";
import sortIcon from "@assets/sort-by-icon.svg";
import playIcon from "@assets/purple-filled-play-icon.svg";
import draftIcon from "@assets/purple-draft-icon.svg";
import noImageUploadedPlaceholder from "@assets/no-image-uploaded.jpg";
import "./ProfileApplicationDrafts.css";

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
  const isVideo = fileCategory === 3 || contentType.startsWith("video/");

  return {
    id, versionId, title: name, description,
    github: repositoryUrl, previewUrl, thumbnailUrl, isVideo,
    isDraft: true,
    technologies: apiItem?.technologies ?? apiItem?.Technologies ?? [],
    raw: { ...apiItem, createdAt },
  };
};

const TECH_VISIBLE_COUNT = 5;

const DraftAppCard = React.memo(
  forwardRef(({ app, canLoadMedia, showShimmer, expandedDropdownId, dropdownRef, isExpanded,
    onCardClick, onExpandDropdown, onEditClick, onDeleteClick, onViewDetailsClick, onImageLoad, onToggleTech }, ref) => {

    const shimmerTimerRef = useRef(null);
    useEffect(() => {
      if (showShimmer) { shimmerTimerRef.current = setTimeout(() => onImageLoad(), 5000); }
      else { if (shimmerTimerRef.current) { clearTimeout(shimmerTimerRef.current); shimmerTimerRef.current = null; } }
      return () => { if (shimmerTimerRef.current) clearTimeout(shimmerTimerRef.current); };
    }, [showShimmer, onImageLoad]);

    const showVideoOverlay = app.isVideo && app.previewUrl;
    const techs = app.technologies || [];
    const visibleTech = isExpanded ? techs : techs.slice(0, TECH_VISIBLE_COUNT);
    const remaining = techs.length - TECH_VISIBLE_COUNT;
    const hasThumbnail = !!app.thumbnailUrl;
    const hasPreview = !!app.previewUrl;

    return (
      <div className="profileDraftApp" onClick={onCardClick} ref={ref}>
        <div className={`profileDraftApp-image-div ${showShimmer ? "is-loading-media" : ""}`}>
          {showShimmer && <div className="profileDraftApp-shimmer" />}

          {!canLoadMedia ? (
            <div className="profileDraftApp-placeholder-img profileDraftApp-media-slot" />
          ) : (hasThumbnail && app.isVideo) ? (
            <img src={app.thumbnailUrl} alt={app.title} className="profileDraftApp-placeholder-img" loading="lazy" decoding="async" onLoad={onImageLoad} onError={onImageLoad} />
          ) : hasPreview ? (
            app.isVideo ? (
              <video src={app.previewUrl} className="profileDraftApp-placeholder-img" muted playsInline preload="metadata" onLoadedMetadata={onImageLoad} onLoadedData={onImageLoad} onError={onImageLoad} />
            ) : (
              <img src={app.previewUrl} alt={app.title} className="profileDraftApp-placeholder-img" loading="lazy" decoding="async" onLoad={onImageLoad} onError={onImageLoad} />
            )
          ) : (
            <img src={noImageUploadedPlaceholder} alt="No media" className="profileDraftApp-placeholder-img" onLoad={onImageLoad} onError={onImageLoad} />
          )}

          {showVideoOverlay && (
            <div className="profileDraftApp-video-overlay">
              <img src={playIcon} alt="Play" className="profileDraftApp-play-icon" />
              <span className="profileDraftApp-video-duration">Video</span>
            </div>
          )}

          <div className="profileDraftApp-expand-div" ref={dropdownRef} onClick={onExpandDropdown}>
            <button type="button"><img src={expandIcon} className="profileDraftApp-expand-icon" alt="More" /></button>
            {expandedDropdownId === app.id && (
              <div className="profileDraftApp-dropdown">
                <div className="profileDraftApp-dropdown-item edit" onClick={onEditClick}><img src={editIcon} alt="Edit" /><span>Edit</span></div>
                <div className="profileDraftApp-dropdown-item delete" onClick={onDeleteClick}><img src={trashIcon} alt="Delete" /><span>Delete</span></div>
              </div>
            )}
          </div>
        </div>

        <div className="profileDraftApp-gitHub-div">
          <div>
            {app.github ? (
              <a href={app.github} target="_blank" rel="noopener noreferrer"><img src={githubIcon} alt="GitHub icon" /></a>
            ) : (
              <img src={githubIcon} alt="GitHub icon" style={{ opacity: 0.35 }} />
            )}
          </div>
          <div className="profileDraftApp-gitHub-anchor-div">
            {app.github ? (
              <a href={app.github} target="_blank" rel="noopener noreferrer">{app.github}</a>
            ) : (
              <span style={{ opacity: 0.6 }}>No repository link</span>
            )}
          </div>
        </div>

        <div className="profileDraftApp-app-header">
          <h6 className="profileDraftApp-app-title">{app.title}</h6>
        </div>
        <div className="profileDraftApp-app-description-div">
            <p className="profileDraftApp-app-description">{app.description}</p>
        </div>

        {techs.length > 0 && (
          <ul className="profileDraftApp-app-tech-stack">
            {visibleTech.map((t, i) => <li key={`${app.id}-tech-${i}`}>{t}</li>)}
            {!isExpanded && remaining > 0 && (
              <li className="expand-tech" onClick={(e) => { e.stopPropagation(); onToggleTech(); }}>+{remaining}</li>
            )}
            {isExpanded && remaining > 0 && (
              <li className="profileDraftApp-collapse-tech" onClick={(e) => { e.stopPropagation(); onToggleTech(); }}>Show less</li>
            )}
          </ul>
        )}

        <button className="profileDraftApp-view-details-button"
          onClick={(e) => { e.stopPropagation(); onViewDetailsClick(); }}>
          <img src={addIcon} alt="Details" /><span>View Details</span>
        </button>
      </div>
    );
  })
);

const ProfileApplicationDrafts = () => {
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  const [displayApps, setDisplayApps] = useState([]);
  const [hasDraftsAtAll, setHasDraftsAtAll] = useState(true);

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
  const sortOptionRef = useRef("Latest");
  const searchInputRef = useRef("");

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

  const loadDrafts = useCallback(async (sort, query) => {
    setIsLoadingApps(true); setAppsError("");
    try {
      const params = new URLSearchParams();
      if (sort && sort !== "Latest") params.set("sort", sort);
      if (query?.trim()) params.set("q", query.trim());
      const qs = params.toString();
      const url = qs
        ? `/api/user-application/search-draft-cards?${qs}`
        : "/api/user-application/search-draft-cards";

      const res = await fetch(url, { method: "GET", credentials: "include" });
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }

      if (!res.ok) { setAppsError("Unable to load your drafts."); setDisplayApps([]); return; }

      const items = Array.isArray(data?.applications) ? data.applications : [];
      const normalized = items.map(normalizeCardToUiApp).filter((x) => !!x?.id);
      setDisplayApps(normalized);

      if (!query?.trim() && (!sort || sort === "Latest")) {
        setHasDraftsAtAll(normalized.length > 0);
      }
    } catch (e) {
      console.error(e); setAppsError("Unable to connect to the server."); setDisplayApps([]);
    } finally { setIsLoadingApps(false); }
  }, []);

  useEffect(() => { loadDrafts("Latest", ""); }, [loadDrafts]);

  const handleSearchInputChange = useCallback((e) => {
    const val = e.target.value;
    setSearchInput(val); searchInputRef.current = val;
    setIsSearchMode(!!val.trim() || sortOptionRef.current !== "Latest");
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setShowAll(false);
      loadDrafts(sortOptionRef.current, val);
    }, 300);
  }, [loadDrafts]);

  const handleSearchSubmit = useCallback(() => {
    clearTimeout(searchDebounceRef.current);
    setShowAll(false);
    setIsSearchMode(!!searchInputRef.current.trim() || sortOptionRef.current !== "Latest");
    loadDrafts(sortOptionRef.current, searchInputRef.current);
  }, [loadDrafts]);

  const handleSearchKeyDown = useCallback((e) => { if (e.key === "Enter") handleSearchSubmit(); }, [handleSearchSubmit]);

  const handleSortChange = useCallback((option) => {
    setSortOption(option); sortOptionRef.current = option; setSortDropdownOpen(false);
    setShowAll(false);
    setIsSearchMode(!!searchInputRef.current.trim() || option !== "Latest");
    loadDrafts(option, searchInputRef.current);
  }, [loadDrafts]);

  const clearSearchAndReload = useCallback(() => {
    setSearchInput(""); searchInputRef.current = "";
    setSortOption("Latest"); sortOptionRef.current = "Latest";
    setIsSearchMode(false); setShowAll(false);
    loadDrafts("Latest", "");
  }, [loadDrafts]);

  const openDetailModal = useCallback(async (app) => {
    setModalApp(app); setModalDetail(null); setModalDetailLoading(true); setModalOpen(true);
    try {
      const res = await fetch(`/api/user-application/get-user-application-details/${app.id}`, { method: "GET", credentials: "include" });
      const text = await res.text();
      let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = null; }
      if (res.ok && data?.application) setModalDetail(data.application);
    } catch (e) { console.error("Failed to load draft details:", e); }
    finally { setModalDetailLoading(false); }
  }, []);

  const closeDetailModal = useCallback(() => {
    setModalOpen(false); setModalApp(null); setModalDetail(null); setModalDetailLoading(false);
  }, []);

  const handleCloseUploadModal = useCallback((returnedCard) => {
    setShowUploadEditModal(false); setSelectedApp(null);

    if (returnedCard && returnedCard.userApplicationId) {
      const cardIsDraft = returnedCard.isDraft ?? returnedCard.IsDraft ?? returnedCard.__isDraft ?? false;
      if (!cardIsDraft && returnedCard.__isUpdate) {
        loadDrafts(sortOptionRef.current, searchInputRef.current);
        return;
      }
      loadDrafts(sortOptionRef.current, searchInputRef.current);
      return;
    }

    if (!returnedCard) return;

    loadDrafts(sortOptionRef.current, searchInputRef.current);
  }, [loadDrafts]);


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
  const hasNoDrafts = !isLoadingApps && !appsError && !hasDraftsAtAll;
  const hasAppsButNoResults = !isLoadingApps && !appsError && hasDraftsAtAll && displayApps.length === 0 && isSearchMode;

  return (
    <section id="profile-application-drafts">
      <div className="profile-application-drafts-title-div">
        <h2 className="profile-application-drafts-title">Drafts ({displayApps.length})</h2>
        <div className="profile-application-drafts-search-filter-add-div">
          <div className="profile-application-drafts-search-div">
            <input className="profile-application-drafts-search" placeholder="Search..." value={searchInput}
              onChange={handleSearchInputChange} onKeyDown={handleSearchKeyDown} />
            <img src={searchIcon} alt="Search" className="profile-application-drafts-search-icon" onClick={handleSearchSubmit} />
          </div>
          <div className="profile-application-drafts-sortby-upload-div">
            <div className="profile-application-drafts-sortby-div">
              <div onClick={() => setSortDropdownOpen((o) => !o)}>
                <img src={sortIcon} alt="Sort" /><span>Sort By: {sortOption}</span>
              </div>
              {sortDropdownOpen && (
                <ul className="draft-sortby-dropdown">
                  {["Latest", "A-Z", "Z-A"].map((option) => (
                    <li key={option} className={sortOption === option ? "active" : ""} onClick={() => handleSortChange(option)}>{option}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="profile-application-drafts-drafts-div">
              <img src={draftIcon} alt="" /><span>Drafts</span>
            </div>
            <div className="profileDrafts-header-right-border"></div>
            <div className="profile-application-drafts-upload-new-div">
              <div className="profile-application-drafts-upload-new-btn" onClick={() => setShowUploadEditModal(true)}>
                <img src={addIcon} alt="Add" /><span>Upload New App</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLoadingApps && <div style={{ padding: "12px 0", opacity: 0.8 }}>Loading your drafts…</div>}
      {!isLoadingApps && appsError && <div style={{ padding: "12px 0" }}>{appsError}</div>}

      {hasNoDrafts && (
        <div className="profileDrafts-emptyState">
          <div className="profileDrafts-emptyState-card">
            <div className="profileDrafts-emptyState-icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <h3 className="profileDrafts-emptyState-title">No drafts yet</h3>
            <p className="profileDrafts-emptyState-subtitle">Save an app as a draft to continue working on it later.</p>
          </div>
        </div>
      )}

      {hasAppsButNoResults && (
        <div className="profileDrafts-emptyState">
          <div className="profileDrafts-emptyState-card">
            <div className="profileDrafts-emptyState-icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>
            <h3 className="profileDrafts-emptyState-title">No results found</h3>
            <p className="profileDrafts-emptyState-subtitle">
              No drafts matched{" "}{searchInput.trim() ? (<>&ldquo;<strong>{searchInput.trim()}</strong>&rdquo;</>) : "your current filters"}. Try adjusting your search.
            </p>
            <button type="button" className="profileDrafts-emptyState-cta" onClick={clearSearchAndReload}>Clear search</button>
          </div>
        </div>
      )}

      <div className="profile-application-drafts-grid">
        {visibleApps.map((app) => {
          if (!dropdownRefs.current[app.id]) dropdownRefs.current[app.id] = React.createRef();
          const idStr = String(app.id);
          const canLoadMedia = !!shouldLoadMedia[idStr];
          const hasMedia = !!(app.thumbnailUrl || app.previewUrl);
          const showShimmer = canLoadMedia && hasMedia && !mediaLoadedMap[idStr];

          return (
            <DraftAppCard key={app.id} ref={(node) => setCardNode(app.id, node)} app={app}
              canLoadMedia={canLoadMedia} showShimmer={showShimmer} expandedDropdownId={expandedDropdownId}
              dropdownRef={dropdownRefs.current[app.id]} isExpanded={!!expandedTechStacks[app.id]}
              onCardClick={(e) => {
                if (e.target.closest("a") || e.target.closest(".profileDraftApp-expand-div") ||
                  e.target.classList.contains("expand-tech") || e.target.classList.contains("profileDraftApp-collapse-tech")) return;
                openDetailModal(app);
              }}
              onExpandDropdown={(e) => { e.stopPropagation(); setExpandedDropdownId((prev) => (prev === app.id ? null : app.id)); }}
              onEditClick={(e) => { e.stopPropagation(); setSelectedApp(app); setShowUploadEditModal(true); setExpandedDropdownId(null); }}
              onDeleteClick={(e) => { e.stopPropagation(); setAppToDelete(app); setShowDeleteModal(true); setExpandedDropdownId(null); }}
              onViewDetailsClick={() => { openDetailModal(app); setExpandedDropdownId(null); }}
              onImageLoad={() => markMediaLoaded(app.id)}
              onToggleTech={() => toggleTechStack(app.id)}
            />
          );
        })}
      </div>

      {displayApps.length > 12 && (
        <div className="profile-application-drafts-load-more-div">
          <button className="profile-application-drafts-load-more" onClick={() => setShowAll((s) => !s)}>
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
        <ProfileUploadEditAppModal modalOpenState={showUploadEditModal} onClose={handleCloseUploadModal}
          selected={selectedApp} context={selectedApp ? "draft" : undefined} />
      )}

      {showDeleteModal && appToDelete && (
        <DeleteConfirmationModal modalOpenState={showDeleteModal}
          onClose={() => { if (isDeleting) return; setShowDeleteModal(false); setAppToDelete(null); }}
          app={appToDelete} onConfirmDelete={handleConfirmDelete} />
      )}
      {isDeleting && <ProcessingModal modalOpenState={isDeleting} message="Deleting draft…" />}
    </section>
  );
};

export default ProfileApplicationDrafts;