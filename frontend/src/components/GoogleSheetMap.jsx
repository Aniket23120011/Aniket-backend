import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './GoogleSheetMap.css';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

function FlyToLocation({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 13, { duration: 1.2 });
    }
  }, [center, zoom]);
  return null;
}

export default function EnhancedGoogleSheetMap() {
  const [flowmeters, setFlowmeters] = useState([]);
  const [selectedFlowmeter, setSelectedFlowmeter] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [history, setHistory] = useState({});
  const [allHistoricalData, setAllHistoricalData] = useState([]);
  const [timeSliderValue, setTimeSliderValue] = useState(0);
  const [isTimeSliderActive, setIsTimeSliderActive] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeRange, setTimeRange] = useState({ min: 0, max: 0 });
  const [selectedTimeRange, setSelectedTimeRange] = useState('1day');
  const [timeBasedData, setTimeBasedData] = useState({});
  const [activeStatsTab, setActiveStatsTab] = useState('सांगली');
  const [showStatsPanel, setShowStatsPanel] = useState(true);
  const mapRef = useRef();
  const markerRefs = useRef({});
  const playbackInterval = useRef(null);

  const locationCenters = {
    'सांगली': { center: [16.8676, 74.5704], zoom: 13 },
    'सांगोला': { center: [17.4342, 75.1905], zoom: 13 },
    'आटपाडी': { center: [17.4203, 74.9375], zoom: 13 },
  };

  const locationBounds = {
    'सांगली': [[16.7, 74.3], [17.0, 74.8]],
    'सांगोला': [[17.2, 74.9], [17.7, 75.5]],
    'आटपाडी': [[17.2, 74.7], [17.7, 75.2]],
  };

  const getGroupForLocation = (location) => {
    if (!location) return flowmeters;

    return flowmeters.filter(fm => {
      const idNum = parseInt(fm.device_id.toString().replace(/\D/g, ''));
      if (location === 'सांगली') return idNum >= 1 && idNum <= 5;
      if (location === 'सांगोला') return idNum >= 6 && idNum <= 10;
      if (location === 'आटपाडी') return idNum >= 11 && idNum <= 15;
      return false;
    });
  };

  const calculateLocationStats = (location) => {
    const currentData = isTimeSliderActive ? Object.values(timeBasedData) : flowmeters;
    const locationDevices = currentData.filter(fm => {
      const deviceId = parseInt(fm.device_id.toString().replace(/\D/g, ''));
      switch (location) {
        case 'सांगली':
          return deviceId >= 1 && deviceId <= 5;
        case 'सांगोला':
          return deviceId >= 6 && deviceId <= 10;
        case 'आटपाडी':
          return deviceId >= 11 && deviceId <= 15;
        default:
          return false;
      }
    });

    const validDischarges = locationDevices
      .map(fm => parseFloat(fm.discharge))
      .filter(d => !isNaN(d) && d !== 0);
    
    const validVolumes = locationDevices
      .map(fm => parseFloat(fm.volume))
      .filter(v => !isNaN(v) && v !== 0);

    const avgDischarge = validDischarges.length > 0 
      ? (validDischarges.reduce((sum, d) => sum + d, 0) / validDischarges.length).toFixed(2)
      : '0.00';
    
    const totalVolume = validVolumes.length > 0 
      ? validVolumes.reduce((sum, v) => sum + v, 0).toFixed(2)
      : '0.00';

    return {
      avgDischarge,
      totalVolume,
      activeDevices: locationDevices.length,
      validDischarges: validDischarges.length,
      validVolumes: validVolumes.length
    };
  };

  const fetchData = () => {
    fetch('https://opensheet.elk.sh/1gXp7KngcraVZXc2T15hSTijyK2TJplWU5mDC2IZcxgE/1')
      .then(res => res.json())
      .then(data => {
        const now = new Date();
        let startDate;
        
        switch (selectedTimeRange) {
          case '1day':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '1week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '1month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case '1year':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }

        const parsed = data.map((row, index) => {
          const lat = parseFloat(row.latitude || row.Latitude || row[' latitude'] || '0');
          const lng = parseFloat(row.longitude || row.Longitude || row[' longitude'] || '0');
          if (!lat || !lng) return null;

          const device_id = row.device_id || row['DEVICE ID'] || row['device id'] || 'N/A';
          const discharge = row.discharge || row.DISCHARGE || row[' discharge'] || 'N/A';
          const volume = row.volume || row.VOLUME || row[' volume'] || 'N/A';
          const location = row.location || row.LOCATION || 'Unknown';
          const time = row.time || row.TIME || new Date().toISOString();
          
          const timestamp = new Date(time).getTime();
          if (timestamp < startDate.getTime()) return null;

          return {
            id: index,
            device_id,
            discharge,
            volume,
            location,
            lat,
            lng,
            receivedAt: time,
            timestamp,
          };
        }).filter(Boolean);

        setAllHistoricalData(parsed);

        if (parsed.length > 0) {
          const timestamps = parsed.map(p => p.timestamp);
          const minTime = Math.min(...timestamps);
          const maxTime = Math.max(...timestamps);
          setTimeRange({ min: minTime, max: maxTime });
          
          if (!isTimeSliderActive) {
            setTimeSliderValue(maxTime);
          }
        }

        setHistory(prev => {
          const updated = { ...prev };
          parsed.forEach(fm => {
            const key = fm.device_id;
            if (!updated[key]) updated[key] = [];
            const exists = updated[key].some(r => r.receivedAt === fm.receivedAt);
            if (!exists) {
              updated[key].push(fm);
              updated[key].sort((a, b) => new Date(a.receivedAt) - new Date(b.receivedAt));
            }
          });
          return updated;
        });

        const latestByDevice = Object.values(
          parsed.reduce((acc, curr) => {
            const key = curr.device_id;
            if (!acc[key] || new Date(curr.receivedAt) > new Date(acc[key].receivedAt)) {
              acc[key] = curr;
            }
            return acc;
          }, {})
        );
        setFlowmeters(latestByDevice);
      })
      .catch(err => console.error('❌ Error fetching sheet data:', err));
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [selectedTimeRange]);

  useEffect(() => {
    if (isTimeSliderActive && allHistoricalData.length > 0) {
      const dataAtTime = allHistoricalData.filter(data => data.timestamp <= timeSliderValue);
      
      const latestByDevice = dataAtTime.reduce((acc, curr) => {
        const key = curr.device_id;
        if (!acc[key] || curr.timestamp > acc[key].timestamp) {
          acc[key] = curr;
        }
        return acc;
      }, {});
      
      setTimeBasedData(latestByDevice);
    } else {
      const latestByDevice = flowmeters.reduce((acc, curr) => {
        acc[curr.device_id] = curr;
        return acc;
      }, {});
      setTimeBasedData(latestByDevice);
    }
  }, [timeSliderValue, isTimeSliderActive, allHistoricalData, flowmeters]);

  useEffect(() => {
    if (isPlaying && isTimeSliderActive) {
      playbackInterval.current = setInterval(() => {
        setTimeSliderValue(prev => {
          const step = (timeRange.max - timeRange.min) / 100;
          const next = prev + step;
          if (next >= timeRange.max) {
            setIsPlaying(false);
            return timeRange.max;
          }
          return next;
        });
      }, playbackSpeed);
    } else {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
    }

    return () => {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
    };
  }, [isPlaying, isTimeSliderActive, timeRange, playbackSpeed]);

  const handleLocationClick = (loc) => {
    setSelectedLocation(loc);
    setActiveStatsTab(loc);
    const group = getGroupForLocation(loc);

    if (group.length > 0) {
      setSelectedFlowmeter(group[0]);
    } else {
      setSelectedFlowmeter(null);
    }

    const map = mapRef.current;
    if (map) {
      const { center, zoom } = locationCenters[loc];
      const bounds = locationBounds[loc];

      map.setMaxBounds(null);
      map.flyTo([17.2, 74.9], 10, { duration: 0.6, easeLinearity: 0.1 });

      setTimeout(() => {
        map.flyTo(center, zoom, { duration: 1.5, easeLinearity: 0.3 });
        setTimeout(() => map.setMaxBounds(bounds), 1600);
      }, 700);
    }
  };

  const handleShowAllDevices = () => {
    setSelectedLocation(null);
    setSelectedFlowmeter(null);

    const map = mapRef.current;
    if (map) {
      map.setMaxBounds(null);
      map.flyTo([17.2, 74.9], 10, { duration: 1.2, easeLinearity: 0.3 });
    }
  };

  const toggleTimeSlider = () => {
    setIsTimeSliderActive(!isTimeSliderActive);
    setIsPlaying(false);
    if (!isTimeSliderActive) {
      setTimeSliderValue(timeRange.max);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('hi-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPopupData = (deviceId) => {
    return timeBasedData[deviceId] || flowmeters.find(fm => fm.device_id === deviceId);
  };

  const group = getGroupForLocation(selectedLocation);
  const routePoints = group.map(fm => [fm.lat, fm.lng]);

  return (
    <div style={{ position: 'relative' }}>
      {/* Stats Panel - Top Right Floating */}
      {showStatsPanel && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          backgroundColor: 'white',
          border: '2px solid #007bff',
          borderRadius: '8px',
          minWidth: '350px',
          maxWidth: '400px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontSize: '14px'
        }}>
          {/* Stats Panel Header */}
          <div style={{
            backgroundColor: '#007bff',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px 6px 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontWeight: 'bold' }}>📊 स्थान आकडेवारी</span>
            <button 
              onClick={() => setShowStatsPanel(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '0',
                width: '20px',
                height: '20px'
              }}
            >
              ×
            </button>
          </div>

          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #ddd'
          }}>
            {['सांगली', 'सांगोला', 'आटपाडी'].map(location => (
              <button
                key={location}
                onClick={() => setActiveStatsTab(location)}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  border: 'none',
                  backgroundColor: activeStatsTab === location ? '#e3f2fd' : 'transparent',
                  color: activeStatsTab === location ? '#007bff' : '#666',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: activeStatsTab === location ? 'bold' : 'normal',
                  borderBottom: activeStatsTab === location ? '2px solid #007bff' : 'none'
                }}
              >
                {location}
              </button>
            ))}
          </div>

          {/* Stats Content */}
          <div style={{ padding: '12px' }}>
            {(() => {
              const stats = calculateLocationStats(activeStatsTab);
              return (
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <h4 style={{ margin: 0, color: '#007bff' }}>{activeStatsTab}</h4>
                    <span style={{
                      fontSize: '10px',
                      color: '#666',
                      backgroundColor: '#f0f0f0',
                      padding: '2px 6px',
                      borderRadius: '10px'
                    }}>
                      {isTimeSliderActive ? 'ऐतिहासिक' : 'वर्तमान'}
                    </span>
                  </div>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      backgroundColor: '#e8f5e8',
                      padding: '8px',
                      borderRadius: '4px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '11px', color: '#666' }}>सरासरी प्रवाह</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#28a745' }}>
                        {stats.avgDischarge}
                      </div>
                      <div style={{ fontSize: '10px', color: '#666' }}>लि./से.</div>
                    </div>
                    
                    <div style={{
                      backgroundColor: '#e3f2fd',
                      padding: '8px',
                      borderRadius: '4px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '11px', color: '#666' }}>एकूण वापर</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#007bff' }}>
                        {stats.totalVolume}
                      </div>
                      <div style={{ fontSize: '10px', color: '#666' }}>लिटर</div>
                    </div>
                  </div>

                  <div style={{
                    fontSize: '11px',
                    color: '#666',
                    borderTop: '1px solid #eee',
                    paddingTop: '6px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>सक्रिय उपकरणे:</span>
                      <span style={{ fontWeight: 'bold' }}>{stats.activeDevices}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>वैध प्रवाह रीडिंग:</span>
                      <span style={{ fontWeight: 'bold' }}>{stats.validDischarges}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>वैध व्हॉल्यूम रीडिंग:</span>
                      <span style={{ fontWeight: 'bold' }}>{stats.validVolumes}</span>
                    </div>
                  </div>

                  <div style={{
                    fontSize: '10px',
                    color: '#999',
                    textAlign: 'center',
                    marginTop: '8px',
                    borderTop: '1px solid #eee',
                    paddingTop: '6px'
                  }}>
                    शेवटचे अपडेट: {new Date().toLocaleTimeString('hi-IN')}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Show Stats Button when panel is hidden */}
      {!showStatsPanel && (
        <button
          onClick={() => setShowStatsPanel(true)}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 1000,
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          📊 आकडेवारी
        </button>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem', gap: '1rem' }}>
        <button onClick={handleShowAllDevices} style={{
          padding: '0.5rem 1rem',
          backgroundColor: selectedLocation === null ? '#007bff' : '#ccc',
          color: selectedLocation === null ? 'white' : 'black',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: selectedLocation === null ? 'bold' : 'normal'
        }}>
          सर्व उपकरणे
        </button>
        {['सांगली', 'सांगोला', 'आटपाडी'].map(loc => (
          <button key={loc} onClick={() => handleLocationClick(loc)} style={{
            padding: '0.5rem 1rem',
            backgroundColor: selectedLocation === loc ? '#007bff' : '#ccc',
            color: selectedLocation === loc ? 'white' : 'black',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: selectedLocation === loc ? 'bold' : 'normal'
          }}>
            {loc}
          </button>
        ))}
        <button onClick={toggleTimeSlider} style={{
          padding: '0.5rem 1rem',
          backgroundColor: isTimeSliderActive ? '#28a745' : '#17a2b8',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}>
          {isTimeSliderActive ? '🕰️ टाइम स्लाइडर बंद' : '🕰️ टाइम स्लाइडर चालू'}
        </button>
      </div>

      {/* Time Slider Controls */}
      {isTimeSliderActive && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          margin: '0 1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0 }}>🕰️ टाइम स्लाइडर</h4>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: isPlaying ? '#dc3545' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {isPlaying ? '⏸️ रोकें' : '▶️ चलाएं'}
            </button>
            <select 
              value={playbackSpeed} 
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              style={{ padding: '0.3rem' }}
            >
              <option value={2000}>0.5x धीमा</option>
              <option value={1000}>1x सामान्य</option>
              <option value={500}>2x तेज़</option>
              <option value={200}>5x तेज़</option>
            </select>
          </div>

          {/* Time Range Selection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 'bold' }}>काळ मुदत:</span>
            {[
              { value: '1day', label: '१ दिवस' },
              { value: '1week', label: '१ आठवडा' },
              { value: '1month', label: '१ महिना' },
              { value: '1year', label: '१ वर्ष' }
            ].map(range => (
              <button
                key={range.value}
                onClick={() => setSelectedTimeRange(range.value)}
                style={{
                  padding: '0.3rem 0.8rem',
                  backgroundColor: selectedTimeRange === range.value ? '#007bff' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                {range.label}
              </button>
            ))}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ minWidth: '120px', fontSize: '0.9rem' }}>
              {formatTimestamp(timeRange.min)}
            </span>
            <input
              type="range"
              min={timeRange.min}
              max={timeRange.max}
              value={timeSliderValue}
              onChange={(e) => setTimeSliderValue(Number(e.target.value))}
              style={{ 
                flex: 1, 
                height: '8px',
                borderRadius: '4px',
                background: '#ddd',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
            <span style={{ minWidth: '120px', fontSize: '0.9rem', textAlign: 'right' }}>
              {formatTimestamp(timeRange.max)}
            </span>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '1rem', fontWeight: 'bold' }}>
            वर्तमान समय: {formatTimestamp(timeSliderValue)}
          </div>
        </div>
      )}

      <MapContainer
        center={[17.2, 74.9]}
        zoom={10}
        style={{ height: '75vh', width: '100%' }}
        ref={mapRef}
        maxBoundsViscosity={0.7}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        touchZoom={true}
        zoomSnap={0.25}
        zoomDelta={0.5}
        minZoom={9}
        maxZoom={16}
        whenCreated={(map) => {
          mapRef.current = map;
        }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToLocation center={selectedLocation ? locationCenters[selectedLocation]?.center : [17.2, 74.9]} 
                      zoom={selectedLocation ? locationCenters[selectedLocation]?.zoom : 10} />

        {group.map((fm) => {
          const popupData = getPopupData(fm.device_id);
          return (
            <Marker
              key={fm.id}
              position={[fm.lat, fm.lng]}
              ref={(ref) => {
                if (ref) markerRefs.current[fm.device_id] = ref;
              }}
              eventHandlers={{
                click: () => setSelectedFlowmeter(fm),
              }}
            >
              <Popup
                autoPan={false}
                closeButton={true}
                autoClose={false}
                closeOnClick={false}
              >
                <div style={{
                  minWidth: '200px',
                  backgroundColor: selectedFlowmeter?.device_id === fm.device_id ? '#fff3cd' : 'white',
                  border: selectedFlowmeter?.device_id === fm.device_id ? '2px solid orange' : '1px solid #ccc',
                  padding: '0.5rem',
                  borderRadius: '4px'
                }}>
                  <strong>डिव्हाइस आयडी:</strong> {popupData?.device_id || fm.device_id}<br />
                  <strong>पाणीचा प्रवाह (लि./से.):</strong> {popupData?.discharge || 'N/A'}<br />
                  <strong>पाण्याचा एकूण वापर (लिटर):</strong> {popupData?.volume || 'N/A'}<br />
                  <strong>ठिकाण:</strong> {popupData?.location || fm.location}<br />
                  <strong>वेळ:</strong> {popupData?.receivedAt ? new Date(popupData.receivedAt).toLocaleString() : 'N/A'}
                  {isTimeSliderActive && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                      📅 ऐतिहासिक डेटा
                    </div>
                  )}
                  {isTimeSliderActive && !popupData && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#ff6b6b' }}>
                      ⚠️ या वेळेसाठी माहिती उपलब्ध नाही
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {selectedFlowmeter && (
        <div style={{ padding: '1rem', background: '#f5f5f5' }}>
          <h3>📊 निवडलेला फ्लोमीटर तपशील {isTimeSliderActive ? '(ऐतिहासिक डेटा)' : ''}</h3>
          <table border="1" cellPadding="8" style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr>
                <th>डिव्हाइस आयडी</th>
                <th>ठिकाण</th>
                <th>पाणीचा प्रवाह (लि./से.)</th>
                <th>मागील प्रवाह</th>
                <th>फरक (Δ)</th>
                <th>पाण्याचा एकूण वापर (लिटर)</th>
                <th>मागील वापर</th>
                <th>फरक (Δ)</th>
                <th>वेळ</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const hist = history[selectedFlowmeter.device_id] || [];
                const current = isTimeSliderActive ? 
                  (timeBasedData[selectedFlowmeter.device_id] || selectedFlowmeter) : 
                  selectedFlowmeter;
                const previous = hist.length > 1 ? hist[hist.length - 2] : null;

                const dischargeDelta = previous && current.discharge !== 'N/A' && previous.discharge !== 'N/A'
                  ? (parseFloat(current.discharge) - parseFloat(previous.discharge)).toFixed(2)
                  : 'N/A';
                const volumeDelta = previous && current.volume !== 'N/A' && previous.volume !== 'N/A'
                  ? (parseFloat(current.volume) - parseFloat(previous.volume)).toFixed(2)
                  : 'N/A';

                return (
                  <tr>
                    <td>{current.device_id}</td>
                    <td>{current.location}</td>
                    <td>{current.discharge}</td>
                    <td>{previous ? previous.discharge : 'N/A'}</td>
                    <td>{dischargeDelta}</td>
                    <td>{current.volume}</td>
                    <td>{previous ? previous.volume : 'N/A'}</td>
                    <td>{volumeDelta}</td>
                    <td>{current.receivedAt ? new Date(current.receivedAt).toLocaleString() : 'N/A'}</td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}