import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Line Graph Component with Datum Level
const LineGraphComponent = ({ flowmeters, timeBasedData, isTimeSliderActive }) => {
  const [showGraphPanel, setShowGraphPanel] = useState(false);
  const [selectedGraphLocation, setSelectedGraphLocation] = useState('सांगली');
  const [selectedParameter, setSelectedParameter] = useState('सर्व');

  const getLocationData = (location) => {
    const currentData = isTimeSliderActive ? Object.values(timeBasedData) : flowmeters;
    
    switch (location) {
      case 'सांगली':
        return currentData.filter(fm => parseInt(fm.device_id) >= 11 && parseInt(fm.device_id) <= 15);
      case 'सांगोला':
        return currentData.filter(fm => parseInt(fm.device_id) >= 1 && parseInt(fm.device_id) <= 5);
      case 'आटपाडी':
        return currentData.filter(fm => parseInt(fm.device_id) >= 6 && parseInt(fm.device_id) <= 10);
      default:
        return [];
    }
  };

  const graphData = useMemo(() => {
    const locationData = getLocationData(selectedGraphLocation);
    
    return locationData.map(fm => ({
      device_id: fm.device_id,
      प्रवाह: parseFloat(fm.discharge) || 0,
      व्हॉल्यूम: parseFloat(fm.volume) || 0,
      पातळी: parseFloat(fm.level) || 0,
      deviceName: `डिव्हाइस ${fm.device_id}`
    })).sort((a, b) => parseInt(a.device_id) - parseInt(b.device_id));
  }, [selectedGraphLocation, flowmeters, timeBasedData, isTimeSliderActive]);

  // Compute datum level
  const datumLevel = useMemo(() => {
    if (graphData.length === 0) return null;

    // Sort by device_id to get the last device
    const sortedByDeviceId = [...graphData].sort((a, b) => parseInt(a.device_id) - parseInt(b.device_id));
    const lastDevice = sortedByDeviceId[sortedByDeviceId.length - 1];

    const lastLevel = lastDevice?.पातळी;
    if (!isNaN(lastLevel)) return lastLevel;

    // Fallback to min level - 1
    const minLevel = Math.min(...graphData.map(d => d.पातळी));
    return minLevel - 1;
  }, [graphData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '8px 12px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          fontSize: '12px'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{`डिव्हाइस: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '2px 0', color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
              {entry.name === 'प्रवाह' && ' लि./से.'}
              {entry.name === 'व्हॉल्यूम' && ' लिटर'}
              {entry.name === 'पातळी' && ' मीटर'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Graph Toggle Button */}
      <div style={{
        position: 'fixed',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000
      }}>
        <button
          onClick={() => setShowGraphPanel(!showGraphPanel)}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '25px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease'
          }}
        >
          📊 {showGraphPanel ? 'आकृती बंद करा' : 'आकृती दाखवा'}
        </button>
      </div>

      {/* Graph Panel */}
      {showGraphPanel && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '10px',
          right: '10px',
          backgroundColor: 'white',
          border: '2px solid #007bff',
          borderRadius: '10px',
          maxHeight: '50vh',
          overflowY: 'auto',
          zIndex: 999,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.2)'
        }}>
          {/* Graph Header */}
          <div style={{
            backgroundColor: '#007bff',
            color: 'white',
            padding: '10px 15px',
            borderRadius: '8px 8px 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 1001
          }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>📈 पाणी प्रवाह आकृती</h3>
            <button
              onClick={() => setShowGraphPanel(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0',
                width: '25px',
                height: '25px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>

          {/* Location Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #dee2e6',
            backgroundColor: '#f8f9fa',
            position: 'sticky',
            top: '46px',
            zIndex: 1000
          }}>
            {['सांगली', 'सांगोला', 'आटपाडी'].map(location => (
              <button
                key={location}
                onClick={() => setSelectedGraphLocation(location)}
                style={{
                  flex: 1,
                  padding: '8px 6px',
                  border: 'none',
                  backgroundColor: selectedGraphLocation === location ? '#007bff' : 'transparent',
                  color: selectedGraphLocation === location ? 'white' : '#495057',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: selectedGraphLocation === location ? 'bold' : 'normal',
                  transition: 'all 0.3s ease'
                }}
              >
                {location}
              </button>
            ))}
          </div>

          {/* Parameter Selection */}
          <div style={{
            padding: '8px 15px',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #dee2e6',
            position: 'sticky',
            top: '82px',
            zIndex: 1000
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '12px' }}>पॅरामीटर:</span>
              {['सर्व', 'प्रवाह', 'व्हॉल्यूम', 'पातळी'].map(param => (
                <button
                  key={param}
                  onClick={() => setSelectedParameter(param)}
                  style={{
                    padding: '4px 8px',
                    border: '1px solid #007bff',
                    borderRadius: '15px',
                    backgroundColor: selectedParameter === param ? '#007bff' : 'white',
                    color: selectedParameter === param ? 'white' : '#007bff',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: selectedParameter === param ? 'bold' : 'normal',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {param}
                </button>
              ))}
            </div>
          </div>

          {/* Graph Content */}
          <div style={{ padding: '12px 15px 20px 15px' }}>
            <h4 style={{ 
              margin: '0 0 12px 0',
              color: '#495057',
              textAlign: 'center',
              fontSize: '14px'
            }}>
              {selectedGraphLocation} - {selectedParameter === 'सर्व' ? 'सर्व पॅरामीटर' : selectedParameter}
              {isTimeSliderActive && <span style={{ color: '#6c757d', fontSize: '11px' }}> (ऐतिहासिक डेटा)</span>}
            </h4>
            
            {graphData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart 
                  data={graphData} 
                  margin={{ top: 10, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                  <XAxis 
                    dataKey="device_id" 
                    stroke="#6c757d"
                    fontSize={11}
                    height={50}
                    label={{ 
                      value: 'डिव्हाइस आयडी', 
                      position: 'insideBottom', 
                      offset: -15, 
                      fontSize: 11,
                      textAnchor: 'middle'
                    }}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    stroke="#6c757d"
                    fontSize={11}
                    width={60}
                    label={{ 
                      value: 'मूल्य', 
                      angle: -90, 
                      position: 'insideLeft', 
                      fontSize: 11,
                      textAnchor: 'middle'
                    }}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    fontSize={11}
                    wrapperStyle={{ paddingTop: '10px' }}
                  />
                  
                  {/* Datum Level Reference Line */}
                  {datumLevel !== null && selectedParameter !== 'प्रवाह' && selectedParameter !== 'व्हॉल्यूम' && (
                    <ReferenceLine
                      y={datumLevel}
                      stroke="#dc3545"
                      strokeDasharray="5 5"
                      label={{
                        value: `Datum स्तर: ${datumLevel.toFixed(2)} मी.`,
                        position: 'left',
                        fill: '#dc3545',
                        fontSize: 11
                      }}
                    />
                  )}
                  
                  {/* Render lines based on selected parameter */}
                  {(selectedParameter === 'सर्व' || selectedParameter === 'प्रवाह') && (
                    <Line 
                      type="monotone" 
                      dataKey="प्रवाह" 
                      stroke="#28a745" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      name="प्रवाह (लि./से.)"
                    />
                  )}
                  
                  {(selectedParameter === 'सर्व' || selectedParameter === 'व्हॉल्यूम') && (
                    <Line 
                      type="monotone" 
                      dataKey="व्हॉल्यूम" 
                      stroke="#007bff" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      name="व्हॉल्यूम (लिटर)"
                    />
                  )}
                  
                  {(selectedParameter === 'सर्व' || selectedParameter === 'पातळी') && (
                    <Line 
                      type="monotone" 
                      dataKey="पातळी" 
                      stroke="#ffc107" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      name="पातळी (मीटर)"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '30px',
                color: '#6c757d'
              }}>
                <p>या स्थानासाठी डेटा उपलब्ध नाही</p>
              </div>
            )}
            
            {/* Data Summary */}
            <div style={{
              marginTop: '12px',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #dee2e6'
            }}>
              <h5 style={{ margin: '0 0 8px 0', color: '#495057', fontSize: '13px' }}>डेटा सारांश:</h5>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '8px',
                fontSize: '11px'
              }}>
                <div>
                  <strong>एकूण डिव्हाइसेस:</strong> {graphData.length}
                </div>
                <div>
                  <strong>सरासरी प्रवाह:</strong> {
                    graphData.length > 0 
                      ? (graphData.reduce((sum, d) => sum + d.प्रवाह, 0) / graphData.length).toFixed(2) 
                      : '0'
                  } लि./से.
                </div>
                <div>
                  <strong>एकूण व्हॉल्यूम:</strong> {
                    graphData.reduce((sum, d) => sum + d.व्हॉल्यूम, 0).toFixed(2)
                  } लिटर
                </div>
                <div>
                  <strong>सरासरी पातळी:</strong> {
                    graphData.length > 0 
                      ? (graphData.reduce((sum, d) => sum + d.पातळी, 0) / graphData.length).toFixed(2) 
                      : '0'
                  } मीटर
                </div>
                {datumLevel !== null && (
                  <div>
                    <strong>Datum स्तर:</strong> {datumLevel.toFixed(2)} मी.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function FlowMap() {
  const [flowmeters, setFlowmeters] = useState([]);
  const [devicePositions, setDevicePositions] = useState({});
  const [selectedFlowmeter, setSelectedFlowmeter] = useState(null);
  const [history, setHistory] = useState({});
  const [selectedLocation, setSelectedLocation] = useState(null);
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

  const allDevicesBounds = [[16.1, 74.0], [17.7, 75.5]];

  // Updated getGroupForLocation function
  const getGroupForLocation = (location) => {
    // Always return all devices with their current data, not just positions
    const currentData = isTimeSliderActive ? Object.values(timeBasedData) : flowmeters;
    
    if (!location) return currentData; // Show all devices when no location selected

    // Filter devices based on location
    switch (location) {
      case 'सांगली':
        return currentData.filter(fm => parseInt(fm.device_id) >= 11 && parseInt(fm.device_id) <= 15);
      case 'सांगोला':
        return currentData.filter(fm => parseInt(fm.device_id) >= 1 && parseInt(fm.device_id) <= 5);
      case 'आटपाडी':
        return currentData.filter(fm => parseInt(fm.device_id) >= 6 && parseInt(fm.device_id) <= 10);
      default:
        return [];
    }
  };

  const calculateLocationStats = (location) => {
    const currentData = isTimeSliderActive ? Object.values(timeBasedData) : flowmeters;
    const locationDevices = currentData.filter(fm => {
      const deviceId = parseInt(fm.device_id);
      switch (location) {
        case 'सांगली':
          return deviceId >= 11 && deviceId <= 15;
        case 'सांगोला':
          return deviceId >= 1 && deviceId <= 5;
        case 'आटपाडी':
          return deviceId >= 6 && deviceId <= 10;
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

  useEffect(() => {
    const fetchLiveSmsData = async () => {
      try {
        console.log('🔄 Fetching SMS data for time range:', selectedTimeRange);
        
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

      const res = await fetch(`${process.env.REACT_APP_API_URL}/all-sms`);

const payload = await res.json();
let list = Array.isArray(payload.data) ? payload.data : [];

console.log('📡 Raw SMS data received:', list.length, 'messages');
console.log('📅 Date range filter:', startDate.toISOString(), 'to', now.toISOString());


        const parsed = list
          .map((sms, index) => {
            const pf = sms.parsedFields || {};
            const lat = parseFloat(pf.latitude);
            const lng = parseFloat(pf.longitude);
            if (!lat || !lng) return null;

            const receivedAt = new Date(sms.receivedAt);
            const timestamp = receivedAt.getTime();
            
            if (timestamp < startDate.getTime()) return null;

            return {
              id: sms.id || index,
              device_id: pf.device_id || 'N/A',
              discharge: pf.discharge || 'N/A',
              volume: pf.volume || 'N/A',
              level: pf.level || 'N/A',
              location: pf.location || 'Unknown',
              lat,
              lng,
              receivedAt: sms.receivedAt,
              timestamp,
            };
          })
          .filter(Boolean);

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

        // Get latest data for each device
        const latestByDevice = Object.values(
          parsed.reduce((acc, curr) => {
            const key = curr.device_id;
            if (!acc[key] || new Date(curr.receivedAt) > new Date(acc[key].receivedAt)) {
              acc[key] = curr;
            }
            return acc;
          }, {})
        );

        // Updated device data merging logic
        setFlowmeters(prev => {
          const merged = [...prev];
          latestByDevice.forEach(newDevice => {
            const existingIndex = merged.findIndex(d => d.device_id === newDevice.device_id);
            if (existingIndex >= 0) {
              merged[existingIndex] = newDevice; // Update existing
            } else {
              merged.push(newDevice); // Add new
            }
          });
          
          // If we have very few new devices, keep old ones that aren't updated
          if (latestByDevice.length < 5) {
            console.log('⚠️ Very few new devices found, preserving old data');
          }
          
          console.log('📊 Total devices after merge:', merged.length);
          return merged;
        });

        // Updated device positions update logic
        setDevicePositions(prevPositions => {
          const newPositions = { ...prevPositions };
          // Update positions for all current flowmeters
          flowmeters.forEach(device => {
            if (device.lat && device.lng) {
              newPositions[device.device_id] = {
                lat: device.lat,
                lng: device.lng,
                location: device.location
              };
            }
          });
          // Also update with any new devices
          latestByDevice.forEach(device => {
            if (device.lat && device.lng) {
              newPositions[device.device_id] = {
                lat: device.lat,
                lng: device.lng,
                location: device.location
              };
            }
          });
          return newPositions;
        });

      } catch (err) {
        console.error('❌ SMS डेटा मिळविण्यात अयशस्वी:', err);
      }
    };

    fetchLiveSmsData();
    const interval = setInterval(fetchLiveSmsData, 10000);
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
      map.setMaxBounds(allDevicesBounds);
      map.flyTo([17.1, 74.75], 10, { 
        duration: 1.2, 
        easeLinearity: 0.3 
      });
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
    return new Date(timestamp).toLocaleString('mr-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    if (selectedLocation) {
      const group = getGroupForLocation(selectedLocation);
      group.forEach(fm => {
        const marker = markerRefs.current[fm.device_id];
        if (marker) marker.openPopup();
      });
    } else {
      Object.values(markerRefs.current).forEach(marker => marker?.closePopup());
    }
  }, [selectedLocation, flowmeters]);

  useEffect(() => {
    if (selectedFlowmeter && mapRef.current) {
      mapRef.current.flyTo([selectedFlowmeter.lat, selectedFlowmeter.lng], 14, { duration: 1 });
    }
  }, [selectedFlowmeter]);

  const group = getGroupForLocation(selectedLocation);
  const routePoints = group.map(fm => [fm.lat, fm.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && flowmeters.length > 0 && !selectedLocation) {
      map.setMaxBounds(allDevicesBounds);
      map.setView([17.1, 74.75], 10);
    }
  }, [flowmeters, selectedLocation]);

  const getPopupData = (deviceId) => {
    return timeBasedData[deviceId] || flowmeters.find(fm => fm.device_id === deviceId);
  };

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
                    शेवटचे अपडेट: {new Date().toLocaleTimeString('mr-IN')}
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
              {isPlaying ? '⏸️ थांबवा' : '▶️ सुरू करा'}
            </button>
            <select 
              value={playbackSpeed} 
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              style={{ padding: '0.3rem' }}
            >
              <option value={2000}>0.5x मंद</option>
              <option value={1000}>1x सामान्य</option>
              <option value={500}>2x वेगवान</option>
              <option value={200}>5x वेगवान</option>
            </select>
          </div>

          {/* Time Range Selection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 'bold' }}>कालावधी:</span>
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
            सध्याची वेळ: {formatTimestamp(timeSliderValue)}
          </div>
        </div>
      )}

      <MapContainer
        center={[20, 74.75]}
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
        maxBounds={!selectedLocation ? allDevicesBounds : null}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {group.map((fm) => {
          const popupData = getPopupData(fm.device_id);
          return (
            <Marker
              key={fm.device_id}
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
                  <strong>पाण्याचा प्रवाह (लि./से.):</strong> {popupData?.discharge || 'N/A'}<br />
                  <strong>पाण्याचा एकूण वापर (लिटर):</strong> {popupData?.volume || 'N/A'}<br />
                  <strong>पाण्याची पातळी (मीटर):</strong> {popupData?.level || 'N/A'}<br />
                  <strong>ठिकाण:</strong> {popupData?.location || fm.location}<br />
                  <strong>वेळ:</strong> {popupData?.receivedAt ? new Date(popupData.receivedAt).toLocaleString('mr-IN') : 'N/A'}
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
                <th>पाण्याचा प्रवाह (लि./से.)</th>
                <th>मागील प्रवाह</th>
                <th>फरक (Δ)</th>
                <th>पाण्याचा एकूण वापर (लिटर)</th>
                <th>मागील वापर</th>
                <th>फरक (Δ)</th>
                <th>पाण्याची पातळी (मीटर)</th>
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
                    <td>{current.level || 'N/A'}</td>
                    <td>{current.receivedAt ? new Date(current.receivedAt).toLocaleString('mr-IN') : 'N/A'}</td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      )}

      {/* Line Graph Component */}
      <LineGraphComponent 
        flowmeters={flowmeters} 
        timeBasedData={timeBasedData} 
        isTimeSliderActive={isTimeSliderActive} 
      />
    </div>
  );
}