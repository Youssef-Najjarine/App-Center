import React from 'react';
import image1 from '../../../assets/HomeCarousel/iphone-cycling.png';
import image2 from '../../../assets/HomeCarousel/iphone-statistics.png';
import image3 from '../../../assets/HomeCarousel/laptop.png';
import image4 from '../../../assets/HomeCarousel/design.jpg';
import image5 from '../../../assets/HomeCarousel/verify-identity-desktop.jpeg';
import image6 from '../../../assets/HomeCarousel/AI-future.jpg';
import './HomeCarousel.css';

const images = [image1, image2, image3, image4, image5, image6];

const HomeCarousel = () => {
  return (
    <section className="home-carousel-section">
      <div className="carousel-container">
        <div className="carousel-track">
          {[...images, ...images].map((img, i) => (
            <img src={img} key={i} alt="" className="home-carousel-image" />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeCarousel;


