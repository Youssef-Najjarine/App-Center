import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import profilePic from '../../../../assets/Member/member-profile-pic.JPG';
import cancelIcon from '../../../../assets/Member/member-edit-profile-close-circle-icon.svg';
import checkIcon from '../../../../assets/Member/member-edit-profile-check-circle-icon.svg';
import uploadPhotoIcon from '../../../../assets/Member/member-edit-profile-upload-icon.svg';
import dangerIcon from '../../../../assets/danger.svg';
import dangerFilledIcon from '../../../../assets/Member/member-edit-profile-filled-error.svg';
import closeIcon from '../../../../assets/Member/member-edit-profile-close-error-icon.svg';

import './EditProfile.css';

const EditProfile = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const [fullName, setFullName] = useState("Youssef Najjarine");
  const [email, setEmail] = useState("ynajjarine@gmail.com");
  const [username, setUsername] = useState("ynajjarine532");
  const [bio, setBio] = useState("Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum. It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like).");
  const [errors, setErrors] = useState({});
  const [showErrorBox, setShowErrorBox] = useState(false);
  const navigate = useNavigate();

  const handleSaveAndRedirect = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!fullName.trim()) newErrors.fullName = 'Field Missing';

    if (!email.trim()) newErrors.email = 'Field Missing';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email';

    if (!username.trim()) newErrors.username = 'Field Missing';
    else if (!/^[a-zA-Z0-9._-]{3,15}$/.test(username)) {
      newErrors.username = 'Invalid username';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      navigate('/profile', { state: { updateSuccess: true } });
    } else {
      setShowErrorBox(true);
    }
  };
  const handleCloseErrorBox = () => {
    setShowErrorBox(false);
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
            <div className='member-edit-info-save-div'>
              <button onClick={handleSaveAndRedirect}>
                <img src={checkIcon} />
                <span>Save & Update</span>
              </button>
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

        <form className='member-edit-profile-bio-info-grid' onSubmit={handleSaveAndRedirect}>
          <div className='member-edit-profile-bio-info-name'>
            <label>
              Full Name <span className='member-edit-profile-bio-info-required-star'>*</span>
            </label>
            <div className="input-container">
              {errors.fullName === 'Field Missing' && (
                <span className="edit-profile-field-missing">*Field Missing*</span>
              )}
              <input
                type='text'
                value={fullName}
                placeholder='Full Name...'
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (e.target.value.trim()) {
                    setErrors(prev => ({ ...prev, fullName: '' }));
                  }
                }}
                className={errors.fullName ? 'error-input' : ''}
              />
              {errors.fullName && (
                <img src={dangerIcon} alt="Error" className="edit-profile-error-icon" />
              )}
            </div>
          </div>

          {/* Email */}
          <div className='member-edit-profile-bio-info-email'>
            <label>
              Email Address <span className='member-edit-profile-bio-info-required-star'>*</span>
            </label>
            <div className="input-container">
              {errors.email === 'Field Missing' && (
                <span className="edit-profile-field-missing">*Field Missing*</span>
              )}
              <input
                type='email'
                value={email}
                placeholder='Email Address...'
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (e.target.value.trim()) {
                    setErrors(prev => ({ ...prev, email: '' }));
                  }
                }}
                className={errors.email ? 'error-input' : ''}
              />
              {errors.email && (
                <img src={dangerIcon} alt="Error" className="edit-profile-error-icon" />
              )}
            </div>
            {errors.email === 'Invalid email' && (
              <div className="edit-profile-error-message">
                <span>Invalid email address.</span>
              </div>
            )}
          </div>

          {/* Username */}
          <div className='member-edit-profile-bio-info-username'>
            <label>
              Username <span className='member-edit-profile-bio-info-required-star'>*</span>
            </label>
            <div className="input-container">
              {errors.username === 'Field Missing' && (
                <span className="edit-profile-field-missing">*Field Missing*</span>
              )}
              <input
                type='text'
                value={username}
                placeholder='Username...'
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (e.target.value.trim()) {
                    setErrors(prev => ({ ...prev, username: '' }));
                  }
                }}
                className={errors.username ? 'error-input' : ''}
              />
              {errors.username && (
                <img src={dangerIcon} alt="Error" className="edit-profile-error-icon" />
              )}
            </div>
            {errors.username === 'Invalid username' && (
              <div className="edit-profile-error-message">
                <span>
                  Please use 3–15 characters, only letters, numbers, periods, underscores, or hyphens.
                </span>
              </div>
            )}
          </div>
        </form>

        <div className='member-edit-profile-bio-info-bio'>
          <label>Bio</label>
          <div>
            <textarea 
              placeholder='Bio...'
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            ></textarea>
          </div>
        </div>
      </div>
        {showErrorBox && (
          <div className="edit-profile-error-banner">
              <img src={dangerFilledIcon} alt="Error" className="edit-profile-error-icon-banner" />
              <span className="edit-profile-error-box-message-banner">
                Error – Fields Missing or Invalid. Please try again.
              </span>
              <div>
                <button className='edit-profile-close-banner-button'>
                  <img
                    src={closeIcon}
                    alt="Close"
                    onClick={handleCloseErrorBox}
                  />
                </button>
              </div>
          </div>
        )}
    </section>
  );
};

export default EditProfile;
