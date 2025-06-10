// Home.jsx
import React from "react";
import { Link } from "react-router-dom";
import introBg from "../../assets/intro-bg.jpeg";
import Carousel from "./HomeCarousel/HomeCarousel";
import FeatureHighlight from "./FeatureHighlight/FeatureHighlight"; // Import FeatureHighlight component
import "./Home.css";

const Home = () => {
  return (
    <>
      <div
        className="home-background"
        style={{ backgroundImage: `url(${introBg})` }}
      >
        <div className="overlay"></div>
        <div className="home-content">
          <h1 className="headline-mobile">
            <span>
              Deploy Apps
              <br />
            </span>{" "}
            Easily.
            <br /> Feed to AI. Scale Seamlessly.
          </h1>
          <h1 className="headline-desktop">
            <span>Deploy Apps</span> Easily.
            <br /> Feed to AI. Scale Seamlessly.
          </h1>
          <p className="description">
            Our platform simplifies app deployment, empowering users to scale{" "}
            <span className="desktop-description-break">
              <br />
            </span>
            effortlessly and reach new heights with ease.
          </p>
          <div className="home-explore-div">
            <Link to="/applications" className="explore-button">
              Explore Our Latest Apps
            </Link>
          </div>
        </div>
      </div>
      <Carousel />
      <FeatureHighlight />
    </>
  );
};

export default Home;
