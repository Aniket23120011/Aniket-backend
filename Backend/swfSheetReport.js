

// module.exports = router;
const express = require('express');
const PDFDocument = require('pdfkit');
const axios = require('axios');

const router = express.Router();
const SHEET_URL = 'https://opensheet.elk.sh/1gXp7KngcraVZXc2T15hSTijyK2TJplWU5mDC2IZcxgE/1';

const getFlexibleValue = (row, keys) => {
  for (const key of keys) {
    if (row[key]?.trim()) return row[key].trim();
  }
  return '';
};

router.get('/swf-range', async (req, res) => {
  try {
    const response = await axios.get(SHEET_URL);
    const data = response.data;

    console.log('🔢 Total rows in sheet:', data.length);
    console.log('📋 Sample row:', data[0]);

    const cleaned = data.map((row, index) => {
      const lat = parseFloat(getFlexibleValue(row, ['latitude', 'Latitude', ' latitude']));
      const lng = parseFloat(getFlexibleValue(row, ['longitude', 'Longitude', ' longitude']));
      const timeRaw = getFlexibleValue(row, ['time', 'TIME']);

      if (!lat || !lng || !timeRaw) {
        console.log(`⛔ Row ${index + 1} skipped — Missing data`, { lat, lng, timeRaw });
        return null;
      }

      const parsedDate = new Date(timeRaw);
      if (isNaN(parsedDate)) {
        console.log(`❌ Invalid time format at row ${index + 1}:`, timeRaw);
        return null;
      }

      return {
        id: index + 1,
        device_id: getFlexibleValue(row, ['device_id', 'DEVICE ID', 'device id']),
        discharge: getFlexibleValue(row, ['discharge', 'DISCHARGE', ' discharge']),
        volume: getFlexibleValue(row, ['volume', 'VOLUME', ' volume']),
        time: parsedDate.toISOString(),
        location: getFlexibleValue(row, ['location', 'LOCATION']),
      };
    }).filter(Boolean);

    console.log('✅ Valid cleaned rows:', cleaned.length);

    const { start, end, location } = req.query;
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;

    const filtered = cleaned.filter(row => {
      const rowDate = new Date(row.time);
      const matchesLocation = location ? row.location === location : true;
      const matchesDate = (!startDate || rowDate >= startDate) && (!endDate || rowDate <= endDate);
      return matchesLocation && matchesDate;
    });

    console.log('📄 Filtered rows for PDF:', filtered.length);

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const filename = `SWF-Report-${new Date().toISOString().slice(0, 10)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    doc.fontSize(18).text('SWF Monitoring Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Total Entries: ${filtered.length}`, { align: 'left' });
    doc.moveDown(0.5);

    const headers = ['ID', 'Device ID', 'Discharge', 'Volume', 'Location', 'Time'];
    const widths = [40, 80, 80, 80, 100, 150];

    let x = doc.x;
    let y = doc.y;
    doc.font('Helvetica-Bold');
    headers.forEach((header, i) => {
      doc.text(header, x, y, { width: widths[i], align: 'left' });
      x += widths[i];
    });

    doc.moveDown(0.5);
    doc.font('Helvetica');

    filtered.forEach(row => {
      x = doc.x;
      y = doc.y;
      const values = [row.id, row.device_id, row.discharge, row.volume, row.location, row.time];
      values.forEach((val, i) => {
        doc.text(val, x, y, { width: widths[i], align: 'left' });
        x += widths[i];
      });
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    console.error('❌ SWF Report Generation Error:', err);
    res.status(500).json({ error: 'Failed to generate SWF report' });
  }
});

module.exports = router;
