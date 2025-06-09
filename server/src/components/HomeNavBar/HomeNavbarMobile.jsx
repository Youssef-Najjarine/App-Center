import React from 'react';
import { Link } from 'react-router-dom';
import logoIcon from '../../assets/intro-bg.jpeg';
import './HomeNavbarMobile.css';

const HomeNavbar = () => {
  return (
    <nav className="home-navbar-mobile fixed-top">
      <div className="home-navbar-container-mobile">
        <div className="home-navbar-logo-mobile">
          <Link to="/" className="home-navbar-logo-link">
            <img src={logoIcon} alt="Logo Icon" className="home-logo-image-mobile" />
          </Link>
          <Link to="/" className="home-navbar-logo-link">
          <span className="home-logo-text-mobile">Open App Partners</span>
          </Link>
        </div>
        <div className="home-navbar-actions-mobile">
          <Link to="/auth/login" className="home-navbar-login-mobile">Login</Link>
          <Link to="/auth/sign-up" className="home-navbar-signup-mobile">Sign up</Link>
        </div>
      </div>
      
      <div className="home-navbar-links-mobile">
        <Link to="/" className="home-navbar-link-mobile">Home</Link>
        <Link to="/applications" className="home-navbar-link-mobile">Applications</Link>
        <Link to="/about-us" className="home-navbar-link-mobile">About us</Link>
        <Link to="/blog" className="home-navbar-link-mobile">Blogs</Link>
      </div>
    </nav>
  );
};

export default HomeNavbar;