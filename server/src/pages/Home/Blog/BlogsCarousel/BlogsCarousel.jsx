import React from 'react';
import { useNavigate } from "react-router-dom";
import blogImg1 from "../../../../assets/Blogs/1.png";
import blogImg2 from "../../../../assets/Blogs/2.png";
import blogImg3 from "../../../../assets/Blogs/3.png";
import blogImg4 from "../../../../assets/Blogs/12.jpg";
import blogImg5 from "../../../../assets/Blogs/13.jpg";
import './BlogsCarousel.css';

const blogData = [
  {
    title: 'Title of the Blog',
    date: 'Aug 13, 2024',
    tag: 'UI/UX Design',
    excerpt: `Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...`,
    image: blogImg1,
  },
  {
    title: 'Title of the Blog',
    date: 'Aug 13, 2024',
    tag: 'UI/UX Design',
    excerpt: `Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...`,
    image: blogImg2,
  },
  {
    title: 'Title of the Blog',
    date: 'Aug 13, 2024',
    tag: 'UI/UX Design',
    excerpt: `Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...`,
    image: blogImg3,
  },
  {
    title: 'Title of the Blog',
    date: 'Aug 13, 2024',
    tag: 'UI/UX Design',
    excerpt: `Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...`,
    image: blogImg4,
  },
  {
    title: 'Title of the Blog',
    date: 'Aug 13, 2024',
    tag: 'UI/UX Design',
    excerpt: `Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...`,
    image: blogImg5,
  }
];

const BlogsCarousel = () => {
  const navigate = useNavigate();
  const loopedBlogs = [...blogData, ...blogData];
  const handleCardClick = () => {
    navigate("/blog/blogDetails");
  };
  return (
    <section className="blogs-carousel-section">
        <div className="blog-carousel-title-div">
          <h2 className="blogs-carousel-title">Trending Blogs</h2>
        </div>
      <div className="blogs-carousel-container">
        <div className="blogs-carousel-track">
          {loopedBlogs.map((blog, i) => (
            <div 
              className="blogs-carousel-card" 
              key={i}
              onClick={handleCardClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleCardClick()}
            >
              <div className="blogs-carousel-image-div">
                <img src={blog.image} alt={blog.title} />
              </div>
              <div className="blogs-carousel-info">
                <div className="blogs-carousel-header">
                  <ul className="blogs-carousel-list">
                    <li className="blogs-carousel-tag-ui-ux">{blog.tag}</li>
                    <li className="blogs-carousel-date">{blog.date}</li>
                  </ul>
                </div>
                <h4 className="blogs-carousel-header-desc">{blog.title}</h4>
                <p className="blogs-carousel-entry">{blog.excerpt}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BlogsCarousel;
