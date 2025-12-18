import React, { useState, useEffect } from "react";
import GreenCheckPhoto from "../../../assets/green-check-logo.png";
import XIcon from "../../../assets/x-icon.svg";
import WhiteCheckIcon from "../../../assets/white-check-circle-outline.svg";
import "./ConfirmationModal.css";

const ConfirmationModal = ({ modalOpenState, onClose, app, onConfirmDelete }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [onClose, modalOpenState]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirmDelete();
  };

  return (
    <div className="profile-confirmation-modal-overlay" onClick={onClose}>
      <div className="profile-confirmation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-confirmation-modal-header">
          <div>
            <img src={GreenCheckPhoto} className="profile-confirmation-modal-photo"/>
          </div>
          <div className="profile-confirmation-modal-x-icon" onClick={onClose}>
            <img src={XIcon}/>
          </div>
        </div>
        <div className="profile-confirmation-modal-body">
          <form onSubmit={handleSubmit}>
            <h2 className="profile-confirmation-modal-title">Are you sure to do action?</h2>
            <h3 className="profile-confirmation-modal-sub-title">Are you sure to do the action on the app? Make sure this action will not reverse-able.</h3>
            <div className="profile-confirmation-modal-buttons">
                <div className="profile-confirmation-modal-cancel">
                    <button type="button" onClick={onClose}>Cancel</button>
                </div>
                <div className="profile-confirmation-modal-confirm">
                    <button type="submit">
                        <img src={WhiteCheckIcon}/>
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
