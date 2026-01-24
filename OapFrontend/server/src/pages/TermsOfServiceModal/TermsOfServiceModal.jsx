import React, { useState, useEffect } from "react";
import XIcon from "@assets/x-icon.svg";
import WhiteCheckIcon from "@assets/white-check-circle-outline.svg";
import "./TermsOfServiceModal.css";

const TermsOfServiceModal = ({ modalOpenState, onClose }) => {
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

  return (
    <div className="terms-of-service-modal-overlay" onClick={onClose}>
      <div className="terms-of-service-modal terms-of-service-row terms-of-service-gap-medium" onClick={(e) => e.stopPropagation()}>
        <div className="terms-of-service-row terms-of-service-gap-small">
          <div className="terms-of-service-modal-header">
            <h2>Terms of Service</h2>
            <div className="terms-of-service-modal-x-icon" onClick={onClose}>
              <img src={XIcon}/>
            </div>
          </div>
          <div>
            <p className="terms-of-service-text-medium">
              By accessing or using Open App Partners, you agree to these 
              Terms of Services. If you do not agree, please do not use the platform.
            </p>
          </div>
        </div>
        <div className="terms-of-service-row terms-of-service-gap-large">
          <div className="terms-of-service-row terms-of-service-gap-small">
            <div className="terms-of-service-row terms-of-service-gap-tiny">
              <h4 className="terms-of-service-text-large">1. Platform Overview</h4>
              <p className="terms-of-service-text-small">Open App Partners is a marketplace that allows users to:</p>
            </div>
            <div>
              <ul className="terms-of-service-row-unordered-left-padded-list">
                <li className="terms-of-service-text-small">Upload, publish, and manage applications</li>
                <li className="terms-of-service-text-small">Buy and download applications</li>
                <li className="terms-of-service-text-small">Promote apps using boost features</li>
                <li className="terms-of-service-text-small">Access blogs, content, and resources</li>
              </ul>
            </div>
          </div>
          <div className="terms-of-service-row terms-of-service-gap-small">
            <h4 className="terms-of-service-text-large">2. User Accounts</h4>
            <div>
              <ul className="terms-of-service-row-unordered-left-padded-list">
                <li className="terms-of-service-text-small">You must provide accurate and complete information</li>
                <li className="terms-of-service-text-small">You are responsible for maintaining account security</li>
                <li className="terms-of-service-text-small">You must not share your login credentials</li>
                <li className="terms-of-service-text-small">We reserve the right to suspend or terminate accounts for misuse</li>
              </ul>
            </div>            
          </div>
          <div className="terms-of-service-row terms-of-service-gap-small">
            <div className="terms-of-service-row terms-of-service-gap-tiny">
              <h4 className="terms-of-service-text-large">3. Applications & Content</h4>
              <p className="terms-of-service-text-small">By uploading content, you confirm that:</p>
            </div>
            <div>
              <ul className="terms-of-service-row-unordered-left-padded-list">
                <li className="terms-of-service-text-small">You own the rights or have permission to distribute the content</li>
                <li className="terms-of-service-text-small">Your content does not violate laws or third-party rights</li>
                <li className="terms-of-service-text-small">Promote apps using boost features</li>
                <li className="terms-of-service-text-small">GitHub repositories linked are valid and lawful</li>
              </ul>
            </div>
            <div>
              <p className="terms-of-service-text-small">We reserve the right to:</p>
            </div>
            <div>
              <ul className="terms-of-service-row-unordered-left-padded-list">
                <li className="terms-of-service-text-small">Review, modify, or remove content</li>
                <li className="terms-of-service-text-small">Suspend applications under review or dispute</li>
              </ul>
            </div>            
          </div>
          <div className="terms-of-service-row terms-of-service-gap-small">
            <h4 className="terms-of-service-text-large">4. Purchases, Payments & Refunds</h4>
            <div>
              <ul className="terms-of-service-row-unordered-left-padded-list">
                <li className="terms-of-service-text-small">Refunds and disputes are handled according to platform rules</li>
                <li className="terms-of-service-text-small">Earnings and withdrawals are subject to verification and clearance periods</li>
                <li className="terms-of-service-text-small">Platform fees may apply</li>
              </ul>
            </div>             
          </div> 
          <div className="terms-of-service-row terms-of-service-gap-small">
            <h4 className="terms-of-service-text-large">5. Promotions & Analytics</h4>
            <div>
              <ul className="terms-of-service-row-unordered-left-padded-list">
                <li className="terms-of-service-text-small">Boosted promotions are optional and budget-controlled</li>
                <li className="terms-of-service-text-small">Analytics data is provided for informational purposes only</li>
                <li className="terms-of-service-text-small">Results may vary based on market conditions</li>
              </ul>
            </div>             
          </div>
          <div className="terms-of-service-row terms-of-service-gap-small">
            <h4 className="terms-of-service-text-large">6. Intellectual Property</h4>
            <div>
              <ul className="terms-of-service-row-unordered-left-padded-list">
                <li className="terms-of-service-text-small">Platform design, branding, and content belong to Open App Partners</li>
                <li className="terms-of-service-text-small">Application ownership remains with the original creator unless transferred</li>
                <li className="terms-of-service-text-small">Users may not copy or misuse platform assets</li>
              </ul>
            </div>             
          </div>
          <div className="terms-of-service-row terms-of-service-gap-small">
            <div className="terms-of-service-row terms-of-service-gap-tiny">
              <h4 className="terms-of-service-text-large">7. Prohibited Activities</h4>
              <p className="terms-of-service-text-small">You agree not to:</p>
            </div>
            <div>
              <ul className="terms-of-service-row-unordered-left-padded-list">
                <li className="terms-of-service-text-small">Upload malicious or harmful content</li>
                <li className="terms-of-service-text-small">Misuse payment systems</li>
                <li className="terms-of-service-text-small">Violate intellectual property rights</li>
                <li className="terms-of-service-text-small">Attempt unauthorized access or data extraction</li>
              </ul>              
            </div>
          </div>
          <div className="terms-of-service-row terms-of-service-gap-small">
            <h4 className="terms-of-service-text-large">8. Disclaimer & Limitation of Liability</h4>
            <div>
              <ul className="terms-of-service-row-unordered-left-padded-list">
                <li className="terms-of-service-text-small">The platform is provided “as is”</li>
                <li className="terms-of-service-text-small">We do not guarantee uninterrupted availability</li>
                <li className="terms-of-service-text-small">We are not responsible for third-party content or external links</li>
                <li className="terms-of-service-text-small">Use of applications is at your own risk</li>
              </ul>             
            </div>             
          </div>
          <div className="terms-of-service-row terms-of-service-gap-small">
            <div className="terms-of-service-row terms-of-service-gap-tiny">
              <h4 className="terms-of-service-text-large">9. Termination</h4>
              <p className="terms-of-service-text-small">We may suspend or terminate access:</p>
            </div>
            <div>
              <ul className="terms-of-service-row-unordered-left-padded-list">
                <li className="terms-of-service-text-small">For violations of these terms</li>
                <li className="terms-of-service-text-small">For security or legal reasons</li>
                <li className="terms-of-service-text-small">Without prior notice if necessary</li>
              </ul>
            </div>
          </div>
          <div>
            <div className="terms-of-service-row terms-of-service-gap-tiny">
              <h4 className="terms-of-service-text-large">10. Changes to Terms</h4>
              <p className="terms-of-service-text-small">We may update these Terms at any time. Continued use of the platform means you accept the updated terms.</p>
            </div>
          </div>
          <div className="terms-of-service-row terms-of-service-gap-small">
            <div className="terms-of-service-row terms-of-service-gap-tiny">
              <h4 className="terms-of-service-text-large">11. Contact Information</h4>
              <p className="terms-of-service-text-small">For questions regarding these Terms:</p>
            </div>
            <div>
              <p className="terms-of-service-text-small">
                Email:{' '}
                <a
                target="_blank"
                  href="mailto:openapppartners@gmail.com"
                  className="terms-of-service-email"
                >
                  openapppartners@gmail.com
                </a>
              </p>
            </div>
          </div>                                                                    
        </div>
      </div>
    </div>
  );
};

export default TermsOfServiceModal;
