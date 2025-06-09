import React, { useState, useEffect } from "react";
import { Button, Modal } from "antd";
import applicationImg1 from "../../../assets/Applications/applicationImg-1.png";
import "./ApplicationDetailModal.css";

const ApplicationDetailModal = (props) => {
  const [modalIsOpen, setIsOpen] = useState(props.modalOpenState);

  useEffect(() => {}, []);

  const app = {
    id: 1,
    name: "App One",
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's ...",
    img: applicationImg1,
    github: "https://github.com/my-name/repo...",
    skills: ["UI/UX Design", "Mobile App", "Mobile App", "Github repo"],
  };

  const openModal = () => {
    setIsOpen(true);
  };

  const afterOpenModal = () => {
    // references are now sync'd and can be accessed.
    subtitle.style.color = "#f00";
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  return (
    <>
      <Modal
        style={{
          width: "1440px",
          height: "460px",
          backgroundColor: "#fff",
        }}
        title="Toritube App"
        open={modalIsOpen}
        onOk={closeModal}
        onCancel={closeModal}
      >
        <div className="modal-header">
          <div>x</div>
        </div>
      </Modal>
    </>
  );
};

export default ApplicationDetailModal;
