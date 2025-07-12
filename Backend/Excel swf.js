import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as XLSX from 'xlsx';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

export default function FlowMapFromExcel() {
  const [flowmeters, setFlowmeters] = useState([]);
  const [selectedFlowmeter, setSelectedFlowmeter] = useState(null);

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      const parsed = jsonData
        .map((row, index) => {
          const lat = parseFloat(row.latitude || row.lat);
          const lng = parseFloat(row.longitude || row.lng);
          if (!lat || !lng) return null;

          return {
            id: index,
            device_id: row.device_id || row.id || `D-${index}`,
            discharge: parseFloat(row.discharge) || 0,
            volume: parseFloat(row.volume) || 0,
            location: row.location || 'Excel डेटा',
            lat,
            lng,
            receivedAt: new Date().toISOString(),
          };
        })
        .filter(Boolean);

      setFlowmeters(parsed);
    };

    reader.readAsArrayBuffer(file);
  };

  const group1 = flowmeters.filter(fm => parseInt(fm.device_id) >= 1 && parseInt(fm.device_id) <= 5);
  const group2 = flowmeters.filter(fm => parseInt(fm.device_id) >= 6 && parseInt(fm.device_id) <= 10);
  const group3 = flowmeters.filter(fm => parseInt(fm.device_id) >= 11 && parseInt(fm.device_id) <= 15);

  const routePoints1 = group1.map(fm => [fm.lat, fm.lng]);
  const routePoints2 = group2.map(fm => [fm.lat, fm.lng]);
  const routePoints3 = group3.map(fm => [fm.lat, fm.lng]);

  return (
    <>
      {/* 📥 Upload Input */}
      <div style={{ padding: '1rem', background: '#e6f0ff' }}>
        <label><strong>📁 Excel अपलोड करा:</strong> <input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} /></label>
      </div>

      {/* 🗺️ Map */}
      <MapContainer center={[17.1, 74.3]} zoom={9} style={{ height: '70vh', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Polyline positions={routePoints1} pathOptions={{ color: 'red', weight: 4 }} />
        <Polyline positions={routePoints2} pathOptions={{ color: 'blue', weight: 4 }} />
        <Polyline positions={routePoints3} pathOptions={{ color: 'green', weight: 4 }} />

        {flowmeters.map((fm) => (
          <Marker
            key={fm.id}
            position={[fm.lat, fm.lng]}
            eventHandlers={{ click: () => setSelectedFlowmeter(fm) }}
          >
            <Popup>
              <strong>डिव्हाइस आयडी:</strong> {fm.device_id}<br />
              <strong>पाणीचा प्रवाह (लि./से.):</strong> {fm.discharge}<br />
              <strong>पाण्याचा एकूण वापर:</strong> {fm.volume}<br />
              <strong>ठिकाण:</strong> {fm.location}<br />
              <strong>वेळ:</strong> {new Date(fm.receivedAt).toLocaleString()}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* 📊 Table for selected marker */}
      {selectedFlowmeter && (
        <div style={{ padding: '1rem', background: '#f5f5f5' }}>
          <h3>📊 निवडलेला फ्लोमीटर तपशील</h3>
          <table border="1" cellPadding="8" style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr>
                <th>डिव्हाइस आयडी</th>
                <th>ठिकाण</th>
                <th>पाणीचा प्रवाह (लि./से.)</th>
                <th>पाण्याचा एकूण वापर</th>
                <th>वेळ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{selectedFlowmeter.device_id}</td>
                <td>{selectedFlowmeter.location}</td>
                <td>{selectedFlowmeter.discharge}</td>
                <td>{selectedFlowmeter.volume}</td>
                <td>{new Date(selectedFlowmeter.receivedAt).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
