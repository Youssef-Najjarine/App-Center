import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logoIcon from '@assets/logo.jpeg';
import downArrowIcon from '@assets/down-arrow-icon.svg';
import applications from '@assets/applications-nav-icon.svg';
import profilePic from '@assets/Member/member-profile-pic.JPG';
import profileIcon from '@assets/purple-outline-profile-icon.svg';
import appManagementIcon from '@assets/outline-purple-boost-icon.svg';
import myPurchasesIcon from '@assets/purple-dollar-circle-icon.svg';
import applicationHistoryIcon from '@assets/purple-outline-desktop-monitor-icon.svg';
import earningsPayoutsIcon from '@assets/purple-outline-wallet-icon.svg';
import cardPaymentsIcon from '@assets/purple-outline-card-icon.svg';
import logoutIcon from '@assets/red-outline-logout-icon.svg';
import './MemberNavbar.css';

const MemberNavbar = () => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const profileWrapperRef = useRef(null);
  const location = useLocation();

  const toggleDropdown = () => {
    setShowDropdown(prev => !prev);
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileWrapperRef.current &&
        !profileWrapperRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  return (
    <nav className="member-navbar fixed-top">
      <div className="member-navbar-container">
        <div className="member-navbar-logo">
          <Link to="/">
            <img src={logoIcon} alt="Logo Icon" className="member-navbar-logo-image" />
          </Link>
          <Link to="/">
            <span className="member-logo-text">Open App Partners</span>
          </Link>
        </div>

        <div className="member-navbar-actions">
          <div className={`member-nav-application-div ${["/profile/apps", "/profile/appManagement", "/profile/MyPurchases", "/profile/ApplicationHistory"].includes(location.pathname) ? "active-app-tab" : ""}`}>
            <Link to="/profile/apps">
              <img src={applications} className='member-nav-applications-icon' />
              <span>Applications</span>
            </Link>
          </div>

          <div className="member-profile-wrapper" ref={profileWrapperRef}>
            <div className={`member-profile-nav ${["/profile/apps", "/profile/appManagement", "/profile/MyPurchases", "/profile/ApplicationHistory", "/profile/Earnings&Payouts"].includes(location.pathname) ? "inactive-profile-tab" : ""}`} onClick={toggleDropdown}>
              <img src={profilePic} alt="member-icon" className='member-nav-profile-picture' />
              <div>
                <p className='member-nav-name'>Youssef Najjarine</p>
                <p className='member-nav-email'>ynajjarine@gmail.com</p>
              </div>
              <div className="member-navbar-caret">
                <img 
                  src={downArrowIcon} 
                  alt="dropdown arrow"
                  className={`member-navbar-down-arrow ${showDropdown ? 'rotated' : ''}`}
                />
              </div>
            </div>
            <div className={`member-dropdown-menu ${showDropdown ? 'show' : ''}`}>
              <Link to="/profile" onClick={() => setShowDropdown(false)}>
                <div className='member-navbar-icon-div'>
                  <img src={profileIcon} />
                  <span>Profile</span>
                </div>
              </Link>
              <Link to="/profile/appManagement" onClick={() => setShowDropdown(false)}>
                <div className='member-navbar-icon-div'>
                  <img src={appManagementIcon} />
                  <span>App Management</span>
                </div>
              </Link>
              <Link to="/profile/MyPurchases" onClick={() => setShowDropdown(false)}>
                <div className='member-navbar-icon-div'>
                  <img src={myPurchasesIcon} />
                  <span>My Purchases</span>
                </div>
              </Link>
              <Link to="/profile/ApplicationHistory" onClick={() => setShowDropdown(false)}>
                <div className='member-navbar-icon-div'>
                  <img src={applicationHistoryIcon} />
                  <span>Application History</span>
                </div>
              </Link>             
              <Link to="/profile/Earnings&Payouts" onClick={() => setShowDropdown(false)}>
                <div className='member-navbar-icon-div'>
                  <img src={earningsPayoutsIcon} />
                  <span>Earnings & Payouts</span>
                </div>
              </Link>
              <Link to="/profile/CardsPayments" onClick={() => setShowDropdown(false)}>
                <div className='member-navbar-icon-div'>
                  <img src={cardPaymentsIcon} />
                  <span>Cards & Payments</span>
                </div>
              </Link>
              <div
                className='member-navbar-icon-div member-navbar-logout-div'
                onClick={() => {
                  setShowDropdown(false);
                  navigate('/');
                }}
              >
                <img src={logoutIcon} />
                <span className="logout">Logout</span>
              </div>              
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default MemberNavbar;
