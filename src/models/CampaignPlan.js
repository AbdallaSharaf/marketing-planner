const mongoose = require('mongoose');

const ObjSchema = new mongoose.Schema(
  { id: String, en: String, ar: String },
  { _id: false }
);

const CampaignPlanSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      index: true,
    },
    planName: { type: String },
    objectives: { type: [ObjSchema], default: [] },
    strategies: { type: [ObjSchema], default: [] },
    servicesPricing: { type: Object, default: {} },
    budget: { type: Number, default: 0 },
    timeline: { type: String },
    startDate: { type: Date },
    duration: { type: String },
    finalStrategy: { type: String },
    status: {
      type: String,
      enum: ['draft', 'active', 'completed', 'cancelled'],
      default: 'draft',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

CampaignPlanSchema.index({ clientId: 1, status: 1 });

module.exports = mongoose.model('CampaignPlan', CampaignPlanSchema);
