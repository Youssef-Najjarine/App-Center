import React, { useState, useEffect, useRef  } from "react";
import ProfileApplicationDetailModal from "@profile/ProfileApplicationDetailModal/ProfileApplicationDetailModal";
import ProfileUploadEditAppModal from "@profile/ProfileUploadEditAppModal/ProfileUploadEditAppModal";
import DeleteConfirmationModal from "@pages/DeleteConfirmationModal/DeleteConfirmationModal";
import ManageBoostModal from "./ManageBoostModal/ManageBoostModal";
import searchIcon from "@assets/magnifying-glass-icon.svg";
import applicationImg1 from "@assets/Member/member-applicationImg-1.png";
import applicationImg2 from "@assets/Member/member-applicationImg-2.png";
import detailsIcon from "@assets/purple-details-icon.svg";
import editIcon from "@assets/purple-edit-icon.svg";
import trashIcon from "@assets/red-outline-trash-icon.svg";
import addIcon from "@assets/add-circle-icon.svg";
import sortIcon from "@assets/sort-by-icon.svg";
import PlaceHolderImg from "@assets/Member/app-management-placeholder.png";
import Chart from "@assets/Member/app-management-chart.png";
import expandIcon from "@assets/three-dots-expand-icon.svg";
import boostIcon from "@assets/filled-purple-boost-icon.png";
import "./AppManagement.css";

