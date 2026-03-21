import React, { useEffect } from "react";
import GreenCheckPhoto from "@assets/green-check-logo.png";
import XIcon from "@assets/x-icon.svg";
import WhiteCheckIcon from "@assets/white-check-circle-outline.svg";
import { forceUnlockScroll } from "@utils/bodyScrollLock";
import "./ConfirmationModal.css";

const ConfirmationModal = ({
  modalOpenState,
  onClose,
  app,
  onConfirm,
  shouldUnlockScroll = false,
  title,
  subtitle,
}) => {
  const handleClose = () => {
    if (shouldUnlockScroll) {
      forceUnlockScroll();
    }
    onClose();
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [handleClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm();
  };

  return (
    <div className="profile-confirmation-modal-overlay" onClick={handleClose}>
      <div
        className="profile-confirmation-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="profile-confirmation-modal-header">
          <div>
            <img
              src={GreenCheckPhoto}
              className="profile-confirmation-modal-photo"
            />
          </div>
          <div className="profile-confirmation-modal-x-icon" onClick={handleClose}>
            <img src={XIcon} />
          </div>
        </div>
        <div className="profile-confirmation-modal-body">
          <form onSubmit={handleSubmit}>
            <h2 className="profile-confirmation-modal-title">
              {title || "Are you sure to do action?"}
            </h2>
            <h3 className="profile-confirmation-modal-sub-title">
              {subtitle || "Are you sure to do the action on the app? Make sure this action will not reverse-able."}
            </h3>
            <div className="profile-confirmation-modal-buttons">
              <div className="profile-confirmation-modal-cancel">
                <button type="button" onClick={handleClose}>
                  Cancel
                </button>
              </div>
              <div className="profile-confirmation-modal-confirm">
                <button type="submit">
                  <img src={WhiteCheckIcon} />
                  <span>Confirm</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;