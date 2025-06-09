// HomeNavbarDesktop.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import logoIcon from '../../assets/intro-bg.jpeg';
import './HomeNavbarDesktop.css';

const HomeNavbarDesktop = () => {
  return (
    <nav className="home-navbar-desktop fixed-top">
      <div className="home-navbar-container-desktop">
        <div className="home-navbar-logo-desktop">
          <Link to="/" className="home-navbar-logo-link">
            <img src={logoIcon} alt="Logo Icon" className="home-logo-image-desktop" />
          </Link>
          <Link to="/" className="home-navbar-logo-link">
            <span className="home-logo-text-desktop">Open App Partners</span>
          </Link>
        </div>
        <div className="home-navbar-options">
            <div className="home-navbar-links-desktop">
                <Link to="/" className="home-navbar-link-desktop">Home</Link>
                <Link to="/applications" className="home-navbar-link-desktop">Applications</Link>
                <Link to="/about-us" className="home-navbar-link-desktop">About us</Link>
                <Link to="/blog" className="home-navbar-link-desktop">Blogs</Link>
            </div>
            <div className="home-navbar-actions-desktop">
                <Link to="/auth/login" className="home-navbar-login-desktop">Login</Link>
                <Link to="/auth/sign-up" className="home-navbar-signup-desktop">Sign up</Link>
            </div>
        </div>
      </div>
    </nav>
  );
};

export default HomeNavbarDesktop;
