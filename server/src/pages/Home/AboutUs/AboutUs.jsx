import React, { useState, useEffect } from "react";
import Carousel from "../HomeCarousel/HomeCarousel";
import ImageThumb1 from "../../../assets/AboutUs/aboutus_pc1.png";
import ImageThumb2 from "../../../assets/AboutUs/aboutus_pc2.png";
import ImageThumb3 from "../../../assets/AboutUs/aboutus_pc3.png";
import "./AboutUs.css";

const AboutUs = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  return (
    <section id="about-us">
      <div className="about-part1">
        <div className="about-image">
          <img src={ImageThumb1} alt="Why Open App Partner?" />
        </div>
        <div className="about-text-container">
          <h3 className="about-title">Why Open App Partner?</h3>
          <p className="about-text">
            At Open App Partners, we are passionate innovators determined to
            change the way technology serves individuals and businesses.
            Founded with the vision of empowering users through high-quality,
            innovative, and accessible applications, we develop solutions that
            tackle real-world problems, simplify complex tasks, and help
            people connect in meaningful ways. We are a team of passionate
            engineers, developers, and visionaries working collaboratively to
            bring the future of tech into the present, with an affordable
            applications platform.
          </p>
        </div>
      </div>

      <div className="about-part2">
        <h3 className="about-title about-our-vision">Our Vision</h3>
        <p className="about-text">
          We envision a world where everyone has access to publishing
          applications, no matter how many team members they have. It should
          improve productivity and the lives of individual app developers,
          whether created from AI or individuals. By pushing the boundaries of
          artificial intelligence, cybersecurity, mental health support, and
          creative applications, we strive to make technology accessible and
          beneficial for all. Our goal is to build a suite of applications and
          platforms that empower individuals and businesses to unlock their
          potential and thrive in the digital age.
        </p>
      </div>
      <Carousel />
      <div className="about-part3">
        <div className="about-text-container">
          <h3 className="about-title">What We Do</h3>
          <p className="about-text">
            We specialize in developing and releasing a variety of innovative applications 
            across multiple industries, publishing other applications no matter how many team 
            members they have, unlike that large corporation. We have a highly advanced 
            cybersecurity AI application, mental health, creative tools, and some game 
            development. Our platform, Open App Partners, is designed to support developers 
            and entrepreneurs by providing a flexible, open-source solution for launching and 
            managing applications. Our solutions, from AI-powered mental health platforms, Dream 
            Interpretation algorithm, and Blessings Random, which is the opposite of Random Nautica, 
            to advanced 3D asset creation tools, reflect our commitment to creating high-quality, 
            user-centric experiences that deliver real value.
          </p>
        </div>
        <div className="about-image">
          <img src={ImageThumb2} alt="What We Do" />
        </div>
      </div>
      <div className="about-part4">
        <div className="about-image">
          <img src={ImageThumb3} alt="Our Approach" />
        </div>
        <div className="about-text-container">
          <h3 className="about-title">Our Approach</h3>
          <p className="about-text">
            At Open App Partners, our approach is user-focused, collaborative,
            and forward-thinking. We believe in creating high-level,
            functional, and accessible applications with precision and quality
            at the core. Every project we undertake starts with a deep
            understanding of user needs, industry trends, and future
            possibilities. Our development process is rooted in creativity,
            innovation, and attention to detail, ensuring that every app we
            release is fully functional, user-friendly, and ahead of the
            curve. We also prioritize collaboration with open-source
            communities and other developers to continuously push the
            boundaries of what’s possible.
          </p>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;
