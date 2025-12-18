import React, { useEffect, useState } from "react";
import "./AddCreditOrDebitCardModal.css";
import xIcon from "../../../../assets/x-icon.svg";
import confirmSaveIcon from "../../../../assets/white-check-circle-outline.svg";
import mastercardLogo from "../../../../assets/Member/add-credit-or-debit-card-mastercard-icon.svg";

const AddCreditOrDebitCardModal = ({ modalOpenState, onClose }) => {

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

  return (
    <div className="add-credit-or-debit-card-modal-overlay" onClick={onClose}>
        <form className="add-credit-or-debit-card-modal" onClick={(e) => e.stopPropagation()}>
            <div className="add-credit-or-debit-card-modal-close-header">
                <h2>Add Credit/Debit Card</h2>
                <div className="add-credit-or-debit-card-close-div">
                <img
                    src={xIcon}
                    alt="Close"
                    className="add-credit-or-debit-card-close-icon"
                    onClick={onClose}
                />
                </div>
            </div>
            <div className="add-credit-or-debit-card-modal-card-details">
                <div className="add-credit-or-debit-card-modal-card-name-expiry-div">
                    <div className="add-credit-or-debit-card-modal-card-name-div">
                        <label>Name on Card</label>
                        <input type="text" placeholder="Enter cardholder name" />
                    </div>
                    <div className="add-credit-or-debit-card-modal-card-expiry-div">
                        <label>Expiry</label>
                        <input type="month" />
                    </div>                    
                </div>
                <div className="add-credit-or-debit-card-modal-card-number-cvv-div">
                    <div className="add-credit-or-debit-card-modal-card-number-div">
                        <label>Card Number</label>
                        <div className="add-credit-or-debit-card-modal-card-number-logo-input-div">
                            <div className="add-credit-or-debit-card-modal-card-number-logo-div">
                                <img src={mastercardLogo} alt="Mastercard Logo" />
                            </div>
                            <input type="number" placeholder="Enter card number" />
                        </div>
                    </div>
                    <div className="add-credit-or-debit-card-modal-card-cvv-div">
                        <label>CVV</label>
                        <input type="number" placeholder="Enter CVV"/>
                    </div>                    
                </div>                
            </div>
            <div className="add-credit-or-debit-card-modal-border"></div>
            <div className="add-credit-or-debit-card-modal-description-div">
                <p>
                    Your card details will be securely saved and can be managed anytime from your dashboard.
                </p>
            </div>
            <div className="add-credit-or-debit-card-modal-confirm-save-button-div">
                <button type="submit">
                    <img src={confirmSaveIcon} alt="Confirm Save" />
                    <span>Confirm Save</span>
                </button>
            </div>
        </form>
    </div>
  );
};

export default AddCreditOrDebitCardModal;
