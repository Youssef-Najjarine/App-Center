import React from 'react';
import { Link } from 'react-router-dom';
import profilePic from '../../../assets/Member/member-profile-pic.JPG';
import './userProfile.css';
const UserProfile = () => {
  return (
  <section id='member-profile-bio'>
    <div className='member-profile-bio-info'>
      <div className='member-profile-bio-header'>
        <div>
          <h2>My Account</h2>
        </div>
        <div>
          <Link to="/">
            <button>Change Password</button>
          </Link>
        </div>
      </div>
      <div className='member-profile-bio-info-profilePic'>
        <img src={profilePic}/>
      </div>
      <div className='member-profile-bio-info-grid'>
        <div>
          Full Name
        </div>
        <div>
          Email Address
        </div>
        <div>
          Username
        </div>
        <div>
          Bio
        </div>
      </div>
    </div>
  </section>
  );
};

export default UserProfile;