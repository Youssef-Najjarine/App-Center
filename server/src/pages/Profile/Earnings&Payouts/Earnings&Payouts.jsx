import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import WithdrawalBalanceModal from "./WithdrawalBalanceModal/WithdrawalBalanceModal";
import calendarIcon from "../../../assets/Member/profile-applications-history-calendar-icon.svg";
import arrowIcon from "../../../assets/Member/profile-applications-history-arrow-icon.svg";
import sortIcon from "../../../assets/Member/member-applications-sort-icon.svg";
import documentIcon from "../../../assets/Member/member-earnings-payout-document-text.svg";
import dollarSignPurpleIcon from "../../../assets/Member/member-earnings-payout-dollar-circle-purple.svg";
import dollarSignMoneyReciveIcon from "../../../assets/Member/member-earnings-payout-money-recive.svg";
import dollarSignBlackIcon from "../../../assets/Member/member-earnings-payout-dollar-circle-black.svg";
import dollarSignMoneySendIcon from "../../../assets/Member/member-earnings-payout-money-send.svg";
import "./Earnings&Payouts.css";

const EarningsPayouts = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const [withdrawalBalanceModalOpen, setWithdrawalBalanceModalOpen] = useState(false);
  const [isHoveringCalendarItem, setIsHoveringCalendarItem] = useState(false);
  const [calendarSortOption, setCalendarSortOption] = useState("All Time");
  const [calendarDropdownOpen, setCalendarDropdownOpen] = useState(false);
  const sortByRef = useRef(null);
  const [sortOption, setSortOption] = useState("All transactions");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const dropdownRefs = useRef({});
  const [expandedDropdownId, setExpandedDropdownId] = useState(null);
  const [totalBalance, setTotalBalance] = useState("12,560");
  const [totalWithdrawalToDate, setTotalWithdrawalToDate] = useState("13,196.78");
  const [paymentUnderClearance, setPaymentUnderClearance] = useState("289.50");
  const [totalRevenueEarned, setTotalRevenueEarned] = useState("17,469.24");
  const [paymentForActiveApplications, setPaymentForActiveApplications] = useState("12,560");
  const [promotionExpenses, setPromotionExpenses] = useState("973.53");
  const applicationDetails = [
    {
      id: 1,
      date: "24 Jan, 2024",
      time: "14:56",
      activity: "Earning",
      description: "Sold Application",
      from: "muddassarhaseeb34",
      orderNumber: "F0138591681383",
      amount: "$2,931",
      clearOn: "15:30 - 24 Jan, 2024"
    },
    {
      id: 2,
      date: "24 Jan, 2024",
      time: "14:56",
      activity: "Withdrawal",
      description: "Transfer successful",
      from: "Payoneer",
      orderNumber: "",
      amount: "-$2,561",
      clearOn: ""
    },
    {
      id: 3,
      date: "24 Jan, 2024",
      time: "14:56",
      activity: "Refunded", 
      description: "Cancel Order - Sold Application",
      from: "muddassarhaseeb34",
      orderNumber: "F0138591681383",
      amount: "-$5,681",
      clearOn: ""
    },
    {
      id: 4,
      date: "24 Jan, 2024",
      time: "14:56",
      activity: "Earning",
      description: "Sold Application",
      from: "muddassarhaseeb34",
      orderNumber: "F0138591681383",
      amount: "$2,931",
      clearOn: "15:30 - 24 Jan, 2024"
    },
    {
      id: 5,
      date: "24 Jan, 2024",
      time: "14:56",
      activity: "Refunded",
      description: "Cancel Order - Sold Application",
      from: "muddassarhaseeb34",
      orderNumber: "F0138591681383",
      amount: "-$5,681",
      clearOn: ""
    },
    {
      id: 6,
      date: "24 Jan, 2024",
      time: "14:56",
      activity: "Earning",
      description: "Sold Application",
      from: "muddassarhaseeb34",
      orderNumber: "F0138591681383",
      amount: "$2,931",
      clearOn: "15:30 - 24 Jan, 2024"      
    }
  ];
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        expandedDropdownId &&
        dropdownRefs.current[expandedDropdownId] &&
        !dropdownRefs.current[expandedDropdownId].current.contains(event.target)
      ) {
        setExpandedDropdownId(null);
      }
      if (
        calendarDropdownOpen &&
        !event.target.closest(".profile-earnings-payouts-calendar-sort-div")
      ) {
        setCalendarDropdownOpen(false);
      }
      if (
        sortDropdownOpen &&
        sortByRef.current &&
        !sortByRef.current.contains(event.target)
      ) {
        setSortDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [expandedDropdownId, calendarDropdownOpen, sortDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        expandedDropdownId &&
        dropdownRefs.current[expandedDropdownId] &&
        !dropdownRefs.current[expandedDropdownId].current.contains(event.target)
      ) {
        setExpandedDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [expandedDropdownId]);

  return (
    <section id="profile-earnings-payouts">
      <div className="profile-earnings-payouts-title-div">
        <h2 className="profile-earnings-payouts-title">Earnings</h2>
        <div className="profile-earnings-payouts-sort-export-activity-div">
          <div
            className="profile-earnings-payouts-sortby-div"
            ref={sortByRef}
            onClick={(e) => {
              e.stopPropagation();
              setSortDropdownOpen((prev) => !prev);
            }}
          >
            <img src={sortIcon} alt="Sort Icon" className="profile-earnings-payouts-icons"/>
            <span>
              <span className="sort-by-label">Sort By:</span> <span className="sort-by-value">{sortOption}</span>
            </span>
            <div className={`earnings-payouts-arrow-div ${sortDropdownOpen ? "arrow-open" : ""}`}>
              <img src={arrowIcon} alt="Arrow Icon" className="profile-earnings-payouts-icons"/>
            </div>
            {sortDropdownOpen && (
              <ul className="profile-earnings-payouts-sortby-dropdown">
                {["All transactions", "Only Cancelled", "Only Withdrawal", "Only Refunded", "Only Pending", "Only Cleared"].map((option) => (
                  <li
                    key={option}
                    className={sortOption === option ? "active" : ""}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSortOption(option);
                      setSortDropdownOpen(false);
                    }}
                  >
                    {option}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div
            className="profile-earnings-payouts-calendar-sort-div"
            onClick={() => setCalendarDropdownOpen(!calendarDropdownOpen)}
          >
            <img src={calendarIcon} alt="Calendar Icon" className="profile-earnings-payouts-icons"/>
            <span>{calendarSortOption}</span>
            <div
              className={`earnings-payouts-arrow-div ${calendarDropdownOpen ? "arrow-open" : ""} ${isHoveringCalendarItem ? "arrow-hover" : ""}`}
            >
              <img src={arrowIcon} alt="Arrow Icon" className="profile-earnings-payouts-icons"/>
            </div>
            {calendarDropdownOpen && (
              <ul className="profile-earnings-payouts-calendar-sortby-dropdown">
                {["All Time", "This Week", "This Month", "Last Month", "Last 6 Months", "This Year"].map((option) => (
                  <li
                    key={option}
                    className={calendarSortOption === option ? "active" : ""}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCalendarSortOption(option);
                      setCalendarDropdownOpen(false);
                    }}
                    onMouseEnter={() => setIsHoveringCalendarItem(true)}
                    onMouseLeave={() => setIsHoveringCalendarItem(false)}
                  >
                    {option}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="earnings-payouts-export-activity-report-div">
            <div className="earnings-payouts-export-activity-report-sub-div">
              <img src={documentIcon} alt="Document Icon" className="profile-earnings-payouts-icons"/>
              <span>Export activity report</span>
            </div>
          </div>
        </div>
      </div>
      <div className="profile-earnings-payouts-body">
        <div className="profile-earnings-payouts-summary">
          <div className="profile-earnings-payouts-total-balances-and-buttons">
            <div className="profile-earnings-payouts-balance-available-div">
              <div className="profile-earnings-payouts-balance-availables-div">
                <div className="profile-earnings-payouts-balance-available">
                  <h6 className="profile-earnings-payouts-balance-available-label">Balance Available</h6>
                  <p className="profile-earnings-payouts-total-balance">${totalBalance}</p>
                </div>
                <div className="profile-earnings-payouts-withdrawal-to-date">
                  <h6 className="profile-earnings-payouts-withdrawal-to-date-label">Withdrawal to date:</h6>
                  <p className="profile-earnings-payouts-total-withdrawal-to-date">${totalWithdrawalToDate}</p>             
                </div>
              </div>
            </div>
              <div className="profile-earnings-payouts-balance-available-buttons-div">
                <button onClick={() => setWithdrawalBalanceModalOpen(true)} className="profile-earnings-payouts-withdrawal-balance-btn">
                  <img src={dollarSignPurpleIcon} alt="Dollar Sign Icon" className="profile-earnings-payouts-icons"/>
                  <span>Withdrawal Balance</span>
                </button>
                <Link to="/profile/ManagePayoutMethods" className="profile-earnings-payouts-manage-payout-methods-btn">
                  Manage Payout Methods
                </Link>              
              </div>
          </div>
          <div className="profile-earnings-payouts-total-balances-details">
            <div className="profile-earnings-payouts-total-balances-details-column">
              <div className="profile-earnings-payouts-payment-under-clearance-div">
                <p className="profile-earnings-payouts-total-balances-detail-label">Payment under clearance</p>
                <p className="profile-earnings-payouts-total-balances-detail-amount">${paymentUnderClearance}</p>
                <p className="profile-earnings-payouts-total-balances-detail-description">1 payment</p>
              </div>
              <div className="profile-earnings-payouts-payment-for-active-applications-div">
                <p className="profile-earnings-payouts-total-balances-detail-label">Payment for Active Applications</p>
                <p className="profile-earnings-payouts-total-balances-detail-amount">${paymentForActiveApplications}</p>
                <p className="profile-earnings-payouts-total-balances-detail-description">2 applications are under sale.</p>            
              </div>
            </div>
            <div className="profile-earnings-payouts-total-balances-details-column">
              <div className="profile-earnings-payouts-total-revenue-earned-div">
                <p className="profile-earnings-payouts-total-balances-detail-label">Total Revenue Earned</p>
                <p className="profile-earnings-payouts-total-balances-detail-amount">${totalRevenueEarned}</p>
                <p className="profile-earnings-payouts-total-balances-detail-description">Your earning since joining.</p>            
              </div>
              <div className="profile-earnings-payouts-payment-promotion-expenses-div">
                <p className="profile-earnings-payouts-total-balances-detail-label">Promotion Expenses</p>
                <p className="profile-earnings-payouts-total-balances-detail-amount">${promotionExpenses}</p>
                <p className="profile-earnings-payouts-total-balances-detail-description">Earnings spent on purchases since joining.</p>            
              </div>
            </div>
          </div>
        </div>
        <div className="profile-earnings-payouts-details-mobile">
          {applicationDetails.map((app) => {
            return (
              <div
                className="profile-earnings-payouts-details-mobile-card"
                key={app.id}
              >
                <div 
                  className={`profile-earnings-payouts-details-colored-activity
                    ${app.activity === "Earning" 
                      ? "profile-earnings-payouts-details-purple-activity-background" 
                      : app.activity === "Withdrawal" 
                        ? "profile-earnings-payouts-details-grey-activity-background" 
                        : "profile-earnings-payouts-details-red-activity-background"
                    }`}
                >
                  {app.activity === "Earning" ? (
                    <>
                      <img src={dollarSignMoneyReciveIcon} alt="Earning Icon" className="profile-earnings-payouts-icons"/>
                      <p className="profile-earnings-payouts-details-label">{app.activity}</p>
                    </>
                  ) : app.activity === "Withdrawal" ? (
                    <>
                      <img src={dollarSignBlackIcon} alt="Withdrawal Icon" className="profile-earnings-payouts-icons"/>
                      <p className="profile-earnings-payouts-details-label">{app.activity}</p>
                    </>
                  ) : (
                    <>
                      <img src={dollarSignMoneySendIcon} alt="Refund Icon" className="profile-earnings-payouts-icons"/>
                      <p className="profile-earnings-payouts-details-label">{app.activity}</p>
                    </>
                  )}
                </div>
                <div className="profile-earnings-payouts-order-number-date-time-mobile-row">
                  <p className="profile-earnings-payouts-details-label">{app.orderNumber ? app.orderNumber : "-----"}</p>
                  <p className="profile-earnings-payouts-details-label">{app.date} at {app.time}</p>
                </div>
                <div>
                  <p className="profile-earnings-payouts-description-label">{app.description}</p>
                </div>
                <div className="profile-earnings-payouts-from-amount-clear-on-mobile-rows">
                  <div>
                    <p className="profile-earnings-payouts-details-label">From:</p>
                    <p className="profile-earnings-payouts-details-label">{app.from}</p>
                  </div>
                  <div>
                    <p className="profile-earnings-payouts-details-label">Amount:</p>
                    <p 
                      className={`
                        profile-earnings-payouts-details-label 
                        ${String(app.amount).startsWith('-') ? 'profile-earnings-payouts-details-red-label' : ''}
                      `.trim()}
                    >
                      {app.amount}
                    </p>
                  </div>
                  <div>
                    <p className="profile-earnings-payouts-details-label">Clear on:</p>
                    <p className="profile-earnings-payouts-details-label">{app.clearOn ? app.clearOn : "----"}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="profile-earnings-payouts-details-tablet">
          {applicationDetails.map((app) => {
            return (
              <div
                className="profile-earnings-payouts-details-tablet-card"
                key={app.id}
              >
                <div className="profile-earnings-payouts-order-number-date-time-label-tablet-row">
                  <p className="profile-earnings-payouts-details-label">{app.orderNumber ? app.orderNumber : "-----"}</p>
                  <div className="profile-earnings-payouts-order-number-date-time-label-table-sub-row">
                    <p className="profile-earnings-payouts-details-label">{app.date} at {app.time}</p>
                    <div 
                      className={`profile-earnings-payouts-details-colored-activity
                        ${app.activity === "Earning" 
                          ? "profile-earnings-payouts-details-purple-activity-background" 
                          : app.activity === "Withdrawal" 
                            ? "profile-earnings-payouts-details-grey-activity-background" 
                            : "profile-earnings-payouts-details-red-activity-background"
                        }`}
                    >
                      {app.activity === "Earning" ? (
                        <>
                          <img src={dollarSignMoneyReciveIcon} alt="Earning Icon" className="profile-earnings-payouts-icons"/>
                          <p className="profile-earnings-payouts-details-label">{app.activity}</p>
                        </>
                      ) : app.activity === "Withdrawal" ? (
                        <>
                          <img src={dollarSignBlackIcon} alt="Withdrawal Icon" className="profile-earnings-payouts-icons"/>
                          <p className="profile-earnings-payouts-details-label">{app.activity}</p>
                        </>
                      ) : (
                        <>
                          <img src={dollarSignMoneySendIcon} alt="Refund Icon" className="profile-earnings-payouts-icons"/>
                          <p className="profile-earnings-payouts-details-label">{app.activity}</p>
                        </>
                      )}
                    </div>  
                  </div>                
                </div>
                <div className="profile-earnings-payouts-from-amount-clear-on-tablet-rows">
                  <div>
                    <p className="profile-earnings-payouts-description-label">{app.description}</p>                    
                  </div>
                  <div className="profile-earnings-payouts-from-amount-clear-on-tablet-sub-rows">                  
                    <div className="profile-earnings-payouts-from-tablet-column">
                      <p className="profile-earnings-payouts-details-label">From:</p>
                      <p className="profile-earnings-payouts-details-label">{app.from}</p>
                    </div>
                    <div className="profile-earnings-payouts-amount-tablet-column">
                      <p className="profile-earnings-payouts-details-label">Amount:</p>
                      <p 
                        className={`
                          profile-earnings-payouts-details-label 
                          ${String(app.amount).startsWith('-') ? 'profile-earnings-payouts-details-red-label' : ''}
                        `.trim()}
                      >
                        {app.amount}
                      </p>
                    </div>
                    <div className="profile-earnings-payouts-clear-on-tablet-column">
                      <p className="profile-earnings-payouts-details-label">Clear on:</p>
                      <p className="profile-earnings-payouts-details-label">{app.clearOn ? app.clearOn : "----"}</p>
                    </div>                    
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="profile-earnings-payouts-details-desktop">
          <div className="profile-earnings-payouts-details-desktop-card-headers">
            <div className="profile-earnings-payouts-details-desktop-card-column-seven-six-five">
              <p className="profile-earnings-payouts-details-label">Date</p>
            </div>
            <div className="profile-earnings-payouts-details-desktop-card-column-four-six">
              <p className="profile-earnings-payouts-details-label">Time</p>
            </div>
            <div className="profile-earnings-payouts-details-desktop-card-column-twelve-two">
              <p className="profile-earnings-payouts-details-label">Activity</p>
            </div>
            <div className="profile-earnings-payouts-details-desktop-card-column-twenty-five-one-six">
              <p className="profile-earnings-payouts-details-label">Description</p>
            </div>
            <div className="profile-earnings-payouts-details-desktop-card-column-eleven-five">
              <p className="profile-earnings-payouts-details-label">From</p>
            </div>
            <div className="profile-earnings-payouts-details-desktop-card-column-eleven-five">
              <p className="profile-earnings-payouts-details-label">Order #</p>
            </div>
            <div className="profile-earnings-payouts-details-desktop-card-column-seven-six-five">
              <p className="profile-earnings-payouts-details-label">Amount</p>
            </div>
            <div className="profile-earnings-payouts-details-desktop-card-column-eleven-five">
              <p className="profile-earnings-payouts-details-label">Clear On</p>
            </div>
          </div>
          <div className="profile-earnings-payouts-details-desktop-cards">
            {applicationDetails.map((app) => {
              return (
                <div
                  className="profile-earnings-payouts-details-desktop-row"
                  key={app.id}
                >
                  <div className="profile-earnings-payouts-details-desktop-card-column-seven-six-five">
                    <p className="profile-earnings-payouts-details-label">{app.date}</p>
                  </div>
                  <div className="profile-earnings-payouts-details-desktop-card-column-four-six">
                    <p className="profile-earnings-payouts-details-label">{app.time}</p>
                  </div>  
                  <div className="profile-earnings-payouts-details-desktop-card-column-twelve-two profile-earnings-payouts-details-desktop-activity-detail">
                    {app.activity === "Earning" ? (
                      <>
                        <img src={dollarSignMoneyReciveIcon} alt="Earning Icon" className="profile-earnings-payouts-icons"/>
                        <p className="profile-earnings-payouts-details-label">{app.activity}</p>
                      </>
                    ) : app.activity === "Withdrawal" ? (
                      <>
                        <img src={dollarSignBlackIcon} alt="Withdrawal Icon" className="profile-earnings-payouts-icons"/>
                        <p className="profile-earnings-payouts-details-label">{app.activity}</p>
                      </>
                    ) : (
                      <>
                        <img src={dollarSignMoneySendIcon} alt="Refund Icon" className="profile-earnings-payouts-icons"/>
                        <p className="profile-earnings-payouts-details-label">{app.activity}</p>
                      </>
                    )}
                  </div>
                  <div className="profile-earnings-payouts-details-desktop-card-column-twenty-five-one-six">
                    <p className="profile-earnings-payouts-details-label">{app.description}</p>                    
                  </div> 
                  <div className="profile-earnings-payouts-details-desktop-card-column-eleven-five">
                    <p className="profile-earnings-payouts-details-label">{app.from}</p>                    
                  </div>
                  <div className="profile-earnings-payouts-details-desktop-card-column-eleven-five">
                    <p className="profile-earnings-payouts-details-label">{app.orderNumber ? app.orderNumber : "-----"}</p>                    
                  </div>
                  <div className="profile-earnings-payouts-details-desktop-card-column-seven-six-five">
                    <p 
                      className={`
                        profile-earnings-payouts-details-label 
                        ${String(app.amount).startsWith('-') ? 'profile-earnings-payouts-details-red-label' : ''}
                      `.trim()}
                    >
                      {app.amount}
                    </p>                   
                  </div>
                  <div className="profile-earnings-payouts-details-desktop-card-column-eleven-five">
                    <p className="profile-earnings-payouts-details-label">{app.clearOn ? app.clearOn : "----"}</p>              
                  </div>
                </div>
              );
            })}
          </div>
        </div>                
      </div>
      {withdrawalBalanceModalOpen && (
        <WithdrawalBalanceModal onClose={() => setWithdrawalBalanceModalOpen(false)} />
      )} 
    </section>
  );
};

export default EarningsPayouts;