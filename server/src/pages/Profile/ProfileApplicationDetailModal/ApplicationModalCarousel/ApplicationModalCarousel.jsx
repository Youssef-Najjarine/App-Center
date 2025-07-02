import React, { useEffect } from "react";
import image1 from "../../../../assets/HomeCarousel/iphone-cycling.png";
import image2 from "../../../../assets/HomeCarousel/iphone-statistics.png";
import image3 from "../../../../assets/HomeCarousel/laptop.png";
import image4 from "../../../../assets/HomeCarousel/design.jpg";
import image5 from "../../../../assets/HomeCarousel/verify-identity-desktop.jpeg";
import image6 from "../../../../assets/HomeCarousel/AI-future.jpg";
import sampleVideo from "../../../../assets/HomeCarousel/Senior-Full-Stack-Developer-Expertise.mp4";
import sampleThumbnail from "../../../../assets/HomeCarousel/sampleThumbnail.png";
import "./ApplicationModalCarousel.css";

const images = [
  {
    type: "video",
    src: sampleThumbnail,
    videoType: "local",
    videoFile: sampleVideo,
    duration: "14:22"
  },
  { type: "image", src: image1 },
  { type: "image", src: image2 },
  { type: "image", src: image3 },
  { type: "image", src: image4 },
  { type: "image", src: image5 },
  { type: "image", src: image6 },
];

const ApplicationModalCarousel = ({ selectedItem, onItemClick, onInitialItem }) => {
  useEffect(() => {
    if (onInitialItem) onInitialItem(images);
  }, [onInitialItem]);

  return (
    <section className="profile-app-details-modal-carousel-section">
      <div className="profile-app-details-modal-carousel-container">
        <div className="profile-app-details-modal-carousel-track">
          {images.map((item, i) => (
            <img
              key={i}
              src={item.src}
              alt={`carousel-${i}`}
              className={`profile-app-details-modal-carousel-image ${
                selectedItem?.src === item.src ? "selected" : ""
              }`}
              onClick={() => onItemClick(item)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ApplicationModalCarousel;
