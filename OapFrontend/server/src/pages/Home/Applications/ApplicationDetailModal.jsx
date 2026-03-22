import React, { useEffect, useState, useCallback } from "react";
import "./ApplicationDetailModal.css";
import closeButton from "@assets/x-icon.svg";
import AppHomeModalCarousel from "./ApplicationModalCarousel/ApplicationModalCarousel";
import githubIcon from "@assets/github-icon.png";
import playIcon from "@assets/purple-filled-play-icon.svg";
import purchaseApplicationIcon from "@assets/purchase-application-icon.svg";
import noImageUploadedPlaceholder from "@assets/no-image-uploaded.jpg";
import ConfirmationModal from "@pages/ConfirmationModal/ConfirmationModal";
import ProcessingModal from "@pages/ProcessingModal/ProcessingModal";

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
  alreadyPurchased: initialAlreadyPurchased = false,
  hidePurchaseButton = false,
}) => {
  if (!app) return null;

  const [selectedItem, setSelectedItem] = useState(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Purchase state
  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [alreadyPurchased, setAlreadyPurchased] = useState(initialAlreadyPurchased);

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
    setPurchaseSuccess(false);
    setPurchaseError("");
    setAlreadyPurchased(initialAlreadyPurchased);
  }, [app?.id]);

  useEffect(() => {
    if (!app?.id || !currentUserId) return;
    let cancelled = false;
    fetch(`/api/transaction/check-status/${app.id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.alreadyPurchased) setAlreadyPurchased(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [app?.id, currentUserId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showPurchaseConfirm) return;
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [onClose, modalOpenState, showPurchaseConfirm]);

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

  const handlePurchaseClick = () => {
    setPurchaseError("");
    setShowPurchaseConfirm(true);
  };

  const handleConfirmPurchase = async () => {
    setShowPurchaseConfirm(false);
    setIsPurchasing(true);
    setPurchaseError("");

    try {
      const res = await fetch("/api/transaction/purchase", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userApplicationId: app.id }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setPurchaseError(data?.error || "Purchase failed. Please try again.");
        return;
      }

      setPurchaseSuccess(true);
      setAlreadyPurchased(true);

      try {
        const dlRes = await fetch(`/api/transaction/download/${app.id}`, { credentials: "include" });
        if (dlRes.ok) {
          const blob = await dlRes.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          const disposition = dlRes.headers.get("content-disposition");
          const match = disposition?.match(/filename="?(.+?)"?$/);
          a.download = match?.[1] || `${title || "application"}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } catch {}
    } catch {
      setPurchaseError("Unable to connect to the server.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const renderPurchaseButton = () => {
    if (isOwnApp) {
      return (
        <button
          disabled
          aria-disabled="true"
          tabIndex={-1}
          className="appHome-purchase-disabled"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <img src={purchaseApplicationIcon} alt="" />
          Purchase the Application - {formatPrice(price)}
        </button>
      );
    }

    if (purchaseSuccess || alreadyPurchased) {
      return (
        <button disabled className="appHome-purchase-success">
          Purchased
        </button>
      );
    }

    return (
      <button onClick={handlePurchaseClick}>
        <img src={purchaseApplicationIcon} alt="" />
        Purchase the Application - {formatPrice(price)}
      </button>
    );
  };

  return (
    <div className="appHome-modal-overlay" onClick={() => { if (showPurchaseConfirm) return; onClose(); }}>
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
              {showLoadingSkeleton && <div className="appHome-media-skeleton" />}
              {showNoMedia && <img src={noImageUploadedPlaceholder} alt="No media uploaded" className="selected-image" />}
              {showVideoPlaying && <video className="selected-video" controls autoPlay preload="none" src={selectedItem.videoUrl} />}
              {showVideoThumb && (
                <div className="video-thumbnail-wrapper" onClick={() => setIsVideoPlaying(true)}>
                  <img src={selectedItem.src} alt="Video thumbnail" className="selected-image" />
                  <div className="video-overlay">
                    <img src={playIcon} alt="Play" className="play-icon" />
                    <span className="video-duration">Video</span>
                  </div>
                </div>
              )}
              {showImage && <img src={selectedItem.src} alt="Selected" className="selected-image" />}
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
              <h3 className="appHome-modal-github-header">Repository:</h3>
              <div className="homeApp-modal-gitHub-div">
                {github ? (
                  <>
                    <a href={github} target="_blank" rel="noopener noreferrer"><img src={githubIcon} alt="GitHub icon" /></a>
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
                  {technologies.map((item, index) => <li key={index}>{item}</li>)}
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
                    {description || <span style={{ opacity: 0.6 }}>No description provided</span>}
                  </p>
                )}
              </div>

              {!hidePurchaseButton && (
                <div className="appHome-modal-purchase-app-div">
                  {renderPurchaseButton()}
                  {purchaseError && (
                    <p style={{ color: "#d32f2f", fontSize: 13, margin: "8px 0 0 0", textAlign: "center" }}>
                      {purchaseError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showPurchaseConfirm && (
        <ConfirmationModal
          modalOpenState={showPurchaseConfirm}
          onClose={() => setShowPurchaseConfirm(false)}
          onConfirm={handleConfirmPurchase}
          title={`Purchase "${title}"?`}
          subtitle={`You are about to purchase this application for ${formatPrice(price)}. This action will be recorded as a transaction.`}
        />
      )}

      {isPurchasing && <ProcessingModal modalOpenState={isPurchasing} message="Processing purchase…" />}
    </div>
  );
};

export default ApplicationDetailModal;