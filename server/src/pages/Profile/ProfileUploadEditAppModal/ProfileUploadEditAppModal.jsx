import React, { useEffect, useState } from "react";
import CloseModalIcon from '../../../assets/Member/upload-edit-app-close-modal-icon.svg';
import TechDeleteIcon from '../../../assets/Member/upload-edit-app-delete-tech-icon.svg';
import UploadIcon from '../../../assets/Member/upload-edit-app-upload-icon.svg';
import TrashIcon from '../../../assets/Member/upload-edit-app-trash-icon.svg';
import PlayIcon from '../../../assets/Member/upload-edit-app-play-icon.svg';
import DraftIcon from '../../../assets/Member/upload-edit-app-draft-icon.svg';
import CancelIcon from '../../../assets/Member/upload-edit-app-cancel-icon.svg';
import SaveIcon from '../../../assets/Member/upload-edit-app-save-icon.svg';
import PlaceHolderImg1 from '../../../assets/Member/upload-edit-app-img-1.jpg';
import PlaceHolderImg2 from '../../../assets/Member/upload-edit-app-img-2.jpg';
import PlaceHolderImg3 from '../../../assets/Member/upload-edit-app-img-3.jpg';
import PlaceHolderImg4 from '../../../assets/Member/upload-edit-app-img-4.jpg';
import PlaceHolderImg5 from '../../../assets/Member/upload-edit-app-img-5.jpg';
import PlaceHolderImg6 from '../../../assets/Member/upload-edit-app-img-6.jpg';
import "./ProfileUploadEditAppModal.css";

const ProfileUploadEditAppModal = ({ modalOpenState, onClose }) => {
  const [techInput, setTechInput] = useState("");
  const [technologies, setTechnologies] = useState([]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [onClose, modalOpenState]);

  const handleTechKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (!techInput.trim()) return;

      const items = techInput
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item && !technologies.includes(item));

      setTechnologies([...technologies, ...items]);
      setTechInput("");
    }
  };

  const handleDeleteTech = (index) => {
    setTechnologies(technologies.filter((_, i) => i !== index));
  };
  
  const uploads = [
    {
      id: 1,
      imageURL: PlaceHolderImg1
    },
    {
      id: 2,
      imageURL: PlaceHolderImg2,
      videoDuration: "14:22"
    },
    {
      id: 3,
      imageURL: PlaceHolderImg3
    },
    {
      id: 4,
      imageURL: PlaceHolderImg4
    },
    {
      id: 5,
      imageURL: PlaceHolderImg5
    },
    {
      id: 6,
      imageURL: PlaceHolderImg6
    }       
  ];
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
                  <label htmlFor="appName">App Name <span className="upload-edit-app-required">*</span></label>
                  <input type="text" className="appName" name="appName" placeholder="Name..." required />
                </div>
                <div className="upload-edit-app-price">
                  <label htmlFor="appPrice">Price <span className="upload-edit-app-required">*</span></label>
                  <input type="number" className="appPrice" name="appPrice" placeholder="Amount..." required />
                </div>
              </div>
              <div className="upload-edit-app-tech-desc-repo">
                <div className="upload-edit-app-tech-stack">
                    <div className="upload-edit-app-tech-stack-label">
                        <label htmlFor="techName" className="tech-used">Technologies Used <span className="upload-edit-app-required">*</span></label>
                        <span className="upload-edit-app-tech-stack-comma-separated">* Comma Separated List *</span>
                    </div>
                    <ul className="upload-edit-app-tech-container">
                        {technologies.map((tech, index) => (
                        <li key={index} className="upload-edit-app-tech-tag">
                            <span>{tech}</span>
                            <img
                            src={TechDeleteIcon}
                            alt="Remove"
                            className="upload-edit-app-tech-delete"
                            onClick={() => handleDeleteTech(index)}
                            />
                        </li>
                        ))}
                        <input
                        type="text"
                        className="techName"
                        name="techName"
                        placeholder="Tech 1, Tech 2, Tech 3..."
                        value={techInput}
                        onChange={(e) => setTechInput(e.target.value)}
                        onKeyDown={handleTechKeyDown}
                        />
                    </ul>
                </div>

                <div className="upload-edit-app-summary">
                  <label>Description <span className="upload-edit-app-required">*</span></label>
                  <textarea placeholder='App description...'></textarea>
                </div>
                <div className="upload-edit-app-repo">
                  <label htmlFor="repoURL">Repository URL</label>
                  <div>
                    <input type="text" className="repoURL" name="repoURL" placeholder="https://github.com/myName/repo-name"/>
                  </div>
                </div>
              </div>
            </div>
            <div className="upload-edit-app-line"></div>
            <div className="upload-edit-app-photos">
              <div>
                <h3>Upload Zip File</h3>
                <div className="upload-edit-app-upload">
                  <div className="upload-edit-app-upload-img">
                    <img src={UploadIcon} alt="Upload" />
                  </div>
                  <div>
                    <p><span>Click</span> or Drag here.</p>
                  </div>
                </div>
              </div>
              <div className="upload-edit-app-photos-line"></div>
              <div>
                <h3>Upload Image/Video</h3>
                <div className="upload-edit-app-upload">
                  <div className="upload-edit-app-upload-img">
                    <img src={UploadIcon} alt="Upload" />
                  </div>
                  <div>
                    <p><span>Click</span> or Drag here.</p>
                  </div>
                </div>
              </div>
              <div>
                <h3>Uploaded Image/Video</h3>
                <div className="upload-edit-app-uploaded-images">
                  {uploads.map((image) => {
                    return (
                      <div
                        key={image.id}
                        className="uploadedImageContainer"
                      >
                        <div className="uploadedImage">
                          {image.videoDuration && (
                            <div className="upload-edit-app-video-duration">
                              <img src={PlayIcon}/>
                              <span>{image.videoDuration}</span>
                            </div>
                          )}
                            <div className="upload-edit-app-uploaded-photo-trash">
                              <img src={TrashIcon}/>
                            </div>
                            <div className="upload-edit-app-uploaded-photo-make-presentation">
                              <span>Make Presentation</span>
                          </div>                      
                          <img src={image.imageURL} className="previewImg"/> 
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="upload-edit-app-draft-cancel-save">
              <div className="upload-edit-app-draft">
                <button type="button">
                  <img src={DraftIcon}/>
                  <span>Save as Draft</span>
                </button>
              </div>
              <div className="upload-edit-app-cancel-save">
                <div className="upload-edit-app-cancel">
                  <button type="button" onClick={onClose}>
                  <img src={CancelIcon}/>
                  <span>Cancel</span>
                  </button>
                </div>
                <div className="upload-edit-app-save">
                  <button type="submit" className="upload-edit-app-save-button">
                    <img src={SaveIcon}/>
                    <span>Save & Upload</span>
                  </button>
                </div>  
              </div>            
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileUploadEditAppModal;
