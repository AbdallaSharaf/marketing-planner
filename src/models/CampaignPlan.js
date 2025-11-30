const mongoose = require('mongoose');

const CustomServiceSchema = new mongoose.Schema(
  {
    id: String,
    en: String,
    ar: String,
    price: Number,
    discount: Number,
    discountType: String,
  },
  { _id: false }
);

const ServicePricingSchema = new mongoose.Schema(
  {
    package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
    customPrice: Number,
  },
  { _id: false }
);

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
      // Removed budget field
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
    // Added pricing fields similar to quotation
    servicesPricing: { type: [ServicePricingSchema], default: [] },
    packages: { type: [mongoose.Schema.Types.ObjectId], ref: 'Package' },
    customServices: { type: [CustomServiceSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    discountValue: { type: Number, default: 0 },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage',
    },
    total: { type: Number, default: 0 },
    overriddenTotal: { type: Number, default: null },
    isTotalOverridden: { type: Boolean, default: false },
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
