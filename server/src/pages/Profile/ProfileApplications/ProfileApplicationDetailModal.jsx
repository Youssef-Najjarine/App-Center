import React, { useEffect, useState } from "react";
import "./ProfileApplicationDetailModal.css";
import closeButton from "../../../assets/Applications/x-close.svg";
import ProfileAppModalCarousel from "./ApplicationModalCarousel/ApplicationModalCarousel";
import githubIcon from "../../../assets/Applications/github-icon.png";
import playIcon from "../../../assets/Applications/play-icon.svg";
import sampleVideo from "../../../assets/HomeCarousel/Senior-Full-Stack-Developer-Expertise.mp4";

const ApplicationDetailModal = ({ modalOpenState, onClose, app }) => {
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
    <div className="appHome-modal-overlay" onClick={onClose}>
      <div className="appHome-modal" onClick={(e) => e.stopPropagation()}>
        <div className="appHome-close-header">
          <h2>{app.title}</h2>
          <button className="appHome-modal-close" onClick={onClose}>
            <img src={closeButton} alt="Close Icon" />
          </button>
        </div>

        <div className="appHome-modal-content">
          <div className="appHome-modal-images-div">
            <div className="appHome-modal-selected-image">
              {selectedItem ? (
                selectedItem.type === "video" ? (
                  isVideoPlaying ? (
                    <video
                      className="selected-video"
                      controls
                      autoPlay
                      src={sampleVideo}
                    />
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
                } else if (!selectedItem) {
                  setSelectedItem(items[0]);
                }
              }}
            />
          </div>

          <div className="appHome-modal-details">
            <div className="appHome-modal-github-section">
              <h3 className="appHome-modal-github-header">GitHub Repo:</h3>
              <div className="homeApp-modal-gitHub-div">
                <a href={app.github} target="_blank" rel="noopener noreferrer">
                  <img src={githubIcon} alt="GitHub icon" />
                </a>
                <a href={app.github} target="_blank" rel="noopener noreferrer">
                  {app.github}
                </a>
              </div>
            </div>

            <div className="appHome-modal-line"></div>

            <div className="appHome-modal-technology-used-div">
              <h3 className="appHome-modal-technology-header">Technology Used</h3>
              <ul className="homeApp-modal-tech-stack">
                {app.tech?.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="appHome-modal-line"></div>

            <div className="appHome-modal-description-button-div">
              <div>
                <h3 className="appHome-modal-description-header">Description</h3>
                <p className="appHome-modal-description-entry">
                  At Open App Partners, we are passionate innovators determined to change the way technology 
                  serves individuals and businesses. Founded with the vision of empowering users through 
                  high-quality, innovative, and accessible applications, we develop solutions that tackle 
                  real-world problems, simplify complex tasks, and help people connect in meaningful ways. 
                  We are a team of passionate engineers, developers, and visionaries working collaboratively 
                  to bring the future of tech into the present, with an affordable applications platform.
                </p>
              </div>
              <div className="appHome-modal-purchase-app-div">
                <button>Purchase the Application - $500</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetailModal;
