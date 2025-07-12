// const express = require('express');
// const router = express.Router();
// const PDFDocument = require('pdfkit');
// const path = require('path');
// const SMS = require('./model/SMS');

// const colors = {
//   primary: '#2C3E50',
//   secondary: '#34495E',
//   light: '#F9FAFB',
//   border: '#DDE1E4',
//   text: '#333333'
// };

// const MAX_VOLUME_PER_12_HOURS = 30000; // m³
// const MAX_FLOW_RATE = 0.65; // m³/s

// const getLocation = (deviceId) => {
//   if (deviceId >= 1 && deviceId <= 5) return 'Sangli';
//   if (deviceId >= 6 && deviceId <= 10) return 'Sangola';
//   if (deviceId >= 11 && deviceId <= 15) return 'Atapadi';
//   return 'Unknown';
// };

// const parseMessage = (message) => {
//   const result = { deviceId: null, discharge: null };
//   if (typeof message !== 'string') return result;

//   const idMatch = message.match(/(?:device\s*id|id)[\s\-:=]*(\d+)/i);
//   const dischargeMatch = message.match(/discharge[\s\-:=]*([\d.]+)/i);

//   if (idMatch) result.deviceId = parseInt(idMatch[1]);
//   if (dischargeMatch) result.discharge = parseFloat(dischargeMatch[1]);

//   return result;
// };

// const formatDate = (date) => date.toLocaleString('en-IN', {
//   timeZone: 'Asia/Kolkata',
//   hour12: true,
//   day: '2-digit',
//   month: '2-digit',
//   year: 'numeric',
//   hour: '2-digit',
//   minute: '2-digit'
// });

// const checkWarnings = (volume, flowRate) => {
//   const reasons = [];
//   if (volume > MAX_VOLUME_PER_12_HOURS) reasons.push('Volume');
//   if (flowRate > MAX_FLOW_RATE) reasons.push('Discharge');
//   return reasons;
// };

// const addHeader = (doc, location, start, end, totalDevices) => {
//   doc.fillColor(colors.primary).fontSize(20).font('Helvetica-Bold')
//     .text('Sangli Irrigation Department', { align: 'center' });

//   doc.fontSize(16).text('Flowmeter Report', { align: 'center' });

//   doc.moveDown(1).font('Helvetica').fontSize(11).fillColor(colors.secondary);
//   doc.text(`Location: ${location}`);
//   doc.text(`Period: ${formatDate(new Date(start))} - ${formatDate(new Date(end))}`);
//   doc.text(`Total Devices: ${totalDevices}`);

//   doc.strokeColor(colors.border).lineWidth(1).moveTo(50, doc.y + 10).lineTo(545, doc.y + 10).stroke();
//   doc.moveDown(2);
// };

// const addTable = (doc, tableData) => {
//   const headers = ['Device ID', 'Location', 'Start Time', 'End Time', 'Volume (m³)', 'Warning'];
//   const colWidths = [60, 70, 100, 100, 100, 100];
//   let currentY = doc.y;

//   doc.fillColor(colors.light).rect(50, currentY, 530, 25).fill();
//   doc.fillColor(colors.primary).font('Helvetica-Bold').fontSize(10);

//   let x = 50;
//   headers.forEach((h, i) => {
//     doc.text(h, x + 5, currentY + 8, { width: colWidths[i] - 10, align: 'center' });
//     x += colWidths[i];
//   });

//   currentY += 25;
//   doc.font('Helvetica').fontSize(9);

//   tableData.forEach((row, idx) => {
//     const reasons = checkWarnings(row.volume, row.maxFlowRate);
//     const hasWarning = reasons.length > 0;

//     if (currentY > 720) {
//       doc.addPage();
//       currentY = 50;
//     }

//     doc.fillColor(idx % 2 === 0 ? '#F8F9FA' : '#FFFFFF')
//        .rect(50, currentY, 530, 20)
//        .fill();

//     if (hasWarning) {
//       doc.fillColor('#FFEFEF').rect(50, currentY, 530, 20).fill();
//     }

