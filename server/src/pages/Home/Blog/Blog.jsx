import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import blogData from "../../../data/blogData";
import searchIcon from "../../../assets/Blogs/search-normal.svg";
import "./Blog.css";
const Blog = () => {
  const [expandedBlogIndex, setExpandedBlogIndex] = useState(null);
  const navigate = useNavigate();

  const toggleReadMore = (index) => {
    setExpandedBlogIndex(expandedBlogIndex === index ? null : index);
  };

  const handleCardClick = (blogId) => {
    navigate("/blog/edit");
  };

  return (
    <section id="blog" className="page-container">
      <div className="mainSubDiv">
        <div className="col-full headers">
          <div className="title-a">Blogs</div>
          <div className="line-mf">
            Explore the best blogs related to apps and Partner app.
          </div>
          <div className="search-bar">
            <div className="search-placeholder">Any blog title...</div>
            <img src={searchIcon} alt="Close" className="search-icon" />
          </div>
        </div>
      </div>
      <div className="blog-grid">
        {blogData.map((blog, index) => (
          <div
            className="card"
            key={index}
            onClick={() => handleCardClick(blog.id || index)}
          >
            <div className="card-body">
              <div className="body-header">
                <div className={`tag tag-${blog.tag.toLowerCase()}`}>
                  {blog.tag}
                </div>
                <div className="body-date">{blog.Date}</div>
              </div>
              <div className="blog-content">
                <div className="blog-title">{blog.title}</div>
                <div className="blog-description">{blog.description}</div>
              </div>
              {expandedBlogIndex === index && (
                <div className="blogEntry roboto-regular">
                  <div dangerouslySetInnerHTML={{ __html: blog.content }} />
                </div>
              )}
              <div className="readMore" onClick={() => toggleReadMore(index)}>
                {expandedBlogIndex === index ? "Show Less" : "Read More"}
              </div>
            </div>
            <div className="card-header">
              <img src={blog.image} alt={blog.title} />
            </div>
          </div>
        ))}
        <div className="loadmore-btn">Load More</div>
      </div>
    </section>
  );
};

export default Blog;
