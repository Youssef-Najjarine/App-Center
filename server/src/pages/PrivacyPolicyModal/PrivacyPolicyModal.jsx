import React, { useState, useEffect } from "react";
import XIcon from "@assets/x-icon.svg";
import WhiteCheckIcon from "@assets/white-check-circle-outline.svg";
import "./PrivacyPolicyModal.css";

const PrivacyPolicyModal = ({ modalOpenState, onClose }) => {
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
    <div className="privacy-policy-modal-overlay" onClick={onClose}>
      <div className="privacy-policy-modal privacy-policy-row privacy-policy-gap-medium" onClick={(e) => e.stopPropagation()}>
        <div className="privacy-policy-row privacy-policy-gap-small">
          <div className="privacy-policy-modal-header">
            <h2>Privacy Policy</h2>
            <div className="privacy-policy-modal-x-icon" onClick={onClose}>
              <img src={XIcon}/>
            </div>
          </div>
          <div>
            <p className="privacy-policy-sub-header-text-medium">
                At Open App Partners, your privacy is important to us. This Privacy Policy explains how 
                we collect, use, store, and protect your information when you use our platform, services, 
                and applications.
            </p>
          </div>
        </div>
        <div className="privacy-policy-row privacy-policy-gap-large">
          <div className="privacy-policy-row privacy-policy-gap-small">
            <div className="privacy-policy-row privacy-policy-gap-tiny">
              <h4 className="privacy-policy-text-large">1. Information We Collect</h4>
              <p className="privacy-policy-text-small">We may collect the following types of information:</p>
            </div>
            <div className="privacy-policy-row privacy-policy-gap-tiny">
              <h4 className="privacy-policy-text-medium privacy-policy-left-padded-list">Personal Information</h4>
              <ul className="privacy-policy-row-unordered-left-padded-list">
                <li className="privacy-policy-text-small">Full name</li>
                <li className="privacy-policy-text-small">Username</li>
                <li className="privacy-policy-text-small">Email address</li>
                <li className="privacy-policy-text-small">Profile photo</li>
                <li className="privacy-policy-text-small">Account credentials (encrypted)</li>
                <li className="privacy-policy-text-small">Payment-related details (processed securely by third-party providers)</li>
              </ul>
            </div>
            <div className="privacy-policy-row privacy-policy-gap-tiny">
              <h4 className="privacy-policy-text-medium privacy-policy-left-padded-list">Account & Usage Data</h4>
              <ul className="privacy-policy-row-unordered-left-padded-list">
                <li className="privacy-policy-text-small">Login activity and timestamps</li>
                <li className="privacy-policy-text-small">Uploaded applications and related metadata</li>
                <li className="privacy-policy-text-small">Purchases, downloads, earnings, and transaction history</li>
                <li className="privacy-policy-text-small">App interactions, impressions, and analytics data</li>
              </ul>    
            </div>
            <div className="privacy-policy-row privacy-policy-gap-tiny">
              <h4 className="privacy-policy-text-medium privacy-policy-left-padded-list">Technical Information</h4>
              <ul className="privacy-policy-row-unordered-left-padded-list">
                <li className="privacy-policy-text-small">IP address</li>
                <li className="privacy-policy-text-small">Device and browser information</li>
                <li className="privacy-policy-text-small">Cookies and similar tracking technologies</li>
                <li className="privacy-policy-text-small">Security verification data (e.g., reCAPTCHA)</li>
              </ul>
            </div>                        
          </div>
          <div className="privacy-policy-row privacy-policy-gap-small">
            <div className="privacy-policy-row privacy-policy-gap-tiny">
              <h4 className="privacy-policy-text-large">2. How We Use Your Information</h4>
              <p className="privacy-policy-text-small">We use your information to:</p>
            </div>
            <div>
              <ul className="privacy-policy-row-unordered-left-padded-list">
                <li className="privacy-policy-text-small">Create and manage user accounts</li>
                <li className="privacy-policy-text-small">Enable buying, selling, and downloading applications</li>
                <li className="privacy-policy-text-small">Process payments, payouts, and refunds</li>
                <li className="privacy-policy-text-small">Improve platform performance and user experience</li>
                <li className="privacy-policy-text-small">Display analytics and promotional insights</li>
                <li className="privacy-policy-text-small">Communicate important updates and notifications</li>
                <li className="privacy-policy-text-small">Ensure platform security and prevent misuse</li>
              </ul>              
            </div>
          </div>
          <div className="privacy-policy-row privacy-policy-gap-small">
            <div className="privacy-policy-row privacy-policy-gap-tiny">
              <h4 className="privacy-policy-text-large">3. Payments & Financial Data</h4>
              <p className="privacy-policy-text-small">All payments are processed through trusted third-party payment providers such as PayPal, Stripe, Payoneer, Wise, or card processors.</p>
            </div>
            <div>
              <ul className="privacy-policy-row-unordered-left-padded-list">
                <li className="privacy-policy-text-small">We do not store full card details</li>
                <li className="privacy-policy-text-small">Payment providers handle sensitive financial data securely</li>
                <li className="privacy-policy-text-small">Transaction records are stored for reporting and compliance purposes</li>
              </ul>                      
            </div>
          </div>
          <div className="privacy-policy-row privacy-policy-gap-small">
            <div className="privacy-policy-row privacy-policy-gap-tiny">
              <h4 className="privacy-policy-text-large">4. Third-Party Services</h4>
              <p className="privacy-policy-text-small">Our platform may include links to third-party services such as GitHub or payment providers.</p>
            </div>
            <div>
              <ul className="privacy-policy-row-unordered-left-padded-list">
                <li className="privacy-policy-text-small">We are not responsible for third-party privacy practices</li>
                <li className="privacy-policy-text-small">Any data shared with third parties is governed by their own policies</li>
              </ul>                             
            </div>
          </div>
          <div className="privacy-policy-row privacy-policy-gap-small">
            <div className="privacy-policy-row privacy-policy-gap-tiny">
              <h4 className="privacy-policy-text-large">5. Cookies & Analytics</h4>
              <p className="privacy-policy-text-small">We use cookies and analytics tools to:</p>
            </div>
            <div>
                <ul className="privacy-policy-row-unordered-left-padded-list">
                    <li className="privacy-policy-text-small">Understand user behavior</li>
                    <li className="privacy-policy-text-small">Improve performance and usability</li>
                    <li className="privacy-policy-text-small">Personalize content and recommendations</li>
                </ul>
            </div>
            <div>
                <p className="privacy-policy-text-small">You can manage cookies through your browser settings.</p>
            </div>                       
          </div>
          <div className="privacy-policy-row privacy-policy-gap-small">
            <div className="privacy-policy-row privacy-policy-gap-tiny">
              <h4 className="privacy-policy-text-large">6. Data Security</h4>
              <p className="privacy-policy-text-small">We apply appropriate technical and organizational measures to protect your data, including:</p>
            </div>
            <div>
                <ul className="privacy-policy-row-unordered-left-padded-list">
                    <li className="privacy-policy-text-small">Encrypted passwords</li>
                    <li className="privacy-policy-text-small">Access controls</li>
                    <li className="privacy-policy-text-small">Regular monitoring for unauthorized activity</li>
                </ul>             
            </div>                      
          </div>
          <div className="privacy-policy-row privacy-policy-gap-small">
            <div className="privacy-policy-row privacy-policy-gap-tiny">
              <h4 className="privacy-policy-text-large">7. Your Rights</h4>
              <p className="privacy-policy-text-small">You have the right to:</p>
            </div>
            <div>
                <ul className="privacy-policy-row-unordered-left-padded-list">
                    <li className="privacy-policy-text-small">Access or update your personal information</li>
                    <li className="privacy-policy-text-small">Request account deletion</li>
                    <li className="privacy-policy-text-small">Withdraw consent for certain data processing</li>
                    <li className="privacy-policy-text-small">Contact us regarding privacy concerns</li>
                </ul>            
            </div>                      
          </div>
          <div>
            <div className="privacy-policy-row privacy-policy-gap-tiny">
              <h4 className="privacy-policy-text-large">8. Updates to This Policy</h4>
              <p className="privacy-policy-text-small">We may update this Privacy Policy from time to time. Changes will be reflected on this page with an updated date.</p>
            </div>                     
          </div>                                                   
          <div className="privacy-policy-row privacy-policy-gap-small">
            <div className="privacy-policy-row privacy-policy-gap-tiny">
              <h4 className="privacy-policy-text-large">9. Contact Us</h4>
              <p className="privacy-policy-text-small">If you have questions about this Privacy Policy, contact us at:</p>
            </div>
            <div>
              <p className="privacy-policy-text-small">
                Email:{' '}
                <a
                target="_blank"
                  href="mailto:openapppartners@gmail.com"
                  className="privacy-policy-email"
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

export default PrivacyPolicyModal;
