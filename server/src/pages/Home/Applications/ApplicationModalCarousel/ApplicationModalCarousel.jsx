import React, { useEffect } from "react";
import image1 from "../../../../assets/HomeCarousel/iphone-cycling.png";
import image2 from "../../../../assets/HomeCarousel/iphone-statistics.png";
import image3 from "../../../../assets/HomeCarousel/laptop.png";
import image4 from "../../../../assets/HomeCarousel/design.jpg";
import image5 from "../../../../assets/HomeCarousel/verify-identity-desktop.jpeg";
import image6 from "../../../../assets/HomeCarousel/AI-future.jpg";
import "./ApplicationModalCarousel.css";

const images = [image1, image2, image3, image4, image5, image6];

const ApplicationModalCarousel = ({ selectedImage, onImageClick, onInitialImage }) => {
  useEffect(() => {
    if (images.length > 0 && onInitialImage) {
      onInitialImage(images[0]);
    }
  }, [onInitialImage]);

  return (
    <section className="appHome-modal-carousel-section">
      <div className="appHome-modal-carousel-container">
        <div className="appHome-modal-carousel-track">
          {images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt={`carousel-${i}`}
              className={`appHome-modal-carousel-image ${
                selectedImage === img ? "selected" : ""
              }`}
              onClick={() => onImageClick(img)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ApplicationModalCarousel;