//     doc.fillColor(colors.text);
//     const cells = [
//       row.deviceId.toString(),
//       row.location,
//       formatDate(new Date(row.startTime)),
//       formatDate(new Date(row.endTime)),
//       row.volume.toFixed(3),
//       hasWarning ? `⚠️ ${reasons.join(', ')}` : ''
//     ];

//     x = 50;
//     cells.forEach((cell, i) => {
//       doc.text(cell, x + 5, currentY + 6, { width: colWidths[i] - 10, align: 'center' });
//       x += colWidths[i];
//     });

//     currentY += 20;
//   });

//   doc.moveDown(2);
// };

// router.get('/data-range', async (req, res) => {
//   try {
//     const { start, end, location } = req.query;
//     if (!start || !end || !location) {
//       return res.status(400).json({ error: 'Missing parameters' });
//     }

//     const startDate = new Date(start);
//     const endDate = new Date(end);
//     endDate.setHours(23, 59, 59, 999);

//     const smsRecords = await SMS.find({ receivedAt: { $gte: startDate, $lte: endDate } })
//       .select('message receivedAt')
//       .sort({ receivedAt: 1 })
//       .lean();

//     const readingsByDevice = {};

//     smsRecords.forEach(sms => {
//       const { deviceId, discharge } = parseMessage(sms.message);
//       if (!deviceId || discharge == null) return;
//       const loc = getLocation(deviceId);
//       if (loc !== location) return;

//       if (!readingsByDevice[deviceId]) readingsByDevice[deviceId] = [];
//       readingsByDevice[deviceId].push({ discharge, timestamp: new Date(sms.receivedAt) });
//     });

//     const tableData = [];

//     for (const deviceId in readingsByDevice) {
//       const readings = readingsByDevice[deviceId].sort((a, b) => a.timestamp - b.timestamp);

//       for (let i = 0; i < readings.length - 1; i++) {
//         const time1 = readings[i].timestamp;
//         const time2 = readings[i + 1].timestamp;

//         const intervalStart = new Date(Math.floor(time1.getTime() / (12 * 60 * 60 * 1000)) * 12 * 60 * 60 * 1000);
//         const intervalEnd = new Date(intervalStart.getTime() + 12 * 60 * 60 * 1000 - 1);

//         if (time2 > intervalEnd) continue;

//         const discharge1 = readings[i].discharge;
//         const discharge2 = readings[i + 1].discharge;
//         const avgDischarge = (discharge1 + discharge2) / 2;
//         const seconds = (time2 - time1) / 1000;
//         const flowRate = avgDischarge / 1000 / 60; // L/min to m³/s
//         const volume = (avgDischarge * seconds) / 1_000_000;

//         tableData.push({
//           deviceId: Number(deviceId),
//           location: getLocation(Number(deviceId)),
//           startTime: time1,
//           endTime: time2,
//           volume,
//           maxFlowRate: flowRate
//         });
//       }
//     }

//     const doc = new PDFDocument({
//       bufferPages: true,
//       info: {
//         Title: `${location} Flowmeter Report`,
//         Author: 'Smart Irrigation System'
//       }
//     });

//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', `attachment; filename="${location}-volume-report.pdf"`);
//     doc.pipe(res);

//     const totalDevices = Object.keys(readingsByDevice).length;
//     addHeader(doc, location, startDate, endDate, totalDevices);

//     if (tableData.length > 0) {
//       addTable(doc, tableData);

//       const totalWarnings = tableData.filter(row => checkWarnings(row.volume, row.maxFlowRate).length > 0);
//       const volumeWarnings = tableData.filter(row => row.volume > MAX_VOLUME_PER_12_HOURS).length;
//       const flowWarnings = tableData.filter(row => row.maxFlowRate > MAX_FLOW_RATE).length;

//       doc.fillColor('red')
//          .font('Helvetica-Bold')
//          .text(`⚠️ Warning Summary`, 50, doc.y + 20)
//          .fontSize(11)
//          .fillColor(colors.secondary)
//          .text(`• Total Warnings: ${totalWarnings.length}`, 60)
//          .text(`• Volume Exceeded: ${volumeWarnings} times`)
//          .text(`• Discharge Exceeded: ${flowWarnings} times`);
//     } else {
//       doc.fontSize(12).text('No data found for the selected period.', { align: 'center' });
//     }

