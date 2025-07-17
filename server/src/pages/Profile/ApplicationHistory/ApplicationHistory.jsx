import React, { useState, useEffect, useRef  } from "react";
import { Link } from "react-router-dom";
import ProfileApplicationDetailModal from "../ProfileApplicationDetailModal/ProfileApplicationDetailModal";
import calendarIcon from "../../../assets/Member/profile-applications-history-calendar-icon.svg";
import arrowIcon from "../../../assets/Member/profile-applications-history-arrow-icon.svg";
import appSoldIcon from "../../../assets/Member/profile-applications-history-app-sold-icon.svg";
import disputedIcon from "../../../assets/Member/profile-applications-history-disputed-icon.svg";
import searchIcon from "../../../assets/Member/member-applications-search-icon.svg";
import applicationImg1 from "../../../assets/Member/member-applicationImg-1.png";
import applicationImg2 from "../../../assets/Member/member-applicationImg-2.png";
import githubIcon from "../../../assets/Member/member-applications-github-icon.png";
import expandIcon from "../../../assets/Member/member-applications-more-icon.svg";
import detailIcon from "../../../assets/Member/profile-applications-history-detail-icon.svg";
import resendIcon from "../../../assets/Member/profile-applications-history-resend-icon.svg";
import inquiryIssueIcon from "../../../assets/Member/profile-applications-history-inquiry-issue-icon.svg";
import refundIcon from "../../../assets/Member/profile-applications-history-give-refund-icon.svg";
import buyerIcon from "../../../assets/Member/profile-applications-history-buyer-icon.svg";
import emailIcon from "../../../assets/Member/profile-applications-history-email-icon.svg";
import priceIcon from "../../../assets/Member/profile-applications-history-price-icon.svg";
import sortIcon from "../../../assets/Member/member-applications-sort-icon.svg";
import "./ApplicationHistory.css";

