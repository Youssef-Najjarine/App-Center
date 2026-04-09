import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import ArrowBackIcon from "@assets/back-arrow-icon.svg";
import noImagePlaceholder from "@assets/no-image-uploaded.jpg";
import BlogDetailsCarousel from "./BlogDetailsCarousel/BlogDetailsCarousel";
import ContactUs from "@components/ContactUs/ContactUs";
import Footer from "@components/Footer/Footer";
import { useAuthUser } from "@context/AuthUserContext";
import "./BlogDetails.css";

const BlogDetails = () => {
  const { slug } = useParams();
  const { user } = useAuthUser();
  const isSignedIn = !!user;

  const [blog, setBlog] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    const fetchBlog = async () => {
      setIsLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/blog/detail/${slug}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data?.blog) setBlog(data.blog);
        else setError("Blog not found.");
      } catch {
        if (!cancelled) setError("Unable to connect to the server.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchBlog();
    return () => { cancelled = true; };
  }, [slug]);

  const handleImgError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = noImagePlaceholder;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (isLoading) {
    return (
      <>
        <section id="blog-details" className={`${isSignedIn ? "signed-in" : "signed-out"}`}>
          <div className="blog-details-main">
            <div style={{ textAlign: "center", padding: "48px 0", opacity: 0.6 }}>Loading blog...</div>
          </div>
        </section>
        <ContactUs />
        <Footer />
      </>
    );
  }

  if (error || !blog) {
    return (
      <>
        <section id="blog-details" className={`${isSignedIn ? "signed-in" : "signed-out"}`}>
          <div className="blog-details-main">
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <p>{error || "Blog not found."}</p>
              <Link to="/blogs" style={{ color: "#5541D7", fontWeight: 600 }}>Back to Blogs</Link>
            </div>
          </div>
        </section>
        <ContactUs />
        <Footer />
      </>
    );
  }

  const sections = blog.sections || [];
  const imageSections = sections.filter((s) => s.sectionType === 1);
  const textSections = sections.filter((s) => s.sectionType === 0);
  const headingSections = sections.filter((s) => s.sectionType === 2);

  const heroImage = imageSections[0]?.imageUrl;
  const section1Text = textSections[0]?.textContent;
  const image2 = imageSections[1]?.imageUrl;
  const section2Heading = headingSections[0]?.textContent;
  const section2Text = textSections[1]?.textContent;
  const image3 = imageSections[2]?.imageUrl;
  const image4 = imageSections[3]?.imageUrl;

  return (
    <>
      <section id="blog-details" className={`${isSignedIn ? "signed-in" : "signed-out"}`}>
        <div className="blog-details-main">
          <div className="blog-details-title-div">
            <ul className="blog-details-list">
              <Link to="/blogs">
                <img src={ArrowBackIcon} alt="Back" className="blog-details-back-arrow" />
              </Link>
              {blog.tag && <li className="blog-details-tag-ui-ux">{blog.tag}</li>}
              <li className="blog-details-date">{formatDate(blog.publishedAt)}</li>
            </ul>
            <div className="blog-details-title-wrapper">
              <h2 className="blog-details-title">{blog.title}</h2>
            </div>
          </div>
          <div className="blog-details-card">
            {heroImage && (
              <div className="blog-details-part1-image-div">
                <img src={heroImage} alt={blog.title} onError={handleImgError} />
              </div>
            )}

            {section1Text && (
              <div className="blog-details-part1-entry">
                <p>{section1Text}</p>
              </div>
            )}

            {image2 && (
              <div className="blog-details-part2-image-div">
                <img src={image2} alt="" onError={handleImgError} />
              </div>
            )}

            {(section2Heading || section2Text) && (
              <div className="blog-details-part2-entry">
                <div className="blog-details-part2-entry-div">
                  {section2Heading && <h3>{section2Heading}</h3>}
                </div>
                <div className="blog-details-part2-entry-description-div">
                  {section2Text && <p>{section2Text}</p>}
                </div>
              </div>
            )}

            {(image3 || image4) && (
              <div className="blog-details-part3-4-row">
                {image3 && (
                  <div className="blog-details-part3-image-div">
                    <img src={image3} alt="" onError={handleImgError} />
                  </div>
                )}
                {image4 && (
                  <div className="blog-details-part4-image-div">
                    <img src={image4} alt="" onError={handleImgError} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <BlogDetailsCarousel slug={slug} tag={blog.tag} />
        <div className="blog-details-view-all-div">
          <Link to="/blogs">
            <button className="blog-details-view-all">View All</button>
          </Link>
        </div>
      </section>
      <ContactUs />
      <Footer />
    </>
  );
};

export default BlogDetails;