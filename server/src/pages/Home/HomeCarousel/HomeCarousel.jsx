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
  {[image1, image2, image3, image1, image2, image3].map((img, i) => (
    <img src={img} key={i} alt="" className="carousel-image" />
  ))}
</div>
      </div>
    </section>
  );
};

export default HomeCarousel;


