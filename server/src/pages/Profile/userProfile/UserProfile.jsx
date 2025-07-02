import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ChangePasswordModal from "./ChangePasswordModal/ChangePasswordModal";
import profilePic from '../../../assets/Member/member-profile-pic.JPG';
import passwordIcon from '../../../assets/Member/member-bio-password-icon.svg';
import editInfoIcon from '../../../assets/Member/member-bio-add-circle-icon.svg';
import CheckMarkIcon from '../../../assets/Member/member-bio-check-mark-icon.svg';
import XIcon from '../../../assets/Member/member-bio-X-icon.svg';
import './userProfile.css';

const UserProfile = () => {
  const location = useLocation();
  const [showSuccess, setShowSuccess] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (location.state?.updateSuccess) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

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
            <img src={passwordIcon} className='member-profile-bio-info-password-icon'/>
            <span>Change Password</span>
          </div>
        </div>

        <div className='member-profile-bio-info-profilePic'>
          <img src={profilePic}/>
        </div>

        <div className='member-profile-bio-info-grid'>
          <div className='member-profile-bio-info-name'>
            <label>Full Name</label>
            <p>Youssef Najjarine</p>
          </div>
          <div className='member-profile-bio-info-email'>
            <label>Email Address</label>
            <p>ynajjarine@gmail.com</p>
          </div>
          <div className='member-profile-bio-info-username'>
            <label>Username</label>
            <p>ynajjarine532</p>
          </div>
        </div>

        <div className='member-profile-bio-info-bio'>
          <label>Bio</label>
          <p>
            Lorem Ipsum is simply dummy text of the printing and typesetting industry. 
            Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, 
            when an unknown printer took a galley of type and scrambled it to make a type 
            specimen book. It has survived not only five centuries, but also the leap into 
            electronic typesetting, remaining essentially unchanged. It was popularised in 
            the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, 
            and more recently with desktop publishing software like Aldus PageMaker including 
            versions of Lorem Ipsum.
          </p>
        </div>

        <div className='member-profile-bio-info-edit-div'>
          <Link to="/profile/edit">
            <img src={editInfoIcon} className='member-profile-bio-info-edit-icon'/>
            <span>Edit my Information</span>
          </Link>
        </div>
      </div>

      {showSuccess && (
        <div className="member-profile-success-banner">
          <img src={CheckMarkIcon} alt="Success" className='member-bio-success'/>
          <span>Account successfully updated!</span>
          <button onClick={() => setShowSuccess(false)} className="member-profile-close-button">
            <img src={XIcon} alt="Close" />
          </button>
        </div>
      )}

      {isChangePasswordOpen && (
        <ChangePasswordModal onClose={() => setIsChangePasswordOpen(false)} />
      )}
    </section>
  );
};

export default UserProfile;
