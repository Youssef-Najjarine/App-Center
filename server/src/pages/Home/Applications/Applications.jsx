import React, { useState, useEffect } from "react";
import ApplicationDetailModal from "./ApplicationDetailModal";
import searchIcon from "../../../assets/Applications/search-normal.svg";
import applicationImg1 from "../../../assets/Applications/applicationImg-1.png";
import applicationImg2 from "../../../assets/Applications/applicationImg-2.png";
import githubIcon from "../../../assets/Applications/github-icon.png";
import "./Applications.css";

const HomeApplications = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      tech: ["Firebase", "JavaScript"],
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
    <section id="applications">
      <div className="applications-title-div">
        <h2 className="applications-title">Applications</h2>
        <h3 className="applications-sub-header">
          Explore the best applications in world available to own.
        </h3>
        <div className="applications-search-div">
          <input className="applications-search" placeholder="Search..." />
          <img src={searchIcon} alt="Applications Search" className="applications-search-icon" />
        </div>
      </div>

      <div className="applications-grid">
        {visibleApps.map((app) => {
          const isExpanded = expandedTechStacks[app.id];
          const visibleTech = isExpanded ? app.tech : app.tech.slice(0, 3);
          const remaining = app.tech.length - 3;

          return (
            <div
              className="homeApp"
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
              <div className="homeApp-image-div">
                <img src={app.img} alt={app.title} />
              </div>
              <div className="homeApp-gitHub-div">
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
              <h6 className="homeApp-app-title">{app.title}</h6>
              <p className="homeApp-app-description">{app.description}</p>
              <ul className="homeApp-app-tech-stack">
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
                  <li className="collapse-tech" onClick={(e) => {
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
      <div className="applications-load-more-div">
        <button
          className="applications-load-more"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? "Show Less" : "Load More"}
        </button>
      </div>

      {/* Modal */}
      {modalOpen && (
        <ApplicationDetailModal
          modalOpenState={modalOpen}
          onClose={closeModal}
          app={selectedApp}
        />
      )}
    </section>
  );
};

export default HomeApplications;