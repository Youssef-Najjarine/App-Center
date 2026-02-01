import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import profilePic from '@assets/placeholder-profile-picture.png';
import cancelIcon from '@assets/x-circle-icon.svg';
import checkIcon from '@assets/white-check-circle-outline.svg';
import uploadPhotoIcon from '@assets/black-outline-upload-icon.svg';
import dangerIcon from '@assets/danger-outline.svg';
import dangerFilledIcon from '@assets/danger-filled.svg';
import closeIcon from '@assets/x-icon.svg';
import ProcessingModal from "@pages/ProcessingModal/ProcessingModal";
import { useAuthUser } from "@context/AuthUserContext";
import './EditProfile.css';

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

const EditProfile = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const navigate = useNavigate();
  const { user, loading, error, refresh } = useAuthUser();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  const [errors, setErrors] = useState({});
  const [showErrorBox, setShowErrorBox] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Prefill once user is loaded
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setEmail(user.email || "");
      setUsername(user.username || "");
      setBio(user.bio || "");
    }
  }, [user]);

  // Redirect if not authenticated once loading ends
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth/sign-in', { replace: true });
    }
  }, [loading, user, navigate]);

  const handleCloseErrorBox = () => {
    setShowErrorBox(false);
  };

  const handleSaveAndRedirect = async (e) => {
    e.preventDefault();

    // Client-side validation (keeps your UI behavior)
    const newErrors = {};

    if (!firstName.trim()) newErrors.firstName = 'Field Missing';
    if (!lastName.trim()) newErrors.lastName = 'Field Missing';

    if (!email.trim()) newErrors.email = 'Field Missing';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email';

    if (!username.trim()) newErrors.username = 'Field Missing';
    else if (!/^[a-zA-Z0-9._-]{3,15}$/.test(username)) newErrors.username = 'Invalid username';

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setShowErrorBox(true);
      return;
    }

    setShowErrorBox(false);
    setIsSaving(true);

    try {
      const response = await fetch('/api/edit-profile', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          username: username.trim(),
          bio: bio
        })
      });

      const data = await safeJson(response);

      if (!data) {
        setShowErrorBox(true);
        setErrors({ form: "Error - Unable to connect to the server." });
        return;
      }

      if (response.status === 401) {
        navigate('/auth/sign-in', { replace: true });
        return;
      }

      // Backend validation errors: { errors: { field: message } }
      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setErrors({ form: data.error || "Unable to update profile." });
        }
        setShowErrorBox(true);
        return;
      }

      // Success: refresh shared user + go back
      if (typeof refresh === "function") {
        await refresh();
      }

      navigate('/profile', { state: { updateSuccess: true }, replace: true });
    } catch (err) {
      console.error("Update profile error:", err);
      setErrors({ form: "Error - Unable to connect to the server." });
      setShowErrorBox(true);
    } finally {
      setIsSaving(false);
    }
  };

  // Processing modal: initial user load OR save in progress
  if (loading || isSaving) {
    return <ProcessingModal />;
  }

  // If we redirected, avoid rendering
  if (!user) {
    return null;
  }

  // If shared auth context has an error (server down etc.)
  if (error) {
    return (
      <section id='member-edit-profile-bio'>
        <div className='member-edit-profile-bio-info'>
          <div className='member-edit-profile-bio-header'>
            <div>
              <h2>My Account</h2>
            </div>
          </div>
          <p style={{ marginTop: 12 }}>
            {error || 'Error - Unable to connect to the server.'}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id='member-edit-profile-bio'>
      <div className='member-edit-profile-bio-info'>
        <div className='member-edit-profile-bio-header'>
          <div>
            <h2>My Account</h2>
          </div>
          <div className='member-edit-profile-bio-info-cancel-save-div'>
            <div className='member-edit-info-cancel-div'>
              <Link to="/profile">
                <img src={cancelIcon} alt="Cancel" />
                <span>Cancel</span>
              </Link>
            </div>
            <div className='member-edit-info-save-div'>
              <button onClick={handleSaveAndRedirect}>
                <img src={checkIcon} alt="Save" />
                <span>Save & Update</span>
              </button>
            </div>
          </div>
        </div>

        {/* Profile picture stays UI-only for now */}
        <div className='member-edit-profile-bio-info-profilePic'>
          <div className='member-edit-profile-bio-info-profilePic-sub-div'>
            <div className="member-profile-photo-container">
              <img src={profilePic} className="member-edit-profile-info-photo" alt="Profile" />
              <button
                className="member-edit-profile-info-upload-background"
                type="button"
                onClick={() => {
                  // Later: implement upload
                }}
              >
                <img src={uploadPhotoIcon} className="member-edit-profile-info-upload-icon" alt="Upload" />
              </button>
            </div>
          </div>
          <div>
            <p className='member-edit-profile-bio-info-upload-photo'>Upload Photo</p>
            <p className='member-edit-profile-bio-info-photo-size'>300x300 and max 2 MB</p>
          </div>
        </div>

        <form className='member-edit-profile-bio-info-grid' onSubmit={handleSaveAndRedirect}>
          <div className='member-edit-profile-bio-info-names'>
            <div className='member-edit-profile-bio-info-name'>
              <label>
                First Name <span className='member-edit-profile-bio-info-required-star'>*</span>
              </label>
              <div className="input-container">
                {errors.firstName === 'Field Missing' && (
                  <span className="edit-profile-field-missing">*Field Missing*</span>
                )}
                <input
                  type='text'
                  value={firstName}
                  placeholder='First Name...'
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (e.target.value.trim()) setErrors(prev => ({ ...prev, firstName: '' }));
                  }}
                  className={errors.firstName ? 'error-input' : ''}
                />
                {errors.firstName && (
                  <img src={dangerIcon} alt="Error" className="edit-profile-error-icon" />
                )}
              </div>
            </div>

            <div className='member-edit-profile-bio-info-name'>
              <label>
                Last Name <span className='member-edit-profile-bio-info-required-star'>*</span>
              </label>
              <div className="input-container">
                {errors.lastName === 'Field Missing' && (
                  <span className="edit-profile-field-missing">*Field Missing*</span>
                )}
                <input
                  type='text'
                  value={lastName}
                  placeholder='Last Name...'
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (e.target.value.trim()) setErrors(prev => ({ ...prev, lastName: '' }));
                  }}
                  className={errors.lastName ? 'error-input' : ''}
                />
                {errors.lastName && (
                  <img src={dangerIcon} alt="Error" className="edit-profile-error-icon" />
                )}
              </div>
            </div>
          </div>

          <div className='member-edit-profile-bio-info-email'>
            <label>
              Email Address <span className='member-edit-profile-bio-info-required-star'>*</span>
            </label>
            <div className="input-container">
              {errors.email === 'Field Missing' && (
                <span className="edit-profile-field-missing">*Field Missing*</span>
              )}
              <input
                type='email'
                value={email}
                placeholder='Email Address...'
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (e.target.value.trim()) setErrors(prev => ({ ...prev, email: '' }));
                }}
                className={errors.email ? 'error-input' : ''}
              />
              {errors.email && (
                <img src={dangerIcon} alt="Error" className="edit-profile-error-icon" />
              )}
            </div>

            {(errors.email === 'Invalid email') && (
              <div className="edit-profile-error-message">
                <span>Invalid email address.</span>
              </div>
            )}

            {(errors.email === 'Email already taken') && (
              <div className="edit-profile-error-message">
                <span>Email already taken.</span>
              </div>
            )}
          </div>

          <div className='member-edit-profile-bio-info-username'>
            <label>
              Username <span className='member-edit-profile-bio-info-required-star'>*</span>
            </label>
            <div className="input-container">
              {errors.username === 'Field Missing' && (
                <span className="edit-profile-field-missing">*Field Missing*</span>
              )}
              <input
                type='text'
                value={username}
                placeholder='Username...'
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (e.target.value.trim()) setErrors(prev => ({ ...prev, username: '' }));
                }}
                className={errors.username ? 'error-input' : ''}
              />
              {errors.username && (
                <img src={dangerIcon} alt="Error" className="edit-profile-error-icon" />
              )}
            </div>

            {errors.username === 'Invalid username' && (
              <div className="edit-profile-error-message">
                <span>
                  Please use 3–15 characters, only letters, numbers, periods, underscores, or hyphens.
                </span>
              </div>
            )}

            {errors.username === 'Username already taken' && (
              <div className="edit-profile-error-message">
                <span>Username already taken.</span>
              </div>
            )}
          </div>
        </form>

        <div className='member-edit-profile-bio-info-bio'>
          <label>Bio</label>
          <div>
            <textarea
              placeholder='Bio...'
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
        </div>
      </div>

      {showErrorBox && (
        <div className="edit-profile-error-banner">
          <img src={dangerFilledIcon} alt="Error" className="edit-profile-error-icon-banner" />
          <span className="edit-profile-error-box-message-banner">
            {errors.form || "Error – Fields Missing or Invalid. Please try again."}
          </span>
          <div>
            <button className='edit-profile-close-banner-button' type="button" onClick={handleCloseErrorBox}>
              <img src={closeIcon} alt="Close" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default EditProfile;