const AppManagement = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [modalSource, setModalSource] = useState("card");
  const [showAll, setShowAll] = useState(false);
  const [expandedTechStacks, setExpandedTechStacks] = useState({});
  const [sortOption, setSortOption] = useState("Popular");
  const sortByRef = useRef(null);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [showUploadEditModal, setShowUploadEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [appToDelete, setAppToDelete] = useState(null);
  const [showManageBoostModal, setShowManageBoostModal] = useState(false);
const [boostApp, setBoostApp] = useState(null);
  const dropdownRefs = useRef({});
  const [expandedDropdownId, setExpandedDropdownId] = useState(null); // for dropdowns
  const [modalApp, setModalApp] = useState(null); // for modal
  const [applications, setApplications] = useState([
    {
      id: 1,
      title: "Toritube App",
      description: "change the way technology serves individuals and businesses. Founded with the vision of empowering users through high-quality, innovative, and accessible applications, we develop solutions th...",
      preview: PlaceHolderImg,
      stats: Chart,
      impressions: "121.5K",
      clicks: "658",
      spent: "$22.56",
      ppc: "$0.5",
      dailyBudget: 20,
      cpcCap: 0.5,
      github: "https://github.com/my-name/repo...",
      tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"]
    },
    {
      id: 2,
      title: "Toritube App",
      description: "change the way technology serves individuals and businesses. Founded with the vision of empowering users through high-quality, innovative, and accessible applications, we develop solutions th...",
      preview: applicationImg1,
      stats: Chart,
      impressions: "121.5K",
      clicks: "658",
      spent: "$22.56",
      ppc: "$0.5",
      dailyBudget: 35.5,
      cpcCap: 1.25,
      github: "https://github.com/my-name/repo...",
      tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"]
    },
    {
      id: 3,
      title: "Toritube App",
      description: "change the way technology serves individuals and businesses. Founded with the vision of empowering users through high-quality, innovative, and accessible applications, we develop solutions th...",
      preview: applicationImg2,
      stats: Chart,
      impressions: "121.5K",
      clicks: "658",
      spent: "$22.56",
      ppc: "$0.5",
      dailyBudget: 46.75,
      cpcCap: 0.89,      
      github: "https://github.com/my-name/repo...",
      tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"]      
    },
    {
      id: 4,
      title: "Toritube App",
      description: "change the way technology serves individuals and businesses. Founded with the vision of empowering users through high-quality, innovative, and accessible applications, we develop solutions th...",
      preview: PlaceHolderImg,
      stats: Chart,
      impressions: "121.5K",
      clicks: "658",
      spent: "$22.56",
      ppc: "$0.5",
      dailyBudget: 486,
      cpcCap: 0.75,       
      github: "https://github.com/my-name/repo...",
      tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"]
    }
  ]);
  const visibleApps = showAll ? applications : applications.slice(0, 3);
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
    <section id="app-management-applications">
      <div className="app-management-title-div">
        <h2 className="app-management-title">App Management</h2>
        <div className="app-management-search-filter-add-div">
          <div className="app-management-search-div">
            <input className="app-management-search" placeholder="Search..." />
            <img src={searchIcon} alt="Applications Search" className="app-management-search-icon" />
          </div>
          <div className="app-management-sortby-upload-div">
            <div className="app-management-sortby-div" ref={sortByRef}>
              <div
                className="app-management-sortby-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  setSortDropdownOpen((prev) => !prev);
                }}
              >
                <img src={sortIcon} alt="Sort Icon" />
                <span>Sort By: {sortOption}</span>
              </div>

              {sortDropdownOpen && (
                <ul className="sortby-dropdown">
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
            <div className="app-management-header-right-border"></div>
            <div className="app-management-upload-new-div">
              <div
                className="app-management-upload-new-btn"
                onClick={() => setShowUploadEditModal(true)}
              >
                <img src={addIcon} alt="Add App" />
                <span>Upload New App</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="app-management-apps">
        {visibleApps.map((app) => {
          if (!dropdownRefs.current[app.id]) {
            dropdownRefs.current[app.id] = React.createRef();
          }
          return (
            <div key={app.id} className="app-management-card">
              <div className="app-management-display-image">
                <img src={app.preview} alt="App preview" />
              </div>
              <div className="app-management-info">
                  <div className="app-management-app-title">
                    <h4>{app.title}</h4>
                    <div className="app-management-expand-div"
                      ref={dropdownRefs.current[app.id]}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedDropdownId((prev) => (prev === app.id ? null : app.id));
                      }}
                    >
                      <button className="app-management-expand-button">
                        <img src={expandIcon}/>
                      </button>
                      {expandedDropdownId === app.id &&  (
                        <div className="app-management-dropdown">
                          <div
                            className="app-management-dropdown-item details"
                            onClick={(e) => {
                              e.stopPropagation();
                              setModalApp(app);
                              setModalSource("details");
                              setModalOpen(true);
                              setExpandedDropdownId(null);
                            }}
                          >
                            <img src={detailsIcon} alt="Details" />
                            <span>Details</span>
                          </div>
                          <div
                            className="app-management-dropdown-item edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowUploadEditModal(true);
                              setSelectedApp(null);
                            }}
                          >
                            <img src={editIcon} alt="Edit" />
                            <span>Edit</span>
                          </div>
                          <div
                            className="app-management-dropdown-item delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAppToDelete(app);
                              setShowDeleteModal(true);
                              setSelectedApp(null);
                            }}
                          >
                            <img src={trashIcon} alt="Delete" />
                            <span>Delete</span>
                          </div>
                        </div>
                      )}                  
                    </div>
                  </div>
                  <div className="app-management-description">
                    <p>
                        {app.description}
                    </p>
                  </div>
                  <div className="app-management-chart-metrics">
                    <div className="app-management-chart">
                      <img src={app.stats} alt="chart"/>
                    </div>
                    <div className="app-management-metrics-boosts">
                      <div className="app-management-metrics">
                          <div>
                            <span className="app-management-metric-label">Impressions:</span>
                            <span className="app-management-metric-amount">{app.impressions}</span>
                          </div>
                          <div>
                            <span className="app-management-metric-label">Clicks:</span>
                            <span className="app-management-metric-amount">{app.clicks}</span>
                          </div>
                          <div>
                            <span className="app-management-metric-label">Spent:</span>
                            <span className="app-management-metric-amount">{app.spent}</span>
                          </div>
                          <div>
                            <span className="app-management-metric-label">PPC:</span>
                            <span className="app-management-metric-amount">{app.spent}</span>
                          </div>
                      </div>
                      <div className="app-management-boosts">
                        <div>
                          <button>
                            <img src={boostIcon}/>
                            <span>Boost Now</span>
                          </button>
                        </div>
                        <div>
                          <button
                            onClick={() => {
                              setBoostApp(app);
                              setShowManageBoostModal(true);
                            }}
                          >
                            <img src={boostIcon} />
                            <span>Manage <span className="app-management-boost-txt">Boost</span></span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
              </div>
            </div>       
          );
        })}
      </div>
      <div className="app-management-load-more-div">
        <button
          className="app-management-load-more"
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

      {showUploadEditModal && (
        <ProfileUploadEditAppModal
          modalOpenState={showUploadEditModal}
          onClose={() => setShowUploadEditModal(false)}
        />
      )}

      {showDeleteModal && appToDelete && (
        <DeleteConfirmationModal
          modalOpenState={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setAppToDelete(null);
          }}
          app={appToDelete}
          onConfirmDelete={() => {
            setApplications((prevApps) =>
              prevApps.filter((app) => app.id !== appToDelete.id)
            );
            setShowDeleteModal(false);
            setAppToDelete(null);
          }}
        />
      )}
      {showManageBoostModal && boostApp && (
        <ManageBoostModal
          modalOpenState={showManageBoostModal}
          onClose={() => {
            setShowManageBoostModal(false);
            setBoostApp(null);
          }}
          title={boostApp.title}
          preview={boostApp.preview}
          dailyBudget={boostApp.dailyBudget}
          cpcCap={boostApp.cpcCap}
          impressions={boostApp.impressions}
          clicks={boostApp.clicks}
          spent={boostApp.spent}
          ppc={boostApp.ppc}
        />
      )}      
    </section>
  );
};

export default AppManagement;