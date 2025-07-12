import React, { useEffect, useState } from 'react';

// Static device details (assumed)
const deviceMeta = {
  "1": { manufacturer: "AquaTech", serial: "AT1001", location: "Sangli", installed: "2024-06-01" },
  "2": { manufacturer: "AquaTech", serial: "AT1002", location: "Sangli", installed: "2024-06-02" },
  "3": { manufacturer: "HydroFlow", serial: "HF2001", location: "Sangli", installed: "2024-06-05" },
  "4": { manufacturer: "HydroFlow", serial: "HF2002", location: "Sangli", installed: "2024-06-10" },
  "5": { manufacturer: "FlowWorks", serial: "FW3001", location: "Sangli", installed: "2024-06-15" },
  "6": { manufacturer: "AquaTech", serial: "AT1003", location: "Sangola", installed: "2024-06-01" },
  "7": { manufacturer: "AquaTech", serial: "AT1004", location: "Sangola", installed: "2024-06-03" },
  "8": { manufacturer: "HydroFlow", serial: "HF2003", location: "Sangola", installed: "2024-06-07" },
  "9": { manufacturer: "HydroFlow", serial: "HF2004", location: "Sangola", installed: "2024-06-11" },
  "10": { manufacturer: "FlowWorks", serial: "FW3002", location: "Sangola", installed: "2024-06-16" },
  "11": { manufacturer: "AquaTech", serial: "AT1005", location: "Atapadi", installed: "2024-06-01" },
  "12": { manufacturer: "AquaTech", serial: "AT1006", location: "Atapadi", installed: "2024-06-03" },
  "13": { manufacturer: "HydroFlow", serial: "HF2005", location: "Atapadi", installed: "2024-06-08" },
  "14": { manufacturer: "HydroFlow", serial: "HF2006", location: "Atapadi", installed: "2024-06-12" },
  "15": { manufacturer: "FlowWorks", serial: "FW3003", location: "Atapadi", installed: "2024-06-18" },
};

const deviceGroups = {
  Sangli: ["1", "2", "3", "4", "5"],
  Sangola: ["6", "7", "8", "9", "10"],
  Atapadi: ["11", "12", "13", "14", "15"],
};

export default function CanalTabs() {
  const [activeTab, setActiveTab] = useState('Sangli');
  const [lastSeenMap, setLastSeenMap] = useState({});

  const fetchLastSms = async () => {
    try {
      const res = await fetch('http://localhost:5000/all-sms');
      const payload = await res.json();
      const allSms = payload.data || payload.allSms || [];

      const map = {};
      for (const sms of allSms) {
        const id = sms.parsedFields?.device_id;
        const time = new Date(sms.receivedAt);
        if (!id || isNaN(time)) continue;
        if (!map[id] || new Date(map[id]) < time) {
          map[id] = time;
        }
      }
      setLastSeenMap(map);
    } catch (err) {
      console.error("❌ Error fetching SMS:", err);
    }
  };

  useEffect(() => {
    fetchLastSms(); // initial fetch
    const interval = setInterval(fetchLastSms, 2000); // ⏱️ auto-refresh every 2 sec
    return () => clearInterval(interval);
  }, []);

  const isActive = (deviceId) => {
    const lastSeen = lastSeenMap[deviceId];
    if (!lastSeen) return false;
    const diff = new Date() - new Date(lastSeen);
    return diff < 2 * 60 * 60 * 1000; // within 2 hours
  };

  return (
    <div style={{ maxWidth: 900, margin: 'auto', padding: 20 }}>
      <h2 style={{ textAlign: 'center', marginBottom: 16 }}>🚰 डिव्हाइस मॉनिटरिंग</h2>

      {/* 🔁 Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
        {Object.keys(deviceGroups).map((location) => (
          <button
            key={location}
            onClick={() => setActiveTab(location)}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === location ? '#1e40af' : '#e0e7ff',
              color: activeTab === location ? 'white' : '#1e3a8a',
              border: 'none',
              borderRadius: 6,
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: '0.3s',
            }}
          >
            {location}
          </button>
        ))}
      </div>

      {/* 📋 Device Table */}
      <table border="1" cellPadding="8" cellSpacing="0" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ backgroundColor: '#f0f0f0' }}>
          <tr>
            <th>उपकरण ID</th>
            <th>निर्माता</th>
            <th>सिरीयल क्रमांक</th>
            <th>स्थान</th>
            <th>प्रतिष्ठापन दिनांक</th>
            <th>स्थिती</th>
          </tr>
        </thead>
        <tbody>
          {deviceGroups[activeTab].map((deviceId) => {
            const meta = deviceMeta[deviceId] || {};
            const status = isActive(deviceId);
            return (
              <tr key={deviceId}>
                <td>{deviceId}</td>
                <td>{meta.manufacturer || '-'}</td>
                <td>{meta.serial || '-'}</td>
                <td>{meta.location || '-'}</td>
                <td>{meta.installed || '-'}</td>
                <td style={{ fontWeight: 'bold', color: status ? 'green' : 'red' }}>
                  {status ? '🟢 सक्रिय' : '🔴 बंद'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
