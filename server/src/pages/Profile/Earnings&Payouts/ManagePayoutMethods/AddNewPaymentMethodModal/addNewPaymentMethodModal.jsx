import React, { useEffect } from "react";
import "./addNewPaymentMethodModal.css";
import xIcon from "@assets/x-icon.svg";
import refreshIcon from "@assets/refresh-icon.svg";
const AddNewPaymentMethodModal = ({ onClose, paymentMethod }) => {
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
  }, [onClose]);

  return (
    <div className="add-new-payment-method-modal-overlay" onClick={onClose}>
      <div
        className="add-new-payment-method-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="add-new-payment-method-modal-close-header">
          <h2>Add new Payment Method</h2>
          <div className="add-new-payment-method-close-div">
            <img
              src={xIcon}
              alt="Close"
              className="add-new-payment-method-close-icon"
              onClick={onClose}
            />
          </div>
        </div>
        <div className="add-new-payment-method-modal-payment-method-info">
            <img src={paymentMethod?.img} alt={paymentMethod?.title} />
            <h3>{paymentMethod?.title}</h3>
        </div>
        <div className="add-new-payment-method-modal-payment-method-instructions">
            <p>
                Please check your email. We have sent a {paymentMethod?.title} connection verification link there.
            </p>
        </div>
        <div className="add-new-payment-method-modal-payment-method-resend-link">
            <button>
                <img src={refreshIcon}/>
                <span>Resend link</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default AddNewPaymentMethodModal;
