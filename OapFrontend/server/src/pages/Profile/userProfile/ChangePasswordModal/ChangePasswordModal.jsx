import React, { useEffect, useMemo, useState } from "react";
import cancelIcon from "@assets/x-circle-icon.svg";
import checkIcon from "@assets/green-check-circle-outline.svg";
import confirmIcon from "@assets/white-check-circle-outline.svg";
import dangerIcon from "@assets/danger-outline.svg";
import eyeSlashIcon from "@assets/eye-slash.svg";
import eyeIcon from "@assets/eye.svg";
import ProcessingModal from "@pages/ProcessingModal/ProcessingModal";
import "./ChangePasswordModal.css";

const safeJson = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  if (!text) return null;
  if (!contentType.includes("application/json")) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const ChangePasswordModal = ({ onClose }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [onClose]);

  const validatePassword = (value) => {
    setPasswordValidation({
      length: value.length >= 8,
      uppercase: /[A-Z]/.test(value),
      number: /[0-9]/.test(value),
      specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(value),
    });
  };

  const handleCurrentPasswordChange = (e) => {
    const value = e.target.value;
    setCurrentPassword(value);

    if (serverError) setServerError("");
    if (value.trim()) setErrors((prev) => ({ ...prev, currentPassword: null }));
  };

  const handleNewPasswordChange = (e) => {
    const value = e.target.value;
    setNewPassword(value);
    validatePassword(value);

    if (serverError) setServerError("");
    if (value.trim()) setErrors((prev) => ({ ...prev, newPassword: null }));

    if (confirmPassword && value === confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: null, newPassword: null }));
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);

    if (serverError) setServerError("");
    if (value.trim()) setErrors((prev) => ({ ...prev, confirmPassword: null }));

    if (newPassword && value === newPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: null, newPassword: null }));
    }
  };

  const mismatch = useMemo(() => {
    return Boolean(newPassword && confirmPassword && newPassword !== confirmPassword);
  }, [newPassword, confirmPassword]);

  const meetsAllRequirements = useMemo(() => {
    return (
      passwordValidation.length &&
      passwordValidation.uppercase &&
      passwordValidation.number &&
      passwordValidation.specialChar
    );
  }, [passwordValidation]);

  const canSubmit = useMemo(() => {
    return (
      currentPassword.trim().length > 0 &&
      newPassword.trim().length > 0 &&
      confirmPassword.trim().length > 0 &&
      !mismatch &&
      meetsAllRequirements &&
      !isSubmitting
    );
  }, [currentPassword, newPassword, confirmPassword, mismatch, meetsAllRequirements, isSubmitting]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!currentPassword.trim()) newErrors.currentPassword = "Field Missing";
    if (!newPassword.trim()) newErrors.newPassword = "Field Missing";
    if (!confirmPassword.trim()) newErrors.confirmPassword = "Field Missing";
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      newErrors.newPassword = "Mismatch";
      newErrors.confirmPassword = "Mismatch";
    }

    setErrors(newErrors);
    setServerError("");

    if (Object.keys(newErrors).length > 0) return;

    if (!meetsAllRequirements) {
      setServerError("Error - Password does not meet the required criteria.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPassword,
          newPassword: newPassword,
        }),
      });

      const data = await safeJson(response);

      if (!data) {
        setServerError("Error - Unable to connect to the server.");
        return;
      }

      if (response.status === 401) {
        setServerError("Error - Your session expired. Please Sign In again.");
        return;
      }

      if (!response.ok || !data.success) {
        setServerError(data.error || "Error - Unable to change password.");
        return;
      }

      onClose?.();
    } catch (err) {
      console.error("Change password error:", err);
      setServerError("Error - Unable to connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return <ProcessingModal />;
  }

  return (
    <div className="profile-change-password-modal-overlay" onClick={onClose}>
      <div
        className="profile-change-password-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="profile-change-password-close-header">
          <h2>Change Password</h2>
        </div>

        <div className="profile-change-password-body">
          <form onSubmit={handleSubmit}>
            {serverError && (
              <div className="profile-change-password-server-error">
                <span>{serverError}</span>
              </div>
            )}

            <div className="profile-current-password-div">
              <label>Current Password</label>
              <div className="profile-change-password-password-input-container">
                {errors.currentPassword && (
                  <span className="profile-change-password-field-missing">
                    *Field Missing*
                  </span>
                )}
                <input
                  type={currentPasswordVisible ? "text" : "password"}
                  name="currentPassword"
                  value={currentPassword}
                  onChange={handleCurrentPasswordChange}
                  placeholder="Current password..."
                  className={errors.currentPassword ? "profile-change-password-error-input" : ""}
                />
                <span
                  className="profile-change-password-toggle-password-visibility"
                  onClick={() => setCurrentPasswordVisible((v) => !v)}
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

            <div className="profile-new-password-div">
              <label>New Password</label>
              <div className="profile-change-password-password-input-container">
                {errors.newPassword === "Field Missing" && (
                  <span className="profile-change-password-field-missing">
                    *Field Missing*
                  </span>
                )}
                <input
                  type={newPasswordVisible ? "text" : "password"}
                  name="newPassword"
                  value={newPassword}
                  onChange={handleNewPasswordChange}
                  placeholder="New password..."
                  className={
                    errors.newPassword || mismatch
                      ? "profile-change-password-error-input"
                      : ""
                  }
                />
                <span
                  className="profile-change-password-toggle-password-visibility"
                  onClick={() => setNewPasswordVisible((v) => !v)}
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
                {errors.confirmPassword === "Field Missing" && (
                  <span className="profile-change-password-field-missing">
                    *Field Missing*
                  </span>
                )}
                <input
                  type={confirmPasswordVisible ? "text" : "password"}
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  placeholder="Confirm new password..."
                  className={
                    errors.confirmPassword || mismatch
                      ? "profile-change-password-error-input"
                      : ""
                  }
                />
                <span
                  className="profile-change-password-toggle-password-visibility"
                  onClick={() => setConfirmPasswordVisible((v) => !v)}
                >
                  <img
                    src={confirmPasswordVisible ? eyeSlashIcon : eyeIcon}
                    alt="Toggle Visibility"
                    className="profile-change-password-password-eye"
                  />
                </span>
              </div>

              {mismatch && (
                <div className="password-mismatch">
                  <span>*Password is not matching*</span>
                </div>
              )}
            </div>

            <ul className="profile-change-password-password-requirements">
              <li className={passwordValidation.length ? "valid" : "invalid"}>
                <img
                  src={passwordValidation.length ? checkIcon : dangerIcon}
                  className="profile-change-password-validation-icon"
                  alt=""
                />
                Password must be at least 8 characters long.
              </li>
              <li className={passwordValidation.uppercase ? "valid" : "invalid"}>
                <img
                  src={passwordValidation.uppercase ? checkIcon : dangerIcon}
                  className="profile-change-password-validation-icon"
                  alt=""
                />
                Password must contain at least one uppercase letter.
              </li>
              <li className={passwordValidation.number ? "valid" : "invalid"}>
                <img
                  src={passwordValidation.number ? checkIcon : dangerIcon}
                  className="profile-change-password-validation-icon"
                  alt=""
                />
                Password must contain at least one number.
              </li>
              <li className={passwordValidation.specialChar ? "valid" : "invalid"}>
                <img
                  src={passwordValidation.specialChar ? checkIcon : dangerIcon}
                  className="profile-change-password-validation-icon"
                  alt=""
                />
                Password must contain at least one special character.
              </li>
            </ul>

            <div className="profile-change-password-buttons">
              <div>
                <button
                  type="button"
                  onClick={onClose}
                  className="profile-change-password-cancel-button"
                  disabled={isSubmitting}
                >
                  <img src={cancelIcon} alt="Cancel Icon" />
                  <span>Cancel</span>
                </button>
              </div>

              <div>
                <button
                  type="submit"
                  className="profile-change-password-save-button"
                  disabled={!canSubmit}
                  style={{
                    opacity: canSubmit ? 1 : 0.6,
                    cursor: canSubmit ? "pointer" : "not-allowed",
                  }}
                >
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
