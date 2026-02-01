import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import verifyIdentityPhoto from '@assets/verify-identity-background.jpg';
import passwordCheckIcon from '@assets/password-verify-identity-icon.svg';
import logoIcon from '@assets/logo.jpeg';
import dangerFilledIcon from '@assets/danger-filled.svg';
import closeIcon from '@assets/x-icon.svg';
import TermsOfServiceModal from "@pages/TermsOfServiceModal/TermsOfServiceModal";
import PrivacyPolicyModal from '@pages/PrivacyPolicyModal/PrivacyPolicyModal';
import ProcessingModal from "@pages/ProcessingModal/ProcessingModal";
import { useAuthUser } from "@context/AuthUserContext";
import './VerifyIdentity.css';

const VerifyIdentity = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useAuthUser();
  const passedEmail = location.state?.email || '';
  const { fromSignIn, fromForgotPassword } = location.state || {};
  const [code, setCode] = useState(['', '', '', '']);
  const [activeIndex, setActiveIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(null);
  const [showPrivacyPolicyModal, setShowPrivacyPolicyModal] = useState(false);
  const [showTermsOfServiceModal, setShowTermsOfServiceModal] = useState(false);
  const inputRefs = useRef([]);

  const maskEmail = (email) => {
    if (!email || !email.includes('@')) return email;
    const [name, domain] = email.split('@');
    if (name.length <= 2) return email;
    const first = name.slice(0, 3);
    const last = name.slice(-2);
    const masked = first + '*'.repeat(6) + last;
    return masked + '@' + domain;
  };
  const maskedEmail = maskEmail(passedEmail);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  useEffect(() => {
    if (!passedEmail) {
      navigate('/auth/sign-in');
    }
  }, [passedEmail, navigate]);

  useEffect(() => {
    if (resendSecondsLeft === null) return;

    if (resendSecondsLeft <= 0) {
      setResendSecondsLeft(null);
      return;
    }

    const id = setInterval(() => {
      setResendSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(id);
  }, [resendSecondsLeft]);


  const formatMMSS = (totalSeconds) => {
    const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const ss = String(totalSeconds % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const handleResendCode = async (e) => {
    e.preventDefault();
    if (resendSecondsLeft !== null) return;

    try {
      setShowProcessingModal(true);

      const response = await fetch('/api/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: passedEmail }),
      });

      const data = await safeJson(response);

      if (!data) {
        setErrorMessage('Error - Unable to connect to the server.');
        return;
      }

      if (response.ok && data.success) {
        setResendSecondsLeft(60);
        setErrorMessage('');
        return;
      }

      setErrorMessage(data.error || 'Unable to resend code');
    } catch (err) {
      setErrorMessage('Error - Unable to connect to the server.');
      console.error('ResendCode error:', err);
    } finally {
      setShowProcessingModal(false);
    }
  };


  const handleCodeChange = (e, index) => {
    let { value } = e.target;
    value = value.replace(/\D/g, '');
    if (value.length > 1) value = value[0];
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
      setActiveIndex(index + 1);
    }
  };

  const handlePaste = (e, startIndex) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, ''); // Only digits
    if (pastedData.length === 0) return;

    const newCode = [...code];
    let currentIndex = startIndex;

    for (let i = 0; i < pastedData.length && currentIndex < 4; i++) {
      newCode[currentIndex] = pastedData[i];
      currentIndex++;
    }

    setCode(newCode);
    setActiveIndex(Math.min(currentIndex, 3));

    // Focus the last filled input (or the next empty if paste filled all)
    const focusIndex = Math.min(currentIndex, 3);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleCodeKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        setActiveIndex(index - 1);
      }
      if (code[index]) {
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setActiveIndex(index - 1);
    } else if (e.key === 'ArrowRight' && index < 3) {
      inputRefs.current[index + 1]?.focus();
      setActiveIndex(index + 1);
    }
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
  setErrorMessage('');

  const isAnyEmpty = code.some((digit) => digit.trim() === '');
  if (isAnyEmpty) {
    setErrorMessage('Please enter the full code.');
    return;
  }

  const fullCode = code.join('');

  try {
    setShowProcessingModal(true);

    const endpoint = fromForgotPassword ? '/api/verify-reset-code' : '/api/verify-code';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: passedEmail, code: fullCode }),
    });

    const data = await safeJson(response);

    if (!data) {
      setErrorMessage('Error - Unable to connect to the server.');
      return;
    }

    if (response.ok && data.success) {
      if (fromForgotPassword) {
        navigate('/auth/create-new-password', { state: { resetToken: data.resetToken } });
        return;
      }
      await refresh();

      navigate('/profile', { replace: true });
      return;
    }

    setErrorMessage(data.error || 'Invalid or expired code. Please try again.');
  } catch (err) {
    setErrorMessage('Error - Unable to connect to the server.');
    console.error('VerifyIdentity error:', err);
  } finally {
    setShowProcessingModal(false);
  }
};


  const handleCloseErrorBox = () => {
    setErrorMessage('');
  };

  return (
    <div className="verify-identity-container">
      <div className="verify-identity-form-div">
        <div className="verify-identity-logo-container">
          <Link to="/" className="verify-identity-logo-link">
            <img src={logoIcon} alt="Logo" className="verify-identity-logo-icon" />
          </Link>
          <Link to="/" className="home-navbar-logo-link">
            <span className="verify-identity-logo-text">Open App Partners</span>
          </Link>
        </div>
        <div className="verify-identity-password-check-div">
          <img src={passwordCheckIcon} alt="Secure" />
        </div>
        <h2>Verify your Identity!</h2>
        <div className="verify-identity-already-enter-code-sent-message-div">
          <p className="verify-identity-already-enter-code-sent-message-label">
            {fromSignIn || fromForgotPassword ? "A new verification code has been sent to your email" : "Enter the code sent to your email"}
          </p>
          <p className="verify-identity-already-enter-code-sent-message-value">
            {maskedEmail}
          </p>
        </div>        
        <form onSubmit={handleSubmit}>
          <div className="verify-identity-codes-div">
            {[0, 1, 2, 3].map((idx) => (
              <div className="verify-identity-code-div" key={idx}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={code[idx]}
                  onChange={(e) => handleCodeChange(e, idx)}
                  onKeyDown={(e) => handleCodeKeyDown(e, idx)}
                  onFocus={() => setActiveIndex(idx)}
                  onPaste={(e) => handlePaste(e, idx)}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  className={`verify-identity-code-input ${
                    activeIndex === idx ? 'verify-identity-code-highlighted' : ''
                  }`}
                />
              </div>
            ))}
          </div>
          <div className="verify-identity-links-div">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="verify-identity-back-link"
            >
              Back
            </button>
            {resendSecondsLeft === null ? (
              <Link
                onClick={handleResendCode}
                className="verify-identity-didnt-receive-link"
              >
                Resend Code?
              </Link>
            ) : (
              <span className="verify-identity-resend-label">
                Resend after{" "}
                <span className="verify-identity-resend-value">
                  {formatMMSS(resendSecondsLeft)}
                </span>
              </span>
            )}
          </div>
          <div className="verify-identity-confirm-div">
            <button type="submit" className="verify-identity-confirm">
              Confirm
            </button>
          </div>
        </form>
        <div className="verify-identity-greyLine"></div>
        <div className='verify-identity-privacy-policy-terms-of-service'>
          <p className='verify-identity-policy-terms-of-service-text'>Protected by reCAPTCHA and subject to the Google <Link onClick={() => setShowPrivacyPolicyModal(true)} className='verify-identity-privacy-policy-text'>Privacy Policy</Link> and <Link onClick={() => setShowTermsOfServiceModal(true)} className='verify-identity-terms-of-service-text'>Terms of Service</Link>.</p>
        </div>
        {errorMessage && (
          <div className='verify-identity-error-box-column'>
            <div className="verify-identity-error-box">
              <img src={dangerFilledIcon} alt="Error" className="verify-identity-error-box-icon" />
              <span className="verify-identity-error-box-message">
                {errorMessage}
              </span>
              <img src={closeIcon} alt="Close" onClick={handleCloseErrorBox} className="verify-identity-close-error-box-icon" />
            </div>
          </div>
        )}
      </div>
      <div className='verify-identity-photo-div'>
        <img
          src={verifyIdentityPhoto}
          alt="verify-identity-background"
          className="verify-identity-photo"
        />
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

export default VerifyIdentity;