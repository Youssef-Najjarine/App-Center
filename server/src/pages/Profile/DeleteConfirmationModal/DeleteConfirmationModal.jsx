import React, { useState, useEffect } from "react";
import DeletePhoto from "../../../assets/white-x-red-background-logo.png";
import XIcon from "../../../assets/x-icon.svg";
import TrashIcon from "../../../assets/white-outline-trash-icon.svg";
import "./DeleteConfirmationModal.css";

const DeleteConfirmationModal = ({ modalOpenState, onClose, app, onConfirmDelete }) => {
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
    <div className="profile-delete-modal-overlay" onClick={onClose}>
      <div className="profile-delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-delete-modal-header">
          <div>
            <img src={DeletePhoto} className="profile-delete-modal-photo"/>
          </div>
          <div className="profile-delete-modal-x-icon" onClick={onClose}>
            <img src={XIcon}/>
          </div>
        </div>
        <div className="profile-delete-modal-body">
          <form onSubmit={handleSubmit}>
            <h2 className="profile-delete-modal-title">Delete Confirmation</h2>
            <h3 className="profile-delete-modal-sub-title">Are you sure you want to delete this app? This action is not reversible.</h3>
            <div className="profile-delete-modal-buttons">
                <div className="profile-delete-modal-cancel">
                    <button type="button" onClick={onClose}>Cancel</button>
                </div>
                <div className="profile-delete-modal-confirm-delete">
                    <button type="submit">
                        <img src={TrashIcon}/>
                        <span>Confirm Delete</span>
                    </button>
                </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
