import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import forgetPasswordPhotoDesktop from '@assets/forgot-password-background.jpeg';
import passwordCheckIcon from '@assets/password-verify-identity-icon.svg';
import logoIcon from '@assets/logo.jpeg';
import dangerOutlineIcon from '@assets/danger-outline.svg';
import dangerFilledIcon from '@assets/danger-filled.svg';
import closeIcon from '@assets/x-icon.svg';
import TermsOfServiceModal from "@pages/TermsOfServiceModal/TermsOfServiceModal";
import PrivacyPolicyModal from '@pages/PrivacyPolicyModal/PrivacyPolicyModal';
import ProcessingModal from "@pages/ProcessingModal/ProcessingModal";
import './ForgotPassword.css';

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ emailUsername: '' });
  const [errors, setErrors] = useState({});
  const [showErrorBox, setShowErrorBox] = useState(false);
  const [errorBoxMessage, setErrorBoxMessage] = useState('');

  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [showPrivacyPolicyModal, setShowPrivacyPolicyModal] = useState(false);
  const [showTermsOfServiceModal, setShowTermsOfServiceModal] = useState(false);
  const emailUsernameFilled = !!formData.emailUsername.trim();
  const isSubmitDisabled = !emailUsernameFilled || showProcessingModal;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    setErrors((prev) => ({ ...prev, [name]: '' }));

    // clear error box as they type
    if (showErrorBox) setShowErrorBox(false);
    if (errorBoxMessage) setErrorBoxMessage('');
  };

  const handleCloseErrorBox = () => {
    setShowErrorBox(false);
    setErrorBoxMessage('');
  };

  const safeJson = async (response) => {
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    if (!text) return null;
    if (!contentType.includes('application/json')) return null;

    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitDisabled) return;

    setShowErrorBox(false);
    setErrorBoxMessage('');

    // Validate
    const newErrors = {};
    if (!formData.emailUsername.trim()) {
      newErrors.emailUsername = 'Field Missing';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setErrorBoxMessage('Error - Fields Missing. Please try again');
      setShowErrorBox(true);
      return;
    }

    try {
      setShowProcessingModal(true);

      // You will implement this endpoint in the backend
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          emailUsername: formData.emailUsername.trim()
        }),
      });

      const data = await safeJson(response);

      if (!data) {
        setErrorBoxMessage('Error - Unable to connect to the server.');
        setShowErrorBox(true);
        return;
      }

      if (response.ok && data.success) {
        // Must navigate with REAL email from backend so VerifyIdentity can resend/verify correctly
        navigate('/auth/verify-identity', {
          state: {
            email: data.email,          // backend should return canonical email
            fromForgotPassword: true,   // used later to route to CreateNewPassword after verify
          }
        });
        return;
      }

      // --- Error mapping ---
      // Recommended server contract for clarity:
      // { errorCode: 'NotFound' | 'Invalid' | 'NotVerified' | 'ServerError', error: '...' }

      const errorCode = data.errorCode || '';

      if (errorCode === 'NotFound') {
        setErrorBoxMessage('Error - Username/Email does not exist');
      } else if (errorCode === 'Invalid') {
        setErrorBoxMessage('Error - Invalid Username/Email');
      } else if (errorCode === 'NotVerified') {
        setErrorBoxMessage('Error - Username/Email for account not verified. Please verify the account first.');
      } else {
        // Non-network fallback should not say "unable to connect"
        setErrorBoxMessage(data.error || 'Error - Invalid Username/Email');
      }
      setShowErrorBox(true);
    } catch (err) {
      setErrorBoxMessage('Error - Unable to connect to the server.');
      setShowErrorBox(true);
      console.error('ForgotPassword error:', err);
    } finally {
      setShowProcessingModal(false);
    }
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

        <div className="forget-password-password-check-div">
          <img src={passwordCheckIcon} alt="Password Check Icon" />
        </div>

        <h2>Forgot Password</h2>

        <div className="forget-password-already-have-account-div">
          <p>Already have an Account?</p>
          <Link to="/auth/login">Login</Link>
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
                    <img src={dangerOutlineIcon} alt="Error" className="forget-password-error-icon" />
                    <span className="forget-password-field-missing">*Field Missing*</span>
                  </>
                )}
              </div>
            </label>
          </div>

          <div className="send-verification-div">
            <button
              type="submit"
              className={`verification-code ${isSubmitDisabled ? 'disabled' : ''}`}
              disabled={isSubmitDisabled}
              aria-disabled={isSubmitDisabled}
            >
              Send Verification Code
            </button>
          </div>
        </form>

        <div className="forget-password-greyLine"></div>

        <div className="forget-password-privacy-policy-terms-of-service">
          <p className="forget-password-policy-terms-of-service-text">
            Protected by reCAPTCHA and subject to the Google{' '}
            <Link onClick={() => setShowPrivacyPolicyModal(true)} className="forget-password-privacy-policy-text">
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link onClick={() => setShowTermsOfServiceModal(true)} className="forget-password-terms-of-service-text">
              Terms of Service
            </Link>.
          </p>
        </div>

        {showErrorBox && (
          <div className="forget-password-error-box-column">
            <div className="forget-password-error-box">
              <img src={dangerFilledIcon} alt="Error" className="forget-password-error-box-icon" />
              <span className="forget-password-error-box-message">{errorBoxMessage}</span>
              <img
                src={closeIcon}
                alt="Close"
                onClick={handleCloseErrorBox}
                className="forget-password-close-error-box-icon"
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <img src={forgetPasswordPhotoDesktop} alt="forget-password-photo" className="forget-password-photo" />
      </div>

      {showPrivacyPolicyModal && (
        <PrivacyPolicyModal modalOpenState={showPrivacyPolicyModal} onClose={() => setShowPrivacyPolicyModal(false)} />
      )}

      {showTermsOfServiceModal && (
        <TermsOfServiceModal modalOpenState={showTermsOfServiceModal} onClose={() => setShowTermsOfServiceModal(false)} />
      )}

      {showProcessingModal && <ProcessingModal />}
    </div>
  );
};

export default ForgotPassword;
