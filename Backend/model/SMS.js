// const mongoose = require('mongoose');

// const smsSchema = new mongoose.Schema({
//   sender: {
//     type: String,
//     required: true,
//   },
//   message: {
//     type: String,
//     required: true,
//   },
//   receivedAt: {
//     type: Date,
//     required: true,
//   },
//   latitude: {
//     type: Number,
//     required: true,
//   },
//   longitude: {
//     type: Number,
//     required: true,
//   },
//   metadata: {
//     package: String,
//     ticker: String,
//     category: String,
//   },
// }, { timestamps: true });

// module.exports = mongoose.model('SMS', smsSchema);


const mongoose = require('mongoose');

const smsSchema = new mongoose.Schema({
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
  latitude: {
    type: Number,
    required: false,
  },
  longitude: {
    type: Number,
    required: false,
  },
  metadata: {
    package: String,
    ticker: String,
    category: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('SMS', smsSchema);
