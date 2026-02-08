import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ChangePasswordModal from "./ChangePasswordModal/ChangePasswordModal";
import profilePic from '@assets/placeholder-profile-picture.png';
import passwordIcon from '@assets/password-verify-identity-icon.svg';
import editInfoIcon from '@assets/add-circle-icon.svg';
import CheckMarkIcon from '@assets/white-check-green-background-icon.svg';
import XIcon from '@assets/x-icon.svg';
import ProcessingModal from "@pages/ProcessingModal/ProcessingModal";
import { useAuthUser } from "@context/AuthUserContext";
import './userProfile.css';

const UserProfile = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { user, loading, error, refresh } = useAuthUser();

  const [showSuccess, setShowSuccess] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (location.state?.updateSuccess) {
      setShowSuccess(true);

      if (typeof refresh === "function") {
        refresh();
      }
      navigate(location.pathname, { replace: true, state: {} });
      const timer = setTimeout(() => setShowSuccess(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [location.state, refresh, navigate, location.pathname]);

  if (loading) {
    return <ProcessingModal />;
  }

  if (!user) {
    return null;
  }

  if (error) {
    return (
      <section id='member-profile-bio'>
        <div className='member-profile-bio-info'>
          <div className='member-profile-bio-header'>
            <div>
              <h2>My Account</h2>
            </div>
          </div>
          <p style={{ marginTop: 12 }}>
            {error || 'Error - Unable to connect to the server.'}
          </p>
        </div>
      </section>
    );
  }

  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();

  return (
    <section id='member-profile-bio'>
      <div className='member-profile-bio-info'>
        <div className='member-profile-bio-header'>
          <div>
            <h2>My Account</h2>
          </div>
          <div
            className='member-profile-bio-info-password-div'
            onClick={() => setIsChangePasswordOpen(true)}
            style={{ cursor: 'pointer' }}
          >
            <img src={passwordIcon} className='member-profile-bio-info-password-icon' />
            <span>Change Password</span>
          </div>
        </div>

        <div className='member-profile-bio-info-profilePic'>
          <img
            src={user.profilePictureUrl || profilePic}
            alt="Profile"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = profilePic;
            }}
          />
        </div>

        <div className='member-profile-bio-info-grid'>
          <div className='member-profile-bio-info-name'>
            <label>Full Name</label>
            <p>{fullName || user.username || '-'}</p>
          </div>
          <div className='member-profile-bio-info-email'>
            <label>Email Address</label>
            <p>{user.email || '-'}</p>
          </div>
          <div className='member-profile-bio-info-username'>
            <label>Username</label>
            <p>{user.username || '-'}</p>
          </div>
        </div>

        <div className='member-profile-bio-info-bio'>
          <label>Bio</label>
          <p>{user.bio || 'No bio yet.'}</p>
        </div>

        <div className='member-profile-bio-info-edit-div'>
          <Link to="/profile/edit">
            <img src={editInfoIcon} className='member-profile-bio-info-edit-icon' />
            <span>Edit my Information</span>
          </Link>
        </div>
      </div>

      {showSuccess && (
        <div className="member-profile-success-banner">
          <img src={CheckMarkIcon} alt="Success" className='member-bio-success' />
          <span>Account successfully updated!</span>
          <button onClick={() => setShowSuccess(false)} className="member-profile-close-button">
            <img src={XIcon} alt="Close" />
          </button>
        </div>
      )}

      {isChangePasswordOpen && (
        <ChangePasswordModal
          key={isChangePasswordOpen ? "open" : "closed"}
          onClose={() => setIsChangePasswordOpen(false)}
        />
      )}
    </section>
  );
};

export default UserProfile;
