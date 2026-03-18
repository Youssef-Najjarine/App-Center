import React, { useState, useEffect, useRef  } from "react";
import { Link } from "react-router-dom";
import ProfileApplicationDetailModal from "@profile/ProfileApplicationDetailModal/ProfileApplicationDetailModal";
import applicationImg1 from "@assets/Member/member-applicationImg-1.png";
import applicationImg2 from "@assets/Member/member-applicationImg-2.png";
import githubIcon from "@assets/github-icon.png";
import expandIcon from "@assets/three-dots-expand-icon.svg";
import viewDetailsIcon from "@assets/purple-view-details-icon.svg";
import downloadIcon from "@assets/purple-download-icon.svg";
import reportIcon from "@assets/danger-outline.svg";
import sellerIcon from "@assets/purple-outline-profile-icon.svg";
import emailIcon from "@assets/purple-outline-email-icon.svg";
import spentIcon from "@assets/purple-dollar-circle-icon.svg";
import addIcon from "@assets/add-circle-icon.svg";
import sortIcon from "@assets/sort-by-icon.svg";
import "./MyPurchases.css";

const MyPurchases = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [modalSource, setModalSource] = useState("card");
  const [showAll, setShowAll] = useState(false);
  const sortByRef = useRef(null);
  const [sortOption, setSortOption] = useState("Popular");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const dropdownRefs = useRef({});
  const [expandedDropdownId, setExpandedDropdownId] = useState(null); // for dropdowns
  const [modalApp, setModalApp] = useState(null); // for modal
  const [applications, setApplications] = useState([
    {
      id: 1,
      title: "Toritube App",
      date: "24 Jan, 2024 at 14:56",
      description: "At Open App Partners, we are passionate innovators determined to change the way technology serves individuals and businesses. Founded with the vision of empowering users through high-quality, innovative, and accessible applications, we develop solutions th... At Open App Partners, we are passionate innovators determined to change the way technology serves individuals and businesses. Founded with the vision of empowering users through high-quality, innovative, and accessible applications, we develop solutions th...",
      img: applicationImg1,
      github: "https://github.com/Youssef-Najjarine/portfolio",
      tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
      seller: "Carlo Mercado",
      email: "muddassarhaseeb34@gmail.commuddassarhaseeb34@gmail.commuddassarhaseeb34@gmail.commuddassarhaseeb34@gmail.com",
      spent: "$500.00"
    },
    {
      id: 2,
      title: "Antidote App",
      date: "24 Jan, 2024 at 14:56",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg2,
      github: "https://github.com/my-name/repo...",
      tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
      seller: "Youssef Najjarine",
      email: "ynajjarine@gmail.com",
      spent: "$500.00"
    },
    {
      id: 3,
      title: "Toritube App",
      date: "24 Jan, 2024 at 14:56",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg1,
      github: "https://github.com/my-name/repo...",
      tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
      seller: "Abraham Najjarine",
      email: "an@najjarinestructures.com",
      spent: "$500.00"
    },
    {
      id: 4,
      title: "Antidote App",
      date: "24 Jan, 2024 at 14:56",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg2,
      github: "https://github.com/my-name/repo...",
      tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
      seller: "Omar Najjarine",
      email: "omarnajjarine@gmail.com",
      spent: "$500.00"
    },
    {
      id: 5,
      title: "Toritube App",
      date: "24 Jan, 2024 at 14:56",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg1,
      github: "https://github.com/my-name/repo...",
      tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
      seller: "Carlo Mercado",
      email: "muddassarhaseeb34@gmail.com",
      spent: "$500.00"
    },
    {
      id: 6,
      title: "Antidote App",
      date: "24 Jan, 2024 at 14:56",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg2,
      github: "https://github.com/my-name/repo...",
      tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
      seller: "Carlo Mercado",
      email: "muddassarhaseeb34@gmail.com",
      spent: "$500.00"
    },
    {
      id: 7,
      title: "Toritube App",
      date: "24 Jan, 2024 at 14:56",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg1,
      github: "https://github.com/my-name/repo...",
      tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
      seller: "Carlo Mercado",
      email: "muddassarhaseeb34@gmail.com",
      spent: "$500.00"
    },
    {
      id: 8,
      title: "Antidote App",
      date: "24 Jan, 2024 at 14:56",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg2,
      github: "https://github.com/my-name/repo...",
      tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
      seller: "Carlo Mercado",
      email: "muddassarhaseeb34@gmail.com",
      spent: "$500.00"
    },
      {
        id: 9,
        title: "Toritube App",
        date: "24 Jan, 2024 at 14:56",
        description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg1,
        github: "https://github.com/my-name/repo...",
        tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
        seller: "Carlo Mercado",
        email: "muddassarhaseeb34@gmail.com",
        spent: "$500.00"
    },
    {
      id: 10,
      title: "Antidote App",
      date: "24 Jan, 2024 at 14:56",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg2,
      github: "https://github.com/my-name/repo...",
      tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
      seller: "Carlo Mercado",
      email: "muddassarhaseeb34@gmail.com",
      spent: "$500.00"
    },
    {
      id: 11,
      title: "Toritube App",
      date: "24 Jan, 2024 at 14:56",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg1,
      github: "https://github.com/my-name/repo...",
      tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
      seller: "Carlo Mercado",
      email: "muddassarhaseeb34@gmail.com",
      spent: "$500.00"
    },
    {
      id: 12,
      title: "Antidote App",
      date: "24 Jan, 2024 at 14:56",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg2,
      github: "https://github.com/my-name/repo...",
      tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
      seller: "Carlo Mercado",
      email: "muddassarhaseeb34@gmail.com",
      spent: "$500.00"
    },
    {
      id: 13,
      title: "Toritube App",
      date: "24 Jan, 2024 at 14:56",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg1,
      github: "https://github.com/my-name/repo...",
      tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
      seller: "Carlo Mercado",
      email: "muddassarhaseeb34@gmail.com",
      spent: "$500.00"
    },
    {
      id: 14,
      title: "Antidote App",
      date: "24 Jan, 2024 at 14:56",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg2,
      github: "https://github.com/my-name/repo...",
      tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
      seller: "Carlo Mercado",
      email: "muddassarhaseeb34@gmail.com",
      spent: "$500.00"
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
    }, [expandedDropdownId, sortDropdownOpen]);


  return (
    <section id="profile-my-purchases">
        <div className="profile-my-purchases-title-div">
            <h2 className="profile-my-purchases-title">My Purchases</h2>
                <div className="profile-my-purchases-sortby-buy-more-div">
                    <div className="profile-my-purchases-sortby-div" ref={sortByRef}>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setSortDropdownOpen((prev) => !prev);
                        }}
                        className="profile-my-purchases-sortby-button"
                      >
                        <img src={sortIcon} alt="Sort Icon" />
                        <span className="profile-my-purchases-sort-option">Sort By: {sortOption}</span>
                      </div>
                      {sortDropdownOpen && (
                        <ul className="profile-my-purchases-sortby-dropdown">
                          {["Popular", "Latest", "A-Z", "Z-A"].map((option) => (
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
                    <div className="profile-my-purchases-header-right-border"></div>
                    <div className="profile-my-purchases-buy-more-div">
                        <div
                            className="profile-my-purchases-buy-more-btn"
                        >
                            <Link to="/applications">
                                <img src={addIcon} alt="Buy App" />
                                <span>Buy more Applications</span>
                            </Link>
                        </div>
                    </div>
                </div>
        </div>
        <div className="profile-my-purchases-grid">
            {visibleApps.map((app) => {
                if (!dropdownRefs.current[app.id]) {
                    dropdownRefs.current[app.id] = React.createRef();
                }
                return (
                    <div
                        className="profile-my-purchases-app"
                        key={app.id}
                    >
                        <div className="profile-my-purchases-body-part1">
                            <div className="profile-my-purchases-image-div">
                                <img src={app.img} alt={app.title} className="profile-my-purchases-placeholder-img" />
                            </div>
                            <div className="profile-my-purchases-body-part1-details">
                                <div className="profile-my-purchases-body-part1-details-header">
                                    <div className="profile-my-purchases-body-part1-details-sub-header">
                                        <h3>{app.title}</h3>
                                        <p>{app.date}</p>
                                    </div>
                                    <div className="profile-my-purchases-expand-div"
                                        ref={dropdownRefs.current[app.id]}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedDropdownId((prev) => (prev === app.id ? null : app.id));
                                        }}
                                    >
                                        <button>
                                            <img src={expandIcon} className="profile-my-purchases-expand-icon" />
                                        </button>
                                        {expandedDropdownId === app.id &&  (
                                            <div className="profile-my-purchases-dropdown">
                                                <div
                                                    className="profile-my-purchases-dropdown-item details"
                                                    onClick={(e) => {
                                                    e.stopPropagation();
                                                    setModalApp(app);
                                                    setModalSource("purchased");
                                                    setModalOpen(true);
                                                    setExpandedDropdownId(null);
                                                    }}
                                                >
                                                    <img src={viewDetailsIcon} alt="Details" />
                                                    <span>View Details</span>
                                                </div>
                                                <div
                                                    className="profile-my-purchases-dropdown-item download"
                                                    onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedApp(null);
                                                    }}
                                                >
                                                    <img src={downloadIcon} alt="Download Again" />
                                                    <span>Download Again</span>
                                                </div>
                                                <div
                                                    className="profile-my-purchases-dropdown-item report"
                                                    onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedApp(null);
                                                    }}
                                                >
                                                    <img src={reportIcon} alt="Report Issue" />
                                                    <span>Report Issue</span>
                                                </div>
                                            </div>
                                        )}                  
                                    </div>
                                </div>
                                <div className="profile-my-purchases-description">
                                    <p>{app.description}</p>
                                </div>
                                <div>
                                <div className="profile-my-purchases-gitHub-div">
                                  <a href={app.github} target="_blank" rel="noopener noreferrer">
                                      <img src={githubIcon} alt="GitHub icon" />
                                  </a>
                                  <div className="profile-my-purchases-github-anchor-div">
                                      <a href={app.github} target="_blank" rel="noopener noreferrer">
                                      {app.github}
                                      </a>
                                  </div>
                                </div>
                                </div>
                            </div>                           
                        </div>
                        <div className="profile-my-purchases-body-part2">
                            <div className="profile-my-purchases-seller-info">
                                <div className="profile-my-purchases-seller-name">
                                    <div className="profile-my-purchases-seller-image-label">
                                        <img src={sellerIcon}/>
                                        <label>Seller Name:</label>
                                    </div>
                                    <div className="profile-my-purchases-seller-value">
                                        {app.seller}
                                    </div>
                                </div>
                                <div className="profile-my-purchases-seller-email">
                                    <div className="profile-my-purchases-seller-image-label">
                                        <img src={emailIcon}/>
                                        <label>Email Address:</label>
                                    </div>
                                    <div className="profile-my-purchases-seller-value">
                                        {app.email}
                                    </div>                                    
                                </div>
                                <div className="profile-my-purchases-seller-amount">
                                    <div className="profile-my-purchases-seller-image-label">
                                        <img src={spentIcon}/>
                                        <label>Spent:</label>
                                    </div>
                                    <div className="profile-my-purchases-seller-value">
                                        {app.spent}
                                    </div>                                     
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>

        <div className="profile-my-purchases-load-more-div">
            <button
            className="profile-my-purchases-load-more"
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

export default MyPurchases;