const ApplicationHistory = () => {
    useEffect(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalSource, setModalSource] = useState("card");
    const [showAll, setShowAll] = useState(false);
    const [isHoveringCalendarItem, setIsHoveringCalendarItem] = useState(false);
    const [calendarSortOption, setCalendarSortOption] = useState("This Month");
    const [calendarDropdownOpen, setCalendarDropdownOpen] = useState(false);
    const sortByRef = useRef(null);
    const [sortOption, setSortOption] = useState("Popular");
    const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
    const dropdownRefs = useRef({});
    const [expandedDropdownId, setExpandedDropdownId] = useState(null); // for dropdowns
    const [modalApp, setModalApp] = useState(null); // for modal
    const totalRevenue = "12,560";
    const applicationsSold = 17;
    const disputedApplications = 2;
    const [applications, setApplications] = useState([
      {
        id: 1,
        title: "Toritube App",
        date: "24 Jan, 2024 at 14:56",
        status: "Request Refund",
        buyer: "Muddassar Haseeb",
        email: "muddassarhaseeb34@gmail.com",
        cost: 500,
        description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ... Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ... Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg1,
        github: "https://github.com/Youssef-Najjarine/portfoliohttps://github.com/Youssef-Najjarine/portfoliohttps://github.com/Youssef-Najjarine/portfolio",
        tech: ["Firebase", "JavaScript"],
      },
      {
        id: 2,
        title: "Antidote App",
        date: "24 Jan, 2024 at 14:56",
        status: "Under Processing",
        buyer: "Youssef Najjarine",
        email: "ynajjarine@gmail.com",
        cost: 500,      
        description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg2,
        github: "https://github.com/my-name/repo...",
        tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
      },
      {
        id: 3,
        title: "Toritube App",
        date: "24 Jan, 2024 at 14:56",
        status: "Sold",
      buyer: "Youssef Najjarine Youssef Najjarine Youssef Najjarine Youssef Najjarine Youssef Najjarine",
        email: "ynajjarine@gmail.comynajjarine@gmail.comynajjarine@gmail.comynajjarine@gmail.comynajjarine@gmail.comynajjarine@gmail.com",        
        cost: 500, 
        description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg1,
        github: "https://github.com/my-name/repo...",
        tech: ["Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API"],
      },
      {
        id: 4,
        title: "Antidote App",
        date: "24 Jan, 2024 at 14:56",
        status: "Request Refund",
        buyer: "Youssef Najjarine",
        email: "ynajjarine@gmail.com",        
        cost: 500,       
        description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg2,
        github: "https://github.com/my-name/repo...",
        tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
      },
      {
        id: 5,
        title: "Toritube App",
        date: "24 Jan, 2024 at 14:56",
        status: "Under Processing",
        buyer: "Youssef Najjarine",
        email: "ynajjarine@gmail.com",        
        cost: 500,       
        description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg1,
        github: "https://github.com/my-name/repo...",
        tech: ["Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API"],
      },
      {
        id: 6,
        title: "Antidote App",
        date: "24 Jan, 2024 at 14:56",
        status: "Sold",
        buyer: "Youssef Najjarine",
        email: "ynajjarine@gmail.com",        
        cost: 500,        
        description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg2,
        github: "https://github.com/my-name/repo...",
        tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
      },
      {
        id: 7,
        title: "Toritube App",
        date: "24 Jan, 2024 at 14:56",
        status: "Request Refund",
        buyer: "Youssef Najjarine",
        email: "ynajjarine@gmail.com",        
        cost: 500,       
        description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg1,
        github: "https://github.com/my-name/repo...",
        tech: ["Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API"],
      },
      {
        id: 8,
        title: "Antidote App",
        date: "24 Jan, 2024 at 14:56",
        status: "Under Processing",
        buyer: "Youssef Najjarine",
        email: "ynajjarine@gmail.com",        
        cost: 500,
        description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg2,
        github: "https://github.com/my-name/repo...",
        tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
      },
        {
        id: 9,
        title: "Toritube App",
        date: "24 Jan, 2024 at 14:56",
        status: "Sold",
        buyer: "Youssef Najjarine",
        email: "ynajjarine@gmail.com",        
        cost: 500,
        description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg1,
        github: "https://github.com/my-name/repo...",
        tech: ["Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API"],
      },
      {
        id: 10,
        title: "Antidote App",
        date: "24 Jan, 2024 at 14:56",
        status: "Request Refund",
        buyer: "Youssef Najjarine",
        email: "ynajjarine@gmail.com",        
        cost: 500,
        description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg2,
        github: "https://github.com/my-name/repo...",
        tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
      },
      {
        id: 11,
        title: "Toritube App",
        date: "24 Jan, 2024 at 14:56",
        status: "Sold",
        buyer: "Youssef Najjarine",
        email: "ynajjarine@gmail.com",        
        cost: 500,      
        description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg1,
        github: "https://github.com/my-name/repo...",
        tech: ["Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API"],
      },
      {
        id: 12,
        title: "Antidote App",
        date: "24 Jan, 2024 at 14:56",
        status: "Under Processing",
        buyer: "Youssef Najjarine",
        email: "ynajjarine@gmail.com",        
        cost: 500,        
        description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg2,
        github: "https://github.com/my-name/repo...",
        tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
      },
      {
        id: 13,
        title: "Toritube App",
        date: "24 Jan, 2024 at 14:56",
        status: "Request Refund",
        buyer: "Youssef Najjarine",
        email: "ynajjarine@gmail.com",        
        cost: 500,         
        description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg1,
        github: "https://github.com/my-name/repo...",
        tech: ["Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API"],
      },
      {
        id: 14,
        title: "Antidote App",
        date: "24 Jan, 2024 at 14:56",
        status: "Sold",
        buyer: "Youssef Najjarine",
        email: "ynajjarine@gmail.com",        
        cost: 500,         
        description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg2,
        github: "https://github.com/my-name/repo...",
        tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
      },
    ]);

    const visibleApps = showAll ? applications : applications.slice(0, 12);
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
          !event.target.closest(".profile-application-history-calendar-sort-div")
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
    <section id="profile-application-history">
      <div className="profile-application-history-title1-div">
        <h2 className="profile-application-history-title">Applications</h2>
        <div 
          className="profile-application-history-calendar-sort-div" 
          onClick={() => setCalendarDropdownOpen(!calendarDropdownOpen)}
        >
          <img src={calendarIcon} alt="Calendar Icon" />
          <span>{calendarSortOption}</span>
          <div
            className={`app-history-arrow-div ${calendarDropdownOpen ? "arrow-open" : ""} ${isHoveringCalendarItem ? "arrow-hover" : ""}`}
          >
            <img src={arrowIcon} alt="Arrow Icon" />
          </div>
          {calendarDropdownOpen && (
            <ul className="profile-application-history-calendar-sortby-dropdown">
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
      </div>
      <div className="profile-application-history-totals">
          <div className="profile-application-history-total">
              <div className="profile-application-history-revenue">
                <div className="profile-application-history-image">
                  <img src={priceIcon}/>
                </div>
                <div className="profile-application-history-details">
                  <p className="profile-application-history-total-amount">${totalRevenue}</p>
                  <p className="profile-application-history-label">Total Revenue</p>
                </div>
              </div>
              <div className="profile-application-history-total-down">
                <span>-12% / last month</span>
              </div>
          </div>
          <div className="profile-application-history-total">
              <div className="profile-application-history-sold">
                <div className="profile-application-history-image">
                  <img src={appSoldIcon}/>
                </div>
                <div className="profile-application-history-details">
                  <p className="profile-application-history-total-amount">{applicationsSold}</p>
                  <p className="profile-application-history-label">No. of Applications Sold</p>
                </div>
              </div>
              <div className="profile-application-history-total-up">
                <span>+8% / last month</span>
              </div>
          </div>
          <div className="profile-application-history-total">
              <div className="profile-application-history-disputed">
                <div className="profile-application-history-image">
                  <img src={disputedIcon}/>
                </div>
                <div className="profile-application-history-details">
                  <p className="profile-application-history-total-amount">{disputedApplications}</p>
                  <p className="profile-application-history-label">Disputed Applications</p>
                </div>
              </div>
              <div className="profile-application-history-total-up">
                <span>-10% / last month</span>
              </div>
          </div>
      </div>
      <div className="profile-application-history-title2-div">
        <h2 className="profile-application-history-title">History</h2>
        <div className="profile-application-history-search-filter-div">
          <div className="profile-application-history-search-div">
            <input className="profile-application-history-search" placeholder="Search..." />
            <img src={searchIcon} alt="Applications Search" className="profile-application-history-search-icon" />
          </div>
          <div
            className="profile-application-history-sortby-div"
            ref={sortByRef}
            onClick={(e) => {
              e.stopPropagation();
              setSortDropdownOpen((prev) => !prev);
            }}
          >
            <img src={sortIcon} alt="Sort Icon" />
            <span>Sort By: {sortOption}</span>
            {sortDropdownOpen && (
              <ul className="profile-application-history-sortby-dropdown">
                {["Popular", "Recent Sold","Latest", "A-Z", "Z-A"].map((option) => (
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
        </div>
      </div>
      <div className="profile-application-history-grid">
        {visibleApps.map((app) => {
          if (!dropdownRefs.current[app.id]) {
            dropdownRefs.current[app.id] = React.createRef();
          }
          return (
            <div
              className="profile-app-history"
              key={app.id}
              onClick={(e) => {
                const target = e.target;
                const isInsideLink = target.closest("a");
                const isInsideExpandDiv = target.closest(".profileApp-expand-div");
              }}
            >
              <div className="profile-app-history-row">
                <div className="profile-app-history-placeholder-image">
                  <img src={app.img}/>
                </div>
                <div className="profile-app-history-body">
                  <div className="profile-app-history-header">
                    <div className="app-history-title">
                      <h3>{app.title}</h3>
                      <div className={`app-history-status ${app.status.replace(/\s+/g, '-').toLowerCase()}`}>
                        {app.status}
                      </div>
                    </div>
                    <div className="app-history-date-expand">
                      <p className="app-history-date">{app.date}</p>
                      <div className="profile-app-history-expand-div"
                        ref={dropdownRefs.current[app.id]}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedDropdownId((prev) => (prev === app.id ? null : app.id));
                        }}
                      >
                        <button>
                          <img src={expandIcon} className="profile-app-history-expand-icon" />
                        </button>
                        {expandedDropdownId === app.id &&  (
                          <div className="profile-app-history-dropdown">
                            <div
                              className="profile-app-history-dropdown-item details"
                              onClick={(e) => {
                                e.stopPropagation();
                                setModalApp(app);
                                setModalSource("details");
                                setModalOpen(true);
                                setExpandedDropdownId(null);
                              }}
                            >
                              <img src={detailIcon} alt="Details" />
                              <span>Details</span>
                            </div>
                            <div className="profile-app-history-dropdown-item details">
                              <img src={resendIcon} alt="Resend" />
                              <span>Resend Details</span>
                            </div>
                            <div className="profile-app-history-dropdown-item details">
                              <img src={inquiryIssueIcon} alt="Inquiry Issue" />
                              <span>Inquiry Issue</span>
                            </div>  
                            <div className="profile-app-history-dropdown-item refund">
                              <img src={refundIcon} alt="Inquiry Issue" />
                              <span>Give Refund</span>
                            </div>                                                                              
                          </div>
                        )}                  
                      </div>
                    </div>                  
                  </div>
                  <div className="profile-app-history-description">
                    <p>{app.description}</p>
                  </div>
                  <div className="profile-app-history-gitHub-div">
                    <a href={app.github} target="_blank" rel="noopener noreferrer">
                        <img src={githubIcon} alt="GitHub icon" />
                    </a>
                    <div className="profile-app-history-github-anchor-div">
                        <a href={app.github} target="_blank" rel="noopener noreferrer">
                        {app.github}
                        </a>
                    </div>
                  </div>
                  <div className="profile-app-history-buyer-info">
                    <div className="profile-app-history-buyer-info-buyer">
                      <img src={buyerIcon}/>
                      <p>{app.buyer}</p>
                    </div>
                    <div className="profile-app-history-buyer-info-email">
                      <img src={emailIcon}/>
                      <p>{app.email}</p>
                    </div>
                    <div className="profile-app-history-buyer-info-price">
                      <img src={priceIcon}/>
                      <p>${app.cost}</p>
                    </div>
                  </div>                                 
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="profile-applications-history-load-more-div">
        <button
          className="profile-applications-history-load-more"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? "Show Less" : "Load More"}
        </button>
      </div>

      {modalOpen && (
        <ProfileApplicationDetailModal
          modalOpenState={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setModalApp(null);
          }}
          app={modalApp}
          modalSource={modalSource}
        />
      )}
    </section>
  );
};

export default ApplicationHistory;