import React, { useState, useEffect, useRef  } from "react";
import { Link } from 'react-router-dom';
import payoneer from "../../../assets/Member/cards-payments-payoneer-icon.png";
import transferWise from "../../../assets/Member/cards-payments-transfer-wise-icon.png";
import payPal from "../../../assets/Member/cards-payments-paypal-icon.png";
import stripe from "../../../assets/Member/cards-payments-stripe-icon.png";
import backArrowIcon from "../../../assets/Member/cards-payments-back-arrow-icon.svg";
import headphoneIcon from "../../../assets/Member/cards-payments-headphone-icon.svg";
import deleteIcon from "../../../assets/Member/cards-payments-close-circle.svg";
import connectAccountIcon from "../../../assets/Member/cards-payments-connect-account-icon.svg";
import "./CardsPayments.css";

const CardsPayments = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

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
    <section id="profile-cards-payments">
        <div className="profile-cards-payments-title-div">
            <div className="profile-cards-payments-arrow-title">
                <Link to="/profile">
                    <img src={backArrowIcon} alt="Back Arrow"/>
                </Link>
                <h2 className="profile-cards-payments-title">Manage Payout Methods</h2>
            </div>
            <div className="profile-cards-payments-contact-support">
                <button>
                    <img src={headphoneIcon} alt="Contact Support" />
                    <span>Contact Support</span>
                </button>
            </div>
        </div>
        <div className="profile-cards-payments-grid">
            {payments.map((payment) => {
                return (
                    <div
                        className="profile-cards-payments-payment"
                        key={payment.id}
                    >
                        <div className="profile-cards-payments-payment-details">
                            <img src={payment.img} className="profile-cards-payments-payment-image"/>
                            <div>
                                <h3 className="profile-cards-payments-payment-account">{payment.title} account</h3>
                                {payment.connected ?
                                    <h4 className="profile-cards-payments-payment-withdrawl">
                                        <span className="profile-cards-payments-payment-withdrawl-label">Last Withdrawl:</span> 
                                        <span className="profile-cards-payments-payment-withdrawl-amount"> ${payment.lastWithdrawl}</span>
                                    </h4>
                                 :
                                    <h4 className="profile-cards-payments-payment-link-withdrawl">Link your account to get withdrawals</h4>
                                }                               
                            </div>
                        </div>
                        <div>
                                {payment.connected ?
                                    <div className="profile-cards-payments-payment-linked">
                                        <div className="profile-cards-payments-payment-linked-label">
                                            <button>Linked Withdrawal Account</button>
                                        </div>
                                        <div className="profile-cards-payments-payment-linked-delete">
                                            <button><img src={deleteIcon} alt="Delete Icon"/></button>
                                        </div>
                                    </div>
                                 :
                                    <div className="profile-cards-payments-payment-not-linked">
                                        <button>
                                            <img src={connectAccountIcon} alt="Connect Account"/>
                                            <span>Connect Account</span>
                                        </button>
                                    </div>
                                }                             
                        </div>
                    </div>
                );
            })}
        </div>
    </section>
  );
};

export default CardsPayments;