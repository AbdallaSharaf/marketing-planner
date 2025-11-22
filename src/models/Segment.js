const mongoose = require('mongoose');

const SegmentSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      index: true,
    },
    name: { type: String, required: true },
    description: { type: String },
    productName: { type: String },
    ageRange: [{ type: String }],
    gender: [{
      type: String,
      enum: ['all', 'male', 'female', 'other'],
      default: 'all',
    }],
    area: [{ type: String }],
    governorate: [{ type: String }],
    note: { type: String },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Segment', SegmentSchema);
