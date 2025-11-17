const mongoose = require('mongoose');

const CampaignPlanSchema = new mongoose.Schema(
  {
    planId: {
      type: String,
      unique: true,
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    description: { type: String },
    objectives: [
      {
        name: { type: String, required: true },
        description: { type: String },
      },
    ],
    strategy: {
      budget: { type: Number, min: 0 },
      timeline: { type: String },
      description: { type: String },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-generate planId before saving
CampaignPlanSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await mongoose.model('CampaignPlan').countDocuments();
    this.planId = `PLAN-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('CampaignPlan', CampaignPlanSchema);
