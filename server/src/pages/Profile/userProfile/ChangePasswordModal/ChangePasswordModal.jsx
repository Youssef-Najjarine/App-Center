import React, { useEffect, useState } from "react";
import "./ChangePasswordModal.css";
import cancelIcon from "../../../../assets/Member/member-change-password-cancel-icon.svg";
import checkIcon from "../../../../assets/Member/member-change-password-check-icon.svg";
import confirmIcon from "../../../../assets/Member/member-change-password-confirm-icon.svg";
import dangerIcon from '../../../../assets/Member/member-change-password-danger-icon.svg';
import eyeSlashIcon from '../../../../assets/Member/member-change-password-eye-slash-icon.svg';
import eyeIcon from '../../../../assets/Member/member-change-password-eye-icon.svg';

const ChangePasswordModal = ({ modalOpenState, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [currentPasswordVisible, setCurrentPasswordVisible] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const [errors, setErrors] = useState({});
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    number: false,
    specialChar: false,
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [onClose, modalOpenState]);

  const handleNewPasswordChange = (e) => {
    const value = e.target.value;
    setNewPassword(value);
    validatePassword(value);
    if (value.trim()) {
      setErrors(prev => ({ ...prev, newPassword: null }));
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (value.trim()) {
      setErrors(prev => ({ ...prev, confirmPassword: null }));
    }
  };

  const handleCurrentPasswordChange = (e) => {
    const value = e.target.value;
    setCurrentPassword(value);
    if (value.trim()) {
      setErrors(prev => ({ ...prev, currentPassword: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!currentPassword.trim()) newErrors.currentPassword = 'Field Missing';
    if (!newPassword.trim()) newErrors.newPassword = 'Field Missing';
    if (!confirmPassword.trim()) newErrors.confirmPassword = 'Field Missing';
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      newErrors.newPassword = 'Mismatch';
      newErrors.confirmPassword = 'Mismatch';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      console.log('Password changed to:', newPassword);
      onClose();
    }
  };

  const validatePassword = (value) => {
    setPasswordValidation({
      length: value.length >= 8,
      uppercase: /[A-Z]/.test(value),
      number: /[0-9]/.test(value),
      specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(value),
    });
  };

  return (
    <div className="profile-change-password-modal-overlay" onClick={onClose}>
      <div className="profile-change-password-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-change-password-close-header">
          <h2>Change Password</h2>
        </div>
        <div className="profile-change-password-body">
          <form onSubmit={handleSubmit}>

            {/* Current Password */}
            <div className="profile-current-password-div">
              <label>Current Password</label>
              <div className="profile-change-password-password-input-container">
                {errors.currentPassword && (
                  <span className="profile-change-password-field-missing">*Field Missing*</span>
                )}
                <input
                  type={currentPasswordVisible ? 'text' : 'password'}
                  name="currentPassword"
                  value={currentPassword}
                  onChange={handleCurrentPasswordChange}
                  placeholder="Current password..."
                  className={errors.currentPassword ? 'profile-change-password-error-input' : ''}
                />
                <span
                  className="profile-change-password-toggle-password-visibility"
                  onClick={() => setCurrentPasswordVisible(!currentPasswordVisible)}
                >
                  <img
                    src={currentPasswordVisible ? eyeSlashIcon : eyeIcon}
                    alt="Toggle Visibility"
                    className="profile-change-password-password-eye"
                  />
                </span>
              </div>
            </div>

            <div className="profile-change-password-line"></div>

            {/* New Password */}
            <div className="profile-new-password-div">
              <label>New Password</label>
              <div className="profile-change-password-password-input-container">
                {errors.newPassword === 'Field Missing' && (
                  <span className="profile-change-password-field-missing">*Field Missing*</span>
                )}
                <input
                  type={newPasswordVisible ? 'text' : 'password'}
                  name="newPassword"
                  value={newPassword}
                  onChange={handleNewPasswordChange}
                  placeholder="New password..."
                  className={
                    errors.newPassword || (confirmPassword && newPassword !== confirmPassword)
                      ? 'profile-change-password-error-input'
                      : ''
                  }
                />
                <span
                  className="profile-change-password-toggle-password-visibility"
                  onClick={() => setNewPasswordVisible(!newPasswordVisible)}
                >
                  <img
                    src={newPasswordVisible ? eyeSlashIcon : eyeIcon}
                    alt="Toggle Visibility"
                    className="profile-change-password-password-eye"
                  />
                </span>
              </div>
            </div>
            <div className="profile-confirm-password-div">
              <label>Confirm New Password</label>
              <div className="profile-change-password-password-input-container">
                {errors.confirmPassword === 'Field Missing' && (
                  <span className="profile-change-password-field-missing">*Field Missing*</span>
                )}
                <input
                  type={confirmPasswordVisible ? 'text' : 'password'}
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  placeholder="Confirm new password..."
                  className={
                    errors.confirmPassword || (newPassword && confirmPassword && newPassword !== confirmPassword)
                      ? 'profile-change-password-error-input'
                      : ''
                  }
                />
                <span
                  className="profile-change-password-toggle-password-visibility"
                  onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                >
                  <img
                    src={confirmPasswordVisible ? eyeSlashIcon : eyeIcon}
                    alt="Toggle Visibility"
                    className="profile-change-password-password-eye"
                  />
                </span>
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <div className="password-mismatch">
                  <span>*Password is not matching*</span>
                </div>
              )}
            </div>

            <ul className="profile-change-password-password-requirements">
              <li className={passwordValidation.length ? 'valid' : 'invalid'}>
                <img src={passwordValidation.length ? checkIcon : dangerIcon} className="profile-change-password-validation-icon" alt="" />
                Password must be at least 8 characters long.
              </li>
              <li className={passwordValidation.uppercase ? 'valid' : 'invalid'}>
                <img src={passwordValidation.uppercase ? checkIcon : dangerIcon} className="profile-change-password-validation-icon" alt="" />
                Password must contain at least one uppercase letter.
              </li>
              <li className={passwordValidation.number ? 'valid' : 'invalid'}>
                <img src={passwordValidation.number ? checkIcon : dangerIcon} className="profile-change-password-validation-icon" alt="" />
                Password must contain at least one number.
              </li>
              <li className={passwordValidation.specialChar ? 'valid' : 'invalid'}>
                <img src={passwordValidation.specialChar ? checkIcon : dangerIcon} className="profile-change-password-validation-icon" alt="" />
                Password must contain at least one special character.
              </li>
            </ul>

            <div className="profile-change-password-buttons">
              <div>
                <button type="button" onClick={onClose} className="profile-change-password-cancel-button">
                  <img src={cancelIcon} alt="Cancel Icon" />
                  <span>Cancel</span>
                </button>
              </div>
              <div>
                <button type="submit" className="profile-change-password-save-button">
                  <img src={confirmIcon} alt="Confirm Icon" />
                  <span>Confirm Save</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
