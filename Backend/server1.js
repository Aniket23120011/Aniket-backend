

require('dotenv').config(); 

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const SMS = require('./model/SMS');
const SWF = require('./model/SWF') ;
const VolumeCounter = require('./model/VolumeCounter');
const swfSheetReportRoute = require('./swfSheetReport'); // ✅ NEW LINE


const app = express();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB once when the server starts
mongoose.connect(MONGO_URI, {})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Enhanced middleware for better request handling
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); 
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] ${req.method} ${req.path}`);
  if (req.method === 'POST') {
    console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
  }
  next();
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    port: PORT
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'SMS Receiver API is running',
    endpoints: {
      'POST /receive-sms': 'Receive SMS messages',
      'GET /latest-sms': 'Get latest SMS',
      'GET /all-sms': 'Get all SMS messages',
      'GET /total-volume': 'Get total volume',
      'GET /flow-data': 'Get flow data points',
      'GET /health': 'Health check',
      'GET /download/data-range': 'Download PDF report by date range'  // ADDED: Download endpoint
    },
    timestamp: new Date().toISOString()
  });
});

// --- ENHANCED ROUTE TO RECEIVE SMS ---
app.post('/receive-sms', async (req, res) => {
  const startTime = Date.now();
  console.log('\n🔄 Processing incoming SMS...');
  console.log('🔎 Raw request body:', JSON.stringify(req.body, null, 2));

  try {
    // Extract data with multiple fallback options
    const {
      package: pkg,
      title,
      message,
      ticker_text,
      timestamp,
      category,
    } = req.body;

    // Enhanced validation with better error messages
    const missingFields = [];
    if (!title) missingFields.push('title');
    if (!message) missingFields.push('message');
    if (!timestamp) missingFields.push('timestamp');

    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      console.log('Available fields:', Object.keys(req.body));
      return res.status(400).json({ 
        error: 'Missing required fields',
        missing: missingFields,
        received: Object.keys(req.body)
      });
    }

    // Parse timestamp with better error handling
    let ts = Number(timestamp);
    if (isNaN(ts)) {
      console.warn('⚠️ Invalid timestamp, using current time');
      ts = Date.now() / 1000; // Convert to seconds
    }
    
    // Handle both seconds and milliseconds timestamps
    const date = new Date(ts > 1e10 ? ts : ts * 1000);
    console.log('📅 Parsed timestamp:', date.toISOString());

    const smsData = {
      sender: String(title).trim(),
      message: String(message).trim(),
      receivedAt: date,
      metadata: {
        package: pkg,
        ticker: ticker_text,
        category,
      }
    };

    console.log('📩 Parsed SMS to store:', {
      sender: smsData.sender,
      messageLength: smsData.message.length,
      receivedAt: smsData.receivedAt,
      metadata: smsData.metadata
    });

    // Extract volume from the message string
    let parsedVolume = 0;
    const volumeMatch = message.match(/Volume\s*[-:]?\s*(\d+)/i);
    if (volumeMatch && volumeMatch[1]) {
      parsedVolume = parseInt(volumeMatch[1], 10);
      console.log(`🔢 Parsed volume: ${parsedVolume}`);
    } else {
      console.log('⚠️ Volume not found in message. Skipping volume accumulation.');
    }

    // Save SMS to database with retry logic
    let savedSMS;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        savedSMS = await SMS.create(smsData);
        console.log('✅ SMS saved to MongoDB with _id:', savedSMS._id);
        break;
      } catch (saveError) {
        retryCount++;
        console.error(`❌ Error saving SMS (attempt ${retryCount}/${maxRetries}):`, saveError.message);
        
        if (retryCount >= maxRetries) {
          throw saveError;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
      }
    }

    // Update cumulative volume if volume was found
    if (parsedVolume > 0) {
      try {
        const updatedCounter = await VolumeCounter.findOneAndUpdate(
          {},
          { $inc: { totalVolume: parsedVolume } },
          { upsert: true, new: true }
        );
        console.log('📈 Updated total volume:', updatedCounter.totalVolume);
      } catch (volumeError) {
        console.error('❌ Error updating volume counter:', volumeError.message);
        // Don't fail the entire request if volume update fails
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ SMS processed successfully in ${processingTime}ms`);

    // Send immediate response to prevent webhook timeout
    res.status(200).json({ 
      status: 'success', 
      received: true, 
      id: savedSMS._id,
      timestamp: new Date().toISOString(),
      processingTime: `${processingTime}ms`
    });

  } catch (err) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Error processing SMS:', err);
    console.error('Stack trace:', err.stack);
    
    // Send error response but don't crash the server
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to process SMS',
      error: err.message,
      timestamp: new Date().toISOString(),
      processingTime: `${processingTime}ms`
    });
  }
});



