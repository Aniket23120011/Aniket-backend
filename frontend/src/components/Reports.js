

import React, { useState } from 'react';
import { Calendar, MapPin, Download, FileText, Droplets } from 'lucide-react';

const PDFDownloadButton = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [reportType, setReportType] = useState('flowmeter'); // flowmeter or swf
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const flowmeterLocations = [
    { name: 'Sangli', bg: '#3b82f6', light: '#dbeafe', icon: '🏞️' },
    { name: 'Sangola', bg: '#10b981', light: '#d1fae5', icon: '🌾' },
    { name: 'Atapadi', bg: '#f59e0b', light: '#fef3c7', icon: '🏔️' }
  ];

  const swfLocations = [
    { name: 'Akola', bg: '#6366f1', light: '#e0e7ff', icon: '🌊' },
    { name: 'pune', bg: '#16a34a', light: '#dcfce7', icon: '🏙️' },
    { name: 'aloa', bg: '#eab308', light: '#fef9c3', icon: '🌄' }
  ];

  const currentLocations = reportType === 'flowmeter' ? flowmeterLocations : swfLocations;

  const handleDownload = () => {
    if (!startDate || !endDate || !location) {
      alert('Please select all fields');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert('Start date must be before end date');
      return;
    }

    setIsLoading(true);

    const endpoint = reportType === 'swf' ? 'swf-range' : 'data-range';
    const url = `http://localhost:5000/download/${endpoint}?start=${startDate}&end=${endDate}&location=${location}`;
    window.open(url, '_blank');

    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 50%, #f3e8ff 100%)',
      padding: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ width: '100%', maxWidth: '448px' }}>
        
        {/* Top Header */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px 16px 0 0',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          padding: '24px',
          borderBottom: '4px solid #3b82f6'
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{
              background: 'linear-gradient(to right, #3b82f6, #2563eb)',
              padding: '12px',
              borderRadius: '50%',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
              <Droplets style={{ width: '32px', height: '32px', color: 'white' }} />
            </div>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', color: '#1f2937' }}>
            Irrigation Report Generator
          </h1>
        </div>

        {/* Report Type Toggle */}
        <div style={{
          backgroundColor: 'white',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-around',
          borderBottom: '1px solid #e5e7eb'
        }}>
          {['flowmeter', 'swf'].map((type) => (
            <button
              key={type}
              onClick={() => {
                setReportType(type);
                setLocation('');
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: `2px solid ${reportType === type ? '#3b82f6' : '#e5e7eb'}`,
                backgroundColor: reportType === type ? '#dbeafe' : '#f9fafb',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {type === 'flowmeter' ? '📈 Flowmeter' : '🌊 SWF'}
            </button>
          ))}
        </div>

        {/* Date Picker & Location Card */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
          {/* Date Pickers */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>
              <Calendar size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Select Date Range
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} />
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} />
            </div>
          </div>

          {/* Location Picker */}
          <div>
            <label style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>
              <MapPin size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Select Location
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {currentLocations.map(loc => (
                <button
                  key={loc.name}
                  onClick={() => setLocation(loc.name)}
                  style={{
                    padding: '12px',
                    flex: '1 1 30%',
                    borderRadius: '10px',
                    backgroundColor: location === loc.name ? loc.light : '#f9fafb',
                    border: location === loc.name ? `2px solid ${loc.bg}` : '1px solid #e5e7eb',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '24px' }}>{loc.icon}</div>
                  <div>{loc.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer & Button */}
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '0 0 16px 16px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <button
            onClick={handleDownload}
            disabled={!startDate || !endDate || !location || isLoading}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '600',
              borderRadius: '8px',
              border: 'none',
              background: isHovered ? '#2563eb' : '#3b82f6',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            {isLoading ? 'Generating PDF...' : <><Download style={{ marginRight: '8px' }} />Download PDF</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PDFDownloadButton;
