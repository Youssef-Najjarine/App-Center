import React, { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import searchIcon from "../../../assets/Blogs/search-normal.svg";
import blogImg1 from "../../../assets/Blogs/1.png";
import blogImg2 from "../../../assets/Blogs/2.png";
import blogImg3 from "../../../assets/Blogs/3.png";
import blogImg4 from "../../../assets/Blogs/4.png";
import blogImg5 from "../../../assets/Blogs/5.png";
import blogImg6 from "../../../assets/Blogs/6.png";
import blogImg7 from "../../../assets/Blogs/7.png";
import BlogCarousel from "./BlogsCarousel/BlogsCarousel";
import "./Blogs.css";

const Blogs = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  return (
    <section id="blogs">
      <div className="blogs-main">
        <div className="blogs-title-div">
            <h2 className="blogs-title">Blogs</h2>
            <h3 className="blogs-sub-header">
              Explore the best blogs related to apps and Partner app.
            </h3>
            <div className="blogs-search-div">
              <input className="blogs-search" placeholder="Search..."/>
              <img src={searchIcon} alt="Blog Search" className="blogs-search-icon" />
            </div>
        </div>
        <div className="blogs-cards">
          <div className="blogs-card">
            <div className="blogs-info">
              <div className="blogs-header">
                <ul className="blogs-list">
                  <li className="blogs-tag-ui-ux">UI/UX Design</li>
                  <li className="blogs-date">Aug 13, 2024</li>
                </ul>
              </div>
              <div>
                <h4 className="blogs-header-desc">
                  Title of the Blog
                </h4>
                <p className="blogs-entry">
                  Lorem Ipsum is simply dummy text of the printing and typesetting industry. 
                  Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, 
                  when an unknown printer took a galley of type and scrambled it to make a type 
                  specimen book. It has survived not only five centuries, but also the leap into 
                  electronic typesetting, remaining essentially unchanged. It was popularised in 
                  the 1960s with the...
                </p>
              </div>
              <div className="blogs-anchor-div">
                <Link to="/blog/blogDetails" className="blogs-read-more">Read More</Link>
              </div>
            </div>
            <div className="blogs-image-div">
              <img src={blogImg1} alt="Title of the Blog" />
            </div>
          </div>
          <div className="blogs-card">
            <div className="blogs-info">
              <div className="blogs-header">
                <ul className="blogs-list">
                  <li className="blogs-tag-ui-ux">UI/UX Design</li>
                  <li className="blogs-date">Aug 13, 2024</li>
                </ul>
              </div>
              <div>
                <h4 className="blogs-header-desc">
                  Title of the Blog
                </h4>
                <p className="blogs-entry">
                  Lorem Ipsum is simply dummy text of the printing and typesetting industry. 
                  Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, 
                  when an unknown printer took a galley of type and scrambled it to make a type 
                  specimen book. It has survived not only five centuries, but also the leap into 
                  electronic typesetting, remaining essentially unchanged. It was popularised in 
                  the 1960s with the...
                </p>
              </div>
              <div className="blogs-anchor-div">
                <Link to="/blog/blogDetails" className="blogs-read-more">Read More</Link>
              </div>
            </div>
            <div className="blogs-image-div">
              <img src={blogImg2} alt="Title of the Blog" />
            </div>
          </div>
          <div className="blogs-card">
            <div className="blogs-info">
              <div className="blogs-header">
                <ul className="blogs-list">
                  <li className="blogs-tag-ui-ux">UI/UX Design</li>
                  <li className="blogs-date">Aug 13, 2024</li>
                </ul>
              </div>
              <div>
                <h4 className="blogs-header-desc">
                  Title of the Blog
                </h4>
                <p className="blogs-entry">
                  Lorem Ipsum is simply dummy text of the printing and typesetting industry. 
                  Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, 
                  when an unknown printer took a galley of type and scrambled it to make a type 
                  specimen book. It has survived not only five centuries, but also the leap into 
                  electronic typesetting, remaining essentially unchanged. It was popularised in 
                  the 1960s with the...
                </p>
              </div>
              <div className="blogs-anchor-div">
                <Link to="/blog/blogDetails" className="blogs-read-more">Read More</Link>
              </div>
            </div>
            <div className="blogs-image-div">
              <img src={blogImg3} alt="Title of the Blog" />
            </div>
          </div>
          <div className="blogs-card">
            <div className="blogs-info">
              <div className="blogs-header">
                <ul className="blogs-list">
                  <li className="blogs-tag-ui-ux">UI/UX Design</li>
                  <li className="blogs-date">Aug 13, 2024</li>
                </ul>
              </div>
              <div>
                <h4 className="blogs-header-desc">
                  Title of the Blog
                </h4>
                <p className="blogs-entry">
                  Lorem Ipsum is simply dummy text of the printing and typesetting industry. 
                  Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, 
                  when an unknown printer took a galley of type and scrambled it to make a type 
                  specimen book. It has survived not only five centuries, but also the leap into 
                  electronic typesetting, remaining essentially unchanged. It was popularised in 
                  the 1960s with the...
                </p>
              </div>
              <div className="blogs-anchor-div">
                <Link to="/blog/blogDetails" className="blogs-read-more">Read More</Link>
              </div>
            </div>
            <div className="blogs-image-div">
              <img src={blogImg4} alt="Title of the Blog" />
            </div>
          </div>
          <div className="blogs-card">
            <div className="blogs-info">
              <div className="blogs-header">
                <ul className="blogs-list">
                  <li className="blogs-tag-ui-ux">UI/UX Design</li>
                  <li className="blogs-date">Aug 13, 2024</li>
                </ul>
              </div>
              <div>
                <h4 className="blogs-header-desc">
                  Title of the Blog
                </h4>
                <p className="blogs-entry">
                  Lorem Ipsum is simply dummy text of the printing and typesetting industry. 
                  Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, 
                  when an unknown printer took a galley of type and scrambled it to make a type 
                  specimen book. It has survived not only five centuries, but also the leap into 
                  electronic typesetting, remaining essentially unchanged. It was popularised in 
                  the 1960s with the...
                </p>
              </div>
              <div className="blogs-anchor-div">
                <Link to="/blog/blogDetails" className="blogs-read-more">Read More</Link>
              </div>
            </div>
            <div className="blogs-image-div">
              <img src={blogImg5} alt="Title of the Blog" />
            </div>
          </div>
          <div className="blogs-card">
            <div className="blogs-info">
              <div className="blogs-header">
                <ul className="blogs-list">
                  <li className="blogs-tag-ui-ux">UI/UX Design</li>
                  <li className="blogs-date">Aug 13, 2024</li>
                </ul>
              </div>
              <div>
                <h4 className="blogs-header-desc">
                  Title of the Blog
                </h4>
                <p className="blogs-entry">
                  Lorem Ipsum is simply dummy text of the printing and typesetting industry. 
                  Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, 
                  when an unknown printer took a galley of type and scrambled it to make a type 
                  specimen book. It has survived not only five centuries, but also the leap into 
                  electronic typesetting, remaining essentially unchanged. It was popularised in 
                  the 1960s with the...
                </p>
              </div>
              <div className="blogs-anchor-div">
                <Link to="/blog/blogDetails" className="blogs-read-more">Read More</Link>
              </div>
            </div>
            <div className="blogs-image-div">
              <img src={blogImg6} alt="Title of the Blog" />
            </div>
          </div>
          <div className="blogs-load-more-div">
            <button className="blogs-load-more">Load More</button>
          </div>
        </div>
        <div className="blogs-unique">
            <div className="blogs-unique-card">
              <div className="blogs-unique-info">
                <div className="blogs-unique-header">
                  <ul className="blogs-unique-list">
                    <li className="blogs-unique-tag-ui-ux">UI/UX Design</li>
                    <li className="blogs-unique-date">Aug 13, 2024</li>
                  </ul>
                </div>
                <div>
                  <h4 className="blogs-unique-header-desc">
                    Title of the Blog
                  </h4>
                  <p className="blogs-unique-entry">
                    Lorem Ipsum is simply dummy text of the printing and typesetting industry. 
                    Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, 
                    when an unknown printer took a galley of type and scrambled it to make a type 
                    specimen book. It has survived not only five centuries, but also the leap into 
                    electronic typesetting, remaining essentially unchanged. It was popularised in 
                    the 1960s with the...
                  </p>
                </div>
                <div className="blogs-anchor-div">
                  <Link to="/blog/blogDetails" className="blogs-unique-read-more">Read More</Link>
                </div>
              </div>
              <div className="blogs-unique-image-div">
                <img src={blogImg7} alt="Title of the Blog" />
              </div>
            </div>
        </div>
      </div>
      <BlogCarousel/>
    </section>
  );
};

export default Blogs;
