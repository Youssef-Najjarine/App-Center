import React, { useEffect, useState } from "react";
import "./ApplicationDetailModal.css";
import closeButton from "../../../assets/Applications/x-close.svg";
import AppHomeModalCarousel from "./ApplicationModalCarousel/ApplicationModalCarousel";
import githubIcon from "../../../assets/Applications/github-icon.png";

const ApplicationDetailModal = ({ modalOpenState, onClose, app }) => {
  const [selectedImage, setSelectedImage] = useState(null);

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

  if (!modalOpenState || !app) return null;

  return (
    <div className="appHome-modal-overlay" onClick={onClose}>
      <div className="appHome-modal" onClick={(e) => e.stopPropagation()}>
        <div className="appHome-close-header">
          <div>
            <h2>{app.title}</h2>
          </div>
          <div>
            <button className="appHome-modal-close" onClick={onClose}>
              <img src={closeButton} alt="Close Icon" />
            </button>
          </div>
        </div>

        <div className="appHome-modal-content">
          <div className="appHome-modal-images-div">
            <div className="appHome-modal-selected-image">
              {selectedImage ? (
                <img src={selectedImage} alt="Selected" />
              ) : (
                <div className="image-placeholder">Select an image below</div>
              )}
            </div>

            <AppHomeModalCarousel
              selectedImage={selectedImage}
              onImageClick={setSelectedImage}
              onInitialImage={(img) => {
                if (!selectedImage) setSelectedImage(img);
              }}
            />
          </div>

          <div className="appHome-modal-details">
            <div className="appHome-modal-github-section">
              <h3 className="appHome-modal-github-header">GitHub Repo:</h3>
              <div className="homeApp-modal-gitHub-div">
                <div>
                  <a href={app.github} target="_blank" rel="noopener noreferrer">
                    <img src={githubIcon} alt="GitHub icon" />
                  </a>
                </div>
                <div>
                  <a href={app.github} target="_blank" rel="noopener noreferrer">
                    {app.github}
                  </a>
                </div>
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
                  At Open App Partners, we are passionate innovators determined to change 
                  the way technology serves individuals and businesses. Founded with the 
                  vision of empowering users through high-quality, innovative, and accessible 
                  applications, we develop solutions that tackle real-world problems, simplify 
                  complex tasks, and help people connect in meaningful ways. We are a team of 
                  passionate engineers, developers, and visionaries working collaboratively to 
                  bring the future of tech into the present, with an affordable applications platform.
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
