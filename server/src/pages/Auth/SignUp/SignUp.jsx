import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import signUpPhotoDesktop from '../../../assets/sign-up-desktop.jpeg';
import signUpPhotoTablet from '../../../assets/sign-up-tablet.jpeg';
import logoIcon from '../../../assets/intro-bg.jpeg';
import checkIcon from '../../../assets/check.svg';
import dangerIcon from '../../../assets/danger.svg';
import eyeSlash from '../../../assets/eye-slash.svg';
import eyeIcon from '../../../assets/eye.svg';
import './SignUp.css';

const SignUp = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
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

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    // Form submission logic
    console.log('Form submitted:', formData);
  };

  return (
    <div className="sign-up-container">
      <div>
        <img src={signUpPhotoDesktop} alt="sign-up-photo-desktop-mobile" className="sign-up-photo-desktop-mobile" />
        <div className='sign-up-photo-tablet-div'>
          <img src={signUpPhotoTablet} alt="sign-up-photo-tablet" className="sign-up-photo-tablet" />
        </div>
      </div>
      <div className="sign-up-form-div">
        <div className="sign-up-logo-container">
          <Link to="/" className="sign-up-logo-link">
            <img src={logoIcon} alt="Logo Icon" className="logo-icon" />
          </Link>
          <Link to="/" className="home-navbar-logo-link">
            <span className="sign-up-logo-text">Open App Partners</span>
          </Link>
        </div>
        <h2>Sign up</h2>
        <div className="already-have-account-div">
          <p>Already have an Account?</p>
          <a href="/auth/login">Login</a>
        </div>
        <form onSubmit={handleSubmit}>
          <div className='name-email-div'>
            <div className="name-fields">
              <label className="firstName">
                First Name
                <div className="input-container">
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Input first name"
                    className={errors.firstName ? 'error-input' : ''}
                  />
                  {errors.firstName && (
                    <>
                      <img src={dangerIcon} alt="Error" className="error-icon" />
                      <span className="field-missing">*Field Missing*</span>
                    </>
                  )}
                </div>
              </label>

              {/* Last Name */}
              <label className="lastName">
                Last Name
                <div className="input-container">
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Input last name"
                    className={errors.lastName ? 'error-input' : ''}
                  />
                  {errors.lastName && (
                    <>
                      <img src={dangerIcon} alt="Error" className="error-icon" />
                      <span className="field-missing">*Field Missing*</span>
                    </>
                  )}
                </div>
              </label>
            </div>
            <div className="email-div">
              <label className="email">
                Email Address
                <div className="input-container">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Input email address"
                    className={errors.email ? 'error-input' : ''}
                  />
                  {errors.email && (
                    <>
                      <img src={dangerIcon} alt="Error" className="error-icon" />
                      <span className="field-missing">*Field Missing*</span>
                    </>
                  )}
                </div>
                {errors.email && (
                  <span className="error-message">Invalid email address.</span>
                )}
              </label>
            </div>
          </div>
          <div className='username-password-div'>
            <div className="username-div">
              <label className="username">
                Username
                <div className="input-container">
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Input username"
                    className={errors.username ? 'error-input' : ''}
                  />
                  {errors.username && (
                    <>
                      <img src={dangerIcon} alt="Error" className="error-icon" />
                      <span className="field-missing">*Field Missing*</span>
                    </>
                  )}
                </div>
                {errors.username && (
                  <span className="error-message">
                    Please use 3-15 characters, only letters, numbers, periods,<span className='sign-up-desktop-break'><br/></span> underscores, or hyphens.
                  </span>
                )}
              </label>
            </div>

            <div className="password-div">
              <label className="password">
                Password
                <div className="password-input-container">
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
                      <span className="field-missing">*Field Missing*</span>
                    </>
                  )}
                  <span
                    className="toggle-password-visibility"
                    onClick={togglePasswordVisibility}
                  >
                    <img
                      src={passwordVisible ? eyeSlash : eyeIcon}
                      alt="Toggle Visibility"
                      className="password-eye"
                    />
                  </span>
                </div>
                <ul className="password-requirements">
                  <li className={passwordValidation.length ? 'valid' : 'invalid'}>
                    <img
                      src={passwordValidation.length ? checkIcon : dangerIcon}
                      className="icon"
                      alt="Validation Icon"
                    />
                    Password must be at least 8 characters long.
                  </li>
                  <li className={passwordValidation.uppercase ? 'valid' : 'invalid'}>
                    <img
                      src={passwordValidation.uppercase ? checkIcon : dangerIcon}
                      className="icon"
                      alt="Validation Icon"
                    />
                    Password must contain at least one uppercase letter.
                  </li>
                  <li className={passwordValidation.number ? 'valid' : 'invalid'}>
                    <img
                      src={passwordValidation.number ? checkIcon : dangerIcon}
                      className="icon"
                      alt="Validation Icon"
                    />
                    Password must contain at least one number.
                  </li>
                  <li className={passwordValidation.specialChar ? 'valid' : 'invalid'}>
                    <img
                      src={passwordValidation.specialChar ? checkIcon : dangerIcon}
                      className="icon"
                      alt="Validation Icon"
                    />
                    Password must contain at least one special character.
                  </li>
                </ul>
              </label>
            </div>
          </div>
          <button type="submit" className="create-account">
            Create Account
          </button>
        </form>
        <div className='sign-up-greyLine'></div>
      </div>
    </div>
  );
};

export default SignUp;
