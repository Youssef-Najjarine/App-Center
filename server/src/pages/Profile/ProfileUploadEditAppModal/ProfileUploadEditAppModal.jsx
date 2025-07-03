import React, { useEffect, useState } from "react";
import CloseModalIcon from '../../../assets/Member/upload-edit-app-close-modal-icon.svg';
import TechDeleteIcon from '../../../assets/Member/upload-edit-app-delete-tech-icon.svg';
import UploadIcon from '../../../assets/Member/upload-edit-app-upload-icon.svg';
import TrashIcon from '../../../assets/Member/upload-edit-app-trash-icon.svg';
import PlayIcon from '../../../assets/Member/upload-edit-app-play-icon.svg';
import DraftIcon from '../../../assets/Member/upload-edit-app-draft-icon.svg';
import CancelIcon from '../../../assets/Member/upload-edit-app-cancel-icon.svg';
import SaveIcon from '../../../assets/Member/upload-edit-app-save-icon.svg';
import CancelUploadIcon from '../../../assets/Member/upload-edit-app-cancel-upload-icon.svg';
import DangerIcon from '../../../assets/Member/upload-edit-app-danger-icon.svg';
import FolderIcon from '../../../assets/Member/upload-edit-app-folder-icon.svg';
import CloseErrorIcon from '../../../assets/Member/upload-edit-app-x-icon.svg';
import PlaceHolderImg1 from '../../../assets/Member/upload-edit-app-img-1.jpg';
import PlaceHolderImg2 from '../../../assets/Member/upload-edit-app-img-2.jpg';
import PlaceHolderImg3 from '../../../assets/Member/upload-edit-app-img-3.jpg';
import PlaceHolderImg4 from '../../../assets/Member/upload-edit-app-img-4.jpg';
import PlaceHolderImg5 from '../../../assets/Member/upload-edit-app-img-5.jpg';
import PlaceHolderImg6 from '../../../assets/Member/upload-edit-app-img-6.jpg';
import "./ProfileUploadEditAppModal.css";

