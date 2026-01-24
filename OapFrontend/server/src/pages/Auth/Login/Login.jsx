import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import signInPhotoDesktop from '@assets/log-in-background.jpeg';
import logoIcon from '@assets/logo.jpeg';
import dangerOutlineIcon from '@assets/danger-outline.svg';
import dangerFilledIcon from '@assets/danger-filled.svg';
import closeIcon from '@assets/x-icon.svg';
import eyeSlash from '@assets/eye-slash.svg';
import eyeIcon from '@assets/eye.svg';
import TermsOfServiceModal from "@pages/TermsOfServiceModal/TermsOfServiceModal";
import PrivacyPolicyModal from '@pages/PrivacyPolicyModal/PrivacyPolicyModal';
import ProcessingModal from "@pages/ProcessingModal/ProcessingModal";
import { useAuthUser } from "@context/AuthUserContext";
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    emailUsername: '',
    password: '',
  });
  const [errorBoxMessage, setErrorBoxMessage] = useState('');
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [showPrivacyPolicyModal, setShowPrivacyPolicyModal] = useState(false);
  const [showTermsOfServiceModal, setShowTermsOfServiceModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordVisible, setPasswordVisible] = useState(false);

  const [showErrorBox, setShowErrorBox] = useState(false);

    const emailUsernameFilled = !!formData.emailUsername.trim();
  const passwordFilled = !!formData.password;
  const noFieldErrors = !errors.emailUsername && !errors.password;
  const noErrorMessagesPresent = !showErrorBox && !errorBoxMessage;

  const isSignInDisabled =
    !emailUsernameFilled ||
    !passwordFilled ||
    !noFieldErrors ||
    !noErrorMessagesPresent ||
    showProcessingModal;

  const { refresh } = useAuthUser();
  const navigate = useNavigate();
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (value.trim()) {
      setErrors((prevErrors) => ({ ...prevErrors, [name]: '' }));
    }

    if (showErrorBox) setShowErrorBox(false);
    if (errorBoxMessage) setErrorBoxMessage('');
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSignInDisabled) return;

    setShowErrorBox(false);
    setErrorBoxMessage('');

    const newErrors = {};
    Object.entries(formData).forEach(([key, value]) => {
      if (!value.trim()) {
        newErrors[key] = 'Field Missing';
      }
    });

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setErrorBoxMessage('Error - Fields Missing. Please try again');
      setShowErrorBox(true);
      return;
    }

    console.log('Form submitted:', formData);

    try {
      setShowProcessingModal(true);

      const response = await fetch('/api/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          emailUsername: formData.emailUsername.trim(),
          password: formData.password,
        }),
      });

      const text = await response.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }

      if (response.ok && data.success) {
      await refresh();
      const from = location.state?.from || "/profile";
      navigate(from, { replace: true });
        return;
      }

      if (data.requiresVerification) {
        navigate('/auth/verify-identity', {
          state: {
            email: data.email,
            fromLogin: true,
            reason: data.reason
          }
        });
        return;
      }

      // Invalid credentials
      if (response.status === 401 || data.error === 'Invalid credentials') {
        setErrorBoxMessage('Error - Invalid sign in credentials.');
      } else {
        setErrorBoxMessage('Error - Unable to connect to the server.');
      }
      setShowErrorBox(true);
    } catch (err) {
      setErrorBoxMessage('Error - Unable to connect to the server.');
      setShowErrorBox(true);
      console.error('Login error:', err);
    } finally {
      setShowProcessingModal(false);
    }
  };

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
                      <img src={dangerOutlineIcon} alt="Error" className="sign-in-error-icon" />
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
            <button
              type="submit"
              className={`log-in ${isSignInDisabled ? 'disabled' : ''}`}
              disabled={isSignInDisabled}
              aria-disabled={isSignInDisabled}
            >
              Sign In Now
            </button>
            </div>
          </div>
        </form>
        <div className='sign-in-greyLine'></div>
        <div className='sign-in-privacy-policy-terms-of-service'>
          <p className='sign-in-policy-terms-of-service-text'>
            Protected by reCAPTCHA and subject to the Google{' '}
            <Link onClick={() => setShowPrivacyPolicyModal(true)} className='sign-in-privacy-policy-text'>Privacy Policy</Link> and{' '}
            <Link onClick={() => setShowTermsOfServiceModal(true)} className='sign-in-terms-of-service-text'>Terms of Service</Link>.
          </p>
        </div> 
        {showErrorBox && (
          <div className='sign-in-error-box-column'>
            <div className='sign-in-error-box'>
              <img src={dangerFilledIcon} alt="Error" className="sign-in-error-box-icon" />
              <span className='sign-in-error-box-message'>{errorBoxMessage}</span>
              <img src={closeIcon} alt="Close" onClick={handleCloseErrorBox} className='sign-in-close-error-box-icon' />
            </div>
          </div>
        )}
      </div>
      <div>
        <img src={signInPhotoDesktop} alt='sign-in-photo' className='sign-in-photo' />
      </div>
      {showPrivacyPolicyModal && (
        <PrivacyPolicyModal
          modalOpenState={showPrivacyPolicyModal}
          onClose={() => setShowPrivacyPolicyModal(false)}
        />
      )}      
      {showTermsOfServiceModal && (
        <TermsOfServiceModal
          modalOpenState={showTermsOfServiceModal}
          onClose={() => setShowTermsOfServiceModal(false)}
        />
      )}
      {showProcessingModal && <ProcessingModal />}
    </div>
  );
};

export default Login;