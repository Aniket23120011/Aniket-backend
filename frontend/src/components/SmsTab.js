import React, { useEffect, useState } from 'react';

export default function SmsTab() {
  const [smsData, setSmsData] = useState([]);
  const [searchSms, setSearchSms] = useState('');

  const canalDeviceMap = {
    "सांगोला": ["1", "2", "3", "4", "5"],
    "आटपाडी डावा": ["6", "7", "8", "9", "10"],
    "सांगली": ["11", "12", "13", "14", "15"],
  };

  const getTodayDateString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  function parseSMS(message = '') {
  const lines = message.split('\n');
  const fields = {};

  lines.forEach(line => {
    const [keyRaw, valueRaw] = line.split(/[:\-]/);
    const key = keyRaw?.trim().toLowerCase();
    const value = valueRaw?.trim();

    if (key && value) {
      if (key.includes('device')) fields.device_id = value;
      else if (key.includes('discharge')) fields.discharge = value;
      else if (key.includes('volume')) fields.volume = value;
      else if (key.includes('level')) fields.level = value;
      else if (key.includes('location')) fields.location = value;
      else if (key.includes('latitude')) fields.latitude = value;
      else if (key.includes('longitude')) fields.longitude = value;
    }
  });

  return fields;
}


  const fetchAllSmsFromAPI = async () => {
    try {
      // console.log("Fetching from:", `${process.env.REACT_APP_BACKEND_URL}/all-sms`);
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/all-sms`);

if (!res.ok) throw new Error('API error');
const payload = await res.json();

      let list = Array.isArray(payload?.data) ? payload.data : [];
   

// ✅ Add this to attach parsed fields
list = list.map(sms => ({
  ...sms,
  parsedFields: parseSMS(sms.message)
}));


      setSmsData(list);
    } catch (err) {
      console.error('Failed to fetch SMS:', err);
    }
  };

  useEffect(() => {
    fetchAllSmsFromAPI();
    const interval = setInterval(fetchAllSmsFromAPI, 2000);
    return () => clearInterval(interval);
  }, []);

  const messagesByDevice = {};
  smsData.forEach((sms) => {
    const pf = sms.parsedFields || {};
    const deviceId = pf.device_id;
    if (!deviceId || !pf.discharge) return;

    if (!messagesByDevice[deviceId]) messagesByDevice[deviceId] = [];
    messagesByDevice[deviceId].push(sms);
  });

  const latestByDevice = {};
  Object.entries(messagesByDevice).forEach(([deviceId, messages]) => {
    const sorted = messages.sort((a, b) => new Date(a.receivedAt) - new Date(b.receivedAt));
    const n = sorted.length;

    if (n >= 2) {
      const secondLast = sorted[n - 2];
      const last = sorted[n - 1];

      const pf1 = secondLast.parsedFields || {};
      const pf2 = last.parsedFields || {};

      const discharge1 = parseFloat(pf1.discharge);
      const discharge2 = parseFloat(pf2.discharge);

      const time1 = new Date(secondLast.receivedAt).getTime();
      const time2 = new Date(last.receivedAt).getTime();

      const avgDischarge = (discharge1 + discharge2) / 2;
      const timeDiffSeconds = (time2 - time1) / 1000;

      const volume = (avgDischarge * timeDiffSeconds) / 1_000_000;

      latestByDevice[deviceId] = {
        ...last,
        calculatedVolume: volume.toFixed(6),
      };
    } else {
      latestByDevice[deviceId] = {
        ...sorted[0],
        calculatedVolume: '-',
      };
    }
  });

  // ✅ Calculate today's cumulative volume and previous day's total
  const todayStr = getTodayDateString();
  const todayVolumeByDevice = {};
  const previousDayVolumeByDevice = {};

  // Get yesterday's date string
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Sort all SMS data by device and timestamp
  const sortedSmsData = [...smsData].sort((a, b) => new Date(a.receivedAt) - new Date(b.receivedAt));

  // Group by device and calculate cumulative volumes
  Object.keys(messagesByDevice).forEach(deviceId => {
    const deviceMessages = sortedSmsData.filter(sms => 
      (sms.parsedFields || {}).device_id === deviceId
    );

    let todayVolume = 0;
    let previousDayVolume = 0;

    for (let i = 1; i < deviceMessages.length; i++) {
      const currentSms = deviceMessages[i];
      const previousSms = deviceMessages[i - 1];

      const currentPf = currentSms.parsedFields || {};
      const previousPf = previousSms.parsedFields || {};

      const currentDischarge = parseFloat(currentPf.discharge);
      const previousDischarge = parseFloat(previousPf.discharge);

      if (isNaN(currentDischarge) || isNaN(previousDischarge)) continue;

      const currentTime = new Date(currentSms.receivedAt);
      const previousTime = new Date(previousSms.receivedAt);
      const currentDateStr = currentTime.toISOString().split('T')[0];

      const timeDiffSeconds = (currentTime.getTime() - previousTime.getTime()) / 1000;
      const avgDischarge = (currentDischarge + previousDischarge) / 2;
      const volume = (avgDischarge * timeDiffSeconds) / 1_000_000; // Convert to MCM

      // Add to today's volume if the current SMS is from today
      if (currentDateStr === todayStr) {
        todayVolume += volume;
      }
      // Add to previous day's volume if the current SMS is from yesterday
      else if (currentDateStr === yesterdayStr) {
        previousDayVolume += volume;
      }
    }

    todayVolumeByDevice[deviceId] = todayVolume;
    previousDayVolumeByDevice[deviceId] = previousDayVolume;
  });

  const groupedByCanal = {};
  Object.entries(canalDeviceMap).forEach(([canal, deviceList]) => {
    groupedByCanal[canal] = deviceList
      .map((deviceId) => latestByDevice[deviceId])
      .filter(Boolean)
      .filter((sms) => {
        const pf = sms.parsedFields || {};
        return (
          pf.device_id?.toLowerCase().includes(searchSms.toLowerCase()) ||
          pf.location?.toLowerCase().includes(searchSms.toLowerCase())
        );
      });
  });

  return (
    <div className="p-4">
      <h2>📊 पाणी प्रवाह मॉनिटरिंग</h2>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="🔍 एसएमएस शोधा (ID किंवा स्थान)..."
          value={searchSms}
          onChange={(e) => setSearchSms(e.target.value)}
          style={{
            padding: '8px',
            width: '100%',
            maxWidth: 300,
            border: '1px solid #ccc',
            borderRadius: 4,
          }}
        />
      </div>

      {Object.entries(groupedByCanal).map(([canal, smsList]) => (
        <div key={canal} style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#1976d2' }}>📍 {canal}</h3>

          <table border="1" cellPadding="8" cellSpacing="0" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f0f0f0' }}>
              <tr>
                <th>उपकरण ID</th>
                <th>विसर्ग (घन.फु/से)</th>
                <th>परिमाण (द.ल.घ.फु)</th>
                <th>स्थान</th>
                <th>कालवा</th>
                <th>अंतिम अद्यतन</th>
                <th>🧮 आजचा एकूण परिमाण (द.ल.घ.फु)</th>
                <th>📦 कालचे एकूण परिमाण (द.ल.घ.फु)</th>
              </tr>
            </thead>
            <tbody>
              {smsList.length > 0 ? (
                smsList.map((sms) => {
                  const pf = sms.parsedFields || {};
                  const deviceId = pf.device_id || '-';
                  const todayVolume = todayVolumeByDevice[deviceId] || 0;
                  const previousVolume = previousDayVolumeByDevice[deviceId] || 0;

                  return (
                    <tr key={sms._id || sms.id}>
                      <td>{deviceId}</td>
                      <td>{pf.discharge || '-'}</td>
                      <td>{sms.calculatedVolume || '-'}</td>
                      <td>{pf.location || '-'}</td>
                      <td>{canal}</td>
                      <td>{sms.receivedAt ? new Date(sms.receivedAt).toLocaleString() : '-'}</td>
                      <td><b>{todayVolume.toFixed(6)} MCM</b></td>
                      <td><b>{previousVolume.toFixed(6)} MCM</b></td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8">📭 डेटा उपलब्ध नाही...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}