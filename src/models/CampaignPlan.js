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
    branches: { type: [mongoose.Schema.Types.ObjectId], ref: 'Branch' },
    segments: { type: [mongoose.Schema.Types.ObjectId], ref: 'Segment' },
    competitors: { type: [mongoose.Schema.Types.ObjectId], ref: 'Competitor' },
    swotAnalysis: {
      strengths: { type: [String], default: [] },
      weaknesses: { type: [String], default: [] },
      opportunities: { type: [String], default: [] },
      threats: { type: [String], default: [] },
    },
    description: { type: String },
    objectives: [
      {
        name: { type: String, required: true },
        ar: { type: String, required: true },
        description: { type: String },
        descriptionAr: { type: String },
      },
    ],
    strategy: {
      budget: { type: Number, min: 0 },
      timeline: [
        {
          timelineStart: { type: String },
          timelineEnd: { type: String },
          objectiveEn: { type: String },
          objectiveAr: { type: String },
        },
      ],
      description: { type: String },
      descriptionAr: { type: String },
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
