import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import noImagePlaceholder from "@assets/no-image-uploaded.jpg";
import "./BlogsCarousel.css";

const SPEED = 60;

const BlogsCarousel = () => {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const trackRef = useRef(null);
  const offsetRef = useRef(0);
  const rafRef = useRef(null);
  const lastTsRef = useRef(null);
  const halfWidthRef = useRef(0);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await fetch("/api/blog/trending?count=10");
        const data = await res.json();
        if (res.ok && data?.blogs) setBlogs(data.blogs);
      } catch {}
    };
    fetchTrending();
  }, []);

  const startLoop = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    if (track.children.length === 0) return;

    halfWidthRef.current = track.scrollWidth / 2;
    offsetRef.current = -halfWidthRef.current;
    lastTsRef.current = null;

    const tick = (ts) => {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = Math.min(ts - lastTsRef.current, 50);
      lastTsRef.current = ts;

      offsetRef.current += (SPEED * dt) / 1000;

      if (offsetRef.current >= 0) {
        offsetRef.current -= halfWidthRef.current;
      }

      track.style.transform = `translateX(${offsetRef.current}px)`;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (blogs.length === 0) return;
    const timer = requestAnimationFrame(() => startLoop());
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(timer);
    };
  }, [blogs, startLoop]);

  if (blogs.length === 0) return null;

  const padded = [];
  while (padded.length < 10) padded.push(...blogs);
  const loopedBlogs = [...padded, ...padded];

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const handleImgError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = noImagePlaceholder;
  };

  return (
    <section className="blogs-carousel-section">
      <div className="blogs-carousel-title-div">
        <h2 className="blogs-carousel-title">Trending Blogs</h2>
        <h3 className="blogs-carousel-sub-title">The most popular blogs based on views.</h3>
      </div>
      <div className="blogs-carousel-container">
        <div className="blogs-carousel-track" ref={trackRef}>
          {loopedBlogs.map((blog, i) => (
            <div
              className="blogs-carousel-card"
              key={`${blog.id}-${i}`}
              onClick={() => navigate(`/blog/${blog.slug}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && navigate(`/blog/${blog.slug}`)}
            >
              <div className="blogs-carousel-image-div">
                <img src={blog.heroImageUrl || noImagePlaceholder} alt={blog.title} onError={handleImgError} />
              </div>
              <div className="blogs-carousel-info">
                <div className="blogs-carousel-header">
                  <ul className="blogs-carousel-list">
                    {blog.tag && <li className="blogs-carousel-tag">{blog.tag}</li>}
                    <li className="blogs-carousel-date">{formatDate(blog.publishedAt)}</li>
                  </ul>
                </div>
                <div className="blogs-carousel-header-desc-div">
                  <h4 className="blogs-carousel-header-desc">{blog.title}</h4>
                </div>
                <div className="blogs-carousel-entry-div">
                  <p className="blogs-carousel-entry">{blog.description || ""}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BlogsCarousel;