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
    id,
    versionId,
    title: name,
    description,
    github: repositoryUrl,
    previewUrl,
    thumbnailUrl,
    isVideo,
    isGif,
    technologies: apiItem?.technologies ?? apiItem?.Technologies ?? [],
    raw: { ...apiItem, createdAt },
  };
};

const TECH_VISIBLE_COUNT = 5;

const ProfileAppCard = React.memo(
  forwardRef(({
    app,
    canLoadMedia,
    showShimmer,
    expandedDropdownId,
    dropdownRef,
    isExpanded,
    onCardClick,
    onExpandDropdown,
    onDetailsClick,
    onEditClick,
    onDeleteClick,
    onImageLoad,
    onToggleTech,
  }, ref) => {
    // Safety net: if shimmer persists beyond 5 seconds (browser quirk, video event
    // not firing, cached resource not triggering onLoad, etc.), force-resolve it.
    // This guarantees shimmer can NEVER be infinite regardless of the cause.
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
    const showGifOverlay = app.isGif && app.previewUrl;
    const techs = app.technologies || [];
    const visibleTech = isExpanded ? techs : techs.slice(0, TECH_VISIBLE_COUNT);
    const remaining = techs.length - TECH_VISIBLE_COUNT;

    const hasThumbnail = !!app.thumbnailUrl;
    const hasPreview   = !!app.previewUrl;

    return (
      <div className="profileApp" onClick={onCardClick} ref={ref}>
        <div className={`profileApp-image-div ${showShimmer ? "is-loading-media" : ""}`}>
          {showShimmer && <div className="profileApp-shimmer" />}

          {!canLoadMedia ? (
            <div className="profileApp-preview-img profileApp-media-slot" />
          ) : (hasThumbnail && app.isVideo) ? (
            <img
              src={app.thumbnailUrl}
              alt={app.title}
              className="profileApp-preview-img"
              loading="lazy"
              decoding="async"
              onLoad={onImageLoad}
              onError={onImageLoad}
            />
          ) : hasPreview ? (
            app.isGif ? (
              <img
                src={app.previewUrl}
                alt={app.title}
                className="profileApp-preview-img"
                loading="lazy"
                decoding="async"
                onLoad={onImageLoad}
                onError={onImageLoad}
              />
            ) : app.isVideo ? (
              <video
                src={app.previewUrl}
                className="profileApp-preview-img"
                muted
                playsInline
                preload="metadata"
                onLoadedMetadata={onImageLoad}
                onLoadedData={onImageLoad}
                onError={onImageLoad}
              />
            ) : (
              <img
                src={app.previewUrl}
                alt={app.title}
                className="profileApp-preview-img"
                loading="lazy"
                decoding="async"
                onLoad={onImageLoad}
                onError={onImageLoad}
              />
            )
          ) : (
            <img
              src={noImageUploadedPlaceholder}
              alt="No media uploaded"
              className="profileApp-preview-img"
              onLoad={onImageLoad}
              onError={onImageLoad}
            />
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
            <button type="button">
              <img src={expandIcon} className="profileApp-expand-icon" alt="More" />
            </button>
            {expandedDropdownId === app.id && (
              <div className="profileApp-dropdown">
                <div className="profileApp-dropdown-item details" onClick={onDetailsClick}>
                  <img src={detailsIcon} alt="Details" /><span>Details</span>
                </div>
                <div className="profileApp-dropdown-item edit" onClick={onEditClick}>
                  <img src={editIcon} alt="Edit" /><span>Edit</span>
                </div>
                <div className="profileApp-dropdown-item delete" onClick={onDeleteClick}>
                  <img src={trashIcon} alt="Delete" /><span>Delete</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="profileApp-gitHub-div">
          <div>
            {app.github ? (
              <a href={app.github} target="_blank" rel="noopener noreferrer">
                <img src={githubIcon} alt="GitHub icon" />
              </a>
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
            {visibleTech.map((techItem, index) => (
              <li key={`${app.id}-tech-${index}`}>{techItem}</li>
            ))}
            {!isExpanded && remaining > 0 && (
              <li
                className="expand-tech"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTech();
                }}
              >
                +{remaining}
              </li>
            )}
            {isExpanded && remaining > 0 && (
              <li
                className="profileApp-collapse-tech"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTech();
                }}
              >
                Show less
              </li>
            )}
          </ul>
        )}
      </div>
    );
  })
);

const ProfileApplications = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalApp, setModalApp] = useState(null);
  const [modalDetail, setModalDetail] = useState(null);
  const [modalDetailLoading, setModalDetailLoading] = useState(false);

  const [showAll, setShowAll] = useState(false);
  const [sortOption, setSortOption] = useState("Latest");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [showUploadEditModal, setShowUploadEditModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [appToDelete, setAppToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedDropdownId, setExpandedDropdownId] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [expandedTechStacks, setExpandedTechStacks] = useState({});

  const [allApps, setAllApps] = useState([]);
  const [techMap, setTechMap] = useState({});
  const [popularityMap, setPopularityMap] = useState({});
  const [displayApps, setDisplayApps] = useState([]);

  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [appsError, setAppsError] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);

  const [mediaLoadedMap, setMediaLoadedMap] = useState({});
  const [shouldLoadMedia, setShouldLoadMedia] = useState({});

  const dropdownRefs = useRef({});
  const cardNodesRef = useRef({});
  const observerRef = useRef(null);
  const searchDebounceRef = useRef(null);

  const allAppsRef = useRef([]);
  const techMapRef = useRef({});
  const popularityMapRef = useRef({});
  const sortOptionRef = useRef("Latest");
  const searchInputRef = useRef("");

  useEffect(() => { allAppsRef.current = allApps; }, [allApps]);
  useEffect(() => { techMapRef.current = techMap; }, [techMap]);
  useEffect(() => { popularityMapRef.current = popularityMap; }, [popularityMap]);
  useEffect(() => { sortOptionRef.current = sortOption; }, [sortOption]);
  useEffect(() => { searchInputRef.current = searchInput; }, [searchInput]);

  useEffect(() => {
    const handler = (e) => {
      if (
        expandedDropdownId &&
        dropdownRefs.current[expandedDropdownId]?.current &&
        !dropdownRefs.current[expandedDropdownId].current.contains(e.target)
      ) setExpandedDropdownId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expandedDropdownId]);

  const markMediaLoaded = useCallback((appId) => {
    setMediaLoadedMap((prev) => prev[appId] ? prev : { ...prev, [appId]: true });
  }, []);
  const handleImageLoad = useCallback((appId) => markMediaLoaded(appId), [markMediaLoaded]);
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
    if (node) {
      cardNodesRef.current[appId] = node;
      node.dataset.appid = String(appId);
      observerRef.current?.observe(node);
    } else {
      delete cardNodesRef.current[appId];
    }
  }, []);

  const openDetailModal = useCallback(async (app) => {
    setModalApp(app);
    setModalDetail(null);
    setModalDetailLoading(true);
    setModalOpen(true);

    try {
      const res = await fetch(`/api/user-application/get-user-application-details/${app.id}`, {
        method: "GET",
        credentials: "include",
      });
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }
      if (res.ok && data?.application) {
        setModalDetail(data.application);
      }
    } catch (e) {
      console.error("Failed to load app details:", e);
    } finally {
      setModalDetailLoading(false);
    }
  }, []);

  const closeDetailModal = useCallback(() => {
    setModalOpen(false);
    setModalApp(null);
    setModalDetail(null);
    setModalDetailLoading(false);
  }, []);

  const applyFilterSort = useCallback((apps, techMapSnap, query, sort) => {
    let arr = apps;
    const q = query.trim().toLowerCase();
    if (q) {
      arr = arr.filter((a) => {
        const techs = techMapSnap[a.versionId?.toString()] ?? a.technologies ?? [];
        return (
          (a.title || "").toLowerCase().includes(q) ||
          (a.description || "").toLowerCase().includes(q) ||
          (a.github || "").toLowerCase().includes(q) ||
          techs.some((t) => t.toLowerCase().includes(q))
        );
      });
    }
    const sorted = q ? arr : [...arr];
    if (sort === "Popular") {
      const popMap = popularityMapRef.current;
      sorted.sort((a, b) => {
        const aP = popMap[String(a.id)];
        const bP = popMap[String(b.id)];
        const aScore = (aP?.impressions ?? 0) + (aP?.clicks ?? 0);
        const bScore = (bP?.impressions ?? 0) + (bP?.clicks ?? 0);
        if (bScore !== aScore) return bScore - aScore;
        const ad = a?.raw?.createdAt ? new Date(a.raw.createdAt).getTime() : 0;
        const bd = b?.raw?.createdAt ? new Date(b.raw.createdAt).getTime() : 0;
        return bd - ad;
      });
    } else if (sort === "A-Z") {
      sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else if (sort === "Z-A") {
      sorted.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
    } else {
      sorted.sort((a, b) => {
        const ad = a?.raw?.createdAt ? new Date(a.raw.createdAt).getTime() : 0;
        const bd = b?.raw?.createdAt ? new Date(b.raw.createdAt).getTime() : 0;
        return bd - ad;
      });
    }
    return sorted;
  }, []);

  const triggerFilterSort = useCallback((query, sort) => {
    const isDefault = !query.trim() && sort === "Latest";
    if (isDefault) {
      setIsSearchMode(false);
      setIsSearching(false);
      const sorted = applyFilterSort(allAppsRef.current, techMapRef.current, "", "Latest");
      setDisplayApps(sorted);
      setShowAll(false);
      return;
    }
    setIsSearchMode(true);
    setIsSearching(true);
    setShowAll(false);
    setTimeout(() => {
      const result = applyFilterSort(allAppsRef.current, techMapRef.current, query, sort);
      setDisplayApps(result);
      setIsSearching(false);
    }, 0);
  }, [applyFilterSort]);

  const handleSearchInputChange = useCallback((e) => {
    const val = e.target.value;
    setSearchInput(val);
    searchInputRef.current = val;
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      triggerFilterSort(val, sortOptionRef.current);
    }, 300);
  }, [triggerFilterSort]);

  const handleSearchSubmit = useCallback(() => {
    clearTimeout(searchDebounceRef.current);
    triggerFilterSort(searchInputRef.current, sortOptionRef.current);
  }, [triggerFilterSort]);

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === "Enter") handleSearchSubmit();
  }, [handleSearchSubmit]);

  const handleSortChange = useCallback((option) => {
    setSortOption(option);
    sortOptionRef.current = option;
    setSortDropdownOpen(false);
    triggerFilterSort(searchInputRef.current, option);
  }, [triggerFilterSort]);

  const clearSearchState = useCallback(() => {
    clearTimeout(searchDebounceRef.current);
    setSearchInput("");
    searchInputRef.current = "";
    setSortOption("Latest");
    sortOptionRef.current = "Latest";
    setIsSearchMode(false);
    setIsSearching(false);
    setShowAll(false);
  }, []);

  const loadMyApps = useCallback(async () => {
    setIsLoadingApps(true);
    setAppsError("");
    clearSearchState();

    try {
      const res = await fetch("/api/user-application/get-all-user-application-cards", {
        method: "GET",
        credentials: "include",
      });
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }

      if (!res.ok) {
        setAppsError("Error – Unable to load your apps.");
        setAllApps([]);
        setDisplayApps([]);
        return;
      }

      const items = Array.isArray(data?.applications)
        ? data.applications
        : Array.isArray(data?.Applications)
        ? data.Applications
        : [];

      const normalized = items.map(normalizeCardToUiApp).filter((x) => !!x?.id);
      setAllApps(normalized);
      allAppsRef.current = normalized;
      setDisplayApps(normalized);

      if (normalized.length === 0) return;

      const versionIds = normalized.map((a) => a.versionId).filter(Boolean);
      fetch("/api/user-application/get-bulk-technologies", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionIds }),
      })
        .then((r) => r.text())
        .then((t) => {
          let td = null;
          try { td = t ? JSON.parse(t) : null; } catch { return; }
          const map = td?.technologies ?? td?.Technologies ?? {};
          if (typeof map !== "object" || map === null) return;

          setTechMap(map);
          techMapRef.current = map;

          const merged = allAppsRef.current.map((app) => {
            const techs = map[app.versionId?.toString()];
            return techs ? { ...app, technologies: techs } : app;
          });
          setAllApps(merged);
          allAppsRef.current = merged;

          const q = searchInputRef.current;
          const sort = sortOptionRef.current;
          if (q.trim() || sort !== "Latest") {
            const filtered = applyFilterSort(merged, map, q, sort);
            setDisplayApps(filtered);
          } else {
            setDisplayApps(merged);
          }
        })
        .catch(() => { });

      // Fetch popularity data in background (for Sort by Popular)
      const appIds = normalized.map((a) => a.id).filter(Boolean);
      fetch("/api/analytics/bulk-popularity", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appIds }),
      })
        .then((r) => r.json())
        .then((data) => {
          const totals = data?.totals;
          if (typeof totals !== "object" || totals === null) return;
          setPopularityMap(totals);
          popularityMapRef.current = totals;
        })
        .catch(() => { });

    } catch (e) {
      console.error(e);
      setAppsError("Error – Unable to connect to the server.");
      setAllApps([]);
      setDisplayApps([]);
    } finally {
      setIsLoadingApps(false);
    }
  }, [applyFilterSort, clearSearchState]);

  useEffect(() => { loadMyApps(); }, [loadMyApps]);

  const handleCloseUploadModal = useCallback((returnedCard) => {
    setShowUploadEditModal(false);
    setSelectedApp(null);

    if (returnedCard && returnedCard.userApplicationId) {
      // If the user saved as draft (including draft copy from published app),
      // don't add it to the published apps list — it belongs on the Drafts page.
      if (returnedCard.__isDraft) return;

      const normalized = normalizeCardToUiApp(returnedCard);

      if (!normalized?.id) {
        loadMyApps();
        return;
      }

      const isUpdate = !!returnedCard.__isUpdate;

      if (isUpdate) {
        // ── UPDATE: replace the existing card in-place ──────────────────
        const oldCard = allAppsRef.current.find((a) => a.id === normalized.id);

        const updatedAll = allAppsRef.current.map((a) =>
          a.id === normalized.id ? normalized : a
        );
        setAllApps(updatedAll);
        allAppsRef.current = updatedAll;

        // Always update tech map for the edited version (handles additions AND removals)
        if (normalized.versionId) {
          const techs = Array.isArray(normalized.technologies) ? normalized.technologies : [];
          const updatedMap = { ...techMapRef.current, [normalized.versionId.toString()]: techs };
          setTechMap(updatedMap);
          techMapRef.current = updatedMap;
        }

        // Re-apply current filter/sort
        const q = searchInputRef.current;
        const sort = sortOptionRef.current;
        const sorted = applyFilterSort(updatedAll, techMapRef.current, q, sort);
        setDisplayApps(sorted);

        // Only invalidate media cache if the presentation actually changed.
        // Covers: URL changed, type switched (image↔video), or media removed/added.
        // If nothing changed (e.g. only text/tech edited), skip invalidation —
        // the browser cache already has the image and won't re-fire onLoad.
        const idStr = String(normalized.id);
        const mediaChanged =
          normalized.previewUrl !== (oldCard?.previewUrl ?? "") ||
          normalized.thumbnailUrl !== (oldCard?.thumbnailUrl ?? "") ||
          normalized.isVideo !== (oldCard?.isVideo ?? false);

        if (mediaChanged) {
          setMediaLoadedMap((prev) => {
            const next = { ...prev };
            delete next[idStr];
            return next;
          });
          setShouldLoadMedia((prev) => ({ ...prev, [idStr]: true }));
        }
      } else {
        // ── CREATE: prepend the new card ─────────────────────────────────
        const updated = [normalized, ...allAppsRef.current];
        setAllApps(updated);
        allAppsRef.current = updated;

        if (normalized.versionId && Array.isArray(normalized.technologies) && normalized.technologies.length > 0) {
          const updatedMap = { ...techMapRef.current, [normalized.versionId.toString()]: normalized.technologies };
          setTechMap(updatedMap);
          techMapRef.current = updatedMap;
        }

        clearSearchState();
        const sorted = applyFilterSort(updated, techMapRef.current, "", "Latest");
        setDisplayApps(sorted);
        setShouldLoadMedia((prev) => ({ ...prev, [String(normalized.id)]: true }));
      }

      return;
    }

    loadMyApps();
  }, [applyFilterSort, clearSearchState, loadMyApps]);

  const handleConfirmDelete = useCallback(async () => {
    if (!appToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/user-application/delete-user-application/${appToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        const deleteId = appToDelete.id;
        const updated = allAppsRef.current.filter((a) => a.id !== deleteId);
        setAllApps(updated);
        allAppsRef.current = updated;
        setDisplayApps((prev) => prev.filter((a) => a.id !== deleteId));
        closeDetailModal();
      }
    } catch (e) { console.error(e); }
    finally { setIsDeleting(false); setShowDeleteModal(false); setAppToDelete(null); }
  }, [appToDelete, closeDetailModal]);

  const visibleApps = useMemo(
    () => (showAll ? displayApps : displayApps.slice(0, 12)),
    [displayApps, showAll]
  );

  const hasNoAppsAtAll = !isLoadingApps && !appsError && allApps.length === 0;
  const hasAppsButNoResults =
    !isLoadingApps && !isSearching && !appsError &&
    allApps.length > 0 && displayApps.length === 0 && isSearchMode;

  return (
    <section id="profile-applications">
      {isSearching && (
        <ProcessingModal
          modalOpenState={isSearching}
          message="Searching your apps…"
        />
      )}

      <div className="profile-applications-title-div">
        <h2 className="profile-applications-title">My Apps</h2>
        <div className="profile-applications-search-filter-add-div">
          <div className="profile-applications-search-div">
            <input
              className="profile-applications-search"
              placeholder="Search..."
              value={searchInput}
              onChange={handleSearchInputChange}
              onKeyDown={handleSearchKeyDown}
            />
            <img
              src={searchIcon}
              alt="Search"
              className="profile-applications-search-icon"
              onClick={handleSearchSubmit}
            />
          </div>
          <div className="profile-applications-sortby-upload-div">
            <div className="profile-applications-sortby-div">
              <div onClick={() => setSortDropdownOpen((o) => !o)}>
                <img src={sortIcon} alt="Sort Icon" />
                <span>Sort By: {sortOption}</span>
              </div>
              {sortDropdownOpen && (
                <ul className="sortby-dropdown">
                  {["Popular", "Latest", "A-Z", "Z-A"].map((option) => (
                    <li
                      key={option}
                      className={sortOption === option ? "active" : ""}
                      onClick={() => handleSortChange(option)}
                    >
                      {option}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="profileapplications-header-right-border"></div>
            <div className="profile-applications-drafts-div">
              <Link to="/profile/drafts">
                <img src={draftIcon} alt="Drafts" />
                <span>Drafts</span>
              </Link>
            </div>
            <div className="profile-applications-upload-new-div">
              <div className="profile-applications-upload-new-btn" onClick={() => setShowUploadEditModal(true)}>
                <img src={addIcon} alt="Add App" />
                <span>Upload New App</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!isLoadingApps && !isSearching && appsError && (
        <div style={{ padding: "12px 0" }}>{appsError}</div>
      )}
      {isLoadingApps && (
        <div style={{ padding: "12px 0", opacity: 0.8 }}>Loading your apps…</div>
      )}

      {hasNoAppsAtAll && (
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
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>
            <h3 className="profileApps-emptyState-title">No results found</h3>
            <p className="profileApps-emptyState-subtitle">
              No apps matched{" "}
              {searchInput.trim() ? (
                <>&ldquo;<strong>{searchInput.trim()}</strong>&rdquo;</>
              ) : (
                "your current filters"
              )}
              . Try adjusting your search or sort options.
            </p>
            <button
              type="button"
              className="profileApps-emptyState-cta profileApps-emptyState-cta--ghost"
              onClick={() => {
                clearSearchState();
                const sorted = applyFilterSort(allAppsRef.current, techMapRef.current, "", "Latest");
                setDisplayApps(sorted);
              }}
            >
              Clear search
            </button>
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
            <ProfileAppCard
              key={app.id}
              ref={(node) => setCardNode(app.id, node)}
              app={app}
              canLoadMedia={canLoadMedia}
              showShimmer={showShimmer}
              expandedDropdownId={expandedDropdownId}
              dropdownRef={dropdownRefs.current[app.id]}
              isExpanded={!!expandedTechStacks[app.id]}
              onCardClick={(e) => {
                if (
                  e.target.closest("a") ||
                  e.target.closest(".profileApp-expand-div") ||
                  e.target.classList.contains("expand-tech") ||
                  e.target.classList.contains("profileApp-collapse-tech")
                ) return;
                openDetailModal(app);
              }}
              onExpandDropdown={(e) => {
                e.stopPropagation();
                setExpandedDropdownId((prev) => (prev === app.id ? null : app.id));
              }}
              onDetailsClick={(e) => {
                e.stopPropagation();
                setExpandedDropdownId(null);
                openDetailModal(app);
              }}
              onEditClick={(e) => {
                e.stopPropagation();
                setSelectedApp(app);
                setShowUploadEditModal(true);
                setExpandedDropdownId(null);
              }}
              onDeleteClick={(e) => {
                e.stopPropagation();
                setAppToDelete(app);
                setShowDeleteModal(true);
                setSelectedApp(null);
                setExpandedDropdownId(null);
              }}
              onImageLoad={() => handleImageLoad(app.id)}
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
        <ProfileApplicationDetailModal
          modalOpenState={modalOpen}
          onClose={() => {
            if (showDeleteModal) return;
            closeDetailModal();
          }}
          app={modalApp}
          detail={modalDetail}
          detailLoading={modalDetailLoading}
          onEditClick={() => {
            closeDetailModal();
            setSelectedApp(modalApp);
            setShowUploadEditModal(true);
          }}
          onDeleteClick={() => {
            setAppToDelete(modalApp);
            setShowDeleteModal(true);
          }}
        />
      )}
      {showUploadEditModal && (
        <ProfileUploadEditAppModal
          modalOpenState={showUploadEditModal}
          onClose={handleCloseUploadModal}
          selected={selectedApp}
        />
      )}
      {showDeleteModal && appToDelete && (
        <DeleteConfirmationModal
          modalOpenState={showDeleteModal}
          onClose={() => { if (isDeleting) return; setShowDeleteModal(false); setAppToDelete(null); }}
          app={appToDelete}
          onConfirmDelete={handleConfirmDelete}
        />
      )}
      {isDeleting && (
        <ProcessingModal
          modalOpenState={isDeleting}
          message="Deleting app…"
        />
      )}
    </section>
  );
};

export default ProfileApplications;