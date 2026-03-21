import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import createPasswordPhoto from '@assets/create-password.jpeg';
import logoIcon from '@assets/logo.jpeg';
import checkIcon from '@assets/green-check-circle-outline.svg';
import dangerIcon from '@assets/danger-outline.svg';
import dangerFilledIcon from '@assets/danger-filled.svg';
import closeIcon from '@assets/x-icon.svg';
import eyeSlash from '@assets/eye-slash.svg';
import eyeIcon from '@assets/eye.svg';
import TermsOfServiceModal from "@pages/TermsOfServiceModal/TermsOfServiceModal";
import PrivacyPolicyModal from '@pages/PrivacyPolicyModal/PrivacyPolicyModal';
import ProcessingModal from "@pages/ProcessingModal/ProcessingModal";
import './CreateNewPassword.css';

const CreateNewPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const resetToken = location.state?.resetToken || '';
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmNewPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmNewPasswordVisible, setConfirmNewPasswordVisible] = useState(false);

  const [showPrivacyPolicyModal, setShowPrivacyPolicyModal] = useState(false);
  const [showTermsOfServiceModal, setShowTermsOfServiceModal] = useState(false);

  const [showProcessingModal, setShowProcessingModal] = useState(false);

  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    number: false,
    specialChar: false,
  });

  const [showErrorBox, setShowErrorBox] = useState(false);
  const [errorBoxMessage, setErrorBoxMessage] = useState('');
  useEffect(() => {
    if (!resetToken) navigate('/auth/forgot-password');
  }, [resetToken, navigate]);

  const validatePassword = (password) => {
    const length = password.length >= 8;
    const uppercase = /[A-Z]/.test(password);
    const number = /[0-9]/.test(password);
    const specialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    setPasswordValidation({ length, uppercase, number, specialChar });
  };

  const allRequirementsMet = useMemo(
    () => Object.values(passwordValidation).every(Boolean),
    [passwordValidation]
  );

  const passwordsFilled = useMemo(() => {
    return !!formData.newPassword.trim() && !!formData.confirmNewPassword.trim();
  }, [formData.newPassword, formData.confirmNewPassword]);

  const passwordsMatch = useMemo(() => {
    return formData.newPassword === formData.confirmNewPassword;
  }, [formData.newPassword, formData.confirmNewPassword]);

  const isSubmitDisabled = useMemo(() => {
    return (
      showProcessingModal ||
      !passwordsFilled ||
      !allRequirementsMet ||
      !passwordsMatch
    );
  }, [showProcessingModal, passwordsFilled, allRequirementsMet, passwordsMatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    setErrors((prev) => ({ ...prev, [name]: '' }));

    if (showErrorBox) setShowErrorBox(false);
    if (errorBoxMessage) setErrorBoxMessage('');

    if (name === 'newPassword') {
      validatePassword(value);
    }
  };

  const toggleNewPasswordVisibility = () => {
    setNewPasswordVisible((prev) => !prev);
  };

  const toggleConfirmNewPasswordVisibility = () => {
    setConfirmNewPasswordVisible((prev) => !prev);
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
    if (showProcessingModal) return;

    setShowErrorBox(false);
    setErrorBoxMessage('');

    const newErrors = {};
    if (!formData.newPassword.trim()) newErrors.newPassword = 'Field Missing';
    if (!formData.confirmNewPassword.trim()) newErrors.confirmNewPassword = 'Field Missing';

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setErrorBoxMessage('Error - Fields Missing. Please try again');
      setShowErrorBox(true);
      return;
    }

    if (!allRequirementsMet) {
      setErrorBoxMessage('Error - Password does not meet the requirements.');
      setShowErrorBox(true);
      return;
    }

    if (!passwordsMatch) {
      setErrorBoxMessage('Error - New Password & Confirm New Password should be the same.');
      setShowErrorBox(true);
      return;
    }

    try {
      setShowProcessingModal(true);
      const response = await fetch('/api/create-new-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ resetToken, newPassword: formData.newPassword })
      });

      const data = await safeJson(response);

      if (!data) {
        setErrorBoxMessage('Error - Unable to connect to the server.');
        setShowErrorBox(true);
        return;
      }

      if (response.ok && data.success) {
        navigate('/auth/sign-in', { state: { passwordResetSuccess: true } });
        return;
      }

      setErrorBoxMessage(data.error || 'Error - Unable to reset password. Please try again.');
      setShowErrorBox(true);
    } catch (err) {
      console.error('CreateNewPassword error:', err);
      setErrorBoxMessage('Error - Unable to connect to the server.');
      setShowErrorBox(true);
    } finally {
      setShowProcessingModal(false);
    }
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
                <Link to="/auth/sign-in" className='create-password-signin-link'>Sign In</Link>
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
                    className={errors.newPassword ? 'error-input' : ''}
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
                    className={errors.confirmNewPassword ? 'error-input' : ''}
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
                <button
                  type="submit"
                  className={`create-password-confirm-button ${isSubmitDisabled ? 'disabled' : ''}`}
                  disabled={isSubmitDisabled}
                  aria-disabled={isSubmitDisabled}
                >
                  Confirm Password
                </button>
              </div>
            </div>
          </form>

          <div className='create-password-greyLine'></div>
          <div className='create-password-privacy-policy-terms-of-service'>
            <p className='create-password-policy-terms-of-service-text'>
              Protected by reCAPTCHA and subject to the Google{' '}
              <Link onClick={() => setShowPrivacyPolicyModal(true)} className='create-password-privacy-policy-text'>Privacy Policy</Link> and{' '}
              <Link onClick={() => setShowTermsOfServiceModal(true)} className='create-password-terms-of-service-text'>Terms of Service</Link>.
            </p>
          </div>

          {showErrorBox && (
            <div className='create-password-error-box-column'>
              <div className='create-password-error-box'>
                <img src={dangerFilledIcon} alt="Error" className="create-password-error-box-icon" />
                <span className='create-password-error-box-message'>{errorBoxMessage}</span>
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
    </section>
  );
};

export default CreateNewPassword;
