import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import logoIcon from '../../assets/intro-bg.jpeg';
import applications from '../../assets/Member/member-applications.svg';
import profilePic from '../../assets/Member/member-profile-pic.JPG';
import profileIcon from '../../assets/Member/member-navbar-profile-icon.svg';
import appManagementIcon from '../../assets/Member/member-application-management-navbar-icon.svg';
import myPurchasesIcon from '../../assets/Member/member-navbar-purchases-icon.svg';
import applicationHistoryIcon from '../../assets/Member/member-navbar-application-history-icon.svg';
import earningsPayoutsIcon from '../../assets/Member/member-navbar-application-history-icon.svg';
import cardPaymentsIcon from '../../assets/Member/member-navbar-cards-payments-icon.svg';
import logoutIcon from '../../assets/Member/member-navbar-logout-icon.svg';
import './MemberNavbar.css';

const HomeNavbar = () => {
  const [showDropdown, setShowDropdown] = useState(false);

  const toggleDropdown = () => {
    setShowDropdown(prev => !prev);
  };

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
          <div className='member-nav-application-div'>
            <Link to="/">
              <img src={applications} className='member-nav-applications-icon'/>
              <span>Applications</span>
            </Link>
          </div>

          <div className="member-profile-wrapper">
            <div className='member-profile-nav' onClick={toggleDropdown}>
              <img src={profilePic} alt="member-icon" />
              <div>
                <p className='member-nav-name'>
                  Youssef Najjarine
                </p>
                <p className='member-nav-email'>
                  ynajjarine@gmail.com
                </p>
              </div>
              <div className="member-navbar-caret">
                {showDropdown ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className='member-navbar-up-arrow'>
                    <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
                  </svg>
                ) : (

                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className='member-navbar-down-arrow'>
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
                  </svg>
                )}
              </div>
            </div>

            <div className={`member-dropdown-menu ${showDropdown ? 'show' : ''}`}>
              <Link to="/profile" onClick={() => setShowDropdown(false)}>
              <div className='member-navbar-icon-div'>
                <img src={profileIcon}/>
                <span>Profile</span>
              </div>
              </Link>
              <Link to="/apps" onClick={() => setShowDropdown(false)}>
                <div className='member-navbar-icon-div'>
                  <img src={appManagementIcon}/>
                  <span>Apps Management</span>
                </div>
              </Link>
              <Link to="/purchases" onClick={() => setShowDropdown(false)}>
              <div className='member-navbar-icon-div'>
                <img src={myPurchasesIcon}/>
                <span>My Purchases</span>
              </div>
              </Link>
              <Link to="/history" onClick={() => setShowDropdown(false)}>
                <div className='member-navbar-icon-div'>
                  <img src={applicationHistoryIcon}/>
                  <span>Application History</span>
                </div>
              </Link>
              <Link to="/payouts" onClick={() => setShowDropdown(false)}>
                <div className='member-navbar-icon-div'>
                  <img src={earningsPayoutsIcon}/>
                  <span>Earning & Payouts</span>
                </div>
              </Link>
              <Link to="/payments" onClick={() => setShowDropdown(false)}>
                <div className='member-navbar-icon-div'>
                  <img src={cardPaymentsIcon}/>
                  <span>Cards & Payments</span>
                </div>
              </Link>
              <Link to="/logout" onClick={() => setShowDropdown(false)}>
                <div className='member-navbar-icon-div member-navbar-logout-div'>
                  <img src={logoutIcon}/>
                  <span className="logout">Logout</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default HomeNavbar;
