import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logoIcon from '@assets/logo.jpeg';
import downArrowIcon from '@assets/down-arrow-icon.svg';
import applications from '@assets/applications-nav-icon.svg';
import profilePic from '@assets/placeholder-profile-picture.png';
import profileIcon from '@assets/purple-outline-profile-icon.svg';
import appManagementIcon from '@assets/outline-purple-boost-icon.svg';
import myPurchasesIcon from '@assets/purple-dollar-circle-icon.svg';
import applicationHistoryIcon from '@assets/purple-outline-desktop-monitor-icon.svg';
import earningsPayoutsIcon from '@assets/purple-outline-wallet-icon.svg';
import cardPaymentsIcon from '@assets/purple-outline-card-icon.svg';
import logoutIcon from '@assets/red-outline-logout-icon.svg';
import { useAuthUser } from "@context/AuthUserContext";
import ProcessingModal from "@pages/ProcessingModal/ProcessingModal";
import './ProfileNavbarMobile.css';

const ProfileNavbarMobile = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, loading, logout, authBusy } = useAuthUser();

  const [showDropdown, setShowDropdown] = useState(false);
  const profileWrapperRef = useRef(null);

  const [navPhotoSrc, setNavPhotoSrc] = useState(profilePic);

  useEffect(() => {
    if (!user) return;
    setNavPhotoSrc(user.profilePictureUrl || profilePic);
  }, [user]);

  const fullName = useMemo(() => {
    if (!user) return '';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
  }, [user]);

  const toggleDropdown = () => {
    setShowDropdown((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileWrapperRef.current && !profileWrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  if (authBusy) {
    return <ProcessingModal />;
  }

  if (!user) {
    return null;
  }

  return (
    <nav className="member-navbar-mobile fixed-top">
      <div className="member-navbar-mobile-container">
        <div className="member-navbar-mobile-logo">
          <Link to="/">
            <img src={logoIcon} alt="Logo Icon" className="member-navbar-mobile-logo-image" />
          </Link>
          <Link to="/">
            <span className="member-nav-mobile-mobile-logo-text">Open App Partners</span>
          </Link>
        </div>

        <div className="member-navbar-mobile-actions">
          <div
            className={`member-nav-mobile-application-div ${
              ["/profile/apps", "/profile/appManagement", "/profile/MyPurchases", "/profile/ApplicationHistory", "/profile/drafts"]
                .includes(location.pathname)
                ? "active-app-tab"
                : ""
            }`}
          >
            <Link to="/profile/apps">
              <img src={applications} className='member-nav-mobile-applications-icon' />
              <span>My Applications</span>
            </Link>
          </div>

          <div className="member-profile-mobile-wrapper" ref={profileWrapperRef}>
            <div
              className={`member-profile-mobile-nav ${
                ["/profile/apps", "/profile/appManagement", "/profile/MyPurchases", "/profile/ApplicationHistory", "/profile/Earnings&Payouts", "/profile/drafts"]
                  .includes(location.pathname)
                  ? "inactive-profile-tab"
                  : ""
              }`}
              onClick={toggleDropdown}
            >
              <img
                src={navPhotoSrc}
                alt="member-icon"
                className="member-nav-mobile-profile-picture"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  setNavPhotoSrc(profilePic);
                }}
              />
              <div>
                <p className='member-nav-mobile-name'>
                  {loading ? 'Loading...' : (fullName || user?.username || 'User')}
                </p>
                <p className='member-nav-mobile-email'>
                  {loading ? 'Loading...' : (user?.email || '-')}
                </p>
              </div>

              <div className="member-navbar-mobile-caret">
                <img
                  src={downArrowIcon}
                  alt="dropdown arrow"
                  className={`member-navbar-mobile-down-arrow ${showDropdown ? 'rotated' : ''}`}
                />
              </div>
            </div>

            <div className={`member-dropdown-menu ${showDropdown ? 'show' : ''}`}>
              <Link to="/profile" onClick={() => setShowDropdown(false)}>
                <div className='member-navbar-mobile-icon-div'>
                  <img src={profileIcon} />
                  <span>Profile</span>
                </div>
              </Link>

              <Link to="/profile/appManagement" onClick={() => setShowDropdown(false)}>
                <div className='member-navbar-mobile-icon-div'>
                  <img src={appManagementIcon} />
                  <span>App Management</span>
                </div>
              </Link>

              <Link to="/profile/MyPurchases" onClick={() => setShowDropdown(false)}>
                <div className='member-navbar-mobile-icon-div'>
                  <img src={myPurchasesIcon} />
                  <span>My Purchases</span>
                </div>
              </Link>

              <Link to="/profile/ApplicationHistory" onClick={() => setShowDropdown(false)}>
                <div className='member-navbar-mobile-icon-div'>
                  <img src={applicationHistoryIcon} />
                  <span>Application History</span>
                </div>
              </Link>

              <Link to="/profile/Earnings&Payouts" onClick={() => setShowDropdown(false)}>
                <div className='member-navbar-mobile-icon-div'>
                  <img src={earningsPayoutsIcon} />
                  <span>Earnings & Payouts</span>
                </div>
              </Link>

              <Link to="/profile/CardsPayments" onClick={() => setShowDropdown(false)}>
                <div className='member-navbar-mobile-icon-div'>
                  <img src={cardPaymentsIcon} />
                  <span>Cards & Payments</span>
                </div>
              </Link>

              <div
                className='member-navbar-mobile-icon-div member-navbar-mobile-logout-div'
                onClick={() => {
                  setShowDropdown(false);
                  logout({ redirectTo: "/" });
                }}
              >
                <img src={logoutIcon} />
                <span className="logout">Logout</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div>
        <ul className="member-navbar-mobile-home-options">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/applications">Applications</Link></li>
          <li><Link to="/about-us">About us</Link></li>
          <li><Link to="/blogs">Blogs</Link></li>
        </ul>
      </div>
    </nav>
  );
};

export default ProfileNavbarMobile;
