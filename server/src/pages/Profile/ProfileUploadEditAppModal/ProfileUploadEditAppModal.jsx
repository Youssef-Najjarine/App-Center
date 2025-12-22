import React, { useEffect, useState } from "react";
import UploadIcon from '@assets/purple-outline-upload-icon.svg';
import TrashIcon from '@assets/red-outline-trash-icon.svg';
import PlayIcon from '@assets/purple-filled-play-icon.svg';
import DraftIcon from '@assets/draft-icon.svg';
import CancelIcon from '@assets/x-circle-icon.svg';
import SaveIcon from '@assets/white-check-circle-outline.svg';
import DangerIcon from '@assets/danger-filled.svg';
import FolderIcon from '@assets/purple-outline-folder-icon.svg';
import xIcon from '@assets/x-icon.svg';
import ConfirmationModal from "@pages/ConfirmationModal/ConfirmationModal";
import "./ProfileUploadEditAppModal.css";

const ProfileUploadEditAppModal = ({ modalOpenState, onClose }) => {
  const [techInput, setTechInput] = useState("");
  const [technologies, setTechnologies] = useState([]);
  const [appName, setAppName] = useState("Microsoft Word");
  const [appPrice, setAppPrice] = useState("");
  const [appTech] = useState("HTML,CSS,JavaScript");
  const [appDescription, setappDescription] = useState(
    "Microsoft Word is a widely used word processing program developed by Microsoft. It allows users to create, edit, and format documents, including text, images, and other elements. It's a key component of the Microsoft Office suite and is known for its features like spell and grammar checking, text formatting, and various layout options."
  );
  const [appRepo, setAppRepo] = useState("https://github.com/myName/repo-name");
  const [uploadStage, setUploadStage] = useState("default");
  const [uploadZipName, setUploadZipName] = useState("");
  const [uploadZip, setUploadZip] = useState(null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [defaultPresentationIndex, setDefaultPresentationIndex] = useState(null);
  const [errors, setErrors] = useState({});
  const [showErrorBox, setShowErrorBox] = useState(false);

  // NEW: state to control ConfirmationModal
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  const fileInputRef = React.useRef(null);
  const uploadTimeoutRef = React.useRef(null);
  const mediaInputRef = React.useRef(null);

  useEffect(() => {
    const initialTechs = appTech
      .split(",")
      .map((t) => t.trim())
      .slice(0, 3);
    setTechnologies(initialTechs);
  }, [appTech]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        // When confirmation is open, ESC should not close the parent modal
        if (showConfirmationModal) return;
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [onClose, modalOpenState, showConfirmationModal]);

  useEffect(() => {
    return () => {
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
      }
    };
  }, []);

  const handleTechKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (!techInput.trim()) return;

      const items = techInput
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item && !technologies.includes(item));

      if (items.length > 0 && errors.technologies) {
        setErrors((prev) => ({ ...prev, technologies: null }));
      }

      setTechnologies([...technologies, ...items]);
      setTechInput("");
    }
  };

  const handleDeleteTech = (index) => {
    setTechnologies(technologies.filter((_, i) => i !== index));
  };

  // NEW: what actually happens after user confirms in ConfirmationModal
  const handleConfirmUpload = () => {
    console.log("Form Submitted:", {
      appName,
      appPrice,
      appDescription,
      technologies,
      appRepo,
      uploadZip,
      mediaFiles,
    });
    setShowConfirmationModal(false);
    onClose(); // close the main upload modal after confirming
  };

  const handleSaveAndUpload = (e) => {
    e.preventDefault();
    const requiredFields = {
      appName,
      appPrice,
      technologies,
      appDescription,
      uploadZip,
    };

    const hasEmpty = Object.entries(requiredFields).some(([key, val]) => {
      if (Array.isArray(val)) return val.length === 0;
      if (key === "uploadZip") return !val;
      return !val?.toString().trim();
    });

    const newErrors = {};

    if (!appName.trim()) newErrors.appName = "Field Missing";
    if (!appPrice.trim()) newErrors.appPrice = "Field Missing";
    if (!technologies.length) newErrors.technologies = "Field Missing";
    if (!appDescription.trim()) newErrors.appDescription = "Field Missing";
    if (!uploadZip) newErrors.uploadZip = "Field Missing";

    setErrors(newErrors);

    if (hasEmpty) {
      setShowErrorBox(true);
    } else {
      setShowErrorBox(false);
      // Instead of immediately submitting, open confirmation modal
      setShowConfirmationModal(true);
    }
  };

  const handleFileUpload = (file) => {
    if (!file.name.endsWith(".zip")) {
      setErrors((prev) => ({ ...prev, uploadZip: "Invalid Type" }));
      return;
    }

    setErrors((prev) => ({ ...prev, uploadZip: null }));
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
    e.preventDefault();
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

  const handleMediaSelect = (e) => {
    const files = Array.from(e.target.files);
    handleMediaUpload(files);
  };

  const handleMediaDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    handleMediaUpload(files);
  };

  const handleMediaUpload = async (files) => {
    const newFiles = [...mediaFiles];
    const validMedia = [];
    const seenKeys = new Set();
    const existingKeys = new Set(
      newFiles.map(
        (f) =>
          `${f.originalName}-${f.originalSize}-${f.originalLastModified}`
      )
    );

    let imageCount = newFiles.filter(
      (f) => f.type.startsWith("image/") && f.type !== "image/gif"
    ).length;
    let hasVideo = newFiles.some(
      (f) => f.type.startsWith("video/") || f.type === "image/gif"
    );

    let error = null;

    for (const file of files) {
      const key = `${file.name}-${file.size}-${file.lastModified}`;
      const isGif = file.type === "image/gif";
      const isVideo = file.type.startsWith("video/") || isGif;
      const isImage = file.type.startsWith("image/") && !isGif;

      if (!isImage && !isVideo) {
        error = "invalid-media-type";
        continue;
      }

      if (existingKeys.has(key) || seenKeys.has(key)) {
        error = "duplicate-image";
        continue;
      }

      seenKeys.add(key);

      if (isVideo) {
        if (
          hasVideo ||
          validMedia.some(
            (f) => f.type.startsWith("video/") || f.type === "image/gif"
          )
        ) {
          error = "video-limit-exceeded";
          continue;
        }

        const previewURL = URL.createObjectURL(file);
        const duration = isGif ? null : await getVideoDuration(file);

        validMedia.push({
          file,
          previewURL,
          type: file.type,
          duration,
          originalName: file.name,
          originalSize: file.size,
          originalLastModified: file.lastModified,
        });

        hasVideo = true;
        continue;
      }

      if (isImage) {
        if (imageCount >= 5) {
          error = "image-limit-exceeded";
          continue;
        }

        const compressedFile = await compressImage(file);
        const compressedURL = URL.createObjectURL(compressedFile);

        validMedia.push({
          file: compressedFile,
          previewURL: compressedURL,
          type: compressedFile.type,
          originalName: file.name,
          originalSize: file.size,
          originalLastModified: file.lastModified,
        });

        imageCount++;
      }
    }

    setMediaFiles([...newFiles, ...validMedia]);

    if (error) {
      setErrors((prev) => ({ ...prev, mediaUpload: error }));
    } else {
      setErrors((prev) => ({ ...prev, mediaUpload: null }));
    }
  };

  const getVideoDuration = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        const minutes = Math.floor(video.duration / 60);
        const seconds = Math.floor(video.duration % 60);
        resolve(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      };
    });
  };

  const compressImage = (file, maxWidth = 1024, maxHeight = 1024, quality = 0.8) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };
    });
  };

  const handleDeleteMedia = (index) => {
    const newFiles = [...mediaFiles];
    URL.revokeObjectURL(newFiles[index].previewURL);
    newFiles.splice(index, 1);
    setMediaFiles(newFiles);
  };

  const triggerMediaDialog = () => {
    mediaInputRef.current.click();
  };

  const handleCloseErrorBox = () => {
    setShowErrorBox(false);
  };

  const handleMakePresentation = (index) => {
    setDefaultPresentationIndex(index);
  };

  return (
    // IMPORTANT: when confirmation is open, ignore clicks on this overlay
    <div
      className="upload-edit-app-modal-overlay"
      onClick={(e) => {
        if (showConfirmationModal) return;
        onClose();
      }}
    >
      <div
        className="upload-edit-app-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="upload-edit-app-close-header">
          <h2>Upload New App</h2>
          <div className="upload-edit-app-close-modal-div">
            <button
              className="upload-edit-app-close-button"
              onClick={onClose}
            >
              <img src={xIcon} alt="Close" />
            </button>
          </div>
        </div>
        <form>
          <div className="upload-edit-app-body">
            <div className="upload-edit-app-inputs">
              <div className="upload-edit-app-name-price">
                <div className="upload-edit-app-name">
                  <div className="upload-edit-app-label-div">
                    <label htmlFor="appName">
                      App Name{" "}
                      <span className="upload-edit-app-required">*</span>
                    </label>
                    {errors.appName === "Field Missing" && (
                      <span className="upload-edit-app-field-missing">
                        *Field Missing*
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    className={`appName ${
                      errors.appName ? "error-input" : ""
                    }`}
                    name="appName"
                    placeholder="Name..."
                    value={appName}
                    onChange={(e) => {
                      setAppName(e.target.value);
                      if (errors.appName) {
                        setErrors((prev) => ({ ...prev, appName: null }));
                      }
                    }}
                    required
                  />
                </div>
                <div className="upload-edit-app-price">
                  <div className="upload-edit-app-label-div">
                    <label htmlFor="appPrice">
                      Price{" "}
                      <span className="upload-edit-app-required">*</span>
                    </label>
                    {errors.appPrice === "Field Missing" && (
                      <span className="upload-edit-app-field-missing">
                        *Field Missing*
                      </span>
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
                        setErrors((prev) => ({ ...prev, appPrice: null }));
                      }
                    }}
                    required
                  />
                </div>
              </div>
              <div className="upload-edit-app-tech-desc-repo">
                <div className="upload-edit-app-tech-stack">
                  <div className="upload-edit-app-tech-stack-label">
                    <label
                      htmlFor="techName"
                      className="tech-used"
                    >
                      Technologies Used{" "}
                      <span className="upload-edit-app-required">*</span>
                    </label>
                    {errors.technologies !== "Field Missing" && (
                      <span className="upload-edit-app-tech-stack-comma-separated">
                        * Comma Separated List *
                      </span>
                    )}
                    {errors.technologies === "Field Missing" && (
                      <span className="upload-edit-app-field-missing">
                        *Field Missing*
                      </span>
                    )}
                  </div>
                  <ul
                    className={`upload-edit-app-tech-container ${
                      errors.technologies ? "error-input" : ""
                    }`}
                  >
                    {technologies.map((tech, index) => (
                      <li
                        key={index}
                        className="upload-edit-app-tech-tag"
                      >
                        <span>{tech}</span>
                        <img
                          src={CancelIcon}
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
                    <label>
                      Description{" "}
                      <span className="upload-edit-app-required">*</span>
                    </label>
                    {errors.appDescription === "Field Missing" && (
                      <span className="upload-edit-app-field-missing">
                        *Field Missing*
                      </span>
                    )}
                  </div>
                  <textarea
                    className={errors.appDescription ? "error-input" : ""}
                    placeholder="App description..."
                    value={appDescription}
                    onChange={(e) => {
                      setappDescription(e.target.value);
                      if (errors.appDescription) {
                        setErrors((prev) => ({
                          ...prev,
                          appDescription: null,
                        }));
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
                  <h3>
                    Upload Zip File{" "}
                    <span className="upload-edit-app-required">*</span>
                  </h3>
                  {errors.uploadZip === "Field Missing" && (
                    <span className="upload-edit-app-field-missing">
                      *Field Missing*
                    </span>
                  )}
                  {errors.uploadZip === "Invalid Type" && (
                    <span className="upload-edit-app-field-missing">
                      Error – Only ZIP files allowed
                    </span>
                  )}
                </div>
                {uploadStage === "default" && (
                  <div
                    className={`upload-edit-app-upload ${
                      errors.uploadZip ? "error-input" : ""
                    }`}
                    onClick={triggerFileDialog}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: "none" }}
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
                    <div className="upload-edit-app-uploading-img-file">
                      <div className="upload-edit-app-upload-img">
                        <img src={FolderIcon} alt="Folder" />
                      </div>
                      <div className="upload-edit-app-uploading-text">
                        {uploadZipName}
                      </div>
                    </div>
                    <div className="upload-edit-app-uploading-upload-txt-close">
                      <div className="upload-edit-app-uploading-text">
                        Uploading... (24.5MB / 34.5MB)
                      </div>
                      <div
                        className="upload-edit-app-upload-img"
                        onClick={handleCancelUpload}
                        style={{ cursor: "pointer" }}
                      >
                        <img
                          src={CancelIcon}
                          alt="Cancel Upload"
                        />
                      </div>
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
                  {errors.mediaUpload === "invalid-media-type" && (
                    <span className="upload-edit-app-field-missing">
                      Invalid image or video type
                    </span>
                  )}
                  {errors.mediaUpload === "image-limit-exceeded" && (
                    <span className="upload-edit-app-field-missing">
                      5 images max
                    </span>
                  )}
                  {errors.mediaUpload === "video-limit-exceeded" && (
                    <span className="upload-edit-app-field-missing">
                      1 video max
                    </span>
                  )}
                  {errors.mediaUpload === "duplicate-image" && (
                    <span className="upload-edit-app-field-missing">
                      Duplicates found
                    </span>
                  )}
                </div>
                <div
                  className="upload-edit-app-upload"
                  onClick={triggerMediaDialog}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleMediaDrop}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    ref={mediaInputRef}
                    style={{ display: "none" }}
                    onChange={handleMediaSelect}
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
              </div>
              <div>
                {mediaFiles.length > 0 && (
                  <>
                    <div className="upload-edit-app-label-div">
                      <h3>Uploaded Image/Video</h3>
                    </div>
                    <div className="upload-edit-app-uploaded-images">
                      {mediaFiles.map((media, index) => (
                        <div
                          key={index}
                          className="uploadedImageContainer"
                        >
                          <div className="uploadedImage">
                            {media.type.startsWith("video/") ||
                            media.type === "image/gif" ? (
                              <div className="upload-edit-app-video-duration">
                                <img src={PlayIcon} alt="Play" />
                                <span>
                                  {media.type === "image/gif"
                                    ? "GIF"
                                    : media.duration || "Video"}
                                </span>
                              </div>
                            ) : null}
                            <div
                              className="upload-edit-app-uploaded-photo-trash"
                              onClick={() => handleDeleteMedia(index)}
                            >
                              <img src={TrashIcon} alt="Trash" />
                            </div>
                            <div
                              className={`upload-edit-app-uploaded-photo-make-presentation ${
                                defaultPresentationIndex === index
                                  ? "selected-presentation"
                                  : ""
                              }`}
                              onClick={() =>
                                handleMakePresentation(index)
                              }
                            >
                              <span>
                                {defaultPresentationIndex === index
                                  ? "Default Presentation"
                                  : "Make Presentation"}
                              </span>
                            </div>
                            {media.type.startsWith("image/") ? (
                              <img
                                src={media.previewURL}
                                alt="Preview"
                                className="previewImg"
                              />
                            ) : (
                              <video
                                src={media.previewURL}
                                className="previewImg"
                                controls
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="upload-edit-app-draft-cancel-save">
            <div className="upload-edit-app-draft">
              <button type="button">
                <img src={DraftIcon} />
                <span>Save as Draft</span>
              </button>
            </div>
            <div className="upload-edit-app-cancel-save">
              <div className="upload-edit-app-cancel">
                <button type="button" onClick={onClose}>
                  <img src={CancelIcon} />
                  <span>Cancel</span>
                </button>
              </div>
              <div className="upload-edit-app-save">
                <button
                  type="submit"
                  className="upload-edit-app-save-button"
                  onClick={handleSaveAndUpload}
                >
                  <img src={SaveIcon} />
                  <span>Save & Upload</span>
                </button>
              </div>
            </div>
          </div>
        </form>
        {showErrorBox && (
          <div className="upload-edit-app-error-banner">
            <img
              src={DangerIcon}
              alt="Error"
              className="upload-edit-app-error-icon-banner"
            />
            <span className="upload-edit-app-error-box-message-banner">
              Error – Fields Missing or Invalid. Please try again.
            </span>
            <div>
              <button className="upload-edit-app-close-banner-button">
                <img
                  src={xIcon}
                  alt="Close"
                  onClick={handleCloseErrorBox}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      {showConfirmationModal && (
        <ConfirmationModal
          modalOpenState={showConfirmationModal}
          onClose={() => setShowConfirmationModal(false)}
          app={null}
          onConfirmDelete={handleConfirmUpload}
        />
      )}
    </div>
  );
};

export default ProfileUploadEditAppModal;
