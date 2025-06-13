// Footer.jsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTwitter, faYoutube, faTiktok, faInstagram } from '@fortawesome/free-brands-svg-icons';
import logoIcon from '../../assets/intro-bg.jpeg';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div>
          <div className="footer-logo-section">
            <img src={logoIcon} alt="Open App Partners" className="footer-logo" />
            <p className="footer-logo-text">Open App Partners</p>
          </div>
          <p className="footer-description">
            A stunning digital application portfolio downloadable for you.
          </p>
        </div>
        <div className="footer-icons">
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon icon={faTwitter} className="social-icon" />
          </a>
          <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon icon={faYoutube} className="social-icon" />
          </a>
          <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon icon={faTiktok} className="social-icon" />
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon icon={faInstagram} className="social-icon" />
          </a>
        </div>
        <p className="footer-copyright-mobile">©2025 All Rights Reserved.</p>
      </div>
      <p className="footer-copyright-desktop">©2025 All Rights Reserved.</p>
    </footer>
  );
};

export default Footer;
