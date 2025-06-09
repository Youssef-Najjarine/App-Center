import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import signInPhotoDesktop from '../../../assets/log-in-desktop.jpeg';
import logoIcon from '../../../assets/intro-bg.jpeg';
import dangerIcon from '../../../assets/danger.svg';
import closeIcon from '../../../assets/close.svg';
import eyeSlash from '../../../assets/eye-slash.svg';
import eyeIcon from '../../../assets/eye.svg';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    emailUsername: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    number: false,
    specialChar: false,
  });

  const [showErrorBox, setShowErrorBox] = useState(false); // New state for showing error box

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Remove error message when user types
    if (value.trim()) {
      setErrors((prevErrors) => ({ ...prevErrors, [name]: '' }));
    }

    if (name === 'password') {
      validatePassword(value);
    }
  };

  const validatePassword = (password) => {
    const length = password.length >= 8;
    const uppercase = /[A-Z]/.test(password);
    const number = /[0-9]/.test(password);
    const specialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    setPasswordValidation({ length, uppercase, number, specialChar });
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
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
  };

  // Function to hide the error box when the close button is clicked
  const handleCloseErrorBox = () => {
    setShowErrorBox(false);
  };

  return (
    <div className="sign-in-container">
      <div className="sign-in-form-div">
        <div className="sign-in-logo-container">
          <Link to="/" className="sign-in-logo-link">
            <img src={logoIcon} alt="Logo Icon" className="sign-in-logo-icon" />
          </Link>
          <Link to="/" className="home-navbar-logo-link">
            <span className="sign-in-logo-text">Open App Partners</span>
          </Link>
        </div>
        <h2>Sign In</h2>
        <div className="sign-in-already-have-account-div">
          <p>Don't have an Account?</p>
          <Link to="/auth/sign-up">Sign Up</Link>
        </div>
        <form onSubmit={handleSubmit}>
          <div className='sign-in-email-username-password-div'>
            <div className="sign-in-email-username-div">
              <label className="sign-in-email-username">
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
                      <img src={dangerIcon} alt="Error" className="sign-in-error-icon" />
                      <span className="sign-in-field-missing">*Field Missing*</span>
                    </>
                  )}
                </div>
              </label>
            </div>
            <div className="sign-in-password-div">
              <label className="sign-in-password">
                Password
                <div className="sign-in-password-input-container">
                  <input
                    type={passwordVisible ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Input password"
                    className={errors.password ? 'error-input' : ''}
                  />
                  {errors.password && (
                    <>
                      <span className="sign-in-field-missing">*Field Missing*</span>
                    </>
                  )}
                  <span
                    className="toggle-password-visibility"
                    onClick={togglePasswordVisibility}
                  >
                    <img
                      src={passwordVisible ? eyeSlash : eyeIcon}
                      alt="Toggle Visibility"
                      className="sign-in-password-eye"
                    />
                  </span>
                </div>
              </label>
            </div>
          </div>
          <div className='forgot-password-login-div'>
            <Link to="/auth/forgot-password" className="sign-in-forgot-password-link">
              <p className='forgot-password'>
                Forgot Password?
              </p>
            </Link>
            <div>
              <button type="submit" className="log-in">
                Login Now
              </button>
            </div>
          </div>
        </form>
        <div className='sign-in-greyLine'></div>
        {showErrorBox && (
          <div className='sign-in-error-box-column'>
            <div className='sign-in-error-box'>
              <img src={dangerIcon} alt="Error" className="sign-in-error-box-icon" />
              <span className='sign-in-error-box-message'>Error - Fields Missing. Please try again</span>
              <img src={closeIcon} alt="Close" onClick={handleCloseErrorBox} className='sign-in-close-error-box-icon' />
            </div>
          </div>
        )}
      </div>
      <div>
        <img src={signInPhotoDesktop} alt='sign-in-photo' className='sign-in-photo' />
      </div>
    </div>
  );
};

export default Login;