const ProfileUploadEditAppModal = ({ modalOpenState, onClose }) => {
  useEffect(() => {
    const initialTechs = appTech.split(",").map((t) => t.trim()).slice(0, 3);
    setTechnologies(initialTechs);
  }, []);
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
  useEffect(() => {
    return () => {
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
      }
    };
}, []);

  const [techInput, setTechInput] = useState("");
  const [technologies, setTechnologies] = useState([]);
  const [appName, setAppName] = useState("Microsoft Word");
  const [appPrice, setAppPrice] = useState("774");
  const [appTech] = useState("HTML,CSS,JavaScript");
  const [appDescription, setappDescription] = useState("Microsoft Word is a widely used word processing program developed by Microsoft. It allows users to create, edit, and format documents, including text, images, and other elements. It's a key component of the Microsoft Office suite and is known for its features like spell and grammar checking, text formatting, and various layout options.");
  const [appRepo, setAppRepo] = useState("https://github.com/myName/repo-name");
  const [uploadStage, setUploadStage] = useState("default");
  const [uploadZipName, setUploadZipName] = useState("");
  const [uploadZip, setUploadZip] = useState(null);
  const [errors, setErrors] = useState({});
  const [showErrorBox, setShowErrorBox] = useState(false);

  const handleTechKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (!techInput.trim()) return;

      const items = techInput
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item && !technologies.includes(item));

      if (items.length > 0 && errors.technologies) {
        setErrors(prev => ({ ...prev, technologies: null }));
      }

      setTechnologies([...technologies, ...items]);
      setTechInput("");
    }
  };

  const handleDeleteTech = (index) => {
    setTechnologies(technologies.filter((_, i) => i !== index));
  };
  
  const handleSaveAndUpload = (e) => {
    e.preventDefault();
    const requiredFields = {
      appName,
      appPrice,
      technologies,
      appDescription,
      uploadZip
    };
    const hasEmpty = Object.entries(requiredFields).some(([key, val]) => {
      if (Array.isArray(val)) return val.length === 0;
      if (key === "uploadZip") return !val;
      return !val?.toString().trim();
    });
    const newErrors = {};

    if (!appName.trim()) newErrors.appName = 'Field Missing';
    if (!appPrice.trim()) newErrors.appPrice = 'Field Missing';
    if (!technologies.length) newErrors.technologies = 'Field Missing';
    if (!appDescription.trim()) newErrors.appDescription = 'Field Missing';
    if (!uploadZip) newErrors.uploadZip = 'Field Missing';

    setErrors(newErrors);
    if (hasEmpty) {
      setShowErrorBox(true);
    } else {
      setShowErrorBox(false);
      // Proceed to upload logic
      console.log('Form Submitted:', { appName, appPrice, appDescription, technologies, appRepo });
    }
  };

  const fileInputRef = React.useRef(null);
  const uploadTimeoutRef = React.useRef(null);

  const handleFileUpload = (file) => {
    if (!file.name.endsWith(".zip")) {
      setErrors(prev => ({ ...prev, uploadZip: "Invalid Type" }));
      return;
    }

    setErrors(prev => ({ ...prev, uploadZip: null }));
    setUploadZip(file);
    setUploadZipName(file.name);
    setUploadStage("uploaded");
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Necessary to allow drop
  };

  const handleCancelUpload = () => {
    if (uploadTimeoutRef.current) {
      clearTimeout(uploadTimeoutRef.current);
      uploadTimeoutRef.current = null;
    }

    setUploadZip(null);
    setUploadZipName("");
    setUploadStage("default");
  };

  const handleDeleteUpload = () => {
    setUploadZip(null);
    setUploadZipName("");
    setUploadStage("default");
  };

  const triggerFileDialog = () => {
    fileInputRef.current.click();
  };

  const handleCloseErrorBox = () => {
    setShowErrorBox(false);
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
                  <div className="upload-edit-app-label-div">
                    <label htmlFor="appName">App Name <span className="upload-edit-app-required">*</span></label>
                    {errors.appName === 'Field Missing' && (
                      <span className="upload-edit-app-field-missing">*Field Missing*</span>
                    )}
                  </div>
                  <input
                    type="text"
                    className={`appName ${errors.appName ? 'error-input' : ''}`}
                    name="appName"
                    placeholder="Name..."
                    value={appName}
                    onChange={(e) => {
                      setAppName(e.target.value);
                      if (errors.appName) {
                        setErrors(prev => ({ ...prev, appName: null }));
                      }
                    }}
                    required
                  />
                </div>
                <div className="upload-edit-app-price">
                  <div className="upload-edit-app-label-div">
                    <label htmlFor="appPrice">Price <span className="upload-edit-app-required">*</span></label>
                    {errors.appPrice === 'Field Missing' && (
                      <span className="upload-edit-app-field-missing">*Field Missing*</span>
                    )}  
                    </div>                
                  <input
                    type="number"
                    className="appPrice"
                    name="appPrice"
                    placeholder="Amount..."
                    value={appPrice}
                    onChange={(e) => {
                      setAppPrice(e.target.value);
                      if (errors.appPrice) {
                        setErrors(prev => ({ ...prev, appPrice: null }));
                      }
                    }}
                    required
                  />
                </div>
              </div>
              <div className="upload-edit-app-tech-desc-repo">
                <div className="upload-edit-app-tech-stack">
                    <div className="upload-edit-app-tech-stack-label">
                      <label htmlFor="techName" className="tech-used">Technologies Used <span className="upload-edit-app-required">*</span></label>
                      {errors.technologies !== 'Field Missing' && (
                        <span className="upload-edit-app-tech-stack-comma-separated">* Comma Separated List *</span>
                      )} 
                      {errors.technologies === 'Field Missing' && (
                        <span className="upload-edit-app-field-missing">*Field Missing*</span>
                      )}                                               
                    </div>
                    <ul className={`upload-edit-app-tech-container ${errors.technologies ? 'error-input' : ''}`}>                       
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
                  <div className="upload-edit-app-label-div">
                    <label>Description <span className="upload-edit-app-required">*</span></label>
                    {errors.appDescription === 'Field Missing' && (
                      <span className="upload-edit-app-field-missing">*Field Missing*</span>
                    )}        
                  </div>            
                  <textarea
                    className={errors.appDescription ? 'error-input' : ''}
                    placeholder='App description...'
                    value={appDescription}
                    onChange={(e) => {
                      setappDescription(e.target.value);
                      if (errors.appDescription) {
                        setErrors(prev => ({ ...prev, appDescription: null }));
                      }
                    }}
                    required
                  />
                </div>
                <div className="upload-edit-app-repo">
                  <label htmlFor="repoURL">Repository URL</label>
                  <input
                    type="text"
                    className="repoURL"
                    name="repoURL"
                    placeholder="https://github.com/myName/repo-name"
                    value={appRepo}
                    onChange={(e) => setAppRepo(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="upload-edit-app-line"></div>
            <div className="upload-edit-app-photos">
              <div>
                <div className="upload-edit-app-label-div">
                  <h3>Upload Zip File <span className="upload-edit-app-required">*</span></h3>
                    {errors.uploadZip === 'Field Missing' && (
                      <span className="upload-edit-app-field-missing">*Field Missing*</span>
                    )}             
                    {errors.uploadZip === 'Invalid Type' && (
                      <span className="upload-edit-app-field-missing">Error – Only ZIP files allowed</span>
                    )}                          
                </div>
                {uploadStage === "default" && (
                  <div
                    className={`upload-edit-app-upload ${errors.uploadZip ? 'error-input' : ''}`}
                    onClick={triggerFileDialog}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      accept=".zip"
                      onChange={handleFileSelect}
                    />
                    <div className="upload-edit-app-upload-img">
                      <img src={UploadIcon} alt="Upload" />
                    </div>
                    <div>
                      <p>
                        <span>Click</span> or Drag here.
                      </p>
                    </div>
                  </div>
                )}
                {uploadStage === "uploading" && (
                  <div className="upload-edit-app-uploading">
                    <div className="upload-edit-app-upload-img">
                      <img src={FolderIcon} alt="Folder" />
                    </div>
                    <div className="upload-edit-app-uploading-text">
                      {uploadZipName}
                    </div>
                    <div className="upload-edit-app-uploading-text">
                      Uploading...
                    </div>
                    <div
                      className="upload-edit-app-upload-img"
                      onClick={handleCancelUpload}
                      style={{ cursor: "pointer" }}
                    >
                      <img src={CancelUploadIcon} alt="Cancel Upload" />
                    </div>
                  </div>
                )}
                {uploadStage === "uploaded" && (
                  <div className="upload-edit-app-uploaded">
                    <div className="upload-edit-app-uploaded-folder-file">
                      <div className="upload-edit-app-upload-img">
                        <img src={FolderIcon} alt="Folder" />
                      </div>
                      <div className="upload-edit-app-uploaded-text">
                        {uploadZipName}
                      </div>
                    </div>
                    <div
                      className="upload-edit-app-upload-img"
                      onClick={handleDeleteUpload}
                      style={{ cursor: "pointer" }}
                    >
                      <img src={TrashIcon} alt="Delete Upload" />
                    </div>
                  </div>
                )}
              </div>
              <div className="upload-edit-app-photos-line"></div>
              <div>
                <div className="upload-edit-app-label-div">
                  <h3>Upload Image/Video</h3>
                </div>
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
                <div className="upload-edit-app-label-div">
                  <h3>Uploaded Image/Video</h3>
                </div>
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
                  <button 
                    type="submit" 
                    className="upload-edit-app-save-button"
                    onClick={handleSaveAndUpload}
                  >
                    <img src={SaveIcon}/>
                    <span>Save & Upload</span>
                  </button>
                </div>  
              </div>            
            </div>
          </div>
        </form>
        {showErrorBox && (
          <div className="upload-edit-app-error-banner">
              <img src={DangerIcon} alt="Error" className="upload-edit-app-error-icon-banner" />
              <span className="upload-edit-app-error-box-message-banner">
                Error – Fields Missing or Invalid. Please try again.
              </span>
              <div>
                <button className='upload-edit-app-close-banner-button'>
                  <img
                    src={CloseErrorIcon}
                    alt="Close"
                    onClick={handleCloseErrorBox}
                  />
                </button>
              </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileUploadEditAppModal;
