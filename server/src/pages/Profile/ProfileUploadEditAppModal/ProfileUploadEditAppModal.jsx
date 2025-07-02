import React, { useEffect, useState } from "react";
import CloseModalIcon from '../../../assets/Member/upload-edit-app-close-modal-icon.svg';
import TechDeleteIcon from '../../../assets/Member/upload-edit-app-delete-tech-icon.svg';
import UploadIcon from '../../../assets/Member/upload-edit-app-upload-icon.svg';
import TrashIcon from '../../../assets/Member/upload-edit-app-trash-icon.svg';
import PlayIcon from '../../../assets/Member/upload-edit-app-play-icon.svg';
import DraftIcon from '../../../assets/Member/upload-edit-app-draft-icon.svg';
import CancelIcon from '../../../assets/Member/upload-edit-app-cancel-icon.svg';
import SaveIcon from '../../../assets/Member/upload-edit-app-upload-icon.svg';
import PlaceHolderImg1 from '../../../assets/Member/upload-edit-app-img-1.jpg';
import PlaceHolderImg2 from '../../../assets/Member/upload-edit-app-img-2.jpg';
import PlaceHolderImg3 from '../../../assets/Member/upload-edit-app-img-3.jpg';
import PlaceHolderImg4 from '../../../assets/Member/upload-edit-app-img-4.jpg';
import PlaceHolderImg5 from '../../../assets/Member/upload-edit-app-img-5.jpg';


import "./ProfileUploadEditAppModal.css";


const ProfileUploadEditAppModal = ({ modalOpenState, onClose }) => {
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

  return (
    <div className="upload-edit-app-modal-overlay" onClick={onClose}>
      <div className="upload-edit-app-modal" onClick={(e) => e.stopPropagation()}>
        <div className="upload-edit-app-close-header">
          <h2>Upload New App</h2>
          <div>
            <div className="upload-edit-app-close-modal-div">
                <button className="upload-edit-app-close-button" onClick={onClose}>
                <img src={CloseModalIcon} alt="Close" />
                </button>
            </div>
          </div>
        </div>
        <form>
            <div className="upload-edit-app-body">
                <div className="upload-edit-app-inputs">
                    <div className="upload-edit-app-name-price">
                        <div className="upload-edit-app-name">
                            <label htmlFor="appName">App Name</label>
                            <div>
                                <input type="text" className="appName" name="appName" placeholder="App name here..." required />
                            </div>
                        </div>
                        <div className="upload-edit-app-price">
                            <label htmlFor="appPrice">Price</label>
                            <div>
                                <input type="number" className="appPrice" name="appPrice" placeholder="App price here..." required />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="upload-edit-app-photos">

                </div>
            </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileUploadEditAppModal;
