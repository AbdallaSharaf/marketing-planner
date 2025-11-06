const mongoose = require('mongoose');

const CompetitorSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      index: true,
    },
    name: { type: String, required: true },
    description: { type: String },
    swot_strengths: { type: [String], default: [] },
    swot_weaknesses: { type: [String], default: [] },
    swot_opportunities: { type: [String], default: [] },
    swot_threats: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Competitor', CompetitorSchema);