//     doc.end();

//   } catch (error) {
//     console.error('PDF generation error:', error);
//     if (!res.headersSent) {
//       res.status(500).json({ error: 'PDF generation failed' });
//     }
//   }
// });

// module.exports = router;



const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const path = require('path');
const SMS = require('./model/SMS');

const colors = {
  primary: '#2C3E50',
  secondary: '#34495E',
  light: '#F9FAFB',
  border: '#DDE1E4',
  text: '#333333'
};

const MAX_VOLUME_PER_12_HOURS = 30000; // m³
const MAX_FLOW_RATE = 0.65; // m³/s

const getLocation = (deviceId) => {
  if (deviceId >= 1 && deviceId <= 5) return 'Sangli';
  if (deviceId >= 6 && deviceId <= 10) return 'Sangola';
  if (deviceId >= 11 && deviceId <= 15) return 'Atapadi';
  return 'Unknown';
};

const parseMessage = (message) => {
  const result = { deviceId: null, discharge: null };
  if (typeof message !== 'string') return result;

  const idMatch = message.match(/(?:device\s*id|id)[\s\-:=]*(\d+)/i);
  const dischargeMatch = message.match(/discharge[\s\-:=]*([\d.]+)/i);

  if (idMatch) result.deviceId = parseInt(idMatch[1]);
  if (dischargeMatch) result.discharge = parseFloat(dischargeMatch[1]);

  return result;
};

const formatDate = (date) => date.toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata',
  hour12: true,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

const checkWarnings = (volume, flowRate) => {
  const reasons = [];
  if (volume > MAX_VOLUME_PER_12_HOURS) reasons.push('Volume');
  if (flowRate > MAX_FLOW_RATE) reasons.push('Discharge');
  return reasons;
};

const addHeader = (doc, location, start, end, totalDevices) => {
  doc.fillColor(colors.primary).fontSize(20).font('Helvetica-Bold')
    .text('Sangli Irrigation Department', { align: 'center' });

  doc.fontSize(16).text('Flowmeter Report', { align: 'center' });

  doc.moveDown(1).font('Helvetica').fontSize(11).fillColor(colors.secondary);
  doc.text(`Location: ${location}`);
  doc.text(`Period: ${formatDate(new Date(start))} - ${formatDate(new Date(end))}`);
  doc.text(`Total Devices: ${totalDevices}`);

  doc.strokeColor(colors.border).lineWidth(1).moveTo(50, doc.y + 10).lineTo(545, doc.y + 10).stroke();
  doc.moveDown(2);
};

const addTable = (doc, tableData) => {
  const headers = ['Device ID', 'Location', 'Start Time', 'End Time', 'Volume (m³)', 'Warning'];
  const colWidths = [60, 70, 100, 100, 100, 100];
  let currentY = doc.y;

  doc.fillColor(colors.light).rect(50, currentY, 530, 25).fill();
  doc.fillColor(colors.primary).font('Helvetica-Bold').fontSize(10);

  let x = 50;
  headers.forEach((h, i) => {
    doc.text(h, x + 5, currentY + 8, { width: colWidths[i] - 10, align: 'center' });
    x += colWidths[i];
  });

  currentY += 25;
  doc.font('Helvetica').fontSize(9);

  tableData.forEach((row, idx) => {
    const reasons = checkWarnings(row.volume, row.maxFlowRate);
    const hasWarning = reasons.length > 0;

    if (currentY > 720) {
      doc.addPage();
      currentY = 50;
    }

    doc.fillColor(idx % 2 === 0 ? '#F8F9FA' : '#FFFFFF')
       .rect(50, currentY, 530, 20)
       .fill();

    if (hasWarning) {
      doc.fillColor('#FFEFEF').rect(50, currentY, 530, 20).fill();
    }

    doc.fillColor(colors.text);
    const cells = [
      row.deviceId.toString(),
      row.location,
      formatDate(new Date(row.startTime)),
      formatDate(new Date(row.endTime)),
      row.volume.toFixed(3),
      hasWarning ? `⚠️ ${reasons.join(', ')}` : ''
    ];

    x = 50;
    cells.forEach((cell, i) => {
      doc.text(cell, x + 5, currentY + 6, { width: colWidths[i] - 10, align: 'center' });
      x += colWidths[i];
    });

    currentY += 20;
  });

  doc.moveDown(2);
};

