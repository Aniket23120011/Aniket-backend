import React from "react";
import "./LogoHeader.css";
import mhlogo from "../assets/mhlogo.png";

const LogoHeader = () => {
  return (
    <div className="logo-header">
      {/* Left Section */}
      <div className="logo-section">
        <img
          src="/krishna.png"
          alt="Krishna Valley Logo"
          className="logo-image-1"
        />
        <p className="section-title">महाराष्ट्र कृष्णा खोरे विकास महामंडळ</p>
        <div className="section-badge">
          <p>श्री.चंद्रशेखर हिम्मतराव पाटोळे
            अधीक्षक अभियंता
            सांगली पाटबंधारे मंडळ,
            सांगली</p>
        </div>
      </div>

      {/* Center Section */}
      <div className="logo-section center-section">
        <img
          src={mhlogo}
          alt="Maharashtra Logo"
          height="100"
          className="mhlogo"
          style={{
            backgroundColor: 'transparent',
            mixBlendMode: 'multiply', // or 'darken'
          }}
        />
        <h1 className="main-heading">
          महाराष्ट्र शासन <br />
          जलसंपदा विभाग <br />
          महाराष्ट्र कृष्णा खोरे विभाग महामंडळ पुणे
        </h1>
        <button className="project-button">टेंभू उपसा सिंचन प्रकल्प</button>
        <div className="dashboard-title">
          <h2 className="flow-monitoring-title">FLOW MONITORING SYSTEM</h2>
        </div>
      </div>

      {/* Right Section */}
      <div className="logo-section">
        <img
          src="/Seal.svg"
          alt="Maharashtra Seal Logo"
          className="logo-image"
        />
        <p className="section-title">जलसंपदा विभाग <br /> महाराष्ट्र शासन, भारत</p>
        <div className="section-badge">
          <p>श्री. अभिनंदन विष्णुपंत  हरुगडे
            कार्यकारी अभियंता
            लघु पाटबंधारे विभाग सांगली
          </p>
        </div>
      </div>
    </div>
  );
};

export default LogoHeader;