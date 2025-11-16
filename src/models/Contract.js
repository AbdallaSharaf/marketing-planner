const mongoose = require('mongoose');

const ContractSchema = new mongoose.Schema(
  {
    contractNumber: { type: String, unique: true },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      index: true,
    },
    value: { type: Number, default: 0 },
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
    contractTerms: { type: [String], default: [] },
    startDate: { type: Date },
    endDate: { type: Date },
    contractImage: { type: String },
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
    deleted: { type: Boolean, default: false },
    note: { type: String },
  },
  { timestamps: true }
);

ContractSchema.index({ clientId: 1, status: 1 });

module.exports = mongoose.model('Contract', ContractSchema);
