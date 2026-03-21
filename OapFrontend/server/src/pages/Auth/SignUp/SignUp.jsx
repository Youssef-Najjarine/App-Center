import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import signUpPhoto from '@assets/sign-up-background.jpeg';
import logoIcon from '@assets/logo.jpeg';
import checkIcon from '@assets/green-check-circle-outline.svg';
import dangerIcon from '@assets/danger-outline.svg';
import eyeSlash from '@assets/eye-slash.svg';
import eyeIcon from '@assets/eye.svg';
import WhiteCheckIcon from "@assets/white-check-circle-outline.svg";
import TermsOfServiceModal from "@pages/TermsOfServiceModal/TermsOfServiceModal";
import PrivacyPolicyModal from '@pages/PrivacyPolicyModal/PrivacyPolicyModal';
import ProcessingModal from "@pages/ProcessingModal/ProcessingModal";
import './SignUp.css';

const USERNAME_RULE_MESSAGE =
  'Please use 3-15 characters, only letters, numbers, periods, underscores, or hyphens.';

const SignUp = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
  });

  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [showPrivacyPolicyModal, setShowPrivacyPolicyModal] = useState(false);
  const [showTermsOfServiceModal, setShowTermsOfServiceModal] = useState(false);

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [emailTakenError, setEmailTakenError] = useState('');
  const [usernameTakenError, setUsernameTakenError] = useState('');
  const [unverifiedConflictError, setUnverifiedConflictError] = useState('');
  const UNVERIFIED_CONFLICT_MESSAGE = 'Username/email mismatch. Verify your original account.';
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    username: false,
    password: false,
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    number: false,
    specialChar: false,
  });

    const allFieldsFilled =
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    formData.email.trim() &&
    formData.username.trim() &&
    formData.password;

  const passwordIsValid = Object.values(passwordValidation).every(Boolean);

  const noFieldErrors =
    !errors.firstName &&
    !errors.lastName &&
    !errors.email &&
    !errors.username &&
    !errors.password;

  const noServerErrors = !serverError && !emailTakenError && !usernameTakenError;

  const isCreateAccountDisabled =
    !allFieldsFilled || !passwordIsValid || !noFieldErrors || !noServerErrors || showProcessingModal;

  useEffect(() => {
    validatePassword(formData.password);
  }, [formData.password]);

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

  const isUsernameFormatValid = (username) => {
    const u = username.trim();
    return /^[a-zA-Z0-9._-]{3,15}$/.test(u);
  };

  const isEmailValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const shouldShowErrorForField = (fieldName) => submitAttempted || touched[fieldName];

  const validateField = (name, value) => {
    if (name === 'password') {
      if (!value) return 'Field Missing';
      return '';
    }

    if (!value.trim()) return 'Field Missing';

    if (name === 'email') {
      if (!isEmailValid(value)) return 'Invalid email address';
    }

    if (name === 'username') {
      if (!isUsernameFormatValid(value)) return USERNAME_RULE_MESSAGE;
    }

    return '';
  };

  const validateAll = (data) => {
    const nextErrors = {};
    Object.entries(data).forEach(([name, value]) => {
      const err = validateField(name, value);
      if (err) nextErrors[name] = err;
    });
    return nextErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (serverError) setServerError('');

    if (name === 'email' && emailTakenError) {
      setEmailTakenError('');
    }

    if (name === 'username' && usernameTakenError) {
      setUsernameTakenError('');
    }

    if (name === 'password') {
      validatePassword(value);
    }

    if (unverifiedConflictError) setUnverifiedConflictError('');

    if (shouldShowErrorForField(name)) {
      const err = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: err }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;

    setTouched((prev) => ({ ...prev, [name]: true }));

    const err = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isCreateAccountDisabled) return;
    setServerError('');
    setEmailTakenError('');
    setUsernameTakenError('');
    setUnverifiedConflictError('');
    setSubmitAttempted(true);

    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      username: true,
      password: true,
    });

    const nextErrors = validateAll(formData);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const trimmedPayload = {
      ...formData,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      username: formData.username.trim(),
    };

    try {
      setShowProcessingModal(true);

      const response = await fetch('/api/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trimmedPayload),
      });

      const data = await response.json();

    if (response.ok && data.success) {
      navigate('/auth/verify-identity', { state: { email: trimmedPayload.email } });
      return;
    }

    const isUsernameTakenPayload = (payload) => {
      const texts = [];
      if (payload?.error) texts.push(String(payload.error));
      if (payload?.message) texts.push(String(payload.message));
      if (payload?.errors && typeof payload.errors === 'object') {
        Object.values(payload.errors).forEach((v) => {
          if (typeof v === 'string') texts.push(v);
        });
        if (typeof payload.errors.username === 'string') texts.push(payload.errors.username);
      }
      const joined = texts.join(' | ').toLowerCase();
      return (
        joined.includes('username') &&
        (joined.includes('taken') || joined.includes('exists') || joined.includes('already'))
      );
    };

    const isEmailTakenPayload = (payload) => {
      const texts = [];
      if (payload?.error) texts.push(String(payload.error));
      if (payload?.message) texts.push(String(payload.message));
      if (payload?.errors && typeof payload.errors === 'object') {
        Object.values(payload.errors).forEach((v) => {
          if (typeof v === 'string') texts.push(v);
        });
        if (typeof payload.errors.email === 'string') texts.push(payload.errors.email);
      }
      const joined = texts.join(' | ').toLowerCase();
      return (
        joined.includes('email') &&
        (joined.includes('taken') || joined.includes('exists') || joined.includes('already'))
      );
    };

    const isUnverifiedConflictPayload = (payload) => {
      const texts = [];
      if (payload?.error) texts.push(String(payload.error));
      if (payload?.message) texts.push(String(payload.message));
      if (payload?.errors && typeof payload.errors === 'object') {
        Object.values(payload.errors).forEach((v) => {
          if (typeof v === 'string') texts.push(v);
        });
      }
      const joined = texts.join(' | ').toLowerCase();

      return (
        joined.includes('different') &&
        joined.includes('unverified') &&
        joined.includes('accounts')
      );
    };

    if (isUsernameTakenPayload(data)) {
      setUsernameTakenError('That username is already taken.');
      return;
    }

    if (isEmailTakenPayload(data)) {
      setEmailTakenError('That email is already taken.');
      return;
    }

    if (isUnverifiedConflictPayload(data)) {
      setUnverifiedConflictError(UNVERIFIED_CONFLICT_MESSAGE);
      return;
    }

    if (data?.errors && typeof data.errors === 'object') {
      setErrors(data.errors);
      return;
    }

    if (data?.error) {
      setServerError(data.error);
    } else {
      setServerError('An error occurred during signup');
    }
    } catch (err) {
      setServerError('Unable to connect to the server. Please try again later.');
      console.error('Signup error:', err);
    } finally {
      setShowProcessingModal(false);
    }
  };

  const showFieldMissing = (fieldName) =>
    shouldShowErrorForField(fieldName) && errors?.[fieldName] === 'Field Missing';

  const showUsernameRuleError =
    shouldShowErrorForField('username') && errors?.username === USERNAME_RULE_MESSAGE;

  const showEmailInvalid =
    shouldShowErrorForField('email') && errors?.email === 'Invalid email address';

  return (
    <div className="sign-up-container">
      <div>
        <img src={signUpPhoto} alt="sign-up-background" className="sign-up-background-photo" />
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

        <h2>Sign Up</h2>

        <div className="already-have-account-div">
          <p>Already have an Account?</p>
          <Link to="/auth/sign-in">Sign In</Link>
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
                    onBlur={handleBlur}
                    placeholder="Input first name"
                    className={shouldShowErrorForField('firstName') && errors.firstName ? 'error-input' : ''}
                  />
                  {showFieldMissing('firstName') && (
                    <>
                      <img src={dangerIcon} alt="Error" className="error-icon" />
                      <span className="field-missing">*Field Missing*</span>
                    </>
                  )}
                </div>
              </label>

              <label className="lastName">
                Last Name
                <div className="input-container">
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Input last name"
                    className={shouldShowErrorForField('lastName') && errors.lastName ? 'error-input' : ''}
                  />
                  {showFieldMissing('lastName') && (
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
                    onBlur={handleBlur}
                    placeholder="Input email address"
                    className={shouldShowErrorForField('email') && errors.email ? 'error-input' : ''}
                  />
                  {showFieldMissing('email') && (
                    <>
                      <img src={dangerIcon} alt="Error" className="error-icon" />
                      <span className="field-missing">*Field Missing*</span>
                    </>
                  )}
                </div>

                {showEmailInvalid && (
                  <span className="error-message">Invalid email address.</span>
                )}
                {emailTakenError && (
                  <span className="error-message">{emailTakenError}</span>
                )}
                {unverifiedConflictError && (
                  <span className="error-message">{unverifiedConflictError}</span>
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
                    onBlur={handleBlur}
                    placeholder="Input username"
                    className={
                      (shouldShowErrorForField('username') && errors.username) || usernameTakenError
                        ? 'error-input'
                        : ''
                    }
                  />
                  {showFieldMissing('username') && (
                    <>
                      <img src={dangerIcon} alt="Error" className="error-icon" />
                      <span className="field-missing">*Field Missing*</span>
                    </>
                  )}
                </div>

                {showUsernameRuleError && (
                  <span className="error-message">
                    Please use 3-15 characters, only letters, numbers, periods,
                    <span className='sign-up-desktop-break'><br /></span>
                    underscores, or hyphens.
                  </span>
                )}

                {usernameTakenError && (
                  <span className="error-message">{usernameTakenError}</span>
                )}
                {unverifiedConflictError && (
                  <span className="error-message">{unverifiedConflictError}</span>
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
                    onBlur={handleBlur}
                    placeholder="Input password"
                    className={shouldShowErrorForField('password') && errors.password ? 'error-input' : ''}
                  />
                  {showFieldMissing('password') && (
                    <span className="field-missing">*Field Missing*</span>
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
          <button
            type="submit"
            className={`create-account ${isCreateAccountDisabled ? 'disabled' : ''}`}
            disabled={isCreateAccountDisabled}
            aria-disabled={isCreateAccountDisabled}
          >
            <img src={WhiteCheckIcon} alt="" />
            Create Account
          </button>

          {serverError && (
            <div className="error-message" style={{ marginTop: '10px' }}>
              {serverError}
            </div>
          )}
        </form>

        <div className='sign-up-greyLine'></div>

        <div className='sign-up-privacy-policy-terms-of-service'>
          <p className='sign-up-policy-terms-of-service-text'>
            Protected by reCAPTCHA and subject to the Google{' '}
            <Link
              onClick={() => setShowPrivacyPolicyModal(true)}
              className='sign-up-privacy-policy-text'
            >
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link
              onClick={() => setShowTermsOfServiceModal(true)}
              className='sign-up-terms-of-service-text'
            >
              Terms of Service
            </Link>
            .
          </p>
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
    </div>
  );
};

export default SignUp;
