require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const SMS = require('./model/SMS');
const VolumeCounter = require('./model/VolumeCounter');
const downloadReportRoute = require('./routes/downloadReportRoute'); // ✅ updated route path

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB
mongoose.connect(MONGO_URI, {})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

app.use(bodyParser.json());

const allowedOrigins = [
  'https://aniket-backend.vercel.app',
  'https://aniket-backend-8jvji8hx2-aniket-s-projects-b2fda10b.vercel.app',
  'https://aniket-backend-git-main-aniket-s-projects-b2fda10b.vercel.app',
  'https://aniket-backend-j6smfpzba-aniket-s-projects-b2fda10b.vercel.app',
  'https://aniket-backend-aniket-s-projects-b2fda10b.vercel.app',
  'https://aniket-backend-muor27fm0-aniket-s-projects-b2fda10b.vercel.app', // Removed trailing slash
  'http://localhost:3000'
];

// Allow CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Check if origin is in allowedOrigins
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});


// 🗺️ Enhanced function to parse coordinates from message
function parseCoordinates(message) {
  let latitude = null;
  let longitude = null;
  
  console.log('🔍 Parsing coordinates from message:', message);
  
  // Multiple patterns to catch different formats
  const patterns = [
    // Standard formats
    /latitude\s*[-:=]?\s*([+-]?\d+\.?\d*)/i,
    /lat\s*[-:=]?\s*([+-]?\d+\.?\d*)/i,
    /longitude\s*[-:=]?\s*([+-]?\d+\.?\d*)/i,
    /long\s*[-:=]?\s*([+-]?\d+\.?\d*)/i,
    /lng\s*[-:=]?\s*([+-]?\d+\.?\d*)/i,
    
    // GPS coordinates format
    /gps\s*[-:=]?\s*([+-]?\d+\.?\d*)[,\s]+([+-]?\d+\.?\d*)/i,
    
    // Coordinates format: "Coordinates: lat, lng"
    /coordinates?\s*[-:=]?\s*([+-]?\d+\.?\d*)[,\s]+([+-]?\d+\.?\d*)/i,
    
    // Location format: "Location: lat, lng"
    /location\s*[-:=]?\s*([+-]?\d+\.?\d*)[,\s]+([+-]?\d+\.?\d*)/i,
    
    // Position format: "Position: lat, lng"
    /position\s*[-:=]?\s*([+-]?\d+\.?\d*)[,\s]+([+-]?\d+\.?\d*)/i,
    
    // Simple format: "lat, lng" or "latitude, longitude"
    /([+-]?\d+\.?\d*)[,\s]+([+-]?\d+\.?\d*)/
  ];
  
  // Try latitude patterns first
  for (const pattern of patterns.slice(0, 2)) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const parsedLat = parseFloat(match[1]);
      if (!isNaN(parsedLat) && parsedLat >= -90 && parsedLat <= 90) {
        latitude = parsedLat;
        console.log(`📍 Found latitude: ${latitude}`);
        break;
      }
    }
  }
  
  // Try longitude patterns
  for (const pattern of patterns.slice(2, 5)) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const parsedLng = parseFloat(match[1]);
      if (!isNaN(parsedLng) && parsedLng >= -180 && parsedLng <= 180) {
        longitude = parsedLng;
        console.log(`📍 Found longitude: ${longitude}`);
        break;
      }
    }
  }
  
  // If we haven't found both coordinates, try combined patterns
  if (!latitude || !longitude) {
    for (const pattern of patterns.slice(5)) {
      const match = message.match(pattern);
      if (match && match[1] && match[2]) {
        const parsedLat = parseFloat(match[1]);
        const parsedLng = parseFloat(match[2]);
        
        if (!isNaN(parsedLat) && !isNaN(parsedLng) && 
            parsedLat >= -90 && parsedLat <= 90 && 
            parsedLng >= -180 && parsedLng <= 180) {
          latitude = parsedLat;
          longitude = parsedLng;
          console.log(`📍 Found combined coordinates: ${latitude}, ${longitude}`);
          break;
        }
      }
    }
  }
  
  return { latitude, longitude };
}

