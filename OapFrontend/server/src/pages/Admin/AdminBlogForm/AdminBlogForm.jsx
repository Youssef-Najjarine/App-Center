import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@context/AdminAuthContext";
import ProcessingModal from "@pages/ProcessingModal/ProcessingModal";
import uploadIcon from "@assets/black-outline-upload-icon.svg";
import trashIcon from "@assets/red-give-refund-icon.svg";
import noImagePlaceholder from "@assets/no-image-uploaded.jpg";
import "./AdminBlogForm.css";

const DEFAULT_TAGS = ["UI/UX Design", "AI", "Development", "Mobile App", "Web App", "Cloud", "DevOps", "Cybersecurity", "Other"];

const AdminBlogForm = ({ mode = "create", initialData = null }) => {
  const navigate = useNavigate();
  const { admin } = useAdminAuth();

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [tag, setTag] = useState(initialData?.tag ?? "");
  const [isPublished, setIsPublished] = useState(initialData?.isPublished ?? false);
  const [isFeatured, setIsFeatured] = useState(initialData?.isFeatured ?? false);
  const [section1Text, setSection1Text] = useState(initialData?.section1Text ?? "");
  const [section2Heading, setSection2Heading] = useState(initialData?.section2Heading ?? "");
  const [section2Text, setSection2Text] = useState(initialData?.section2Text ?? "");

  const [heroPreview, setHeroPreview] = useState(initialData?.heroImageUrl ?? "");
  const [img2Preview, setImg2Preview] = useState(initialData?.image2Url ?? "");
  const [img3Preview, setImg3Preview] = useState(initialData?.image3Url ?? "");
  const [img4Preview, setImg4Preview] = useState(initialData?.image4Url ?? "");

  const [heroFile, setHeroFile] = useState(null);
  const [img2File, setImg2File] = useState(null);
  const [img3File, setImg3File] = useState(null);
  const [img4File, setImg4File] = useState(null);

  const [removeHero, setRemoveHero] = useState(false);
  const [removeImg2, setRemoveImg2] = useState(false);
  const [removeImg3, setRemoveImg3] = useState(false);
  const [removeImg4, setRemoveImg4] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [tagInput, setTagInput] = useState(initialData?.tag ?? "");
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const tagDropdownRef = useRef(null);

  const heroRef = useRef(null);
  const img2Ref = useRef(null);
  const img3Ref = useRef(null);
  const img4Ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target))
        setTagDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredTags = DEFAULT_TAGS.filter((t) =>
    t.toLowerCase().includes(tagInput.toLowerCase().trim())
  );
  const showCreateOption = tagInput.trim() && !DEFAULT_TAGS.some((t) => t.toLowerCase() === tagInput.trim().toLowerCase());

  const selectTag = (val) => {
    setTag(val);
    setTagInput(val);
    setTagDropdownOpen(false);
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (tagInput.trim()) {
        selectTag(tagInput.trim());
      }
    }
  };

  const handleImageSelect = (e, setFile, setPreview, setRemove) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setFile(file);
    setPreview(URL.createObjectURL(file));
    setRemove(false);
  };

  const handleImageRemove = (setFile, setPreview, setRemove) => {
    setFile(null);
    setPreview("");
    setRemove(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setIsSaving(true);

    try {
      const fd = new FormData();
      fd.append("Title", title.trim());
      fd.append("Tag", tag);
      fd.append("IsPublished", String(isPublished));
      fd.append("IsFeatured", String(isFeatured));
      if (section1Text.trim()) fd.append("Section1Text", section1Text.trim());
      if (section2Heading.trim()) fd.append("Section2Heading", section2Heading.trim());
      if (section2Text.trim()) fd.append("Section2Text", section2Text.trim());

      if (heroFile) fd.append("HeroImage", heroFile);
      if (img2File) fd.append("Image2", img2File);
      if (img3File) fd.append("Image3", img3File);
      if (img4File) fd.append("Image4", img4File);

      if (mode === "edit") {
        fd.append("RemoveHeroImage", String(removeHero));
        fd.append("RemoveImage2", String(removeImg2));
        fd.append("RemoveImage3", String(removeImg3));
        fd.append("RemoveImage4", String(removeImg4));
      }

      const url = mode === "edit" ? `/api/admin/blog/${initialData.id}` : "/api/admin/blog";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, { method, credentials: "include", body: fd });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data?.error || "Failed to save blog.");
        return;
      }

      navigate("/admin/blogs", { replace: true });
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderImageSlot = (label, preview, fileRef, setFile, setPreview, setRemove, isRemoved) => (
    <div className="admin-blog-form-image-slot">
      <label className="admin-blog-form-image-label">{label}</label>
      <div className="admin-blog-form-image-box" onClick={() => fileRef.current?.click()}>
        {preview && !isRemoved ? (
          <img src={preview} alt={label} className="admin-blog-form-image-preview" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = noImagePlaceholder; }} />
        ) : (
          <div className="admin-blog-form-image-empty">
            <img src={uploadIcon} alt="Upload" />
            <span>Click to upload</span>
          </div>
        )}
      </div>
      {preview && !isRemoved && (
        <button type="button" className="admin-blog-form-image-remove" onClick={() => handleImageRemove(setFile, setPreview, setRemove)}>
          <img src={trashIcon} alt="Remove" />
          <span>Remove</span>
        </button>
      )}
      <input type="file" accept="image/*" ref={fileRef} style={{ display: "none" }}
        onChange={(e) => handleImageSelect(e, setFile, setPreview, setRemove)} />
    </div>
  );

  if (isSaving) return <ProcessingModal modalOpenState={true} message="Saving blog..." />;

  return (
    <div className="admin-blog-form">
      <div className="admin-blog-form-header">
        <h1>{mode === "edit" ? "Edit Blog" : "Create Blog"}</h1>
        <button className="admin-blog-form-cancel" onClick={() => navigate("/admin/blogs")}>Cancel</button>
      </div>

      <form onSubmit={handleSubmit} className="admin-blog-form-body">
        <div className="admin-blog-form-field">
          <label>Title <span className="admin-blog-form-required">*</span></label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Blog title..." />
        </div>

        <div className="admin-blog-form-row">
          <div className="admin-blog-form-field">
            <label>Tag</label>
            <div className="admin-blog-form-tag-combobox" ref={tagDropdownRef}>
              <input
                type="text"
                className="admin-blog-form-tag-input"
                value={tagInput}
                onChange={(e) => { setTagInput(e.target.value); setTagDropdownOpen(true); }}
                onFocus={() => setTagDropdownOpen(true)}
                onKeyDown={handleTagKeyDown}
                placeholder="Search or type a new tag..."
                autoComplete="off"
              />
              {tag && tagInput && (
                <button type="button" className="admin-blog-form-tag-clear" onClick={() => { setTag(""); setTagInput(""); }}>×</button>
              )}
              {tagDropdownOpen && (filteredTags.length > 0 || showCreateOption) && (
                <ul className="admin-blog-form-tag-dropdown">
                  {filteredTags.map((t) => (
                    <li
                      key={t}
                      className={`admin-blog-form-tag-option ${t === tag ? "selected" : ""}`}
                      onClick={() => selectTag(t)}
                    >
                      {t}
                    </li>
                  ))}
                  {showCreateOption && (
                    <li className="admin-blog-form-tag-option create" onClick={() => selectTag(tagInput.trim())}>
                      Create "<strong>{tagInput.trim()}</strong>"
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
          <div className="admin-blog-form-toggles">
            <label className="admin-blog-form-toggle">
              <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
              <span>Published</span>
            </label>
            <label className="admin-blog-form-toggle">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
              <span>Featured</span>
            </label>
          </div>
        </div>

        <div className="admin-blog-form-section-title">Hero Image (Make Presentation)</div>
        {renderImageSlot("Hero Image", heroPreview, heroRef, setHeroFile, setHeroPreview, setRemoveHero, removeHero)}

        <div className="admin-blog-form-section-title">Section 1 — Introduction</div>
        <div className="admin-blog-form-field">
          <label>Paragraph Text</label>
          <textarea value={section1Text} onChange={(e) => setSection1Text(e.target.value)} placeholder="First paragraph of the blog..." rows={8} />
        </div>

        <div className="admin-blog-form-section-title">Image 2 — Mid Article</div>
        {renderImageSlot("Image 2", img2Preview, img2Ref, setImg2File, setImg2Preview, setRemoveImg2, removeImg2)}

        <div className="admin-blog-form-section-title">Section 2 — Body</div>
        <div className="admin-blog-form-field">
          <label>Heading</label>
          <input type="text" value={section2Heading} onChange={(e) => setSection2Heading(e.target.value)} placeholder="Section heading..." />
        </div>
        <div className="admin-blog-form-field">
          <label>Paragraph Text</label>
          <textarea value={section2Text} onChange={(e) => setSection2Text(e.target.value)} placeholder="Second section text..." rows={8} />
        </div>

        <div className="admin-blog-form-section-title">Images 3 & 4 — Bottom Row (Side by Side)</div>
        <div className="admin-blog-form-images-row">
          {renderImageSlot("Image 3 (Left)", img3Preview, img3Ref, setImg3File, setImg3Preview, setRemoveImg3, removeImg3)}
          {renderImageSlot("Image 4 (Right)", img4Preview, img4Ref, setImg4File, setImg4Preview, setRemoveImg4, removeImg4)}
        </div>

        {error && <p className="admin-blog-form-error">{error}</p>}

        <div className="admin-blog-form-actions">
          <button type="button" className="admin-blog-form-cancel-btn" onClick={() => navigate("/admin/blogs")}>Cancel</button>
          <button type="submit" className="admin-blog-form-submit-btn">{mode === "edit" ? "Save Changes" : "Create Blog"}</button>
        </div>
      </form>
    </div>
  );
};

export default AdminBlogForm;