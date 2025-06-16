import React, { useEffect } from "react";
import "./ApplicationDetailModal.css";
import closeButton from "../../../assets/Applications/x-close.svg";
import AppHomeModalCarousel from "./ApplicationModalCarousel/ApplicationModalCarousel";
import placeholder from "../../../assets/AboutUs/aboutus_pc1.png";
import githubIcon from "../../../assets/Applications/github-icon.png";


const ApplicationDetailModal = ({ modalOpenState, onClose, app }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!modalOpenState || !app) return null;

  return (
    <div className="appHome-modal-overlay" onClick={onClose}>
      <div
        className="appHome-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="appHome-close-header">
          <div>
            <h2>{app.title}</h2>
          </div>
          <div>
          <button className="appHome-modal-close" onClick={onClose}>
            <img src={closeButton} alt="Close Icon"/>
          </button>
          </div>
        </div>
        <div>
          <div className="appHome-modal-selected-image">
            <img src={placeholder}/>
          </div>
          <AppHomeModalCarousel/>
        </div>
        <div className="appHome-modal-description">
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
          <div className="appHome-modal-technology-used-div">
            <h4 className="appHome-modal-technology-header">Technology Used</h4>
            <ul className="homeApp-modal-tech-stack">
              {app.tech?.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
              </ul>
          </div>
          <div className="appHome-modal-line"></div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetailModal;
