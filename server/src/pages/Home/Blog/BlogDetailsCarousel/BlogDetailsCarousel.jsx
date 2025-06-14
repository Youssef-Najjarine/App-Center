import React from 'react';
import blogImg1 from "../../../../assets/Blogs/1.png";
import blogImg2 from "../../../../assets/Blogs/2.png";
import blogImg3 from "../../../../assets/Blogs/3.png";
import blogImg4 from "../../../../assets/Blogs/12.jpg";
import blogImg5 from "../../../../assets/Blogs/13.jpg";
import './BlogDetailsCarousel.css';

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

const BlogCarousel = () => {
  const loopedBlogs = [...blogData, ...blogData];

  return (
    <section className="blog-details-carousel-section">
        <div className="blog-details-carousel-title-div">
          <h2 className="blog-details-carousel-title">Related Blogs</h2>
          <h3 className='blog-details-carousel-sub-title'>Explore the best blogs related to apps and Partner app.</h3>
        </div>
      <div className="blog-details-carousel-container">
        <div className="blog-details-carousel-track">
          {loopedBlogs.map((blog, i) => (
            <div className="blog-details-carousel-card" key={i}>
              <div className="blog-details-carousel-image-div">
                <img src={blog.image} alt={blog.title} />
              </div>
              <div className="blog-details-carousel-info">
                <div className="blog-details-carousel-header">
                  <ul className="blog-details-carousel-list">
                    <li className="blog-details-carousel-tag-ui-ux">{blog.tag}</li>
                    <li className="blog-details-carousel-date">{blog.date}</li>
                  </ul>
                </div>
                <h4 className="blog-details-carousel-header-desc">{blog.title}</h4>
                <p className="blog-details-carousel-entry">{blog.excerpt}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BlogCarousel;