router.get('/data-range', async (req, res) => {
  try {
    const { start, end, location } = req.query;
    
    // Enhanced validation
    if (!start || !end || !location) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing parameters: start, end, and location are required'
      });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid start date format'
      });
    }

    if (isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid end date format'
      });
    }

    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date must be before end date'
      });
    }

    endDate.setHours(23, 59, 59, 999);

    const smsRecords = await SMS.find({ receivedAt: { $gte: startDate, $lte: endDate } })
      .select('message receivedAt')
      .sort({ receivedAt: 1 })
      .lean();

    const readingsByDevice = {};

    smsRecords.forEach(sms => {
      const { deviceId, discharge } = parseMessage(sms.message);
      if (!deviceId || discharge == null) return;
      const loc = getLocation(deviceId);
      if (loc !== location) return;

      if (!readingsByDevice[deviceId]) readingsByDevice[deviceId] = [];
      readingsByDevice[deviceId].push({ discharge, timestamp: new Date(sms.receivedAt) });
    });

    const tableData = [];

    for (const deviceId in readingsByDevice) {
      const readings = readingsByDevice[deviceId].sort((a, b) => a.timestamp - b.timestamp);

      for (let i = 0; i < readings.length - 1; i++) {
        const time1 = readings[i].timestamp;
        const time2 = readings[i + 1].timestamp;

        const intervalStart = new Date(Math.floor(time1.getTime() / (12 * 60 * 60 * 1000)) * 12 * 60 * 60 * 1000);
        const intervalEnd = new Date(intervalStart.getTime() + 12 * 60 * 60 * 1000 - 1);

        if (time2 > intervalEnd) continue;

        const discharge1 = readings[i].discharge;
        const discharge2 = readings[i + 1].discharge;
        const avgDischarge = (discharge1 + discharge2) / 2;
        const seconds = (time2 - time1) / 1000;
        const flowRate = avgDischarge / 1000 / 60; // L/min to m³/s
        const volume = (avgDischarge * seconds) / 1_000_000;

        tableData.push({
          deviceId: Number(deviceId),
          location: getLocation(Number(deviceId)),
          startTime: time1,
          endTime: time2,
          volume,
          maxFlowRate: flowRate
        });
      }
    }

    const doc = new PDFDocument({
      bufferPages: true,
      info: {
        Title: `${location} Flowmeter Report`,
        Author: 'Smart Irrigation System'
      }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${location}-volume-report.pdf"`);
    doc.pipe(res);

    const totalDevices = Object.keys(readingsByDevice).length;
    addHeader(doc, location, startDate, endDate, totalDevices);

    if (tableData.length > 0) {
      addTable(doc, tableData);

      const totalWarnings = tableData.filter(row => checkWarnings(row.volume, row.maxFlowRate).length > 0);
      const volumeWarnings = tableData.filter(row => row.volume > MAX_VOLUME_PER_12_HOURS).length;
      const flowWarnings = tableData.filter(row => row.maxFlowRate > MAX_FLOW_RATE).length;

      doc.fillColor('red')
         .font('Helvetica-Bold')
         .text(`⚠️ Warning Summary`, 50, doc.y + 20)
         .fontSize(11)
         .fillColor(colors.secondary)
         .text(`• Total Warnings: ${totalWarnings.length}`, 60)
         .text(`• Volume Exceeded: ${volumeWarnings} times`)
         .text(`• Discharge Exceeded: ${flowWarnings} times`);
    } else {
      doc.fontSize(12).text('No data found for the selected period.', { align: 'center' });
    }

    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false,
        error: 'PDF generation failed',
        details: error.message
      });
    }
  }
});

module.exports = router;