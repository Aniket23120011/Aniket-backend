import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import VolumeBarChart from './VolumeBarChart';

export default function Dashboard() {
  const totalDevices = 15;
  const [activeDevices, setActiveDevices] = useState(0);
  const [volume, setVolume] = useState(0);

  // ✅ Fetch total volume
  const fetchVolume = async () => {
    try {
      const response = await fetch('http://localhost:5000/total-volume');
      if (!response.ok) throw new Error('Failed to fetch volume');
      const data = await response.json();
      setVolume(data.totalVolume);
    } catch (err) {
      console.error('❌ Error fetching volume:', err);
    }
  };

  // ✅ Fetch SMS data & determine active devices
  const fetchActiveDevices = async () => {
    try {
      const res = await fetch('http://localhost:5000/all-sms');
      const payload = await res.json();

      const smsList = Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload.allSms)
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
    } catch (err) {
      console.error('❌ Error fetching SMS data:', err);
    }
  };

  // ✅ Initial fetch and polling
  useEffect(() => {
    fetchVolume();
    fetchActiveDevices();

    const smsInterval = setInterval(fetchActiveDevices, 2000);      // every 2 sec
    const volumeInterval = setInterval(fetchVolume, 5 * 60 * 1000); // every 5 min

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

        <VolumeBarChart />
      </main>
    </div>
  );
}