// 📥 Receive SMS Route
app.post('/receive-sms', async (req, res) => {
  console.log('\n🔎 Raw request body:', req.body);

  const { package: pkg, title, message, ticker_text, timestamp, category } = req.body;

  if (!title || !message || !timestamp) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let ts = Number(timestamp);
  if (isNaN(ts)) ts = Date.now();
  const date = new Date(ts * 1000);

  let parsedVolume = 0;
  const volumeMatch = message.match(/Volume\s*[-:]?\s*(\d+)/i);
  if (volumeMatch && volumeMatch[1]) {
    parsedVolume = parseInt(volumeMatch[1], 10);
    console.log(`🔢 Parsed volume: ${parsedVolume}`);
  } else {
    console.log('⚠️ Volume not found in message.');
  }

  // 🗺️ Enhanced coordinate parsing
  const { latitude, longitude } = parseCoordinates(message);
  
  if (latitude && longitude) {
    console.log(`📍 Successfully parsed coordinates: Latitude = ${latitude}, Longitude = ${longitude}`);
  } else {
    console.log('⚠️ Could not parse valid coordinates from message');
  }

  const smsData = {
    sender: title,
    message: String(message),
    receivedAt: date,
    latitude,
    longitude,
    metadata: {
      package: pkg,
      ticker: ticker_text,
      category,
    }
  };

  try {
    const savedSMS = await SMS.create(smsData);
    console.log('✅ SMS saved to MongoDB with _id:', savedSMS._id);

    if (parsedVolume > 0) {
      const updatedCounter = await VolumeCounter.findOneAndUpdate(
        {},
        { $inc: { totalVolume: parsedVolume } },
        { upsert: true, new: true }
      );
      console.log('📈 Updated total volume:', updatedCounter.totalVolume);
    }

    res.status(200).json({ 
      status: 'success', 
      received: true, 
      id: savedSMS._id,
      coordinates: latitude && longitude ? { latitude, longitude } : null
    });
  } catch (err) {
    console.error('❌ Error saving SMS:', err);
    res.status(500).json({ status: 'error', message: 'Failed to save SMS' });
  }
});

// 📤 Latest SMS
app.get('/latest-sms', async (req, res) => {
  try {
    const latestSMS = await SMS.findOne().sort({ createdAt: -1 });
    if (!latestSMS) return res.status(404).json({ error: 'No SMS messages found' });

    const fields = {};
    const lines = latestSMS.message.split('\n');
    lines.forEach(line => {
      const [keyRaw, valueRaw] = line.split('-');
      if (keyRaw && valueRaw) {
        const key = keyRaw.trim().toLowerCase().replace(/\s+/g, '_');
        const value = valueRaw.trim();
        fields[key] = value;
      }
    });

    return res.status(200).json({
      id: latestSMS._id,
      sender: latestSMS.sender,
      receivedAt: latestSMS.receivedAt,
      latitude: latestSMS.latitude,
      longitude: latestSMS.longitude,
      parsedFields: fields
    });
  } catch (err) {
    console.error('❌ Error retrieving latest SMS:', err);
    res.status(500).json({ error: 'Failed to retrieve latest SMS' });
  }
});

