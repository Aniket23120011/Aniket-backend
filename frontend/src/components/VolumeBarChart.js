

import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title);

// Correct location-wise device mapping
const deviceGroups = {
  सांगोला: [1, 2, 3, 4, 5],
  आटपाडी: [6, 7, 8, 9, 10],
  सांगली: [11, 12, 13, 14, 15],
};

// Reverse map for quick lookup
const getLocationByDeviceId = (deviceId) => {
  for (const [loc, ids] of Object.entries(deviceGroups)) {
    if (ids.includes(deviceId)) return loc;
  }
  return null;
};

export default function VolumeBarChart() {
  const [flowData, setFlowData] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  useEffect(() => {
   fetch('https://aniket-backend.onrender.com/flow-data')

      .then(res => res.json())
      .then(data => {
        if (data.points) setFlowData(data.points);
      })
      .catch(err => console.error('❌ Error fetching flow data:', err));
  }, []);

  // Reset device if location changes
  useEffect(() => {
    setSelectedDeviceId(null);
  }, [selectedLocation]);

  // --- Case 1: No location selected → show avg flow per location
  if (!selectedLocation) {
    const avgFlowByLocation = Object.keys(deviceGroups).map(location => {
      const deviceIds = deviceGroups[location];
      const points = flowData.filter(p => deviceIds.includes(p.deviceId));
      const avg =
        points.length > 0
          ? points.reduce((sum, p) => sum + p.y, 0) / points.length
          : 0;
      return { location, avg: parseFloat(avg.toFixed(2)) };
    });

    const chartData = {
      labels: avgFlowByLocation.map(d => d.location),
      datasets: [
        {
          label: 'ठिकाणानुसार सरासरी विसर्ग (cumec)',
          data: avgFlowByLocation.map(d => d.avg),
          backgroundColor: '#3b82f6',
          borderRadius: 6,
          barThickness: 40,
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'प्रत्येक ठिकाणाचा सरासरी विसर्ग (cumec)',
          font: { size: 20 },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'विसर्ग (cumec)' },
        },
        x: {
          title: { display: true, text: 'ठिकाण' },
        },
      },
      onClick: (e, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const location = avgFlowByLocation[index].location;
          setSelectedLocation(location);
        }
      },
    };

    return (
      <div style={{ maxWidth: 900, margin: 'auto', padding: 24 }}>
        <h2 style={{ textAlign: 'center', color: '#1e3a8a' }}>
          ठिकाणानुसार सरासरी विसर्ग
        </h2>
        <Bar data={chartData} options={chartOptions} />
      </div>
    );
  }

  // --- Case 2: Location is selected → show device-level view
  const locationDeviceIds = deviceGroups[selectedLocation] || [];

  const filteredPoints = flowData.filter(p =>
    locationDeviceIds.includes(p.deviceId)
  );

  const deviceFilteredPoints = selectedDeviceId
    ? filteredPoints.filter(p => p.deviceId === selectedDeviceId)
    : filteredPoints;

  const chartData = {
    labels: deviceFilteredPoints.map(p =>
      new Date(p.x).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    ),
    datasets: [
      {
        label: selectedDeviceId
          ? `डिव्हाइस ${selectedDeviceId} - विसर्ग (cumec)`
          : `${selectedLocation} - सर्व डिव्हाइसेसचा विसर्ग`,
        data: deviceFilteredPoints.map(p => p.y),
        backgroundColor: '#2563eb',
        borderRadius: 6,
        barThickness: 24,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: true },
      title: {
        display: true,
        text: selectedDeviceId
          ? `डिव्हाइस ${selectedDeviceId} साठी सध्याचा विसर्ग`
          : `${selectedLocation} येथील सर्व डिव्हाइसेसचा सध्याचा विसर्ग`,
        font: { size: 20 },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'विसर्ग (LPS)' },
      },
      x: {
        title: { display: true, text: 'वेळ' },
      },
    },
  };

  return (
    <div style={{ maxWidth: 900, margin: 'auto', padding: 24 }}>
      <h2 style={{ textAlign: 'center', color: '#1e3a8a', marginBottom: 16 }}>
        {selectedLocation} - विसर्ग तपशील
      </h2>

      {/* Device Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
        <button
          onClick={() => setSelectedDeviceId(null)}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            background: selectedDeviceId === null ? '#1e40af' : '#f1f5f9',
            color: selectedDeviceId === null ? '#ffffff' : '#1e3a8a',
            border: 'none',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          सर्व डिव्हाइसेस
        </button>
        {locationDeviceIds.map(deviceId => (
          <button
            key={deviceId}
            onClick={() => setSelectedDeviceId(deviceId)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              background: selectedDeviceId === deviceId ? '#1e40af' : '#f1f5f9',
              color: selectedDeviceId === deviceId ? '#ffffff' : '#1e3a8a',
              border: 'none',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            डिव्हाइस {deviceId}
          </button>
        ))}
      </div>

      {/* Back to main chart */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <button
          onClick={() => setSelectedLocation(null)}
          style={{
            background: '#e11d48',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 6,
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          ⬅ परत ठिकाण निवडीकडे
        </button>
      </div>

      <Bar data={chartData} options={chartOptions} />
    </div>
  );
}
