

import React, { useEffect, useState } from "react";
import "./ProfileApplicationDetailModal.css";
import closeButton from "../../../assets/Member/x-close.svg";
import ProfileAppModalCarousel from "./ApplicationModalCarousel/ApplicationModalCarousel";
import githubIcon from "../../../assets/Member/github-icon.png";
import playIcon from "../../../assets/Member/play-icon.svg";
import sampleVideo from "../../../assets/Member/Senior-Full-Stack-Developer-Expertise.mp4";
import editIcon from "../../../assets/Member/member-app-details-modal-edit-icon.svg";
import deleteIcon from "../../../assets/Member/member-app-details-modal-trash-icon.svg";
import boostIcon from "../../../assets/Member/member-app-details-modal-boost-icon.svg";

const ProfileApplicationDetailModal = ({ modalOpenState, onClose, app, modalSource }) => {
  if (!app) return null;

  const [selectedItem, setSelectedItem] = useState(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

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

  useEffect(() => {
    setIsVideoPlaying(false);
  }, [selectedItem]);

  return (
    <div className="profile-app-details-modal-overlay" onClick={onClose}>
      <div className="profile-app-details-modal" onClick={(e) => e.stopPropagation()}>
        {modalSource === "details" ? (
          <div className="profile-app-details-close-header">
            <h2>{app.title}</h2>
            <div className="profile-app-details-modal-header-buttons">
              <div className="profile-app-details-modal-edit">
                <button>
                  <img src={editIcon} alt="Edit Icon" />
                  <span>Edit</span>
                </button>
              </div>
              <div className="profile-app-details-modal-delete">
                <button>
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
        ) : (
          <div className="profile-app-details-close-header">
            <h2>{app.title}</h2>
            <div className="profile-app-details-modal-close">
              <button onClick={onClose}>
                <img src={closeButton} alt="Close Icon" />
              </button>
            </div>
          </div>
        )}

        <div className="profile-app-details-modal-content">
          <div className="profile-app-details-modal-images-div">
            <div className="profile-app-details-modal-selected-image">
              {selectedItem ? (
                selectedItem.type === "video" ? (
                  isVideoPlaying ? (
                    <video className="selected-video" controls autoPlay src={sampleVideo} />
                  ) : (
                    <div
                      className="video-thumbnail-wrapper"
                      onClick={() => setIsVideoPlaying(true)}
                    >
                      <img src={selectedItem.src} alt="Video thumbnail" className="selected-image" />
                      <div className="video-overlay">
                        <img src={playIcon} alt="Play" className="play-icon" />
                        <span className="video-duration">{selectedItem.duration}</span>
                      </div>
                    </div>
                  )
                ) : (
                  <img src={selectedItem.src} alt="Selected" className="selected-image" />
                )
              ) : (
                <div className="image-placeholder">Select an image or video below</div>
              )}
            </div>

            <ProfileAppModalCarousel
              selectedItem={selectedItem}
              onItemClick={(item) => {
                setSelectedItem(item);
                setIsVideoPlaying(false);
              }}
              onInitialItem={(items) => {
                const defaultVideo = items.find((item) => item.type === "video");
                if (defaultVideo && !selectedItem) {
                  setSelectedItem(defaultVideo);
                } else if (!selectedItem && items.length > 0) {
                  setSelectedItem(items[0]);
                }
              }}
            />
          </div>

          <div className="profile-app-details-modal-details">
            <div className="profile-app-details-modal-github-section">
              <h3 className="profile-app-details-modal-github-header">GitHub Repo:</h3>
              <div className="profile-app-details-modal-gitHub-div">
                <a href={app.github} target="_blank" rel="noopener noreferrer">
                  <img src={githubIcon} alt="GitHub icon" />
                </a>
                <a href={app.github} target="_blank" rel="noopener noreferrer">
                  {app.github}
                </a>
              </div>
            </div>

            <div className="profile-app-details-modal-line"></div>

            <div className="profile-app-details-modal-technology-used-div">
              <h3 className="profile-app-details-modal-technology-header">Technology Used</h3>
              <ul className="profile-app-details-modal-tech-stack">
                {app.tech?.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="profile-app-details-modal-line"></div>

            <div className="profile-app-details-modal-description-button-div">
              <div>
                <h3 className="profile-app-details-modal-description-header">Description</h3>
                <p className="profile-app-details-modal-description-entry">
                  At Open App Partners, we are passionate innovators determined to change the way
                  technology serves individuals and businesses. Founded with the vision of empowering
                  users through high-quality, innovative, and accessible applications, we develop
                  solutions that tackle real-world problems, simplify complex tasks, and help people
                  connect in meaningful ways. We are a team of passionate engineers, developers, and
                  visionaries working collaboratively to bring the future of tech into the present,
                  with an affordable applications platform.
                </p>
              </div>

              {modalSource === "details" ? (
                <div className="profile-details-app-details">
                  <div className="profile-details-app-impressions">
                    <p className="profile-details-app-impressions-label">Impressions:</p>
                    <p className="profile-details-app-impressions-count">12.5K</p>
                  </div>
                  <div className="profile-details-app-clicks">
                    <p className="profile-details-app-clicks-label">Clicks:</p>
                    <p className="profile-details-app-clicks-count">658</p>
                  </div>
                  <div className="profile-details-app-boost-promotion">
                    <button>
                      <img src={boostIcon} alt="Boost Icon" />
                      <span>Boost Promotion</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="profile-app-details-modal-purchase-app-div">
                  <button>Purchase the Application - $500</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileApplicationDetailModal;
