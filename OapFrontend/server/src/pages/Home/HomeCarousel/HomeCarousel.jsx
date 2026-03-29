import React, { useState, useEffect, useRef } from "react";
import image1 from "@assets/HomeCarousel/iphone-cycling.png";
import image2 from "@assets/HomeCarousel/iphone-statistics.png";
import image3 from "@assets/HomeCarousel/laptop.png";
import image4 from "@assets/HomeCarousel/design.jpg";
import image5 from "@assets/HomeCarousel/verify-identity-desktop.jpeg";
import image6 from "@assets/HomeCarousel/AI-future.jpg";
import "./HomeCarousel.css";

const STATIC_IMAGES = [image1, image2, image3, image4, image5, image6];

const HomeCarousel = () => {
  const [images, setImages] = useState(STATIC_IMAGES);
  const [loaded, setLoaded] = useState(false);
  const trackRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const fetchFeatured = async () => {
      try {
        const res = await fetch("/api/store/featured-carousel");
        const data = await res.json();
        if (cancelled) return;

        if (data?.success && Array.isArray(data.items) && data.items.length > 0) {
          const fetched = data.items
            .map((item) => item.imageUrl)
            .filter(Boolean);

          const final = [];
          let staticIndex = 0;

          for (let i = 0; i < 6; i++) {
            if (i < fetched.length) {
              final.push(fetched[i]);
            } else {
              while (staticIndex < STATIC_IMAGES.length && final.includes(STATIC_IMAGES[staticIndex])) {
                staticIndex++;
              }
              if (staticIndex < STATIC_IMAGES.length) {
                final.push(STATIC_IMAGES[staticIndex]);
                staticIndex++;
              } else {
                final.push(STATIC_IMAGES[i % STATIC_IMAGES.length]);
              }
            }
          }

          setImages(final);
        }
      } catch {}
      finally {
        if (!cancelled) setLoaded(true);
      }
    };

    fetchFeatured();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.style.animation = "none";
    void track.offsetHeight;
    track.style.animation = "";
  }, [images]);

  return (
    <section className="home-carousel-section">
      <div className="carousel-container">
        <div className="carousel-track" ref={trackRef}>
          {[...images, ...images].map((img, i) => (
            <img
              src={img}
              key={`${img}-${i}`}
              alt=""
              className="home-carousel-image"
              loading={i < 6 ? "eager" : "lazy"}
              onError={(e) => {
                e.currentTarget.onerror = null;
                const fallbackIdx = i % STATIC_IMAGES.length;
                e.currentTarget.src = STATIC_IMAGES[fallbackIdx];
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeCarousel;