import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import profilePic from '../../../assets/Member/member-profile-pic.JPG';
import cancelIcon from '../../../assets/Member/member-edit-profile-close-circle-icon.svg';
import checkIcon from '../../../assets/Member/member-edit-profile-check-circle-icon.svg';
import uploadPhotoIcon from '../../../assets/Member/member-edit-profile-upload-icon.svg';

import './EditProfile.css';

const EditProfile = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const [fullName, setFullName] = useState("Youssef Najjarine");
  const [email, setEmail] = useState("ynajjarine@gmail.com");
  const [username, setUsername] = useState("ynajjarine532");
  const [bio, setBio] = useState(`Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.`);

  const [showSuccess, setShowSuccess] = useState(false);

  const navigate = useNavigate();

  const handleSaveAndRedirect = () => {
    // Simulate save
    setShowSuccess(true);

    // Delay 2 seconds before navigating
      navigate('/profile', { state: { updateSuccess: true } });
  };

  return (
    <section id='member-edit-profile-bio'>
      <div className='member-edit-profile-bio-info'>
        <div className='member-edit-profile-bio-header'>
          <div>
            <h2>My Account</h2>
          </div>
          <div className='member-edit-profile-bio-info-cancel-save-div'>
            <div className='member-edit-info-cancel-div'>
              <Link to="/profile">
                <img src={cancelIcon} />
                <span>Cancel</span>
              </Link>
            </div>
            <div className='member-edit-info-save-div' onClick={handleSaveAndRedirect}>
              <Link to="/profile">
                <img src={checkIcon} />
                <span>Save & Update</span>
              </Link>
            </div>
          </div>
        </div>

        <div className='member-edit-profile-bio-info-profilePic'>
          <div className='member-edit-profile-bio-info-profilePic-sub-div'>
            <div className="member-profile-photo-container">
              <img src={profilePic} className="member-edit-profile-info-photo" />
              <button className="member-edit-profile-info-upload-background">
                <img src={uploadPhotoIcon} className="member-edit-profile-info-upload-icon" />
              </button>
            </div>
          </div>
          <div>
            <p className='member-edit-profile-bio-info-upload-photo'>Upload Photo</p>
            <p className='member-edit-profile-bio-info-photo-size'>300x300 and max 2 MB</p>
          </div>
        </div>

        <div className='member-edit-profile-bio-info-grid'>
          <div className='member-edit-profile-bio-info-name'>
            <label>
              Full Name <span className='member-edit-profile-bio-info-required-star'>*</span>
            </label>
            <div>
              <input
                type='text'
                value={fullName}
                placeholder='Full Name...'
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>

          <div className='member-edit-profile-bio-info-email'>
            <label>
              Email Address <span className='member-edit-profile-bio-info-required-star'>*</span>
              </label>
            <div>
              <input
                type='email'
                value={email}
                placeholder='Email Address...'
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className='member-edit-profile-bio-info-username'>
            <label>
              Username <span className='member-edit-profile-bio-info-required-star'>*</span>
              </label>
            <div>
              <input
                type='text'
                value={username}
                placeholder='Username...'
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className='member-edit-profile-bio-info-bio'>
          <label>Bio</label>
          <div>
            <textarea 
              placeholder='Bio...'
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            >
            </textarea>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EditProfile;
