import React, { useState } from 'react';
import { Download, Droplets, Server, FileText } from 'lucide-react';

const PDFDownloadButton = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('Sangli');
  const [reportType, setReportType] = useState('flowmeter');
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    if (!startDate || !endDate) {
      alert('कृपया सुरुवातीची व शेवटची तारीख निवडा');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert('सुरुवातीची तारीख शेवटच्या तारखेपूर्वी असली पाहिजे');
      return;
    }

    const baseUrl =
      reportType === 'flowmeter'
        ? `http://localhost:5000/download/data-range?start=${startDate}&end=${endDate}&location=${location}`
        : `http://localhost:5000/download/swf-range?start=${startDate}&end=${endDate}`;

    setIsLoading(true);
    
    try {
      const response = await fetch(baseUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${location}-${reportType}-report-${startDate}-to-${endDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Download error:', error);
      
      try {
        const link = document.createElement('a');
        link.href = baseUrl;
        link.target = '_blank';
        link.download = `${location}-${reportType}-report-${startDate}-to-${endDate}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (fallbackError) {
        console.error('Fallback download error:', fallbackError);
        alert('PDF डाउनलोड करण्यात अडचण आली. कृपया server चालू असल्याची खात्री करा.');
      }
    } finally {
      setTimeout(() => setIsLoading(false), 1000);
    }
  };

  const styles = {
    container: {
      maxWidth: '500px',
      margin: '20px auto',
      padding: '20px',
      backgroundColor: '#fafafa',
      borderRadius: '10px',
      border: '1px solid #e0e0e0',
      fontFamily: 'Arial, sans-serif',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    },
    
    title: {
      textAlign: 'center',
      color: '#333',
      marginBottom: '20px',
      fontSize: '18px',
      fontWeight: '600'
    },
    
    tabContainer: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px',
      justifyContent: 'center'
    },
    
    tab: {
      padding: '10px 20px',
      border: '2px solid #ddd',
      borderRadius: '6px',
      backgroundColor: '#fff',
      cursor: 'pointer',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      transition: 'all 0.2s'
    },
    
    activeTab: {
      backgroundColor: '#e8f4f8',
      borderColor: '#4a90e2',
      color: '#2c5282'
    },
    
    dateSection: {
      marginBottom: '20px'
    },
    
    dateRow: {
      display: 'flex',
      gap: '15px',
      marginBottom: '15px'
    },
    
    dateGroup: {
      flex: 1
    },
    
    label: {
      display: 'block',
      marginBottom: '5px',
      fontSize: '14px',
      color: '#555',
      fontWeight: '500'
    },
    
    input: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '5px',
      fontSize: '14px',
      backgroundColor: '#fff'
    },
    
    locationSection: {
      marginBottom: '20px'
    },
    
    locationGrid: {
      display: 'flex',
      gap: '10px',
      marginTop: '10px'
    },
    
    locationButton: {
      flex: 1,
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '5px',
      backgroundColor: '#fff',
      cursor: 'pointer',
      fontSize: '13px',
      textAlign: 'center',
      transition: 'all 0.2s'
    },
    
    activeLocation: {
      backgroundColor: '#e8f4f8',
      borderColor: '#4a90e2',
      color: '#2c5282'
    },
    
    downloadButton: {
      width: '100%',
      padding: '15px',
      backgroundColor: isLoading ? '#ccc' : '#4a90e2',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '500',
      cursor: isLoading ? 'not-allowed' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      transition: 'background-color 0.2s'
    },
    
    downloadButtonHover: {
      backgroundColor: '#357abd'
    },
    
    infoBox: {
      marginTop: '15px',
      padding: '12px',
      backgroundColor: '#f0f8ff',
      border: '1px solid #b8d4f0',
      borderRadius: '5px',
      fontSize: '13px',
      color: '#2c5282'
    },
    
    infoHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      marginBottom: '5px',
      fontWeight: '500'
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📊 Smart Irrigation Report</h2>
      
      {/* Report Type Selection */}
      <div style={styles.tabContainer}>
        <button
          onClick={() => setReportType('flowmeter')}
          style={{
            ...styles.tab,
            ...(reportType === 'flowmeter' ? styles.activeTab : {})
          }}
        >
          <Droplets size={16} />
          Flowmeter
        </button>
        <button
          onClick={() => setReportType('swf')}
          style={{
            ...styles.tab,
            ...(reportType === 'swf' ? styles.activeTab : {})
          }}
        >
          <Server size={16} />
          SWF
        </button>
      </div>

      {/* Date Selection */}
      <div style={styles.dateSection}>
        <div style={styles.dateRow}>
          <div style={styles.dateGroup}>
            <label style={styles.label}>सुरुवातीची तारीख</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.dateGroup}>
            <label style={styles.label}>शेवटची तारीख</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={styles.input}
            />
          </div>
        </div>
      </div>

      {/* Location Selection - Only for Flowmeter */}
      {reportType === 'flowmeter' && (
        <div style={styles.locationSection}>
          <label style={styles.label}>स्थान निवडा</label>
          <div style={styles.locationGrid}>
            {['Sangli', 'Sangola', 'Atapadi'].map((loc) => (
              <button
                key={loc}
                onClick={() => setLocation(loc)}
                style={{
                  ...styles.locationButton,
                  ...(location === loc ? styles.activeLocation : {})
                }}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Download Button */}
      <button
        onClick={handleDownload}
        disabled={isLoading}
        style={styles.downloadButton}
      >
        <Download size={18} />
        {isLoading ? 'PDF तयार होत आहे...' : 'PDF Report Download करा'}
      </button>

      {/* Info Box */}
      <div style={styles.infoBox}>
        <div style={styles.infoHeader}>
          <FileText size={14} />
          Report माहिती
        </div>
        <div>
          {reportType === 'flowmeter' 
            ? `${location} स्थानाचा Water Flow Monitoring Report तयार केला जाईल`
            : 'SWF System Data Report तयार केला जाईल'
          }
        </div>
        {startDate && endDate && (
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
            <strong>Period:</strong> {startDate} to {endDate}
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFDownloadButton;