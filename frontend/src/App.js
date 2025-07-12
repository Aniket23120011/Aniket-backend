

import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Canals from './components/Canals';
import Reports from './components/Reports';
import About from './components/About';
import SmsTab from './components/SmsTab';
import LogoHeader from './components/LogoHeader';
import SwfTab from './components/swfTab';
import FlowMap from './components/FlowMap';
import ExcelSwfTab from './components/ExcelSwfTab';
import PDFDownloadButton from './components/PDFDownloadButton'; // ✅ Added PDF Button here

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'monitoring':
        return <SmsTab />;
      case 'swf':
        return <SwfTab />;
      case 'canals':
        return <Canals />;
      case 'reports':
        return (
          <div>
      
            <PDFDownloadButton /> {/* ✅ Show PDF button in "reports" tab */}
          </div>
        );
      case 'about':
        return <About />;
      case 'map':
        return <FlowMap />;
      case 'sheetmap':
        return <ExcelSwfTab />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div>
      <LogoHeader />
      <nav className="tab-buttons">
        <button className={activeTab === 'dashboard' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('dashboard')}>
          डॅशबोर्ड
        </button>
        <button className={activeTab === 'monitoring' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('monitoring')}>
          पाणी प्रवाह मॉनिटरिंग
        </button>
        <button className={activeTab === 'swf' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('swf')}>
          S.W.F प्रवाह निरीक्षण
        </button>
        <button className={activeTab === 'canals' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('canals')}>
          कालवे
        </button>
        <button className={activeTab === 'reports' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('reports')}>
          अहवाल
        </button>
        <button className={activeTab === 'about' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('about')}>
          विभागाबद्दल
        </button>
        <button className={activeTab === 'map' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('map')}>
          नकाशा
        </button>
        <button className={activeTab === 'sheetmap' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('sheetmap')}>
          Google Sheet नकाशा
        </button>
      </nav>
      <main className="tab-content">
        {renderActiveTab()}
      </main>
    </div>
  );
}
