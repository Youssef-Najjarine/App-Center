import React, { useEffect, useState, useCallback } from "react";
import "./ProfileApplicationDetailModal.css";
import closeButton from "@assets/x-icon.svg";
import ProfileAppModalCarousel from "./ApplicationModalCarousel/ApplicationModalCarousel";
import githubIcon from "@assets/github-icon.png";
import playIcon from "@assets/purple-filled-play-icon.svg";
import editIcon from "@assets/purple-edit-icon.svg";
import deleteIcon from "@assets/red-outline-trash-icon.svg";
import boostIcon from "@assets/filled-white-boost-icon.svg";
import noImageUploadedPlaceholder from "@assets/no-image-uploaded.jpg";

const FILE_CATEGORY_IMAGE     = 2;
const FILE_CATEGORY_VIDEO     = 3;
const FILE_CATEGORY_THUMBNAIL = 4;

const buildCarouselItems = (files) => {
  if (!Array.isArray(files) || files.length === 0) return [];

  const thumbFile = files.find((f) => f.fileCategory === FILE_CATEGORY_THUMBNAIL);
  const thumbUrl  = thumbFile?.url ?? null;

  return files
    .filter((f) => f.fileCategory === FILE_CATEGORY_IMAGE || f.fileCategory === FILE_CATEGORY_VIDEO)
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((f) => {
      const isVideo = f.fileCategory === FILE_CATEGORY_VIDEO;
      return {
        fileId:     f.fileId,
        type:       isVideo ? "video" : "image",
        src:        isVideo ? (thumbUrl ?? f.url) : f.url,
        videoUrl:   isVideo ? f.url : null,
        orderIndex: f.orderIndex,
      };
    });
};

const ProfileApplicationDetailModal = ({
  modalOpenState,
  onClose,
  app,
  detail,
  detailLoading,
  onEditClick,
  onDeleteClick,
}) => {
  if (!app) return null;

  const [selectedItem, setSelectedItem]     = useState(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const carouselItems = detail ? buildCarouselItems(detail.files ?? []) : [];

  useEffect(() => {
    if (carouselItems.length > 0 && !selectedItem) {
      setSelectedItem(carouselItems[0]);
    }
  }, [carouselItems.length]);

  useEffect(() => {
    setIsVideoPlaying(false);
  }, [selectedItem]);

  useEffect(() => {
    setSelectedItem(null);
    setIsVideoPlaying(false);
  }, [app?.id]);

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [onClose, modalOpenState]);

  const handleItemClick = useCallback((item) => {
    setSelectedItem(item);
    setIsVideoPlaying(false);
  }, []);

  const title        = detail?.name          ?? app.title        ?? "";
  const description  = detail?.description   ?? app.description  ?? "";
  const github       = detail?.repositoryUrl ?? app.github       ?? "";
  const technologies = detail?.technologies  ?? app.technologies ?? [];

  const showLoadingSkeleton = detailLoading;
  const showNoMedia         = !detailLoading && !selectedItem;
  const showVideoPlaying    = !detailLoading && selectedItem?.type === "video" && isVideoPlaying;
  const showVideoThumb      = !detailLoading && selectedItem?.type === "video" && !isVideoPlaying;
  const showImage           = !detailLoading && selectedItem?.type === "image";

  return (
    <div className="profile-app-details-modal-overlay" onClick={onClose}>
      <div className="profile-app-details-modal" onClick={(e) => e.stopPropagation()}>

        <div className="profile-app-details-close-header">
          <h2>{title}</h2>
          <div className="profile-app-details-modal-header-buttons">
            <div className="profile-app-details-modal-edit">
              <button onClick={onEditClick}>
                <img src={editIcon} alt="Edit Icon" />
                <span>Edit</span>
              </button>
            </div>
            <div className="profile-app-details-modal-delete">
              <button onClick={onDeleteClick}>
                <img src={deleteIcon} alt="Delete Icon" />
                <span>Delete</span>
              </button>
            </div>
            <div className="profile-app-details-modal-close">
              <button onClick={onClose}>
                <img src={closeButton} alt="Close Icon" />
              </button>
            </div>
          </div>
        </div>

        <div className="profile-app-details-modal-content">

          <div className="profile-app-details-modal-images-div">
            <div className="profile-app-details-modal-selected-image">

              {showLoadingSkeleton && (
                <div className="profile-app-details-media-skeleton" />
              )}

              {showNoMedia && (
                <img
                  src={noImageUploadedPlaceholder}
                  alt="No media uploaded"
                  className="selected-image"
                />
              )}

              {showVideoPlaying && (
                <video
                  className="selected-video"
                  controls
                  autoPlay
                  preload="none"
                  src={selectedItem.videoUrl}
                />
              )}

              {showVideoThumb && (
                <div
                  className="video-thumbnail-wrapper"
                  onClick={() => setIsVideoPlaying(true)}
                >
                  <img
                    src={selectedItem.src}
                    alt="Video thumbnail"
                    className="selected-image"
                  />
                  <div className="video-overlay">
                    <img src={playIcon} alt="Play" className="play-icon" />
                    <span className="video-duration">Video</span>
                  </div>
                </div>
              )}

              {showImage && (
                <img src={selectedItem.src} alt="Selected" className="selected-image" />
              )}

            </div>

            <ProfileAppModalCarousel
              items={carouselItems}
              selectedItem={selectedItem}
              onItemClick={handleItemClick}
              loading={detailLoading}
            />
          </div>

          {/* ── Right column ── */}
          <div className="profile-app-details-modal-details">

            <div className="profile-app-details-modal-github-section">
              <h3 className="profile-app-details-modal-github-header">GitHub Repo:</h3>
              <div className="profile-app-details-modal-gitHub-div">
                {github ? (
                  <>
                    <a href={github} target="_blank" rel="noopener noreferrer">
                      <img src={githubIcon} alt="GitHub icon" />
                    </a>
                    <div className="profile-app-details-github-anchor-div">
                      <a href={github} target="_blank" rel="noopener noreferrer">{github}</a>
                    </div>
                  </>
                ) : (
                  <>
                    <img src={githubIcon} alt="GitHub icon" style={{ opacity: 0.35 }} />
                    <div className="profile-app-details-github-anchor-div">
                      <span style={{ opacity: 0.6 }}>No repository link</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="profile-app-details-modal-line"></div>

            <div className="profile-app-details-modal-technology-used-div">
              <h3 className="profile-app-details-modal-technology-header">Technology Used</h3>
              {detailLoading ? (
                <div className="profile-app-details-tech-skeleton" />
              ) : technologies.length > 0 ? (
                <ul className="profile-app-details-modal-tech-stack">
                  {technologies.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ opacity: 0.6, fontSize: 14, margin: 0 }}>No technologies listed</p>
              )}
            </div>

            <div className="profile-app-details-modal-line"></div>

            <div className="profile-app-details-modal-description-button-div">
              <div>
                <h3 className="profile-app-details-modal-description-header">Description</h3>
                {detailLoading ? (
                  <div className="profile-app-details-description-skeleton" />
                ) : (
                  <p className="profile-app-details-modal-description-entry">
                    {description || (
                      <span style={{ opacity: 0.6 }}>No description provided</span>
                    )}
                  </p>
                )}
              </div>

              <div className="profile-details-app-details">
                <div className="profile-details-app-impressions">
                  <p className="profile-details-app-impressions-label">Impressions:</p>
                  <p className="profile-details-app-impressions-count">—</p>
                </div>
                <div className="profile-details-app-clicks">
                  <p className="profile-details-app-clicks-label">Clicks:</p>
                  <p className="profile-details-app-clicks-count">—</p>
                </div>
                <div className="profile-details-app-boost-promotion">
                  <button>
                    <img src={boostIcon} alt="Boost Icon" />
                    <span>Boost Promotion</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileApplicationDetailModal;