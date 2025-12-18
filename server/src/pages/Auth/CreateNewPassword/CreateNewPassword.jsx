import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import createPasswordPhoto from '../../../assets/create-password.jpeg';
import logoIcon from '../../../assets/logo.jpeg';
import checkIcon from '../../../assets/green-check-circle-outline.svg';
import dangerIcon from '../../../assets/danger-outline.svg';
import dangerFilledIcon from '../../../assets/danger-filled.svg';
import closeIcon from '../../../assets/x-icon.svg';
import eyeSlash from '../../../assets/eye-slash.svg';
import eyeIcon from '../../../assets/eye.svg';
import './CreateNewPassword.css';

const CreateNewPassword = () => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmNewPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmNewPasswordVisible, setConfirmNewPasswordVisible] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    number: false,
    specialChar: false,
  });

  const [showErrorBox, setShowErrorBox] = useState(false);
  const navigate = useNavigate();

  const validatePassword = (password) => {
    const length = password.length >= 8;
    const uppercase = /[A-Z]/.test(password);
    const number = /[0-9]/.test(password);
    const specialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    setPasswordValidation({ length, uppercase, number, specialChar });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (value.trim()) {
      setErrors((prevErrors) => ({ ...prevErrors, [name]: '' }));
    }

    if (name === 'newPassword') {
      validatePassword(value);
    }

    setShowErrorBox(false);
  };

  const toggleNewPasswordVisibility = () => {
    setNewPasswordVisible((prev) => !prev);
  };

  const toggleConfirmNewPasswordVisibility = () => {
    setConfirmNewPasswordVisible((prev) => !prev);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const { newPassword, confirmNewPassword } = formData;
    const newErrors = {};

    if (!newPassword.trim()) {
      newErrors.newPassword = 'Field Missing';
    }
    if (!confirmNewPassword.trim()) {
      newErrors.confirmNewPassword = 'Field Missing';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    const allRequirementsMet = Object.values(passwordValidation).every(Boolean);
    if (!allRequirementsMet) {
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setShowErrorBox(true);
      return;
    }

    setShowErrorBox(false);

    console.log('Form submitted:', formData);
    navigate('/profile');
  };

  const handleCloseErrorBox = () => {
    setShowErrorBox(false);
  };

  return (
    <section id="create-password">
      <div className='create-password'>
        <div className='create-password-form-submit-div'>
          <div className='create-password-logo-header-already-have-account'>
            <div className="create-password-logo-container">
              <Link to="/" className="create-password-logo-link">
                <img src={logoIcon} alt="Logo Icon" className="create-password-logo-icon" />
                <h1 className="create-password-logo-text">Open App Partners</h1>
              </Link>
            </div>
            <div className='create-password-header-already-have-account'>
              <h2 className='create-password-header'>Create Password</h2>
              <div className="create-password-already-have-account-div">
                <p className='create-password-already-have-account-text'>Already have an Account?</p>
                <Link to="/auth/login" className='create-password-login-link'>Login Account</Link>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className='create-password-password-form'>
            <div className='create-password-passwords-div'>
              <div className="create-password-password-div">
                <label htmlFor='create-password-new-password'>New Password</label>
                <div className='create-password-input-div'>
                  <input
                  id='create-password-new-password'
                    type={newPasswordVisible ? 'text' : 'password'}
                    name="newPassword"
                    value={formData.newPassword}
                    placeholder='Input password'
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="create-password-toggle-password-visibility"
                    onClick={toggleNewPasswordVisibility}
                  >
                    <img
                      src={newPasswordVisible ? eyeSlash : eyeIcon}
                      alt="Toggle Visibility"
                      className="create-password-password-eye"
                    />
                  </button>
                </div>
              </div>

              <div className="create-password-password-div">
                <label htmlFor='create-password-confirm-new-password'>Confirm New Password</label>
                <div className='create-password-input-div'>
                  <input
                  id='create-password-confirm-new-password'
                    type={confirmNewPasswordVisible ? 'text' : 'password'}
                    name="confirmNewPassword"
                    value={formData.confirmNewPassword}
                    placeholder='Input password'
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="create-password-toggle-password-visibility"
                    onClick={toggleConfirmNewPasswordVisibility}
                  >
                    <img
                      src={confirmNewPasswordVisible ? eyeSlash : eyeIcon}
                      alt="Toggle Visibility"
                      className="create-password-password-eye"
                    />
                  </button>
                </div>
              </div>
            </div>
            <div className='create-password-password-requirements-create-password-button'>
              <ul className="create-password-password-requirements">
                <li className={passwordValidation.length ? 'valid' : 'invalid'}>
                  <img
                    src={passwordValidation.length ? checkIcon : dangerIcon}
                    className="create-password-password-requirement-icon"
                    alt="Validation Icon"
                  />
                  Password must be at least 8 characters long.
                </li>
                <li className={passwordValidation.uppercase ? 'valid' : 'invalid'}>
                  <img
                    src={passwordValidation.uppercase ? checkIcon : dangerIcon}
                    className="create-password-password-requirement-icon"
                    alt="Validation Icon"
                  />
                  Password must contain at least one uppercase letter.
                </li>
                <li className={passwordValidation.number ? 'valid' : 'invalid'}>
                  <img
                    src={passwordValidation.number ? checkIcon : dangerIcon}
                    className="create-password-password-requirement-icon"
                    alt="Validation Icon"
                  />
                  Password must contain at least one number.
                </li>
                <li className={passwordValidation.specialChar ? 'valid' : 'invalid'}>
                  <img
                    src={passwordValidation.specialChar ? checkIcon : dangerIcon}
                    className="create-password-password-requirement-icon"
                    alt="Validation Icon"
                  />
                  Password must contain at least one special character.
                </li>
              </ul>
              <div className='create-password-confirm-button-div'>
                <button type="submit" className='create-password-confirm-button'>
                  Confirm Password
                </button>
              </div>              
            </div>
          </form>

          <div className='create-password-greyLine'></div>
          <div className='create-password-privacy-policy-terms-of-service'>
            <p className='create-password-policy-terms-of-service-text'>
              Protected by reCAPTCHA and subject to the Google{' '}
              <Link to="/privacy-policy" className='create-password-privacy-policy-text'>Privacy Policy</Link> and{' '}
              <Link to="/terms-of-service" className='create-password-terms-of-service-text'>Terms of Service</Link>.
            </p>
          </div>

          {showErrorBox && (
            <div className='create-password-error-box-column'>
              <div className='create-password-error-box'>
                <img src={dangerFilledIcon} alt="Error" className="create-password-error-box-icon" />
                <span className='create-password-error-box-message'>
                  New Password &amp; Confirm New Password should be same.
                </span>
                <img
                  src={closeIcon}
                  alt="Close"
                  onClick={handleCloseErrorBox}
                  className='create-password-close-error-box-icon'
                />
              </div>
            </div>
          )}
        </div>

        <div className='create-password-photo-div'>
          <img src={createPasswordPhoto} alt='create-password-photo' className='create-password-photo' />
        </div>
      </div>
    </section>
  );
};

export default CreateNewPassword;
