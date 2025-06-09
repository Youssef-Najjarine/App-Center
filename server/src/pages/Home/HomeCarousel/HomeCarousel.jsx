// HomeCarousel.jsx
import React from 'react';
import image1 from '../../../assets/iphone-cycling.png';
import image2 from '../../../assets/iphone-statistics.png';
import image3 from '../../../assets/laptop.png';
import './HomeCarousel.css';

const HomeCarousel = () => {
  return (
    <section className="home-carousel-section">
      <div className="carousel-container">
        <div className="carousel-track">
          <img src={image1} alt="AI Future" className="carousel-image" />
          <img src={image2} alt="Design" className="carousel-image" />
          <img src={image3} alt="Matrix" className="carousel-image" />
          <img src={image1} alt="AI Future" className="carousel-image" />
          <img src={image2} alt="Design" className="carousel-image" />
          <img src={image3} alt="Matrix" className="carousel-image" />
        </div>
      </div>
    </section>
  );
};

export default HomeCarousel;
