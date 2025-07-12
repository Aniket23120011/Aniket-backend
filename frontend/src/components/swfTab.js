import React, { useEffect, useState } from 'react';

export default function SwfTab() {
  const [swfData, setSwfData] = useState([]);
  const [searchText, setSearchText] = useState('');

  const deviceMap = {
    'सांगली': ['S1'],
    'सांगोला': ['S2'],
    'आटपाडी': ['S3'],
  };

  const getTodayDateString = () => new Date().toISOString().split('T')[0];

  const fetchSWFData = async () => {
    try {
      const res = await fetch('https://aniket-backend.onrender.com/all-sms');

      if (!res.ok) throw new Error('API error');
      const payload = await res.json();
      const list = Array.isArray(payload) ? payload
                   : Array.isArray(payload.allSwf) ? payload.allSwf
                   : [];
      setSwfData(list);
    } catch (err) {
      console.error('डेटा मिळवताना त्रुटी:', err);
    }
  };

  useEffect(() => {
    fetchSWFData();
    const iv = setInterval(fetchSWFData, 3000);
    return () => clearInterval(iv);
  }, []);

  const parseMessage = (msg) => {
    const dischargeMatch = msg.match(/Discharge\s*[:\-]?\s*(\d+)/i);
    const deviceMatch    = msg.match(/Device\s*id\s*[:\-]?\s*(S[123])/i);
    const locationMatch  = msg.match(/Location\s*[:\-]?\s*([A-Za-z]+)/i);

    return {
      discharge: dischargeMatch  ? dischargeMatch[1] : '-',
      deviceId:  deviceMatch     ? deviceMatch[1]    : '-',
      location:  locationMatch   ? locationMatch[1]  : '-',
    };
  };

  const todayStr = getTodayDateString();
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const messagesByDevice = {};
  swfData.forEach((swf) => {
    const pf = parseMessage(swf.message || '');
    if (!pf.deviceId || !pf.discharge) return;

    if (!messagesByDevice[pf.deviceId]) messagesByDevice[pf.deviceId] = [];
    messagesByDevice[pf.deviceId].push({ ...swf, parsedFields: pf });
  });

  const latestByDevice = {};
  const todayVolumeByDevice = {};
  const previousDayVolumeByDevice = {};

  Object.entries(messagesByDevice).forEach(([deviceId, messages]) => {
    const sorted = messages.sort((a, b) => new Date(a.receivedAt) - new Date(b.receivedAt));
    const n = sorted.length;

    if (n >= 2) {
      const last = sorted[n - 1];
      const secondLast = sorted[n - 2];

      const d1 = parseFloat(secondLast.parsedFields.discharge);
      const d2 = parseFloat(last.parsedFields.discharge);

      const t1 = new Date(secondLast.receivedAt).getTime();
      const t2 = new Date(last.receivedAt).getTime();
      const timeDiff = (t2 - t1) / 1000;

      const volume = ((d1 + d2) / 2) * timeDiff / 1_000_000;

      latestByDevice[deviceId] = {
        ...last,
        parsedFields: last.parsedFields,
        calculatedVolume: volume.toFixed(6),
      };
    } else {
      latestByDevice[deviceId] = {
        ...sorted[0],
        parsedFields: sorted[0].parsedFields,
        calculatedVolume: '-',
      };
    }

    // Daily volume calc
    let todayVol = 0;
    let yestVol = 0;

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      const d1 = parseFloat(prev.parsedFields.discharge);
      const d2 = parseFloat(curr.parsedFields.discharge);

      if (isNaN(d1) || isNaN(d2)) continue;

      const t1 = new Date(prev.receivedAt);
      const t2 = new Date(curr.receivedAt);
      const dateStr = t2.toISOString().split('T')[0];

      const avgDis = (d1 + d2) / 2;
      const vol = (avgDis * (t2 - t1) / 1000) / 1_000_000;

      if (dateStr === todayStr) todayVol += vol;
      else if (dateStr === yesterdayStr) yestVol += vol;
    }

    todayVolumeByDevice[deviceId] = todayVol;
    previousDayVolumeByDevice[deviceId] = yestVol;
  });

  const groupedByLocation = {};
  Object.entries(deviceMap).forEach(([location, ids]) => {
    groupedByLocation[location] = ids
      .map((id) => latestByDevice[id])
      .filter(Boolean)
      .filter((entry) => {
        const pf = entry.parsedFields || {};
        return (
          pf.deviceId?.toLowerCase().includes(searchText.toLowerCase()) ||
          pf.location?.toLowerCase().includes(searchText.toLowerCase())
        );
      });
  });

  return (
    <div className="p-4">
      <h2>💧 SWF पाण्याचा डेटा</h2>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="🔍 उपकरण ID किंवा स्थान शोधा..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            padding: '8px',
            width: '100%',
            maxWidth: 300,
            border: '1px solid #ccc',
            borderRadius: 4,
          }}
        />
      </div>

      {Object.entries(groupedByLocation).map(([location, swfList]) => (
        <div key={location} style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#1976d2' }}>📍 {location}</h3>

          <table border="1" cellPadding="8" cellSpacing="0" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f0f0f0' }}>
              <tr>
                <th>उपकरण ID</th>
                <th>विसर्ग (LPS)</th>
                <th>घनफळ</th>
                <th>स्थान</th>
                <th>कालवा</th>
                <th>अंतिम अद्यतन</th>
                <th>🧮 आजचा घनफळ</th>
                <th>📦 कालचा घनफळ</th>
              </tr>
            </thead>
            <tbody>
              {swfList.length > 0 ? (
                swfList.map((swf) => {
                  const pf = swf.parsedFields || {};
                  const id = pf.deviceId || '-';
                  const todayVol = todayVolumeByDevice[id] || 0;
                  const yestVol = previousDayVolumeByDevice[id] || 0;

                  return (
                    <tr key={swf._id}>
                      <td>{id}</td>
                      <td>{pf.discharge || '-'}</td>
                      <td>{swf.calculatedVolume || '-'}</td>
                      <td>{pf.location || '-'}</td>
                      <td>{location}</td>
                      <td>{swf.receivedAt ? new Date(swf.receivedAt).toLocaleString() : '-'}</td>
                      <td><b>{todayVol.toFixed(6)} MCM</b></td>
                      <td><b>{yestVol.toFixed(6)} MCM</b></td>
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
