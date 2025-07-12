require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const SMS = require('./model/SMS');
const SWF = require('./model/SWF');
const VolumeCounter = require('./model/VolumeCounter');
const swfSheetReportRoute = require('./swfSheetReport');
const os = require('os');

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

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// Request logging
app.use((req, res, next) => {
  console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.method === 'POST') console.log('Headers:', JSON.stringify(req.headers, null, 2));
  next();
});

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    port: PORT
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'SMS Receiver API',
    endpoints: {
      'POST /receive-sms': 'Receive SMS',
      'GET /latest-sms': 'Latest SMS',
      'GET /all-sms': 'All SMS',
      'GET /total-volume': 'Total volume',
      'GET /flow-data': 'Flow data',
      'GET /gps-data': 'GPS data',
      'GET /gps-data/:deviceId': 'Device GPS history',
      'GET /health': 'Health check'
    }
  });
});

// SMS Processing
app.post('/receive-sms', async (req, res) => {
  try {
    const { package: pkg, title, message, ticker_text, timestamp, category } = req.body;
    
    if (!title || !message || !timestamp) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        received: Object.keys(req.body)
      });
    }

    const ts = isNaN(timestamp) ? Date.now() / 1000 : Number(timestamp);
    const date = new Date(ts > 1e10 ? ts : ts * 1000);

    const smsData = {
      sender: String(title).trim(),
      message: String(message).trim(),
      receivedAt: date,
      metadata: { package: pkg, ticker: ticker_text, category }
    };

    const savedSMS = await SMS.create(smsData);

    // Volume extraction
    const volumeMatch = message.match(/Volume\s*[-:]?\s*(\d+)/i);
    if (volumeMatch?.[1]) {
      const parsedVolume = parseInt(volumeMatch[1], 10);
      await VolumeCounter.findOneAndUpdate(
        {},
        { $inc: { totalVolume: parsedVolume } },
        { upsert: true }
      );
    }

    res.status(200).json({ 
      status: 'success', 
      id: savedSMS._id,
      timestamp: date.toISOString()
    });
  } catch (err) {
    console.error('Error processing SMS:', err);
    res.status(500).json({ error: 'Failed to process SMS' });
  }
});

// SWF Processing
app.post('/swfMessage', async (req, res) => {
  try {
    const { package: pkg, title, message, ticker_text, timestamp, category } = req.body;
    
    if (!title || !message || !timestamp) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        received: Object.keys(req.body)
      });
    }

    const ts = isNaN(timestamp) ? Date.now() / 1000 : Number(timestamp);
    const date = new Date(ts > 1e10 ? ts : ts * 1000);

    const swfData = {
      sender: String(title).trim(),
      message: String(message).trim(),
      receivedAt: date,
      metadata: { package: pkg, ticker: ticker_text, category }
    };

    const savedSWF = await SWF.create(swfData);
    res.status(200).json({ status: 'success', id: savedSWF._id });
  } catch (err) {
    console.error('Error processing SWF:', err);
    res.status(500).json({ error: 'Failed to process SWF' });
  }
});

// Data Retrieval Endpoints
app.get('/all-swf', async (req, res) => {
  try {
    const allSwf = await SWF.find({}).sort({ receivedAt: -1 });
    res.status(200).json(allSwf);
  } catch (err) {
    console.error('Error fetching SWF:', err);
    res.status(500).json({ error: 'Failed to fetch SWF' });
  }
});

app.get('/latest-sms', async (req, res) => {
  try {
    const latestSMS = await SMS.findOne().sort({ createdAt: -1 });
    if (!latestSMS) return res.status(404).json({ error: 'No SMS found' });
    res.status(200).json(latestSMS);
  } catch (err) {
    console.error('Error fetching latest SMS:', err);
    res.status(500).json({ error: 'Failed to fetch latest SMS' });
  }
});

app.get('/all-sms', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [allSMS, totalCount] = await Promise.all([
      SMS.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      SMS.countDocuments()
    ]);

    res.status(200).json({
      data: allSMS,
      pagination: {
        page, limit, total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching SMS:', err);
    res.status(500).json({ error: 'Failed to fetch SMS' });
  }
});

app.get('/total-volume', async (req, res) => {
  try {
    const counter = await VolumeCounter.findOne();
    res.json({ totalVolume: counter?.totalVolume || 0 });
  } catch (err) {
    console.error('Error fetching volume:', err);
    res.status(500).json({ error: 'Failed to fetch volume' });
  }
});

// Enhanced GPS Data Endpoints
app.get('/flow-data', async (req, res) => {
  try {
    const hoursBack = parseInt(req.query.hours) || 24;
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    const smsRecords = await SMS.find({ receivedAt: { $gte: since } }).sort({ receivedAt: 1 });

    const allPoints = smsRecords.map(sms => {
      // Improved GPS extraction
      const deviceIdMatch = sms.message.match(/Device\s*id\s*[^0-9]*(\d+)/i);
      const gpsPair = sms.message.match(/(?:GPS|Location|Coordinates)[\s:=-]*(\d+\.\d+)\s*[,;]\s*(\d+\.\d+)/i);
      const latMatch = sms.message.match(/(?:Latitude|Lat|GPS_Lat)[\s:=-]*(\d+\.\d+)/i);
      const lngMatch = sms.message.match(/(?:Longitude|Long|Lng|GPS_Long)[\s:=-]*(\d+\.\d+)/i);

      const deviceId = deviceIdMatch ? parseInt(deviceIdMatch[1], 10) : null;
      let latitude = null, longitude = null;

      if (gpsPair) {
        latitude = parseFloat(gpsPair[1]);
        longitude = parseFloat(gpsPair[2]);
      } else if (latMatch && lngMatch) {
        latitude = parseFloat(latMatch[1]);
        longitude = parseFloat(lngMatch[1]);
      }

      return {
        deviceId,
        latitude,
        longitude,
        hasGPS: latitude !== null && longitude !== null,
        timestamp: sms.receivedAt,
        message: sms.message
      };
    });

    res.json({
      points: allPoints.filter(p => p.deviceId),
      stats: {
        totalRecords: smsRecords.length,
        withGPS: allPoints.filter(p => p.hasGPS).length,
        uniqueDevices: [...new Set(allPoints.map(p => p.deviceId))].length - 1 // subtract null
      }
    });
  } catch (err) {
    console.error('Error building flow data:', err);
    res.status(500).json({ error: 'Failed to fetch flow data' });
  }
});

app.get('/gps-data', async (req, res) => {
  try {
    const hoursBack = parseInt(req.query.hours) || 24;
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    const smsRecords = await SMS.find({ receivedAt: { $gte: since } }).sort({ receivedAt: -1 });

    const gpsPoints = [];
    const deviceGPSMap = {};

    smsRecords.forEach(sms => {
      const deviceIdMatch = sms.message.match(/Device\s*id\s*[^0-9]*(\d+)/i);
      const gpsPair = sms.message.match(/(?:GPS|Location|Coordinates)[\s:=-]*(\d+\.\d+)\s*[,;]\s*(\d+\.\d+)/i);
      const latMatch = sms.message.match(/(?:Latitude|Lat|GPS_Lat)[\s:=-]*(\d+\.\d+)/i);
      const lngMatch = sms.message.match(/(?:Longitude|Long|Lng|GPS_Long)[\s:=-]*(\d+\.\d+)/i);

      const deviceId = deviceIdMatch ? parseInt(deviceIdMatch[1], 10) : null;
      let latitude = null, longitude = null;

      if (gpsPair) {
        latitude = parseFloat(gpsPair[1]);
        longitude = parseFloat(gpsPair[2]);
      } else if (latMatch && lngMatch) {
        latitude = parseFloat(latMatch[1]);
        longitude = parseFloat(lngMatch[1]);
      }

      if (deviceId && latitude !== null && longitude !== null) {
        const point = {
          deviceId,
          latitude,
          longitude,
          timestamp: sms.receivedAt,
          message: sms.message
        };

        gpsPoints.push(point);
        if (!deviceGPSMap[deviceId]) deviceGPSMap[deviceId] = point;
      }
    });

    res.json({
      allPoints: gpsPoints,
      latestPoints: Object.values(deviceGPSMap),
      stats: {
        totalRecords: smsRecords.length,
        withGPS: gpsPoints.length,
        uniqueDevices: Object.keys(deviceGPSMap).length
      }
    });
  } catch (err) {
    console.error('Error fetching GPS data:', err);
    res.status(500).json({ error: 'Failed to fetch GPS data' });
  }
});

app.get('/gps-data/:deviceId', async (req, res) => {
  try {
    const deviceId = parseInt(req.params.deviceId, 10);
    const hoursBack = parseInt(req.query.hours) || 24;
    const limit = parseInt(req.query.limit) || 100;

    if (isNaN(deviceId)) {
      return res.status(400).json({ error: 'Invalid device ID' });
    }

    const records = await SMS.find({
      'message': { $regex: `Device\\s*id\\s*[^0-9]*${deviceId}`, $options: 'i' },
      'receivedAt': { $gte: new Date(Date.now() - hoursBack * 60 * 60 * 1000) }
    })
    .sort({ receivedAt: -1 })
    .limit(limit);

    const gpsData = records.map(sms => {
      const gpsPair = sms.message.match(/(?:GPS|Location|Coordinates)[\s:=-]*(\d+\.\d+)\s*[,;]\s*(\d+\.\d+)/i);
      const latMatch = sms.message.match(/(?:Latitude|Lat|GPS_Lat)[\s:=-]*(\d+\.\d+)/i);
      const lngMatch = sms.message.match(/(?:Longitude|Long|Lng|GPS_Long)[\s:=-]*(\d+\.\d+)/i);

      let lat, lng;
      if (gpsPair) {
        lat = parseFloat(gpsPair[1]);
        lng = parseFloat(gpsPair[2]);
      } else if (latMatch && lngMatch) {
        lat = parseFloat(latMatch[1]);
        lng = parseFloat(lngMatch[1]);
      }

      return {
        timestamp: sms.receivedAt,
        latitude: lat,
        longitude: lng,
        isValid: (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180),
        rawMessage: sms.message
      };
    }).filter(point => point.isValid);

    res.json({
      deviceId,
      totalRecords: records.length,
      gpsRecords: gpsData.length,
      coordinates: gpsData,
      latest: gpsData[0] || null
    });
  } catch (err) {
    console.error('Error fetching device GPS:', err);
    res.status(500).json({ error: 'Failed to fetch device GPS' });
  }
});

// Error Handling
process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Helper function
function getLocalIPv4() {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Start Server
app.listen(PORT, () => {
  const ipv4 = getLocalIPv4();
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔗 Local: http://localhost:${PORT}`);
  console.log(`🔗 Network: http://${ipv4}:${PORT}`);
  console.log(`🌍 GPS Endpoints:`);
  console.log(`   • /gps-data - All GPS data`);
  console.log(`   • /gps-data/:deviceId - Device-specific history`);
});