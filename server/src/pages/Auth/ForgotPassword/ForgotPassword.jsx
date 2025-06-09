import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import forgetPasswordPhotoDesktop from '../../../assets/forgot-password-desktop.jpeg';
import logoIcon from '../../../assets/intro-bg.jpeg';
import dangerIcon from '../../../assets/danger.svg';
import closeIcon from '../../../assets/close.svg';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    emailUsername: ''
  });

  const [errors, setErrors] = useState({});;

  const [showErrorBox, setShowErrorBox] = useState(false); // New state for showing error box

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Remove error message when user types
    if (value.trim()) {
      setErrors((prevErrors) => ({ ...prevErrors, [name]: '' }));
    }

  };



  const handleSubmit = (e) => {
    e.preventDefault();
  
    const newErrors = {};
  
    // Check for missing fields
    Object.entries(formData).forEach(([key, value]) => {
      if (!value.trim()) {
        newErrors[key] = 'Field Missing';
      }
    });
  
    // Validate email format if present
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
  
    setErrors(newErrors);
  
    // Show error box if there are any errors
    if (Object.keys(newErrors).length > 0) {
      setShowErrorBox(true); // Show error box
      return;
    }
  
    // Form submission logic
    console.log('Form submitted:', formData);
    
    // Navigate to verify identity page after successful submission
    navigate('/auth/verify-identity');
  };

  // Function to hide the error box when the close button is clicked
  const handleCloseErrorBox = () => {
    setShowErrorBox(false);
  };

  return (
    <div className="forget-password-container">
      <div className="forget-password-form-div">
        <div className="forget-password-logo-container">
          <Link to="/" className="forget-password-logo-link">
            <img src={logoIcon} alt="Logo Icon" className="forget-password-logo-icon" />
          </Link>
          <Link to="/" className="home-navbar-logo-link">
            <span className="forget-password-logo-text">Open App Partners</span>
          </Link>
        </div>
        <h2>Forget Password</h2>
        <div className="forget-password-already-have-account-div">
          <p>Already have an Account?</p>
          <a href="/auth/login">Login</a>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="forget-password-email-username-div">
            <label className="forget-password-email-username">
              Email/Username
              <div className="input-container">
                <input
                  type="text"
                  name="emailUsername"
                  value={formData.emailUsername}
                  onChange={handleChange}
                  placeholder="Input email address or username"
                  className={errors.emailUsername ? 'error-input' : ''}
                />
                {errors.emailUsername && (
                  <>
                    <img src={dangerIcon} alt="Error" className="forget-password-error-icon" />
                    <span className="forget-password-field-missing">*Field Missing*</span>
                  </>
                )}
              </div>
            </label>
          </div>
          <div className='send-verification-div'>
            <div>
              <button type="submit" className="verification-code">
                Send Verification Code
              </button>
            </div>
          </div>
        </form>
        <div className='forget-password-greyLine'></div>
        {showErrorBox && (
          <div className='forget-password-error-box-column'>
            <div className='forget-password-error-box'>
              <img src={dangerIcon} alt="Error" className="forget-password-error-box-icon" />
              <span className='forget-password-error-box-message'>Error - Fields Missing. Please try again</span>
              <img src={closeIcon} alt="Close" onClick={handleCloseErrorBox} className='forget-password-close-error-box-icon' />
            </div>
          </div>
        )}
      </div>
      <div>
        <img src={forgetPasswordPhotoDesktop} alt='forget-password-photo' className='forget-password-photo' />
      </div>
    </div>
  );
};

export default ForgotPassword;