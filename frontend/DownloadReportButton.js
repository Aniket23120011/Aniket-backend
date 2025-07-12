import React from 'react';

const DownloadReportButton = () => {
  const handleDownload = async () => {
    const start = '2025-07-01'; // you can make this dynamic
    const end = '2025-07-09';

    try {
      const response = await fetch(`http://localhost:5000/download/data-range?start=${start}&end=${end}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Open the PDF in a new tab
      window.open(url, '_blank');

    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to generate report.');
    }
  };

  return (
    <button onClick={handleDownload}>
      📄 Download PDF Report
    </button>
  );
};

export default DownloadReportButton;
