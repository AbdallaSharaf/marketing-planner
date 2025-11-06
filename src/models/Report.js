const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      index: true,
    },
    reportType: {
      type: String,
      enum: ['monthly', 'quarterly', 'campaign', 'custom'],
      default: 'custom',
    },
    period: { type: String },
    title: { type: String },
    metrics: { type: Object, default: {} },
    platforms: { type: [Object], default: [] },
    topPosts: { type: [Object], default: [] },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ReportSchema.index({ clientId: 1, reportType: 1, period: 1 });

module.exports = mongoose.model('Report', ReportSchema);
