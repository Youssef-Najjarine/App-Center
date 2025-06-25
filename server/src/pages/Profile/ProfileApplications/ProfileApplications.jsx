import React, { useState, useEffect } from "react";
import {Link} from 'react-router-dom';
import ProfileApplicationDetailModal from "./ProfileApplicationDetailModal";
import searchIcon from "../../../assets/Member/member-applications-search-icon.svg";
import applicationImg1 from "../../../assets/Member/member-applicationImg-1.png";
import applicationImg2 from "../../../assets/Member/member-applicationImg-2.png";
import githubIcon from "../../../assets/Member/member-applications-github-icon.png";
import expandIcon from "../../../assets/Member/member-applications-more-icon.svg";
import detailsIcon from "../../../assets/Member/member-applications-details-icon.svg";
import editIcon from "../../../assets/Member/member-applications-edit-icon.svg";
import trashIcon from "../../../assets/Member/member-applications-trash-icon.svg";
import addIcon from "../../../assets/Member/member-applications-add-circle-icon.svg";
import sortIcon from "../../../assets/Member/member-applications-sort-icon.svg";
import playIcon from "../../../assets/Member/member-applications-play-icon.svg";
import "./ProfileApplications.css";

const ProfileApplications = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  useEffect(() => {
  const handleClickOutside = () => setSelectedApp(null);
  document.addEventListener('click', handleClickOutside);
  return () => document.removeEventListener('click', handleClickOutside);
}, []);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [expandedTechStacks, setExpandedTechStacks] = useState({});

  const applications = [
    {
      id: 1,
      title: "Toritube App",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg1,
      github: "https://github.com/my-name/repo...",
      tech: ["Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API"],
    },
    {
      id: 2,
      title: "Antidote App",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg2,
      github: "https://github.com/my-name/repo...",
      tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
    },
    {
      id: 3,
      title: "Toritube App",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg1,
      github: "https://github.com/my-name/repo...",
      tech: ["Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API"],
    },
    {
      id: 4,
      title: "Antidote App",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg2,
      github: "https://github.com/my-name/repo...",
      tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
    },
    {
      id: 5,
      title: "Toritube App",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg1,
      github: "https://github.com/my-name/repo...",
      tech: ["Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API"],
    },
    {
      id: 6,
      title: "Antidote App",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg2,
      github: "https://github.com/my-name/repo...",
      tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
    },
    {
      id: 7,
      title: "Toritube App",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg1,
      github: "https://github.com/my-name/repo...",
      tech: ["Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API"],
    },
    {
      id: 8,
      title: "Antidote App",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg2,
      github: "https://github.com/my-name/repo...",
      tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
    },
      {
      id: 9,
      title: "Toritube App",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg1,
      github: "https://github.com/my-name/repo...",
      tech: ["Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API"],
    },
    {
      id: 10,
      title: "Antidote App",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg2,
      github: "https://github.com/my-name/repo...",
      tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
    },
    {
      id: 11,
      title: "Toritube App",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg1,
      github: "https://github.com/my-name/repo...",
      tech: ["Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API"],
    },
    {
      id: 12,
      title: "Antidote App",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg2,
      github: "https://github.com/my-name/repo...",
      tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
    },
    {
      id: 13,
      title: "Toritube App",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg1,
      github: "https://github.com/my-name/repo...",
      tech: ["Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API", "Firebase", "JavaScript", "UI/UX Design", "GitHub Repo", "Artificial Intelligence", "React", "REST API"],
    },
    {
      id: 14,
      title: "Antidote App",
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
      img: applicationImg2,
      github: "https://github.com/my-name/repo...",
      tech: ["Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App", "Web App", "Artificial Intelligence", "Node.js", "SQL", "Mobile App"],
    },
  ];

 const visibleApps = showAll ? applications : applications.slice(0, 12);

  const toggleTechStack = (id) => {
    setExpandedTechStacks((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const openModalWithApp = (app) => {
    setSelectedApp(app);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedApp(null);
  };

  return (
    <section id="profile-applications">
      <div className="profile-applications-title-div">
        <h2 className="profile-applications-title">My Apps</h2>
        <div className="profile-applications-search-filter-add-div">
          <div className="profile-applications-search-div">
            <input className="profile-applications-search" placeholder="Search..." />
            <img src={searchIcon} alt="Applications Search" className="profile-applications-search-icon" />
          </div>
          <div className="profile-applications-sortby-div">
            <Link to="/">
              <img src={sortIcon}/>
              <span>Sort By: Popular</span>
            </Link>
          </div>
          <div className="profile-applications-upload-new-div">
            <Link to="/">
              <img src={addIcon}/>
              <span>Upload New App</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="profile-applications-grid">
        {visibleApps.map((app) => {
          const isExpanded = expandedTechStacks[app.id];
          const visibleTech = isExpanded ? app.tech : app.tech.slice(0, 3);
          const remaining = app.tech.length - 3;

          return (
            <div
              className="profileApp"
              key={app.id}
              onClick={(e) => {
                const target = e.target;
                const isLink = target.closest("a");
                const isToggle = target.classList.contains("expand-tech") || target.classList.contains("collapse-tech");
                if (!isLink && !isToggle) {
                  openModalWithApp(app);
                }
              }}
            >
              <div className="profileApp-image-div">
                <img src={app.img} alt={app.title} className="profileApp-placeholder-img" />

                <div className="profileApp-expand-div">
                  <button onClick={(e) => {
                    e.stopPropagation();
                    setSelectedApp(app.id === selectedApp ? null : app.id);
                  }}>
                    <img src={expandIcon} className="profileApp-expand-icon" />
                  </button>

                  {selectedApp === app.id && (
                    <div className="profileApp-dropdown">
                      <Link to={`/details/${app.id}`} className="profileApp-dropdown-item details">
                        <img src={detailsIcon} alt="Details" />
                        <span>
                          Details
                        </span>
                      </Link>
                      <Link to={`/edit/${app.id}`} className="profileApp-dropdown-item edit">
                        <img src={editIcon} alt="Edit" />
                        <span>Edit</span>
                      </Link>
                      <Link to={`/delete/${app.id}`} className="profileApp-dropdown-item delete">
                        <img src={trashIcon} alt="Delete" />
                        <span>Delete</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
              <div className="profileApp-gitHub-div">
                <div>
                  <a href={app.github} target="_blank" rel="noopener noreferrer">
                    <img src={githubIcon} alt="GitHub icon" />
                  </a>
                </div>
                <div>
                  <a href={app.github} target="_blank" rel="noopener noreferrer">
                    {app.github}
                  </a>
                </div>
              </div>
              <h6 className="profileApp-app-title">{app.title}</h6>
              <p className="profileApp-app-description">{app.description}</p>
              <ul className="profileApp-app-tech-stack">
                {visibleTech.map((techItem, index) => (
                  <li key={`${app.id}-tech-${index}`}>{techItem}</li>
                ))}
                {!isExpanded && remaining > 0 && (
                  <li className="expand-tech" onClick={(e) => {
                    e.stopPropagation();
                    toggleTechStack(app.id);
                  }}>
                    +{remaining}
                  </li>
                )}
                {isExpanded && remaining > 0 && (
                  <li className="profileApp-collapse-tech" onClick={(e) => {
                    e.stopPropagation();
                    toggleTechStack(app.id);
                  }}>
                    Show less
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Load More */}
      <div className="profile-applications-load-more-div">
        <button
          className="applications-load-more"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? "Show Less" : "Load More"}
        </button>
      </div>

      {/* Modal */}
      {modalOpen && (
        <ProfileApplicationDetailModal
          modalOpenState={modalOpen}
          onClose={closeModal}
          app={selectedApp}
        />
      )}
    </section>
  );
};

export default ProfileApplications;