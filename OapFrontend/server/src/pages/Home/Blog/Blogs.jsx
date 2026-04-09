import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import searchIcon from "@assets/magnifying-glass-icon.svg";
import noImagePlaceholder from "@assets/no-image-uploaded.jpg";
import BlogsCarousel from "./BlogsCarousel/BlogsCarousel";
import { useAuthUser } from "@context/AuthUserContext";
import ContactUs from "@components/ContactUs/ContactUs";
import Footer from "@components/Footer/Footer";
import "./Blogs.css";

const Blogs = () => {
  const navigate = useNavigate();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  const { user } = useAuthUser();
  const isSignedIn = !!user;

  const [blogs, setBlogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [featured, setFeatured] = useState(null);

  const searchRef = useRef("");
  const debounceRef = useRef(null);
  const PAGE_SIZE = 6;

  const loadBlogs = useCallback(async (pageNum, query, append = false) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pageNum));
      params.set("pageSize", String(PAGE_SIZE));
      if (query?.trim()) params.set("q", query.trim());

      const res = await fetch(`/api/blog/list?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data?.blogs) {
        setBlogs((prev) => append ? [...prev, ...data.blogs] : data.blogs);
        setTotalCount(data.totalCount ?? 0);
      }
    } catch {}
    finally { setIsLoading(false); }
  }, []);

  const loadFeatured = useCallback(async () => {
    try {
      const res = await fetch("/api/blog/featured");
      const data = await res.json();
      if (res.ok && data?.blog) setFeatured(data.blog);
    } catch {}
  }, []);

  useEffect(() => {
    loadBlogs(1, "");
    loadFeatured();
  }, [loadBlogs, loadFeatured]);

  const handleSearch = useCallback((e) => {
    const val = e.target.value;
    setSearchInput(val);
    searchRef.current = val;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      loadBlogs(1, val);
    }, 300);
  }, [loadBlogs]);

  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadBlogs(nextPage, searchRef.current, true);
  }, [page, loadBlogs]);

  const hasMore = blogs.length < totalCount;

  const handleImgError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = noImagePlaceholder;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <>
      <section id="blogs" className={`${isSignedIn ? "signed-in" : "signed-out"}`}>
        <div className="blogs-main">
          <div className="blogs-title-div">
            <h2 className="blogs-title">Blogs</h2>
            <h3 className="blogs-sub-header">Explore the best blogs related to apps and Partner app.</h3>
            <div className="blogs-search-div">
              <input className="blogs-search" placeholder="Search..." value={searchInput} onChange={handleSearch} />
              <img src={searchIcon} alt="Search" className="blogs-search-icon" />
            </div>
          </div>

          <div className="blogs-cards">
            {blogs.map((blog) => (
              <div className="blogs-card" key={blog.id}>
                <div className="blogs-info">
                  <div className="blogs-header">
                    <ul className="blogs-list">
                      {blog.tag && <li className="blogs-tag-ui-ux">{blog.tag}</li>}
                      <li className="blogs-date">{formatDate(blog.publishedAt)}</li>
                    </ul>
                  </div>
                  <div>
                    <div className="blogs-header-desc-div">
                      <h4 className="blogs-header-desc">{blog.title}</h4>
                    </div>
                    <div className="blogs-entry-div">
                      <p className="blogs-entry">{blog.description || ""}</p>
                    </div>
                  </div>
                  <div className="blogs-anchor-div">
                    <Link to={`/blog/${blog.slug}`} className="blogs-read-more">Read More</Link>
                  </div>
                </div>
                <div className="blogs-image-div">
                  <img src={blog.heroImageUrl || noImagePlaceholder} alt={blog.title} onError={handleImgError} />
                </div>
              </div>
            ))}

            {!isLoading && blogs.length === 0 && (
              <div style={{ textAlign: "center", padding: "32px 0", opacity: 0.6 }}>
                {searchInput.trim() ? "No blogs found matching your search." : "No blogs published yet."}
              </div>
            )}

            {hasMore && (
              <div className="blogs-load-more-div">
                <button className="blogs-load-more" onClick={handleLoadMore} disabled={isLoading}>
                  {isLoading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </div>

          {featured && (
            <div className="blogs-unique">
              <div className="blogs-unique-card">
                <div className="blogs-unique-info">
                  <div className="blogs-unique-header">
                    <ul className="blogs-unique-list">
                      {featured.tag && <li className="blogs-unique-tag-ui-ux">{featured.tag}</li>}
                      <li className="blogs-unique-date">{formatDate(featured.publishedAt)}</li>
                    </ul>
                  </div>
                  <div>
                    <div className="blogs-unique-header-desc-div">
                      <h4 className="blogs-unique-header-desc">{featured.title}</h4>
                    </div>
                    <div className="blogs-unique-entry-div">
                      <p className="blogs-unique-entry">{featured.description || ""}</p>
                    </div>
                  </div>
                  <div className="blogs-anchor-div">
                    <Link to={`/blog/${featured.slug}`} className="blogs-unique-read-more">Read More</Link>
                  </div>
                </div>
                <div className="blogs-unique-image-div">
                  <img src={featured.heroImageUrl || noImagePlaceholder} alt={featured.title} onError={handleImgError} />
                </div>
              </div>
            </div>
          )}
        </div>
        <BlogsCarousel />
      </section>
      <ContactUs />
      <Footer />
    </>
  );
};

export default Blogs;