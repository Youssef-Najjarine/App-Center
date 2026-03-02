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
import ProcessingModal from "@pages/ProcessingModal/ProcessingModal";
import { lockScroll, unlockScroll, forceUnlockScroll } from "@utils/bodyScrollLock";
import "./ProfileUploadEditAppModal.css";

const ProfileUploadEditAppModal = ({ modalOpenState, onClose }) => {
  const confirmationOpenRef = React.useRef(false);

  const [selectedTechnologies, setSelectedTechnologies] = useState([]);
  const [techInput, setTechInput] = useState("");
  const [appName, setAppName] = useState("");
  const [appPrice, setAppPrice] = useState("");
  const [appDescription, setappDescription] = useState("");
  const [appRepo, setAppRepo] = useState("");
  const [uploadStage, setUploadStage] = useState("default");
  const [uploadZipName, setUploadZipName] = useState("");
  const [uploadZip, setUploadZip] = useState(null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [defaultPresentationIndex, setDefaultPresentationIndex] = useState(null);
  const [errors, setErrors] = useState({});
  const [showErrorBox, setShowErrorBox] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const fileInputRef = React.useRef(null);
  const uploadTimeoutRef = React.useRef(null);
  const mediaInputRef = React.useRef(null);
  const abortControllerRef = React.useRef(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  useEffect(() => {
    lockScroll();
    return () => { unlockScroll(); };
  }, []);

  useEffect(() => {
    if (!modalOpenState) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        if (confirmationOpenRef.current) return;
        onClose(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [modalOpenState, onClose]);

  useEffect(() => { confirmationOpenRef.current = showConfirmationModal; }, [showConfirmationModal]);

  useEffect(() => {
    return () => { if (uploadTimeoutRef.current) clearTimeout(uploadTimeoutRef.current); };
  }, []);

  // ── Tech ──────────────────────────────────────────────────────────────────

  const addTechsFromInput = () => {
    const items = techInput.split(",").map((x) => x.trim()).filter(Boolean);
    if (!items.length) return;
    setSelectedTechnologies((prev) => {
      const set = new Set(prev.map((t) => t.toLowerCase()));
      const next = [...prev];
      for (const item of items) {
        const key = item.toLowerCase();
        if (!set.has(key)) { set.add(key); next.push(item); }
      }
      return next;
    });
    if (errors.technologies) setErrors((p) => ({ ...p, technologies: null }));
    setTechInput("");
  };

  const handleTechKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTechsFromInput(); }
  };

  const handleDeleteTech = (index) => {
    setSelectedTechnologies((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Errors ────────────────────────────────────────────────────────────────

  const showGenericError = () => { setCreateError(""); setShowErrorBox(true); };
  const showServerError = () => { setCreateError("Error - Unable to connect to the server."); setShowErrorBox(true); };

  const applyBackendValidationErrors = (backendErrors) => {
    if (!backendErrors || typeof backendErrors !== "object") return;
    const next = { ...errors };
    if (backendErrors.name) next.appName = "Field Missing";
    if (backendErrors.price) next.appPrice = "Field Missing";
    if (backendErrors.description) next.appDescription = "Field Missing";
    if (backendErrors.technologies) next.technologies = "Field Missing";
    if (backendErrors.zipFile) next.uploadZip = "Field Missing";
    if (backendErrors.media) next.mediaUpload = "invalid-media-type";
    if (backendErrors.presentationIndex) next.mediaUpload = "invalid-media-type";
    setErrors(next);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleConfirmUpload = async () => { await submitApplication({ isDraft: false }); };
  const handleSaveAsDraft = async () => { await submitApplication({ isDraft: true }); };

  const submitApplication = async ({ isDraft }) => {
    setShowErrorBox(false);
    setCreateError("");
    setIsCreating(true);
    try {
      const form = new FormData();
      form.append("name", appName.trim());
      form.append("price", appPrice ? String(appPrice) : "");
      form.append("description", appDescription.trim());
      form.append("repositoryUrl", appRepo.trim() || "");
      form.append("isDraft", isDraft ? "true" : "false");

      const presentationIndex = defaultPresentationIndex === null ? 0 : defaultPresentationIndex;
      form.append("presentationIndex", String(presentationIndex));

      selectedTechnologies.forEach((t) => form.append("technologies", t));
      form.append("zipFile", uploadZip, uploadZip.name);
      mediaFiles.forEach((m) => form.append("media", m.file, m.originalName));

      abortControllerRef.current = new AbortController();

      const res = await fetch("/api/user-application/create-user-application", {
        method: "POST",
        credentials: "include",
        body: form,
        signal: abortControllerRef.current.signal,
      });

      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }

      if (res.status === 400 && data?.errors) {
        applyBackendValidationErrors(data.errors);
        showGenericError();
        setShowConfirmationModal(false);
        return;
      }

      if (!res.ok || !data.success) {
        if ([0, 500, 502, 503, 504].includes(res.status)) showServerError();
        else showGenericError();
        setShowConfirmationModal(false);
        return;
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
      if (mediaInputRef.current) mediaInputRef.current.value = "";

      forceUnlockScroll();
      setShowConfirmationModal(false);

      // Pass the full card back so the parent can prepend it immediately
      // without needing to reload all apps from the server.
      onClose(data.card ?? null);
    } catch (e) {
      console.error(e);
      showServerError();
      setShowConfirmationModal(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveAndUpload = (e) => {
    e.preventDefault();
    setShowErrorBox(false);
    setCreateError("");

    const newErrors = {};
    if (!appName.trim()) newErrors.appName = "Field Missing";
    if (!appPrice.toString().trim()) newErrors.appPrice = "Field Missing";
    if (!selectedTechnologies.length) newErrors.technologies = "Field Missing";
    if (!appDescription.trim()) newErrors.appDescription = "Field Missing";
    if (!uploadZip) newErrors.uploadZip = "Field Missing";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) showGenericError();
    else setShowConfirmationModal(true);
  };

  // ── ZIP handlers ──────────────────────────────────────────────────────────

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

  const handleFileSelect = (e) => { const file = e.target.files[0]; if (file) handleFileUpload(file); };
  const handleDrop = (e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleFileUpload(file); };
  const handleDragOver = (e) => { e.preventDefault(); };
  const handleCancelUpload = () => {
    if (uploadTimeoutRef.current) { clearTimeout(uploadTimeoutRef.current); uploadTimeoutRef.current = null; }
    setUploadZip(null); setUploadZipName(""); setUploadStage("default");
  };
  const handleDeleteUpload = () => { setUploadZip(null); setUploadZipName(""); setUploadStage("default"); };
  const triggerFileDialog = () => { fileInputRef.current.click(); };

  // ── Media handlers ────────────────────────────────────────────────────────

  const handleMediaSelect = (e) => { handleMediaUpload(Array.from(e.target.files)); };
  const handleMediaDrop = (e) => { e.preventDefault(); handleMediaUpload(Array.from(e.dataTransfer.files)); };

  const handleMediaUpload = async (files) => {
    const newFiles = [...mediaFiles];
    const validMedia = [];
    const seenKeys = new Set();
    const existingKeys = new Set(
      newFiles.map((f) => `${f.originalName}-${f.originalSize}-${f.originalLastModified}`)
    );

    let imageCount = newFiles.filter((f) => f.type.startsWith("image/") && f.type !== "image/gif").length;
    let hasVideo = newFiles.some((f) => (f.type || "").startsWith("video/"));
    let error = null;

    const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
    const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

    for (const file of files) {
      const key = `${file.name}-${file.size}-${file.lastModified}`;
      const type = (file.type || "").toLowerCase();
      const isGif = type === "image/gif";
      const isImage = type.startsWith("image/") && !isGif && ALLOWED_IMAGE_TYPES.has(type);
      const isVideo = ALLOWED_VIDEO_TYPES.has(type);

      if (isGif) { error = "gif-not-allowed"; continue; }
      if (!isImage && !isVideo) { error = "invalid-media-type"; continue; }
      if (existingKeys.has(key) || seenKeys.has(key)) { error = "duplicate-image"; continue; }
      seenKeys.add(key);

      if (isVideo) {
        if (hasVideo || validMedia.some((f) => f.type.startsWith("video/"))) {
          error = "video-limit-exceeded"; continue;
        }
        const previewURL = URL.createObjectURL(file);
        validMedia.push({
          file, previewURL, type: file.type,
          originalName: file.name, originalSize: file.size, originalLastModified: file.lastModified,
        });
        hasVideo = true;
        continue;
      }

      if (isImage) {
        if (imageCount >= 5) { error = "image-limit-exceeded"; continue; }
        const compressedFile = await compressImage(file);
        const compressedURL = URL.createObjectURL(compressedFile);
        validMedia.push({
          file: compressedFile, previewURL: compressedURL, type: compressedFile.type,
          originalName: file.name, originalSize: file.size, originalLastModified: file.lastModified,
        });
        imageCount++;
      }
    }

    setMediaFiles([...newFiles, ...validMedia]);
    setErrors((prev) => ({ ...prev, mediaUpload: error ?? null }));
  };

  const compressImage = (file, maxWidth = 1024, maxHeight = 1024, quality = 0.8) =>
    new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.src = url;
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement("canvas");
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() })),
          "image/jpeg",
          quality
        );
      };
    });

  const handleDeleteMedia = (index) => {
    setMediaFiles((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].previewURL);
      copy.splice(index, 1);
      return copy;
    });
    setDefaultPresentationIndex((prev) => {
      if (prev === null) return null;
      if (index === prev) return 0;
      if (index < prev) return prev - 1;
      return prev;
    });
  };

  const triggerMediaDialog = () => { mediaInputRef.current.click(); };
  const handleCloseErrorBox = () => { setShowErrorBox(false); };
  const handleMakePresentation = (index) => { setDefaultPresentationIndex(index); };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="upload-edit-app-modal-overlay"
      onClick={() => { if (showConfirmationModal) return; onClose(null); }}
    >
      <div className="upload-edit-app-modal" onClick={(e) => e.stopPropagation()}>
        <div className="upload-edit-app-close-header">
          <h2>Upload New App</h2>
          <div className="upload-edit-app-close-modal-div">
            <button className="upload-edit-app-close-button" onClick={() => onClose(null)}>
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
                    <label htmlFor="appName">App Name <span className="upload-edit-app-required">*</span></label>
                    {errors.appName === "Field Missing" && <span className="upload-edit-app-field-missing">*Field Missing*</span>}
                  </div>
                  <input
                    type="text"
                    className={`appName ${errors.appName ? "error-input" : ""}`}
                    name="appName"
                    placeholder="Name..."
                    value={appName}
                    onChange={(e) => { setAppName(e.target.value); if (errors.appName) setErrors((p) => ({ ...p, appName: null })); }}
                    required
                  />
                </div>
                <div className="upload-edit-app-price">
                  <div className="upload-edit-app-label-div">
                    <label htmlFor="appPrice">Price <span className="upload-edit-app-required">*</span></label>
                    {errors.appPrice === "Field Missing" && <span className="upload-edit-app-field-missing">*Field Missing*</span>}
                  </div>
                  <input
                    type="number"
                    className="appPrice"
                    name="appPrice"
                    placeholder="Amount..."
                    value={appPrice}
                    onChange={(e) => { setAppPrice(e.target.value); if (errors.appPrice) setErrors((p) => ({ ...p, appPrice: null })); }}
                    required
                  />
                </div>
              </div>

              <div className="upload-edit-app-tech-desc-repo">
                <div className="upload-edit-app-tech-stack">
                  <div className="upload-edit-app-tech-stack-label">
                    <label htmlFor="techName" className="tech-used">
                      Technologies Used <span className="upload-edit-app-required">*</span>
                    </label>
                    {errors.technologies !== "Field Missing" && (
                      <span className="upload-edit-app-tech-stack-comma-separated">* Comma Separated List *</span>
                    )}
                    {errors.technologies === "Field Missing" && (
                      <span className="upload-edit-app-field-missing">*Field Missing*</span>
                    )}
                  </div>
                  <ul className={`upload-edit-app-tech-container ${errors.technologies ? "error-input" : ""}`}>
                    {selectedTechnologies.map((tech, index) => (
                      <li key={`${tech}-${index}`} className="upload-edit-app-tech-tag">
                        <span>{tech}</span>
                        <img src={CancelIcon} alt="Remove" className="upload-edit-app-tech-delete" onClick={() => handleDeleteTech(index)} />
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
                    {errors.appDescription === "Field Missing" && <span className="upload-edit-app-field-missing">*Field Missing*</span>}
                  </div>
                  <textarea
                    className={errors.appDescription ? "error-input" : ""}
                    placeholder="App description..."
                    value={appDescription}
                    onChange={(e) => { setappDescription(e.target.value); if (errors.appDescription) setErrors((p) => ({ ...p, appDescription: null })); }}
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
                  {errors.uploadZip === "Field Missing" && <span className="upload-edit-app-field-missing">*Field Missing*</span>}
                  {errors.uploadZip === "Invalid Type" && <span className="upload-edit-app-field-missing">Error – Only ZIP files allowed</span>}
                </div>
                {uploadStage === "default" && (
                  <div
                    className={`upload-edit-app-upload ${errors.uploadZip ? "error-input" : ""}`}
                    onClick={triggerFileDialog}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <input type="file" ref={fileInputRef} style={{ display: "none" }} accept=".zip" onChange={handleFileSelect} />
                    <div className="upload-edit-app-upload-img"><img src={UploadIcon} alt="Upload" /></div>
                    <div><p><span>Click</span> or Drag here.</p></div>
                  </div>
                )}
                {uploadStage === "uploading" && (
                  <div className="upload-edit-app-uploading">
                    <div className="upload-edit-app-uploading-img-file">
                      <div className="upload-edit-app-upload-img"><img src={FolderIcon} alt="Folder" /></div>
                      <div className="upload-edit-app-uploading-text">{uploadZipName}</div>
                    </div>
                    <div className="upload-edit-app-uploading-upload-txt-close">
                      <div className="upload-edit-app-uploading-text">Uploading...</div>
                      <div className="upload-edit-app-upload-img" onClick={handleCancelUpload} style={{ cursor: "pointer" }}>
                        <img src={CancelIcon} alt="Cancel Upload" />
                      </div>
                    </div>
                  </div>
                )}
                {uploadStage === "uploaded" && (
                  <div className="upload-edit-app-uploaded">
                    <div className="upload-edit-app-uploaded-folder-file">
                      <div className="upload-edit-app-upload-img"><img src={FolderIcon} alt="Folder" /></div>
                      <div className="upload-edit-app-uploaded-text">{uploadZipName}</div>
                    </div>
                    <div className="upload-edit-app-upload-img" onClick={handleDeleteUpload} style={{ cursor: "pointer" }}>
                      <img src={TrashIcon} alt="Delete Upload" />
                    </div>
                  </div>
                )}
              </div>

              <div className="upload-edit-app-photos-line"></div>

              <div>
                <div className="upload-edit-app-label-div">
                  <h3>Upload Image/Video</h3>
                  {errors.mediaUpload === "invalid-media-type" && <span className="upload-edit-app-field-missing">Invalid image or video type</span>}
                  {errors.mediaUpload === "image-limit-exceeded" && <span className="upload-edit-app-field-missing">5 images max</span>}
                  {errors.mediaUpload === "video-limit-exceeded" && <span className="upload-edit-app-field-missing">1 video max</span>}
                  {errors.mediaUpload === "duplicate-image" && <span className="upload-edit-app-field-missing">Duplicates found</span>}
                  {errors.mediaUpload === "gif-not-allowed" && (
                    <span className="upload-edit-app-field-missing">
                      GIFs are not allowed. Please upload JPG/PNG/WebP images or MP4/WebM/MOV videos.
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
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                    ref={mediaInputRef}
                    style={{ display: "none" }}
                    onChange={handleMediaSelect}
                  />
                  <div className="upload-edit-app-upload-img"><img src={UploadIcon} alt="Upload" /></div>
                  <div><p><span>Click</span> or Drag here.</p></div>
                </div>
              </div>

              {mediaFiles.length > 0 && (
                <div>
                  <div className="upload-edit-app-label-div"><h3>Uploaded Image/Video</h3></div>
                  <div className="upload-edit-app-uploaded-images">
                    {mediaFiles.map((media, index) => (
                      <div key={index} className="uploadedImageContainer">
                        <div className="uploadedImage">
                          {media.type.startsWith("video/") && (
                            <div className="upload-edit-app-video-duration">
                              <img src={PlayIcon} alt="Play" />
                              <span>Video</span>
                            </div>
                          )}
                          <div className="upload-edit-app-uploaded-photo-trash" onClick={() => handleDeleteMedia(index)}>
                            <img src={TrashIcon} alt="Trash" />
                          </div>
                          <div
                            className={`upload-edit-app-uploaded-photo-make-presentation ${defaultPresentationIndex === index ? "selected-presentation" : ""}`}
                            onClick={() => handleMakePresentation(index)}
                          >
                            <span>{defaultPresentationIndex === index ? "Default Presentation" : "Make Presentation"}</span>
                          </div>
                          {media.type.startsWith("image/") ? (
                            <img src={media.previewURL} alt="Preview" className="previewImg" />
                          ) : (
                            <video src={media.previewURL} className="previewImg" controls />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="upload-edit-app-draft-cancel-save">
            <div className="upload-edit-app-draft">
              <button type="button" onClick={handleSaveAsDraft}>
                <img src={DraftIcon} /><span>Save as Draft</span>
              </button>
            </div>
            <div className="upload-edit-app-cancel-save">
              <div className="upload-edit-app-cancel">
                <button type="button" onClick={() => onClose(null)}>
                  <img src={CancelIcon} /><span>Cancel</span>
                </button>
              </div>
              <div className="upload-edit-app-save">
                <button type="submit" className="upload-edit-app-save-button" onClick={handleSaveAndUpload}>
                  <img src={SaveIcon} /><span>Save & Upload</span>
                </button>
              </div>
            </div>
          </div>
        </form>

        {showErrorBox && (
          <div className="upload-edit-app-error-banner">
            <img src={DangerIcon} alt="Error" className="upload-edit-app-error-icon-banner" />
            <span className="upload-edit-app-error-box-message-banner">
              {createError || "Error – Fields Missing or Invalid. Please try again."}
            </span>
            <div>
              <button className="upload-edit-app-close-banner-button">
                <img src={xIcon} alt="Close" onClick={handleCloseErrorBox} />
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
          onConfirm={handleConfirmUpload}
        />
      )}
      {isCreating && <ProcessingModal />}
    </div>
  );
};

export default ProfileUploadEditAppModal;