import React, { useState } from 'react';
import GoogleSheetMap from './GoogleSheetMap';

export default function ExcelSwfTab() {
  const [selectedPoint, setSelectedPoint] = useState(null);

  // Function to determine area based on device_id
  const getArea = (deviceId) => {
    const idNum = parseInt(deviceId?.replace(/\D/g, '')); // extract number part
    if (idNum >= 1 && idNum <= 5) return 'सांगली';
    if (idNum >= 6 && idNum <= 10) return 'सांगोला';
    if (idNum >= 11 && idNum <= 15) return 'आटपाडी';
    return 'अज्ञात'; // Unknown
  };

  return (
    <div>
      <h2 style={{ textAlign: 'center' }}>📍 Excel SWF Monitoring</h2>

      <GoogleSheetMap onSelectPoint={setSelectedPoint} />

      {selectedPoint && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', marginLeft: '1rem' }}>📊 निवडलेला फ्लोमीटर तपशील</h3>

          <table style={{
            width: '98%',
            margin: '0 auto',
            borderCollapse: 'collapse',
            border: '1px solid #ccc',
            fontFamily: 'inherit'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#0066cc', color: 'white', textAlign: 'center' }}>
                <th style={thStyle}>उपकरण ID</th>
                <th style={thStyle}>विसर्ग (क्यूसेक)</th>
                <th style={thStyle}>घनफळ</th>
                <th style={thStyle}>स्थान</th>
                <th style={thStyle}>कालवा</th>
                <th style={thStyle}>अंतिम अद्यतन</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ textAlign: 'center' }}>
                <td style={tdStyle}>{selectedPoint.device_id}</td>
                <td style={tdStyle}>{selectedPoint.discharge || 'N/A'}</td>
                <td style={tdStyle}>{selectedPoint.volume || 'N/A'}</td>
                <td style={tdStyle}>{selectedPoint.location || 'N/A'}</td>
                <td style={tdStyle}>{getArea(selectedPoint.device_id)}</td>
                <td style={tdStyle}>{selectedPoint.time || new Date().toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: '10px',
  border: '1px solid #ccc',
  fontSize: '16px'
};

const tdStyle = {
  padding: '10px',
  border: '1px solid #ccc',
  fontSize: '15px'
};
