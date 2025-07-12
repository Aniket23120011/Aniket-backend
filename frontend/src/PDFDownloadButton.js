// // src/components/PDFDownloadButton.js
// import React, { useState } from 'react';

// const PDFDownloadButton = () => {
//   const [startDate, setStartDate] = useState('');
//   const [endDate, setEndDate] = useState('');

//   const handleDownload = () => {
//     if (!startDate || !endDate) {
//       alert('Please select both start and end dates');
//       return;
//     }

//   const url = `${process.env.REACT_APP_BACKEND_URL}/download/data-range?start=${startDate}&end=${endDate}`;

// window.open(url, '_blank');

//   };

//   return (
//     <div style={{ padding: '16px', fontFamily: 'Arial' }}>
//       <h3>📄 Download PDF Report</h3>
//       <div style={{ marginBottom: '8px' }}>
//         <label>Start Date:&nbsp;</label>
//         <input
//           type="date"
//           value={startDate}
//           onChange={e => setStartDate(e.target.value)}
//         />
//       </div>
//       <div style={{ marginBottom: '8px' }}>
//         <label>End Date:&nbsp;&nbsp;&nbsp;&nbsp;</label>
//         <input
//           type="date"
//           value={endDate}
//           onChange={e => setEndDate(e.target.value)}
//         />
//       </div>
//       <button onClick={handleDownload} style={{ padding: '8px 16px' }}>
//         Download PDF
//       </button>
//     </div>
//   );
// };

// export default PDFDownloadButton;
import React, { useState } from 'react';

const PDFDownloadButton = () => {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    location: 'Sangli' // Default location
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const locations = [
    { value: 'Sangli', label: 'Sangli' },
    { value: 'Sangola', label: 'Sangola' },
    { value: 'Atapadi', label: 'Atapadi' }
  ];

  const handleDownload = () => {
    setError(null);
    
    // Validation
    if (!formData.startDate || !formData.endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setError('Start date must be before end date');
      return;
    }

    setIsLoading(true);
    
    try {
      const params = new URLSearchParams({
        start: formData.startDate,
        end: formData.endDate,
        location: formData.location
      });

      const url = `${process.env.REACT_APP_BACKEND_URL}/download/data-range?${params.toString()}`;
      window.open(url, '_blank');
    } catch (err) {
      setError('Failed to generate PDF');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div style={{ 
      padding: '16px', 
      fontFamily: 'Arial',
      maxWidth: '400px',
      margin: '0 auto'
    }}>
      <h3>📄 Download PDF Report</h3>
      
      {error && (
        <div style={{ 
          color: 'red', 
          marginBottom: '10px',
          padding: '8px',
          backgroundColor: '#ffebee',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '12px' }}>
        <label>Location: </label>
        <select
          name="location"
          value={formData.location}
          onChange={handleChange}
          style={{ padding: '6px' }}
        >
          {locations.map(loc => (
            <option key={loc.value} value={loc.value}>
              {loc.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label>Start Date: </label>
        <input
          type="date"
          name="startDate"
          value={formData.startDate}
          onChange={handleChange}
          style={{ padding: '6px' }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label>End Date: </label>
        <input
          type="date"
          name="endDate"
          value={formData.endDate}
          onChange={handleChange}
          style={{ padding: '6px', marginLeft: '4px' }}
        />
      </div>

      <button 
        onClick={handleDownload} 
        disabled={isLoading}
        style={{ 
          padding: '8px 16px',
          backgroundColor: isLoading ? '#cccccc' : '#2C3E50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        {isLoading ? 'Generating PDF...' : 'Download PDF'}
      </button>
    </div>
  );
};

export default PDFDownloadButton;