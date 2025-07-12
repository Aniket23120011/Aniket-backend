const mongoose = require('mongoose');

const swfSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  receivedAt: {
    type: Date,
    required: true,
  },
  metadata: {
    package: String,
    ticker: String,
    category: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('SWF', swfSchema);
