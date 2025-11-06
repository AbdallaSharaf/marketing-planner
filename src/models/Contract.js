const mongoose = require('mongoose');

const ContractSchema = new mongoose.Schema(
  {
    contractNumber: { type: String, unique: true },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      index: true,
    },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
    campaignPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CampaignPlan',
    },
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
    contractTerms: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    value: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ['draft', 'active', 'completed', 'cancelled', 'renewed'],
      default: 'draft',
    },
    signedDate: { type: Date },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ContractSchema.index({ clientId: 1, status: 1 });

module.exports = mongoose.model('Contract', ContractSchema);
