import React, { useEffect, useState } from "react";
import "./ManageBoostModal.css";
import xIcon from "../../../../assets/x-icon.svg";
import confirmSaveIcon from "../../../../assets/white-check-circle-outline.svg";

const ManageBoostModal = ({ modalOpenState, onClose, title, preview, dailyBudget, cpcCap, impressions, clicks, spent, ppc }) => {
  const [dailyBudgetState, setDailyBudgetState] = useState(dailyBudget);
const [cpcCapState, setCpcCapState] = useState(cpcCap);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [onClose, modalOpenState]);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submitted values:", {
        dailyBudget: dailyBudgetState,
        cpcCap: cpcCapState
    });
    onClose();
  };

  return (
    <div className="profile-manage-boost-modal-overlay" onClick={onClose}>
      <div className="profile-manage-boost-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-manage-boost-close-header">
          <h2>Manage Boost</h2>
          <div className="profile-manage-boost-close">
            <button onClick={onClose}>
                <img src={xIcon} alt="Close" />
            </button>
          </div>
        </div>
        <div className="profile-manage-boost-body">
          <form onSubmit={handleSubmit}>
            <div className="profile-manage-boost-part-1">
                <div className="manage-boost-preview">
                  <img src={preview} alt="App Preview" />
                </div>
                <div className="profile-manage-boost-header-budget">
                    <h3>{title}</h3>
                    <div className="profile-manage-boost-budgets">
                        <div className="boost-input-wrapper">
                            <label htmlFor="manage-boost-dailyBudget">Daily Budget</label>
                            <div className="boost-input-container">
                                <input 
                                    type="number" 
                                    id="manage-boost-dailyBudget" 
                                    name="manage-boost-dailyBudget" 
                                    placeholder="Daily Budget"
                                    value={dailyBudgetState}
                                    onChange={(e) => setDailyBudgetState(e.target.value)}
                                />
                                <span className="boost-dollar-suffix">$</span>
                            </div>
                        </div>
                        <div className="boost-input-wrapper">
                            <label htmlFor="manage-boost-cpcCap">CPC cap</label>
                            <div className="boost-input-container">
                            <input 
                                type="number" 
                                id="manage-boost-cpcCap" 
                                name="manage-boost-cpcCap"
                                placeholder="CPC cap"
                                value={cpcCapState}
                                onChange={(e) => setCpcCapState(e.target.value)}
                            />
                            <span className="boost-dollar-suffix">$</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="profile-manage-boost-part-2">
              <div className="profile-manage-boost-hint">
                  These impressions and clicks are dedicatedly from boosting profile.
              </div>
              <div className="profile-manage-boost-metrics">
                  <div>
                    <span className="profile-manage-boost-metric-label">Impressions:</span>
                    <span className="profile-manage-boost-metric-amount">{impressions}</span>
                  </div>
                  <div>
                    <span className="profile-manage-boost-metric-label">Clicks:</span>
                    <span className="profile-manage-boost-metric-amount">{clicks}</span>
                  </div>
                  <div>
                    <span className="profile-manage-boost-metric-label">Spent:</span>
                    <span className="profile-manage-boost-metric-amount">{spent}</span>
                  </div>
                  <div>
                    <span className="profile-manage-boost-metric-label">PPC:</span>
                    <span className="profile-manage-boost-metric-amount">{ppc}</span>
                  </div>
              </div>
              <div className="profile-manage-boost-save">
                <button>
                  <img src={confirmSaveIcon}/>
                  <span>Confirm Save</span>
                </button>
              </div>             
            </div>          
          </form>
        </div>
      </div>
    </div>
  );
};

export default ManageBoostModal;
