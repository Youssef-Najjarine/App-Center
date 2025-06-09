// FeatureHighlight.jsx
import React from 'react';
import placeholderImage from '../../../assets/dream.jpg'; // Import the placeholder image directly here
import './FeatureHighlight.css';

const FeatureHighlight = () => {
  return (
    <div className="feature-highlight">
      <img src={placeholderImage} alt="Featured App" className="feature-image" />
      <div className='feature-highlight-info'>
        <h2 className="feature-headline">
            Dream <span>Interpretation</span> algorithm
        </h2>
        <p className="feature-description">
            We specialize in developing and releasing a variety of innovative applications across multiple industries, 
            publishing other applications no matter how many team members they have, unlike that large corporation. 
            We have a highly advanced cybersecurity AI application, mental health, creative tools, and some game development.
        </p>
      </div>
    </div>
  );
};

export default FeatureHighlight;
