import React, { useEffect, useState, useCallback } from "react";
import "./ApplicationDetailModal.css";
import closeButton from "@assets/x-icon.svg";
import AppHomeModalCarousel from "./ApplicationModalCarousel/ApplicationModalCarousel";
import githubIcon from "@assets/github-icon.png";
import playIcon from "@assets/purple-filled-play-icon.svg";
import purchaseApplicationIcon from "@assets/purchase-application-icon.svg";
import noImageUploadedPlaceholder from "@assets/no-image-uploaded.jpg";

const FILE_CATEGORY_IMAGE = 2;
const FILE_CATEGORY_VIDEO = 3;
const FILE_CATEGORY_THUMBNAIL = 4;

const buildCarouselItems = (files) => {
  if (!Array.isArray(files) || files.length === 0) return [];

  const thumbFile = files.find((f) => f.fileCategory === FILE_CATEGORY_THUMBNAIL);
  const thumbUrl = thumbFile?.url ?? null;

  return files
    .filter((f) => f.fileCategory === FILE_CATEGORY_IMAGE || f.fileCategory === FILE_CATEGORY_VIDEO)
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((f) => {
      const isVideo = f.fileCategory === FILE_CATEGORY_VIDEO;
      return {
        fileId: f.fileId,
        type: isVideo ? "video" : "image",
        src: isVideo ? (thumbUrl ?? f.url) : f.url,
        videoUrl: isVideo ? f.url : null,
        orderIndex: f.orderIndex,
      };
    });
};

const formatPrice = (price) => {
  if (price == null) return "Free";
  const num = Number(price);
  if (num === 0) return "Free";
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const ApplicationDetailModal = ({
  modalOpenState,
  onClose,
  app,
  detail,
  detailLoading,
  currentUserId,
}) => {
  if (!app) return null;

  const [selectedItem, setSelectedItem] = useState(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const carouselItems = detail ? buildCarouselItems(detail.files ?? []) : [];

  useEffect(() => {
    if (carouselItems.length > 0 && !selectedItem) {
      setSelectedItem(carouselItems[0]);
    }
  }, [carouselItems.length]);

  useEffect(() => { setIsVideoPlaying(false); }, [selectedItem]);

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

  const title = detail?.name ?? app.title ?? "";
  const description = detail?.description ?? app.description ?? "";
  const github = detail?.repositoryUrl ?? app.github ?? "";
  const technologies = detail?.technologies ?? app.technologies ?? [];
  const price = detail?.price ?? app.price ?? null;
  const ownerUserId = detail?.ownerUserId ?? app.ownerUserId ?? null;
  const isOwnApp = currentUserId && ownerUserId && currentUserId === ownerUserId;

  const showLoadingSkeleton = detailLoading;
  const showNoMedia = !detailLoading && !selectedItem;
  const showVideoPlaying = !detailLoading && selectedItem?.type === "video" && isVideoPlaying;
  const showVideoThumb = !detailLoading && selectedItem?.type === "video" && !isVideoPlaying;
  const showImage = !detailLoading && selectedItem?.type === "image";

  return (
    <div className="appHome-modal-overlay" onClick={onClose}>
      <div className="appHome-modal" onClick={(e) => e.stopPropagation()}>
        <div className="appHome-close-header">
          <h2>{title}</h2>
          <button className="appHome-modal-close" onClick={onClose}>
            <img src={closeButton} alt="Close Icon" />
          </button>
        </div>

        <div className="appHome-modal-content">
          <div className="appHome-modal-images-div">
            <div className="appHome-modal-selected-image">
              {showLoadingSkeleton && (
                <div className="appHome-media-skeleton" />
              )}

              {showNoMedia && (
                <img src={noImageUploadedPlaceholder} alt="No media uploaded" className="selected-image" />
              )}

              {showVideoPlaying && (
                <video className="selected-video" controls autoPlay preload="none" src={selectedItem.videoUrl} />
              )}

              {showVideoThumb && (
                <div className="video-thumbnail-wrapper" onClick={() => setIsVideoPlaying(true)}>
                  <img src={selectedItem.src} alt="Video thumbnail" className="selected-image" />
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

            <AppHomeModalCarousel
              items={carouselItems}
              selectedItem={selectedItem}
              onItemClick={handleItemClick}
              loading={detailLoading}
            />
          </div>

          <div className="appHome-modal-details">
            <div className="appHome-modal-github-section">
              <h3 className="appHome-modal-github-header">GitHub Repo:</h3>
              <div className="homeApp-modal-gitHub-div">
                {github ? (
                  <>
                    <a href={github} target="_blank" rel="noopener noreferrer">
                      <img src={githubIcon} alt="GitHub icon" />
                    </a>
                    <div className="appHome-modal-github-anchor-div">
                      <a href={github} target="_blank" rel="noopener noreferrer">{github}</a>
                    </div>
                  </>
                ) : (
                  <>
                    <img src={githubIcon} alt="GitHub icon" style={{ opacity: 0.35 }} />
                    <div className="appHome-modal-github-anchor-div">
                      <span style={{ opacity: 0.6 }}>No repository link</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="appHome-modal-line"></div>

            <div className="appHome-modal-technology-used-div">
              <h3 className="appHome-modal-technology-header">Technology Used</h3>
              {detailLoading ? (
                <div className="appHome-tech-skeleton" />
              ) : technologies.length > 0 ? (
                <ul className="homeApp-modal-tech-stack">
                  {technologies.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ opacity: 0.6, fontSize: 14, margin: 0 }}>No technologies listed</p>
              )}
            </div>

            <div className="appHome-modal-line"></div>

            <div className="appHome-modal-description-button-div">
              <div>
                <h3 className="appHome-modal-description-header">Description</h3>
                {detailLoading ? (
                  <div className="appHome-description-skeleton" />
                ) : (
                  <p className="appHome-modal-description-entry">
                    {description || (
                      <span style={{ opacity: 0.6 }}>No description provided</span>
                    )}
                  </p>
                )}
              </div>
              <div className="appHome-modal-purchase-app-div">
                {isOwnApp ? (
                  <button disabled className="appHome-purchase-disabled">
                    Your App
                  </button>
                ) : (
                  <button>
                    <img src={purchaseApplicationIcon} alt="" />
                    Purchase the Application - {formatPrice(price)}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetailModal;