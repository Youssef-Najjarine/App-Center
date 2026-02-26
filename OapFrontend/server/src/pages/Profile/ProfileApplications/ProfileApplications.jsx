import React, { useState, useEffect, useRef, useMemo, useCallback, forwardRef } from "react";
import { Link } from "react-router-dom";
import ProfileApplicationDetailModal from "@profile/ProfileApplicationDetailModal/ProfileApplicationDetailModal";
import ProfileUploadEditAppModal from "@profile/ProfileUploadEditAppModal/ProfileUploadEditAppModal";
import DeleteConfirmationModal from "@pages/DeleteConfirmationModal/DeleteConfirmationModal";
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
import "./ProfileApplications.css";

// ─── Helpers ───────────────────────────────────────────────────────────────────

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
    technologies: [],   // populated shortly after by the single bulk-tech fetch
    raw: { ...apiItem, createdAt },
  };
};

// ─── Memoised card ─────────────────────────────────────────────────────────────

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
    const showVideoOverlay = app.isVideo && app.previewUrl;
    const showGifOverlay = app.isGif && app.previewUrl;
    const techs = app.technologies || [];
    const visibleTech = isExpanded ? techs : techs.slice(0, TECH_VISIBLE_COUNT);
    const remaining = techs.length - TECH_VISIBLE_COUNT;

    return (
      <div className="profileApp" onClick={onCardClick} ref={ref}>
        <div className={`profileApp-image-div ${showShimmer ? "is-loading-media" : ""}`}>
          {showShimmer && <div className="profileApp-shimmer" />}

          {!canLoadMedia ? (
            <div className="profileApp-placeholder-img skeleton-media" />
          ) : app.thumbnailUrl ? (
            <img
              src={app.thumbnailUrl}
              alt={app.title}
              className="profileApp-placeholder-img"
              loading="lazy"
              decoding="async"
              onLoad={onImageLoad}
              onError={onImageLoad}
            />
          ) : app.previewUrl ? (
            app.isGif ? (
              <img
                src={app.previewUrl}
                alt={app.title}
                className="profileApp-placeholder-img"
                loading="lazy"
                decoding="async"
                onLoad={onImageLoad}
                onError={onImageLoad}
              />
            ) : app.isVideo ? (
              <video
                src={app.previewUrl}
                className="profileApp-placeholder-img"
                muted
                playsInline
                preload="none"
                onLoadedData={onImageLoad}
                onError={onImageLoad}
              />
            ) : (
              <img
                src={app.previewUrl}
                alt={app.title}
                className="profileApp-placeholder-img"
                loading="lazy"
                decoding="async"
                onLoad={onImageLoad}
                onError={onImageLoad}
              />
            )
          ) : (
            <div
              className="profileApp-placeholder-img"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#f2f2f2", color: "#555", fontSize: 14 }}
            >
              No preview
            </div>
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

        <h6 className="profileApp-app-title">{app.title}</h6>
        <p className="profileApp-app-description">{app.description}</p>

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

// ─── Main component ────────────────────────────────────────────────────────────

const ProfileApplications = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalApp, setModalApp] = useState(null);
  const [modalSource, setModalSource] = useState("card");
  const [showAll, setShowAll] = useState(false);
  const [sortOption, setSortOption] = useState("Latest");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [showUploadEditModal, setShowUploadEditModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [appToDelete, setAppToDelete] = useState(null);
  const [expandedDropdownId, setExpandedDropdownId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedTechStacks, setExpandedTechStacks] = useState({});

  // techMap: versionId (string) → string[]
  // Kept separate from `applications` so tech arriving async doesn't re-create
  // the whole apps array — only cards whose tech changed re-render.
  const [techMap, setTechMap] = useState({});

  const [applications, setApplications] = useState([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [appsError, setAppsError] = useState("");

  const [mediaLoadedMap, setMediaLoadedMap] = useState({});
  const [shouldLoadMedia, setShouldLoadMedia] = useState({});

  const dropdownRefs = useRef({});
  const cardNodesRef = useRef({});
  const observerRef = useRef(null);

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

  // ── Fetch ──────────────────────────────────────────────────────────────────
  //
  // Two-phase load for maximum perceived speed:
  //
  //   Phase 1 — cards endpoint: returns INSTANTLY (text + file IDs only, no ZIPs).
  //             Cards appear on screen immediately.
  //
  //   Phase 2 — bulk-tech endpoint: ONE request for ALL version IDs fired right
  //             after cards render. Server handles ZIP reads in parallel and
  //             serves from cache on subsequent visits. Tech tags pop in shortly
  //             after cards are already visible.
  //
  // This is strictly faster than the old approach (N per-card requests) because:
  //   - Phase 1 is unblocked (no ZIP reads at all)
  //   - Phase 2 replaces N serial/parallel HTTP round-trips with 1

  const loadMyApps = useCallback(async () => {
    setIsLoadingApps(true);
    setAppsError("");
    setMediaLoadedMap({});
    setShouldLoadMedia({});
    setTechMap({});
    try {
      // ── Phase 1: cards (instant) ──
      const res = await fetch("/api/user-application/get-all-user-application-cards", {
        method: "GET",
        credentials: "include",
      });
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }

      if (!res.ok) {
        setAppsError("Error – Unable to load your apps.");
        setApplications([]);
        return;
      }
      const items = Array.isArray(data?.applications)
        ? data.applications
        : Array.isArray(data?.Applications)
        ? data.Applications
        : [];

      const normalized = items.map(normalizeCardToUiApp).filter((x) => !!x?.id);
      setApplications(normalized);

      if (normalized.length === 0) return;

      // ── Phase 2: bulk tech (one request, fires after cards are on screen) ──
      // Not awaited here — we let cards render first, then tech pops in.
      const versionIds = normalized
        .map((a) => a.versionId)
        .filter(Boolean);

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
          if (typeof map === "object" && map !== null) {
            setTechMap(map);
          }
        })
        .catch(() => { /* tech tags just won't show — non-fatal */ });

    } catch (e) {
      console.error(e);
      setAppsError("Error – Unable to connect to the server.");
      setApplications([]);
    } finally {
      setIsLoadingApps(false);
    }
  }, []);

  useEffect(() => { loadMyApps(); }, [loadMyApps]);

  // ── Upload close ──
  const handleCloseUploadModal = useCallback(() => {
    setShowUploadEditModal(false);
    setSelectedApp(null);
    setShowAll(false);
    setSortOption("Latest");
    loadMyApps();
  }, [loadMyApps]);

  // ── Delete ──
  const handleConfirmDelete = useCallback(async () => {
    if (!appToDelete) return;
    try {
      const res = await fetch(`/api/user-application/delete-user-application/${appToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) setApplications((prev) => prev.filter((a) => a.id !== appToDelete.id));
    } catch (e) { console.error(e); }
    finally { setShowDeleteModal(false); setAppToDelete(null); }
  }, [appToDelete]);

  // ── Derived lists ──
  const sortedApplications = useMemo(() => {
    const arr = [...(applications || [])];
    if (sortOption === "Latest") {
      arr.sort((a, b) => {
        const ad = a?.raw?.createdAt ? new Date(a.raw.createdAt).getTime() : 0;
        const bd = b?.raw?.createdAt ? new Date(b.raw.createdAt).getTime() : 0;
        return bd - ad;
      });
    } else if (sortOption === "A-Z") {
      arr.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else if (sortOption === "Z-A") {
      arr.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
    }
    return arr;
  }, [applications, sortOption]);

  const filteredApplications = useMemo(() => {
    if (!searchTerm.trim()) return sortedApplications;
    const q = searchTerm.toLowerCase();
    return sortedApplications.filter(
      (a) => {
        const techs = techMap[a.versionId] ?? [];
        return (
          (a.title || "").toLowerCase().includes(q) ||
          (a.description || "").toLowerCase().includes(q) ||
          techs.some((t) => t.toLowerCase().includes(q))
        );
      }
    );
  }, [sortedApplications, searchTerm, techMap]);

  const visibleApps = useMemo(
    () => (showAll ? filteredApplications : filteredApplications.slice(0, 12)),
    [filteredApplications, showAll]
  );

  // ── IntersectionObserver for lazy media ──
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
  }, [visibleApps]);

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

  // ── Render ──
  return (
    <section id="profile-applications">
      <div className="profile-applications-title-div">
        <h2 className="profile-applications-title">My Apps</h2>
        <div className="profile-applications-search-filter-add-div">
          <div className="profile-applications-search-div">
            <input
              className="profile-applications-search"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setShowAll(false); }}
            />
            <img src={searchIcon} alt="Applications Search" className="profile-applications-search-icon" />
          </div>
          <div className="profile-applications-sortby-upload-div">
            <div className="profile-applications-sortby-div">
              <div onClick={() => setSortDropdownOpen(!sortDropdownOpen)}>
                <img src={sortIcon} alt="Sort Icon" />
                <span>Sort By: {sortOption}</span>
              </div>
              {sortDropdownOpen && (
                <ul className="sortby-dropdown">
                  {["Popular", "Latest", "A-Z", "Z-A"].map((option) => (
                    <li
                      key={option}
                      className={sortOption === option ? "active" : ""}
                      onClick={() => { setSortOption(option); setSortDropdownOpen(false); }}
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

      {!isLoadingApps && appsError && <div style={{ padding: "12px 0" }}>{appsError}</div>}
      {isLoadingApps && <div style={{ padding: "12px 0", opacity: 0.8 }}>Loading your apps…</div>}
      {!isLoadingApps && !appsError && sortedApplications.length === 0 && (
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
      {!isLoadingApps && !appsError && sortedApplications.length > 0 && filteredApplications.length === 0 && (
        <div style={{ padding: "12px 0", opacity: 0.7 }}>No apps match your search.</div>
      )}

      <div className="profile-applications-grid">
        {visibleApps.map((app) => {
          if (!dropdownRefs.current[app.id]) dropdownRefs.current[app.id] = React.createRef();

          const canLoadMedia = !!shouldLoadMedia[String(app.id)];
          const hasMedia = !!(app.thumbnailUrl || app.previewUrl);
          const showShimmer = canLoadMedia && hasMedia && !mediaLoadedMap[app.id];

          // Merge tech from the async bulk-tech map into the card.
          // Falls back to [] until tech arrives — no janky re-creates of the whole array.
          const appWithTech = {
            ...app,
            technologies: techMap[app.versionId] ?? [],
          };

          return (
            <ProfileAppCard
              key={app.id}
              ref={(node) => setCardNode(app.id, node)}
              app={appWithTech}
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
                setModalApp(appWithTech);
                setModalSource("card");
                setModalOpen(true);
              }}
              onExpandDropdown={(e) => {
                e.stopPropagation();
                setExpandedDropdownId((prev) => (prev === app.id ? null : app.id));
              }}
              onDetailsClick={(e) => {
                e.stopPropagation();
                setModalApp(appWithTech);
                setModalSource("details");
                setModalOpen(true);
                setExpandedDropdownId(null);
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

      {filteredApplications.length > 12 && (
        <div className="profile-applications-load-more-div">
          <button className="profile-applications-load-more" onClick={() => setShowAll(!showAll)}>
            {showAll ? "Show Less" : "Load More"}
          </button>
        </div>
      )}

      {modalOpen && (
        <ProfileApplicationDetailModal
          modalOpenState={modalOpen}
          onClose={() => { setModalOpen(false); setModalApp(null); }}
          app={modalApp}
          modalSource={modalSource}
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
          onClose={() => { setShowDeleteModal(false); setAppToDelete(null); }}
          app={appToDelete}
          onConfirmDelete={handleConfirmDelete}
        />
      )}
    </section>
  );
};

export default ProfileApplications;