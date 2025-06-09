import React, { useState, useEffect } from "react";
import ApplicationDetailModal from "./ApplicationDetailModal";
import searchIcon from "../../../assets/Blogs/search-normal.svg";
import applicationImg1 from "../../../assets/Applications/applicationImg-1.png";
import applicationImg2 from "../../../assets/Applications/applicationImg-2.png";
import githubIcon from "../../../assets/Applications/more.png";
import "./Applications.css";

const Applications = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [modalState, seModalState] = useState(false);

  useEffect(() => {
    // Simulate a fetch call to get application data
    setIsLoading(false);
    setApplications([
      // Example app data; replace with actual API fetch data
      {
        id: 1,
        name: "App One",
        description:
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg1,
        github: "https://github.com/my-name/repo...",
        skills: ["UI/UX Design", "Mobile App", "Mobile App", "Github repo"],
      },
      {
        id: 2,
        name: "App Two",
        description:
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg2,
        github: "https://github.com/my-name/repo...",
        skills: ["UI/UX Design", "Mobile App", "Github repo"],
      },
      {
        id: 3,
        name: "App Two",
        description:
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg1,
        github: "https://github.com/my-name/repo...",
        skills: ["UI/UX Design", "Mobile App", "Github repo"],
      },
      {
        id: 4,
        name: "App Two",
        description:
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg2,
        github: "https://github.com/my-name/repo...",
        skills: ["UI/UX Design", "Mobile App", "Github repo"],
      },
      {
        id: 5,
        name: "App Two",
        description:
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg1,
        github: "https://github.com/my-name/repo...",
        skills: ["UI/UX Design", "Mobile App", "Github repo"],
      },
      {
        id: 6,
        name: "App Two",
        description:
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg2,
        github: "https://github.com/my-name/repo...",
        skills: ["UI/UX Design", "Mobile App", "Github repo"],
      },
      {
        id: 7,
        name: "App Two",
        description:
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg1,
        github: "https://github.com/my-name/repo...",
        skills: ["UI/UX Design", "Mobile App", "Github repo"],
      },
      {
        id: 8,
        name: "App Two",
        description:
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg2,
        github: "https://github.com/my-name/repo...",
        skills: ["UI/UX Design", "Mobile App", "Github repo"],
      },
      {
        id: 9,
        name: "App Two",
        description:
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg1,
        github: "https://github.com/my-name/repo...",
        skills: ["UI/UX Design", "Mobile App", "Github repo"],
      },
      {
        id: 10,
        name: "App Two",
        description:
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg2,
        github: "https://github.com/my-name/repo...",
        skills: ["UI/UX Design", "Mobile App", "Github repo"],
      },
      {
        id: 11,
        name: "App Two",
        description:
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg1,
        github: "https://github.com/my-name/repo...",
        skills: ["UI/UX Design", "Mobile App", "Github repo"],
      },
      {
        id: 12,
        name: "App Two",
        description:
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg2,
        github: "https://github.com/my-name/repo...",
        skills: ["UI/UX Design", "Mobile App", "Github repo"],
      },
      {
        id: 13,
        name: "App Two",
        name: "App Two",
        description:
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg1,
        github: "https://github.com/my-name/repo...",
        skills: ["UI/UX Design", "Mobile App", "Github repo"],
      },
      {
        id: 14,
        name: "App Two",
        name: "App Two",
        description:
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg2,
        github: "https://github.com/my-name/repo...",
        skills: ["UI/UX Design", "Mobile App", "Github repo"],
      },
      {
        id: 15,
        name: "App Two",
        description:
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg1,
        github: "https://github.com/my-name/repo...",
        skills: ["UI/UX Design", "Mobile App", "Github repo"],
      },
      {
        id: 16,
        name: "App Two",
        description:
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg2,
        github: "https://github.com/my-name/repo...",
        skills: ["UI/UX Design", "Mobile App", "Github repo"],
      },
      {
        id: 17,
        name: "App Two",
        description:
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg1,
        github: "https://github.com/my-name/repo...",
        skills: ["UI/UX Design", "Mobile App", "Github repo"],
      },
      {
        id: 18,
        name: "App Two",
        description:
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
        img: applicationImg2,
        github: "https://github.com/my-name/repo...",
        skills: ["UI/UX Design", "Mobile App", "Github repo"],
      },
    ]);
  }, []);

  const handleClickCard = () => {
    seModalState(true);
  };

  return (
    <section id="applications" className="page-container">
      <div className="mainSubDiv">
        <div className="col-full headers">
          <div className="title-content">
            <h3 className="title-a">Applications</h3>
            <div className="line-mf">
              Explore the best applications in world available to own.
            </div>
          </div>
          <div className="search-bar">
            <div className="search-placeholder">AI UI/UX Creator</div>
            <img src={searchIcon} alt="Close" className="search-icon" />
          </div>
        </div>
      </div>
      <div className="main-grid">
        <div className="applications-grid">
          {applications.map((app, index) => (
            <div
              key={app.id}
              className="application-card"
              onClick={() => handleClickCard()}
            >
              <img className="card-image" src={app.img}></img>
              <div className="card-content">
                <div className="github">
                  <img src={githubIcon}></img>
                  <div className="github-url">{app.github}</div>
                </div>
                <div className="card-text">
                  <div className="card-title">{app.name}</div>
                  <div className="card-description">{app.description}</div>
                </div>
                <div className="skills">
                  {app.skills.map((skill, index) => (
                    <div className="skill">{skill}</div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="load-more">Load More</div>
      </div>
      {modalState && <ApplicationDetailModal modalOpenState={modalState} />}
    </section>
  );
};

export default Applications;