// 📤 All SMS
app.get('/all-sms', async (req, res) => {
  try {
    const allSMS = await SMS.find().sort({ createdAt: -1 });
    if (!allSMS || allSMS.length === 0) {
      return res.status(404).json({ error: 'No SMS messages found' });
    }

    const result = allSMS.map(sms => {
      const fields = {};
      const lines = sms.message.split('\n');
      lines.forEach(line => {
        const [keyRaw, valueRaw] = line.split('-');
        if (keyRaw && valueRaw) {
          const key = keyRaw.trim().toLowerCase().replace(/\s+/g, '_');
          const value = valueRaw.trim();
          fields[key] = value;
        }
      });

      return {
        id: sms._id,
        sender: sms.sender,
        receivedAt: sms.receivedAt,
        latitude: sms.latitude,
        longitude: sms.longitude,
        parsedFields: fields
      };
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ Error retrieving all SMS messages:', err);
    res.status(500).json({ error: 'Failed to retrieve SMS messages' });
  }
});

// 🗺️ NEW: Get SMS messages with valid coordinates for map
app.get('/map-data', async (req, res) => {
  try {
    const smsWithCoords = await SMS.find({
      latitude: { $ne: null },
      longitude: { $ne: null }
    }).sort({ receivedAt: -1 });

    const mapData = smsWithCoords.map(sms => {
      // Parse additional fields from message
      const fields = {};
      const lines = sms.message.split('\n');
      lines.forEach(line => {
        const [keyRaw, valueRaw] = line.split('-');
        if (keyRaw && valueRaw) {
          const key = keyRaw.trim().toLowerCase().replace(/\s+/g, '_');
          const value = valueRaw.trim();
          fields[key] = value;
        }
      });

      return {
        id: sms._id,
        sender: sms.sender,
        receivedAt: sms.receivedAt,
        latitude: sms.latitude,
        longitude: sms.longitude,
        message: sms.message,
        parsedFields: fields
      };
    });

    res.json({
      totalPoints: mapData.length,
      points: mapData
    });
  } catch (err) {
    console.error('❌ Error fetching map data:', err);
    res.status(500).json({ error: 'Failed to fetch map data' });
  }
});

// 📦 Total Volume
app.get('/total-volume', async (req, res) => {
  const counter = await VolumeCounter.findOne();
  const total = counter ? counter.totalVolume : 0;
  res.json({ totalVolume: total });
});

// 📊 Flow Data
app.get('/flow-data', async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const smsRecords = await SMS.find({ receivedAt: { $gte: since } }).sort({ receivedAt: 1 });

    const points = [];

    for (const sms of smsRecords) {
      const message = sms.message || '';
      const lines = message.split('\n').map(line => line.trim());

      let deviceId = null;
      let discharge = null;
      let volume = null;
      let location = 'Unknown';

      for (const line of lines) {
        if (/device\s*id/i.test(line)) {
          const match = line.match(/(?:device\s*id|deviceid|id)[\s\-:=]*(\d+)/i);
          if (match) deviceId = parseInt(match[1], 10);
        }

        if (/discharge/i.test(line)) {
          const match = line.match(/discharge[\s\-:=]*([\d.]+)/i);
          if (match) discharge = parseFloat(match[1]);
        }

        if (/volume/i.test(line)) {
          const match = line.match(/volume[\s\-:=]*([\d.]+)/i);
          if (match) volume = parseFloat(match[1]);
        }
      }

      if (deviceId >= 1 && deviceId <= 5) location = 'Sangli';
      else if (deviceId >= 6 && deviceId <= 10) location = 'Sangola';
      else if (deviceId >= 11 && deviceId <= 15) location = 'Atapadi';

      if (
        typeof deviceId === 'number' &&
        typeof discharge === 'number' &&
        !isNaN(deviceId) &&
        !isNaN(discharge)
      ) {
        points.push({
          x: new Date(sms.receivedAt).toISOString(),
          y: discharge,
          deviceId,
          volume: volume || 0,
          location,
          latitude: sms.latitude,
          longitude: sms.longitude
        });
      }
    }

    res.json({
      points,
      timeRange: '24 hours',
      totalRecords: smsRecords.length,
      validDischargeRecords: points.length
    });
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: 'Failed to fetch flow data' });
  }
});

// ✅ PDF Report Route
app.use('/download', downloadReportRoute);

// 🚀 Start Server
app.listen(PORT, () => {
  console.log(`✅ SMS Receiver running at public URL on port ${PORT}`);
});