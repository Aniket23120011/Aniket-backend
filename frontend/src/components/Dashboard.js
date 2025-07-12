import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import VolumeBarChart from './VolumeBarChart';

export default function Dashboard() {
  const totalDevices = 15;
  const [activeDevices, setActiveDevices] = useState(0);
  const [volume, setVolume] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Common fetch function with proper headers and error handling
  const fetchData = async (endpoint) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          // Add if your API requires authentication:
          // 'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // First check if the response is OK (status 200-299)
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API Error (${res.status}): ${errorText || 'Unknown error'}`);
      }

      // Verify content type is JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON');
      }

      return await res.json();
    } catch (err) {
      console.error(`Error fetching ${endpoint}:`, err);
      throw err; // Re-throw to handle in calling function
    }
  };

  // Fetch total volume
  const fetchVolume = async () => {
    try {
      const data = await fetchData('/total-volume');
      setVolume(data.totalVolume || 0);
      setError(null);
    } catch (err) {
      setError('Failed to load volume data');
    }
  };

  // Fetch SMS data & determine active devices
  const fetchActiveDevices = async () => {
    try {
      const payload = await fetchData('/all-sms');
      
      const smsList = Array.isArray(payload?.data) 
        ? payload.data 
        : Array.isArray(payload?.allSms) 
          ? payload.allSms 
          : [];

      const now = Date.now();
      const deviceLastSeen = {};

      smsList.forEach((sms) => {
        const pf = sms.parsedFields || {};
        const deviceId = pf.device_id;
        if (!deviceId || isNaN(deviceId)) return;

        const receivedTime = new Date(sms.receivedAt).getTime();
        if (!deviceLastSeen[deviceId] || receivedTime > deviceLastSeen[deviceId]) {
          deviceLastSeen[deviceId] = receivedTime;
        }
      });

      const activeCount = Object.values(deviceLastSeen).filter(
        (timestamp) => now - timestamp <= 2 * 60 * 60 * 1000 // 2 hours
      ).length;

      setActiveDevices(activeCount);
      setError(null);
    } catch (err) {
      setError('Failed to load device data');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    // Initial fetch
    const initializeData = async () => {
      await Promise.all([fetchVolume(), fetchActiveDevices()]);
    };
    initializeData();

    // Set up polling
    const smsInterval = setInterval(fetchActiveDevices, 30000);      // every 30 sec
    const volumeInterval = setInterval(fetchVolume, 5 * 60 * 1000);  // every 5 min

    return () => {
      clearInterval(smsInterval);
      clearInterval(volumeInterval);
    };
  }, []);

  return (
    <div className="dashboard-container">
      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1>जल व्यवस्थापन डॅशबोर्ड</h1>
          <p>{new Date().toLocaleString()}</p>
        </header>

        {loading ? (
          <div className="loading-message">Loading data...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <section className="dashboard-cards">
            <div className="dashboard-card">
              <h3>एकूण उपकरणे</h3>
              <p>{totalDevices}</p>
            </div>
            <div className="dashboard-card active">
              <h3>सक्रिय उपकरणे</h3>
              <p>{activeDevices}</p>
            </div>
            <div className="dashboard-card inactive">
              <h3>एकूण घनफळ</h3>
              <p>{volume} घन मीटर</p>
            </div>
          </section>
        )}

        <VolumeBarChart />
      </main>
    </div>
  );
}