import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminAuth } from "@context/AdminAuthContext";
import ConfirmationModal from "@pages/ConfirmationModal/ConfirmationModal";
import ProcessingModal from "@pages/ProcessingModal/ProcessingModal";
import searchIcon from "@assets/magnifying-glass-icon.svg";
import sortIcon from "@assets/sort-by-icon.svg";
import addIcon from "@assets/add-circle-icon.svg";
import expandIcon from "@assets/three-dots-expand-icon.svg";
import editIcon from "@assets/purple-view-details-icon.svg";
import trashIcon from "@assets/red-give-refund-icon.svg";
import noImagePlaceholder from "@assets/no-image-uploaded.jpg";
import "./AdminBlogManagement.css";

const AdminBlogManagement = () => {
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuth();

  const [blogs, setBlogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortOption, setSortOption] = useState("Latest");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const sortByRef = useRef(null);
  const dropdownRefs = useRef({});
  const searchDebounceRef = useRef(null);
  const sortRef = useRef("Latest");
  const searchRef = useRef("");

  useEffect(() => { sortRef.current = sortOption; }, [sortOption]);
  useEffect(() => { searchRef.current = searchInput; }, [searchInput]);

  useEffect(() => {
    const handler = (e) => {
      if (expandedId && dropdownRefs.current[expandedId]?.current && !dropdownRefs.current[expandedId].current.contains(e.target))
        setExpandedId(null);
      if (sortDropdownOpen && sortByRef.current && !sortByRef.current.contains(e.target))
        setSortDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expandedId, sortDropdownOpen]);

  const loadBlogs = useCallback(async (sort, query) => {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (sort && sort !== "Latest") params.set("sort", sort);
      if (query?.trim()) params.set("q", query.trim());
      const qs = params.toString();
      const url = qs ? `/api/admin/blog/list?${qs}` : "/api/admin/blog/list";
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (res.ok && data?.blogs) setBlogs(data.blogs);
      else setError("Unable to load blogs.");
    } catch { setError("Unable to connect to the server."); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadBlogs("Latest", ""); }, [loadBlogs]);

  const handleSearch = useCallback((e) => {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => loadBlogs(sortRef.current, val), 300);
  }, [loadBlogs]);

  const handleSortChange = useCallback((option) => {
    setSortOption(option);
    setSortDropdownOpen(false);
    loadBlogs(option, searchRef.current);
  }, [loadBlogs]);

  const handleDelete = useCallback(async () => {
    if (!confirmAction) return;
    setConfirmAction(null);
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/blog/${confirmAction.blogId}`, { method: "DELETE", credentials: "include" });
      if (res.ok) loadBlogs(sortRef.current, searchRef.current);
    } catch {}
    finally { setIsProcessing(false); }
  }, [confirmAction, loadBlogs]);

  const hasNoBlogs = !isLoading && !error && blogs.length === 0;

  return (
    <div className="admin-blog-mgmt">
      <div className="admin-blog-mgmt-header">
        <div className="admin-blog-mgmt-header-left">
          <h1>Blog Management</h1>
          <button className="admin-blog-mgmt-back" onClick={() => navigate("/admin/dashboard")}>Dashboard</button>
          <button className="admin-blog-mgmt-logout" onClick={() => logout()}>Logout</button>
        </div>
        <Link to="/admin/blogs/create" className="admin-blog-mgmt-create-btn">
          <img src={addIcon} alt="" />
          <span>Create Blog</span>
        </Link>
      </div>

      <div className="admin-blog-mgmt-filters">
        <div className="admin-blog-mgmt-search-div">
          <input className="admin-blog-mgmt-search" placeholder="Search blogs..." value={searchInput} onChange={handleSearch} />
          <img src={searchIcon} alt="Search" className="admin-blog-mgmt-search-icon" />
        </div>
        <div className="admin-blog-mgmt-sort-div" ref={sortByRef} onClick={() => setSortDropdownOpen((p) => !p)}>
          <img src={sortIcon} alt="Sort" />
          <span>Sort By: {sortOption}</span>
          {sortDropdownOpen && (
            <ul className="admin-blog-mgmt-sort-dropdown">
              {["Latest", "Popular", "A-Z", "Z-A"].map((opt) => (
                <li key={opt} className={sortOption === opt ? "active" : ""} onClick={(e) => { e.stopPropagation(); handleSortChange(opt); }}>{opt}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {isLoading && <div className="admin-blog-mgmt-loading">Loading blogs...</div>}
      {error && <div className="admin-blog-mgmt-loading">{error}</div>}

      {hasNoBlogs && (
        <div className="admin-blog-mgmt-empty">
          <h3>No blogs yet</h3>
          <p>Create your first blog post to get started.</p>
          <Link to="/admin/blogs/create" className="admin-blog-mgmt-empty-cta">Create Blog</Link>
        </div>
      )}

      <div className="admin-blog-mgmt-grid">
        {blogs.map((blog) => {
          if (!dropdownRefs.current[blog.id]) dropdownRefs.current[blog.id] = React.createRef();
          const dateStr = blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Draft";

          return (
            <div className="admin-blog-mgmt-card" key={blog.id}>
              <div className="admin-blog-mgmt-card-image">
                <img src={blog.heroImageUrl || noImagePlaceholder} alt={blog.title} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = noImagePlaceholder; }} />
              </div>
              <div className="admin-blog-mgmt-card-body">
                <div className="admin-blog-mgmt-card-header">
                  <div className="admin-blog-mgmt-card-meta">
                    <span className={`admin-blog-mgmt-status ${blog.isPublished ? "published" : "draft"}`}>{blog.isPublished ? "Published" : "Draft"}</span>
                    {blog.isFeatured && <span className="admin-blog-mgmt-featured">Featured</span>}
                    {blog.tag && <span className="admin-blog-mgmt-tag">{blog.tag}</span>}
                  </div>
                  <div className="admin-blog-mgmt-expand" ref={dropdownRefs.current[blog.id]}
                    onClick={(e) => { e.stopPropagation(); setExpandedId((p) => p === blog.id ? null : blog.id); }}>
                    <button><img src={expandIcon} alt="More" /></button>
                    {expandedId === blog.id && (
                      <div className="admin-blog-mgmt-dropdown">
                        <div className="admin-blog-mgmt-dropdown-item edit" onClick={(e) => { e.stopPropagation(); navigate(`/admin/blogs/edit/${blog.id}`); setExpandedId(null); }}>
                          <img src={editIcon} alt="Edit" /><span>Edit</span>
                        </div>
                        <div className="admin-blog-mgmt-dropdown-item delete" onClick={(e) => {
                          e.stopPropagation(); setExpandedId(null);
                          setConfirmAction({ blogId: blog.id, title: `Delete "${blog.title}"?`, subtitle: "This will permanently delete this blog post and all its images." });
                        }}>
                          <img src={trashIcon} alt="Delete" /><span>Delete</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <h3 className="admin-blog-mgmt-card-title">{blog.title}</h3>
                <div className="admin-blog-mgmt-card-footer">
                  <span>{dateStr}</span>
                  <span>{blog.viewCount} views</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {confirmAction && (
        <ConfirmationModal
          modalOpenState={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleDelete}
          title={confirmAction.title}
          subtitle={confirmAction.subtitle}
        />
      )}
      {isProcessing && <ProcessingModal modalOpenState={isProcessing} message="Deleting blog..." />}
    </div>
  );
};

export default AdminBlogManagement;