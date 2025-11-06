const mongoose = require('mongoose');

const SwotSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      unique: true,
      index: true,
    },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    opportunities: { type: [String], default: [] },
    threats: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SwotAnalysis', SwotSchema);
