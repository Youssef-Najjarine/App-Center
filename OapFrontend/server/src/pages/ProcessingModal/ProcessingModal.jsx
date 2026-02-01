import React, { useState, useEffect } from "react";
import ProcessingSpinner from "@assets/processing-spinner.png";
import "./ProcessingModal.css";

const ProcessingModal = () => {
    const [dots, setDots] = useState("");
    useEffect(() => {
    const interval = setInterval(() => {
        setDots(prev => (prev.length < 3 ? prev + "." : ""));
    }, 400);

    return () => clearInterval(interval);
    }, []);
    return (
    <div className="processing-spinner-modal-overlay">
        <div className="processing-spinner-modal">
        <img
            src={ProcessingSpinner}
            alt="Processing Spinner"
            className="processing-spinner-modal-image"
        />
        <h2 className="processing-spinner-modal-text">Processing{dots}</h2>
        </div>
    </div>
    );
};

export default ProcessingModal;