// --- ENHANCED ROUTE TO RECEIVE SMS ---
app.post('/swfMessage', async (req, res) => {
  const startTime = Date.now();
  console.log('\n🔄 Processing incoming SWF message...');
  console.log('🔎 Raw request body:', JSON.stringify(req.body, null, 2));

  try {
    // Extract data with multiple fallback options
    const {
      package: pkg,
      title,
      message,
      ticker_text,
      timestamp,
      category,
    } = req.body;

    // Validation
    const missingFields = [];
    if (!title) missingFields.push('title');
    if (!message) missingFields.push('message');
    if (!timestamp) missingFields.push('timestamp');

    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      return res.status(400).json({ 
        error: 'Missing required fields',
        missing: missingFields,
        received: Object.keys(req.body)
      });
    }

    // Parse timestamp
    let ts = Number(timestamp);
    if (isNaN(ts)) {
      console.warn('⚠️ Invalid timestamp, using current time');
      ts = Date.now() / 1000;
    }

    const date = new Date(ts > 1e10 ? ts : ts * 1000);
    console.log('📅 Parsed timestamp:', date.toISOString());

    const swfData = {
      sender: String(title).trim(),
      message: String(message).trim(),
      receivedAt: date,
      metadata: {
        package: pkg,
        ticker: ticker_text,
        category,
      }
    };

    console.log('📩 Parsed SWF message to store:', {
      sender: swfData.sender,
      messageLength: swfData.message.length,
      receivedAt: swfData.receivedAt,
      metadata: swfData.metadata
    });

    // Save SWF to database with retry logic
    let savedSWF;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        savedSWF = await SWF.create(swfData);
        console.log('✅ SWF message saved to MongoDB with _id:', savedSWF._id);
        break;
      } catch (saveError) {
        retryCount++;
        console.error(`❌ Error saving SWF message (attempt ${retryCount}/${maxRetries}):`, saveError.message);
        if (retryCount >= maxRetries) {
          throw saveError;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ SWF message processed successfully in ${processingTime}ms`);

    res.status(200).json({ 
      status: 'success', 
      received: true, 
      id: savedSWF._id,
      timestamp: new Date().toISOString(),
      processingTime: `${processingTime}ms`
    });

  } catch (err) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Error processing SWF message:', err);
    console.error('Stack trace:', err.stack);

    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to process SWF message',
      error: err.message,
      timestamp: new Date().toISOString(),
      processingTime: `${processingTime}ms`
    });
  }
});


app.get('/all-swf', async (req, res) => {
  try {
    // Fetch all SWF documents, newest first
    const allSwf = await SWF.find({})
      .sort({ receivedAt: -1 });
    res.status(200).json(allSwf);

  } catch (err) {
    console.error('❌ Error fetching SWF messages:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch SWF messages',
      error: err.message
    });
  }
});



// --- ENHANCED LATEST SMS ROUTE ---
app.get('/latest-sms', async (req, res) => {
  try {
    console.log('📋 Fetching latest SMS...');
    
    // Fetch the latest SMS document (sorted by creation time)
    const latestSMS = await SMS.findOne().sort({ createdAt: -1 });

    if (!latestSMS) {
      return res.status(404).json({ error: 'No SMS messages found' });
    }

    // Parse key-value pairs from the message
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

    console.log('✅ Latest SMS retrieved successfully');
    return res.status(200).json({
      id: latestSMS._id,
      sender: latestSMS.sender,
      receivedAt: latestSMS.receivedAt,
      parsedFields: fields
    });
  } catch (err) {
    console.error('❌ Error retrieving latest SMS:', err);
    res.status(500).json({ error: 'Failed to retrieve latest SMS' });
  }
});

// --- ENHANCED ALL SMS ROUTE ---
app.get('/all-sms', async (req, res) => {
  try {
    console.log('📋 Fetching all SMS messages...');
    
    // Add pagination support
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Fetch SMS documents with pagination
    const allSMS = await SMS.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await SMS.countDocuments();

    if (!allSMS || allSMS.length === 0) {
      return res.status(404).json({ error: 'No SMS messages found' });
    }

    // Map each SMS to include parsed fields
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
        parsedFields: fields
      };
    });

    console.log(`✅ Retrieved ${result.length} SMS messages (page ${page})`);
    return res.status(200).json({
      data: result,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    console.error('❌ Error retrieving all SMS messages:', err);
    res.status(500).json({ error: 'Failed to retrieve SMS messages' });
  }
});

// --- ENHANCED TOTAL VOLUME ROUTE ---
app.get('/total-volume', async (req, res) => {
  try {
    console.log('📊 Fetching total volume...');
    const counter = await VolumeCounter.findOne();
    const total = counter ? counter.totalVolume : 0;
    
    console.log('✅ Total volume retrieved:', total);
    res.json({ 
      totalVolume: total,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Error retrieving total volume:', err);
    res.status(500).json({ error: 'Failed to retrieve total volume' });
  }
});

/// --- ENHANCED FLOW DATA ROUTE WITH LEVEL EXTRACTION ---
app.get('/flow-data', async (req, res) => {
  try {
    console.log('📊 Building flow data...');

    const hoursBack = parseInt(req.query.hours) || 24;
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    const smsRecords = await SMS.find({ receivedAt: { $gte: since } }).sort({ receivedAt: 1 });

    const locationMap = {
      Sangli: [1, 2, 3, 4, 5],
      Sangola: [6, 7, 8, 9, 10],
      Atapadi: [11, 12, 13, 14, 15]
    };

    const locationPoints = {
      Sangli: [],
      Sangola: [],
      Atapadi: []
    };

    const allPoints = [];

    smsRecords.forEach(sms => {
      const dischargeMatch = sms.message.match(/Discharge\s*[-:=]?\s*(\d+)/i);
      const deviceIdMatch = sms.message.match(/Device\s*id\s*[-:=]?\s*(\d+)/i);
      const volumeMatch = sms.message.match(/Volume\s*[-:=]?\s*(\d+)/i);
      const levelMatch = sms.message.match(/Level\s*[-:=]?\s*(\d+)/i);  // ✅ Level extraction

      const discharge = dischargeMatch ? Number(dischargeMatch[1]) : null;
      const deviceId = deviceIdMatch ? parseInt(deviceIdMatch[1], 10) : null;
      const volume = volumeMatch ? Number(volumeMatch[1]) : null;
      const level = levelMatch ? Number(levelMatch[1]) : null;  // ✅ Parse level

      if (
        discharge !== null && !isNaN(discharge) &&
        deviceId !== null && !isNaN(deviceId)
      ) {
        const point = {
          x: sms.receivedAt.toISOString(),
          y: discharge,
          deviceId,
          volume: volume || 0,
          level: level || 0,          // ✅ Include level in point
          location: null
        };

        if (locationMap.Sangli.includes(deviceId)) {
          locationPoints.Sangli.push(point);
          point.location = 'Sangli';
        } else if (locationMap.Sangola.includes(deviceId)) {
          locationPoints.Sangola.push(point);
          point.location = 'Sangola';
        } else if (locationMap.Atapadi.includes(deviceId)) {
          locationPoints.Atapadi.push(point);
          point.location = 'Atapadi';
        }

        allPoints.push(point);
      }
    });

    // Prepare bar chart data (latest per device)
    const lastByDevice = {};
    allPoints.forEach(p => {
      lastByDevice[p.deviceId] = p; // keep latest
    });
    const barChartByDevice = Object.values(lastByDevice);

    // Prepare hourly average
    const hourlyBuckets = {};
    allPoints.forEach(p => {
      const hourKey = new Date(p.x).toISOString().slice(0, 13) + ':00';
      if (!hourlyBuckets[hourKey]) hourlyBuckets[hourKey] = [];
      hourlyBuckets[hourKey].push(p.y);
    });
    const barChartByHour = Object.entries(hourlyBuckets).map(([x, ys]) => ({
      x,
      y: Math.round(ys.reduce((a, b) => a + b, 0) / ys.length)
    }));

    console.log(`📊 Flow data points by location built for last ${hoursBack} hours.`);
    res.json({
      points: allPoints,
      barChartByDevice,
      barChartByHour,
      timeRange: `${hoursBack} hours`,
      totalRecords: smsRecords.length,
      summary: {
        Sangli: locationPoints.Sangli.length,
        Sangola: locationPoints.Sangola.length,
        Atapadi: locationPoints.Atapadi.length
      },
      metadata: {
        tabs: ['Sangli', 'Sangola', 'Atapadi'],
        chartType: 'bar',
        groupBy: 'location',
        includes: ['discharge', 'volume', 'level']  // ✅ Metadata shows level included
      }
    });
  } catch (err) {
    console.error('❌ Error building flow data:', err);
    res.status(500).json({ error: 'Failed to fetch flow data' });
  }
});

// *** ADDED: Import and use the download route ***
const downloadReportRoute = require('./downloadReportRoute');  // Adjust path if needed
app.use('/download', downloadReportRoute);
app.use('/download', swfSheetReportRoute); // ✅ Enables /download/swf-sheet

// Enhanced error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.error('Stack trace:', err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🔄 SIGINT received, shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  });
});


const os = require('os');

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




// --- Start server ---
app.listen(PORT, () => {
  const ipv4 = getLocalIPv4();
  console.log(`✅ SMS Receiver running on port ${PORT}`);
  console.log(`🔗 Webhook URL (Localhost): http://localhost:${PORT}/receive-sms`);
  console.log(`🔗 Webhook URL (IPv4):      http://${ipv4}:${PORT}/receive-sms`);
  console.log(`📊 Health check:            http://${ipv4}:${PORT}/health`);
  console.log(`🎯 Environment:             ${process.env.NODE_ENV || 'development'}`);
});