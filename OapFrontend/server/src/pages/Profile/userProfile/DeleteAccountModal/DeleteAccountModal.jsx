import React, { useState, useEffect, useRef } from "react";
import DangerFilledIcon from "@assets/danger-filled.svg";
import XIcon from "@assets/x-icon.svg";
import TrashIcon from "@assets/red-outline-trash-icon.svg";
import "./DeleteAccountModal.css";

const DeleteAccountModal = ({ onClose, onDeleted }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    return () => { document.body.style.overflow = "auto"; };
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (!isDeleting) onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [onClose, isDeleting]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    setIsDeleting(true);

    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data?.error || "Unable to delete account.");
        return;
      }

      onDeleted();
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="delete-account-modal-overlay" onClick={() => { if (!isDeleting) onClose(); }}>
      <div className="delete-account-modal" onClick={(e) => e.stopPropagation()}>
        <div className="delete-account-modal-header">
          <img src={DangerFilledIcon} alt="" className="delete-account-modal-warning-icon" />
          <div className="delete-account-modal-close" onClick={() => { if (!isDeleting) onClose(); }}>
            <img src={XIcon} alt="Close" />
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <h2 className="delete-account-modal-title">Delete your account?</h2>
          <p className="delete-account-modal-subtitle">
            This will permanently delete your account, all your applications, purchases, sales history, and analytics data. This action cannot be undone.
          </p>
          <label className="delete-account-modal-label" htmlFor="delete-password">
            Enter your password to confirm
          </label>
          <input
            id="delete-password"
            ref={inputRef}
            type="password"
            className={`delete-account-modal-input ${error ? "error-input" : ""}`}
            placeholder="Password..."
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
            autoComplete="current-password"
            disabled={isDeleting}
          />
          <div className="delete-account-modal-error">{error}</div>
          <div className="delete-account-modal-buttons">
            <button type="button" className="delete-account-modal-cancel" onClick={() => { if (!isDeleting) onClose(); }} disabled={isDeleting}>
              Cancel
            </button>
            <button type="submit" className="delete-account-modal-confirm" disabled={isDeleting || !password.trim()}>
              <img src={TrashIcon} alt="" />
              <span>{isDeleting ? "Deleting…" : "Delete Account"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeleteAccountModal;