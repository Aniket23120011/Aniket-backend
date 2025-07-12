// src/components/PDFDownloadButton.js
import React, { useState } from 'react';

const PDFDownloadButton = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleDownload = () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

   const url = `https://aniket-backend.onrender.com/download/data-range?start=${startDate}&end=${endDate}`;
window.open(url, '_blank');

  };

  return (
    <div style={{ padding: '16px', fontFamily: 'Arial' }}>
      <h3>📄 Download PDF Report</h3>
      <div style={{ marginBottom: '8px' }}>
        <label>Start Date:&nbsp;</label>
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
        />
      </div>
      <div style={{ marginBottom: '8px' }}>
        <label>End Date:&nbsp;&nbsp;&nbsp;&nbsp;</label>
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
        />
      </div>
      <button onClick={handleDownload} style={{ padding: '8px 16px' }}>
        Download PDF
      </button>
    </div>
  );
};

export default PDFDownloadButton;
