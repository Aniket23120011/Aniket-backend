
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

// Allow CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

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

  let latitude = null;
  let longitude = null;
  const latMatch = message.match(/Latitude\s*[-:]?\s*([0-9.]+)/i);
  const longMatch = message.match(/Longitude\s*[-:]?\s*([0-9.]+)/i);
  if (latMatch && latMatch[1]) latitude = parseFloat(latMatch[1]);
  if (longMatch && longMatch[1]) longitude = parseFloat(longMatch[1]);

  console.log(`📍 Parsed coordinates: Latitude = ${latitude}, Longitude = ${longitude}`);

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

    res.status(200).json({ status: 'success', received: true, id: savedSMS._id });
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
        parsedFields: fields
      };
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ Error retrieving all SMS messages:', err);
    res.status(500).json({ error: 'Failed to retrieve SMS messages' });
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
          location
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


