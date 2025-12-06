import React, { useEffect, useState } from "react";
import "./WithdrawalBalanceModal.css";
import xIcon from "../../../../assets/Member/withdrawal-balance-x-icon.svg";
import payoneer from "../../../../assets/Member/cards-payments-payoneer-icon.png";
import transferWise from "../../../../assets/Member/cards-payments-transfer-wise-icon.png";
import payPal from "../../../../assets/Member/cards-payments-paypal-icon.png";
import stripe from "../../../../assets/Member/cards-payments-stripe-icon.png";
const WithdrawalBalanceModal = ({ modalOpenState, onClose }) => {

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

  const [withdrawalAmount, setWithdrawalAmount] = useState("12,560");

  const [payments, setPayments] = useState([
    {
      id: 1,
      title: "Payoneer",
      lastWithdrawl: "2,786",
      img: payoneer,
      connected: true
    },
    {
      id: 2,
      title: "Transfer wise",
      lastWithdrawl: "2,786",
      img: transferWise,
      connected: true
    },
    {
      id: 3,
      title: "Paypal",
      img: payPal,
      connected: false
    },
    {
      id: 4,
      title: "Stripe",
      img: stripe,
      connected: false
    }
  ]);  
  return (
    <div className="withdrawal-balance-modal-overlay" onClick={onClose}>
      <div className="withdrawal-balance-modal" onClick={(e) => e.stopPropagation()}>
        <div className="withdrawal-balance-modal-close-header">
          <h2>Withdrawal Balance</h2>
          <div className="withdrawal-balance-close-div">
            <img
                src={xIcon}
                alt="Close"
                className="withdrawal-balance-close-icon"
                onClick={onClose}
            />
          </div>
        </div>
        <div className="withdrawal-balance-modal-amount-div">
            <h3>Withdrawal Amount</h3>
            <p>${withdrawalAmount}</p>
        </div>
        <div className="withdrawal-balance-modal-payments-grid">
            {payments.map((payment) => {
                return (
                    <div
                    key={payment.id}
                    className={[
                        "withdrawal-balance-modal-payment-row",
                        !payment.connected && "withdrawal-balance-modal-payment-disabled",
                    ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                        <div>
                            <img src={payment.img}/>
                        </div>
                        <p className="withdrawal-balance-modal-payment-title">{payment.title}</p>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};

export default WithdrawalBalanceModal;
