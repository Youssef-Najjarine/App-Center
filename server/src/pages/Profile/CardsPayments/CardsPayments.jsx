import React, { useState, useEffect, useRef  } from "react";
import { Link } from 'react-router-dom';
import AddCreditOrDebitCardModal from "./AddCreditOrDebitCardModal/AddCreditOrDebitCardModal";
import cardIcon from "@assets/white-outline-card-icon.svg";
import trashIcon from "@assets/red-outline-trash-icon.svg";
import visaLogo from "@assets/Member/cards-payment-visa-logo.png";
import mastercardLogo from "@assets/Member/cards-payment-mastercard-logo.png";
import americanExpressLogo from "@assets/Member/cards-payment-american-express-logo.png";
import "./CardsPayments.css";

const CardsPayments = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const [addCreditOrDebitCardModalOpen, setAddCreditOrDebitCardModalOpen] = useState(false);
  const [payments, setPayments] = useState([
    {
      id: 1,
      title: "Visa",
      name: "Youssef Najjarine",
      lastDigits: "3016",
      expiry: "11/28",
      img: visaLogo,
      default: true
    },
    {
      id: 2,
      title: "Mastercard",
      name: "Shoaib Ahmad",
      lastDigits: "5619",
      expiry: "11/28",
      img: mastercardLogo,
      default: false
    },
    {
      id: 3,
      title: "American Express",
      name: "Fiaz Hussain",
      lastDigits: "1593",
      expiry: "11/28",
      img: americanExpressLogo,
      default: false
    }
  ]);

  return (
    <section id="profile-cards-payments">
        <div className="profile-cards-payments-title-div">
            <div className="profile-cards-payments-title">
                <h2>Debit / Credit Cards & Payments</h2>
            </div>
            <div className="profile-cards-payments-add-credit-debit-card">
                <button onClick={() => setAddCreditOrDebitCardModalOpen(true)}>
                    <img src={cardIcon} alt="Card Icon" />
                    <span>Add Credit/Debit Card</span>
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
                        <div className="profile-cards-payments-payment-type-name-digits-row">
                            <div className="profile-cards-payments-payment-type">
                                <img 
                                    src={payment.img} 
                                    alt={payment.title}
                                    className="profile-cards-payments-payment-img"
                                />
                            </div>
                            <div className="profile-cards-payments-name-digits">
                                <div>
                                    <p className="profile-cards-payments-name">{payment.name}</p>
                                </div>
                                <div className="profile-cards-payments-card-number-digits-rows">
                                    <div className="profile-cards-payments-card-number-dots-row">
                                        <div className="profile-cards-payments-card-number-dot"></div>
                                        <div className="profile-cards-payments-card-number-dot"></div>
                                        <div className="profile-cards-payments-card-number-dot"></div>
                                        <div className="profile-cards-payments-card-number-dot"></div>
                                    </div>
                                    <div className="profile-cards-payments-card-number-dots-row">
                                        <div className="profile-cards-payments-card-number-dot"></div>
                                        <div className="profile-cards-payments-card-number-dot"></div>
                                        <div className="profile-cards-payments-card-number-dot"></div>
                                        <div className="profile-cards-payments-card-number-dot"></div>
                                    </div>
                                    <div className="profile-cards-payments-card-number-dots-row">
                                        <div className="profile-cards-payments-card-number-dot"></div>
                                        <div className="profile-cards-payments-card-number-dot"></div>
                                        <div className="profile-cards-payments-card-number-dot"></div>
                                        <div className="profile-cards-payments-card-number-dot"></div>
                                    </div>
                                    <div>
                                        <p className="profile-cards-payments-card-number-last-digits">{payment.lastDigits}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="profile-cards-payments-expiry-payment-button-trash-row">
                            <div className="profile-cards-payments-expiry-column">
                                <p className="profile-cards-payments-expiry-label">Expiry:</p>
                                <p className="profile-cards-payments-expiry-value">{payment.expiry}</p>
                            </div>
                            <div className="profile-cards-payments-payment-method-button-column">
                                {payment.default ? 
                                    (
                                        <div className="profile-cards-payments-default-payment-method">
                                            <span>Default Payment Method</span>
                                        </div>
                                    ) 
                                    : 
                                    (
                                        <button className="profile-cards-payments-make-default-button">
                                            <span>Make Default Payment</span>
                                        </button>
                                    )
                                }
                            </div>
                            <div className="profile-cards-payments-trash-button-column">
                                <button className="profile-cards-payments-trash-button">
                                    <img src={trashIcon} alt="Trash Icon" />
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
        {addCreditOrDebitCardModalOpen && (
            <AddCreditOrDebitCardModal onClose={() => setAddCreditOrDebitCardModalOpen(false)} />
        )}         
    </section>
  );
};

export default CardsPayments;