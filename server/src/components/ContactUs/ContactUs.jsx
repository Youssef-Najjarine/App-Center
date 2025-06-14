// ContactUs.jsx
import React from 'react';
import './ContactUs.css';

const ContactUs = () => {
  return (
    <section className="contact-section">
      <div className='contact-headline-icon-div'>
        <h2 className="contact-headline">Keep in Touch</h2>
        <span className="contact-icon"><i className="fa-solid fa-phone"></i></span>
      </div>
      <div className='contact-description-div'>
        <p className="contact-description">
          Get in touch with us for support, inquiries, or feedback. We're here to help!
        </p>
      </div>
      <div className="contact-info">
        <div className="contact-item">
          <div>
            <span className="icon"><i className="fa-solid fa-location-dot"></i></span>
          </div>
          <p>Seattle, WA 98154</p>
        </div>
        <div className="contact-item">
          <div>
            <span className="icon"><i className="fa-solid fa-phone"></i></span>
          </div>
          <p>(206) 735 - 2580</p>
        </div>
        <div className="contact-item">
          <div>
            <span className="icon"><i className="fa-solid fa-envelope"></i></span>
          </div>
          <p>openapppartners@gmail.com</p>
        </div>
      </div>
    </section>
  );
};

export default ContactUs;
