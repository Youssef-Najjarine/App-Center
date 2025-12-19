import React, { useState, useEffect, useRef } from "react";
import { Link } from 'react-router-dom';
import payoneer from "@assets/Member/cards-payments-payoneer-icon.png";
import transferWise from "@assets/Member/cards-payments-transfer-wise-icon.png";
import payPal from "@assets/Member/cards-payments-paypal-icon.png";
import stripe from "@assets/Member/cards-payments-stripe-icon.png";
import backArrowIcon from "@assets/back-arrow-icon.svg";
import headphoneIcon from "@assets/white-headphone-icon.svg";
import deleteIcon from "@assets/red-x-close-circle.svg";
import connectAccountIcon from "@assets/white-connect-account-icon.svg";
import AddNewPaymentMethodModal from "./AddNewPaymentMethodModal/addNewPaymentMethodModal";
import "./ManagePayoutMethods.css";

const ManagePayoutMethods = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const [addNewPaymentMethodModalOpen, setAddNewPaymentMethodModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

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

  const handleConnectClick = (payment) => {
    setSelectedPayment(payment);
    setAddNewPaymentMethodModalOpen(true);
  };

  const handleCloseModal = () => {
    setAddNewPaymentMethodModalOpen(false);
    setSelectedPayment(null);
  };

  return (
    <section id="manage-payout-methods">
      <div className="manage-payout-methods-title-div">
        <div className="manage-payout-methods-arrow-title">
          <Link to="/profile/Earnings&Payouts">
            <img src={backArrowIcon} alt="Back Arrow" />
          </Link>
          <h2 className="manage-payout-methods-title">Manage Payout Methods</h2>
        </div>
        <div className="manage-payout-methods-contact-support">
          <button>
            <img src={headphoneIcon} alt="Contact Support" />
            <span>Contact Support</span>
          </button>
        </div>
      </div>
      <div className="manage-payout-methods-grid">
        {payments.map((payment) => {
          return (
            <div
              className="manage-payout-methods-payment"
              key={payment.id}
            >
              <div className="manage-payout-methods-payment-details">
                <img
                  src={payment.img}
                  className="manage-payout-methods-payment-image"
                  alt={payment.title}
                />
                <div>
                  <h3 className="manage-payout-methods-payment-account">
                    {payment.title} account
                  </h3>
                  {payment.connected ? (
                    <h4 className="manage-payout-methods-payment-withdrawl">
                      <span className="manage-payout-methods-payment-withdrawl-label">
                        Last Withdrawl:
                      </span>
                      <span className="manage-payout-methods-payment-withdrawl-amount">
                        {" "}
                        ${payment.lastWithdrawl}
                      </span>
                    </h4>
                  ) : (
                    <h4 className="manage-payout-methods-payment-link-withdrawl">
                      Link your account to get withdrawals
                    </h4>
                  )}
                </div>
              </div>
              <div>
                {payment.connected ? (
                  <div className="manage-payout-methods-payment-linked">
                    <div className="manage-payout-methods-payment-linked-label">
                      <button>Linked Withdrawal Account</button>
                    </div>
                    <div className="manage-payout-methods-payment-linked-delete">
                      <button>
                        <img src={deleteIcon} alt="Delete Icon" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="manage-payout-methods-payment-not-linked">
                    <button onClick={() => handleConnectClick(payment)}>
                      <img src={connectAccountIcon} alt="Connect Account" />
                      <span>Connect Account</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {addNewPaymentMethodModalOpen && selectedPayment && (
        <AddNewPaymentMethodModal
          onClose={handleCloseModal}
          paymentMethod={selectedPayment}
        />
      )}
    </section>
  );
};

export default ManagePayoutMethods;
