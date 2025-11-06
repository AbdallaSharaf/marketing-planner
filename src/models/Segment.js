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
    ageRange: { type: String },
    gender: {
      type: String,
      enum: ['all', 'male', 'female', 'other'],
      default: 'all',
    },
    interests: { type: [String], default: [] },
    incomeLevel: { type: String, enum: ['low', 'middle', 'high', 'varied'] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Segment', SegmentSchema);
