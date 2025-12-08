// models/Contract.js
const mongoose = require('mongoose');

const ContractTermItemSchema = new mongoose.Schema(
  {
    term: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ContractTerm',
    },
    customKey: {
      type: String,
    },
    customKeyAr: {
      type: String,
    },
    customValue: {
      type: String,
    },
    customValueAr: {
      type: String,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
    isCustom: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const ContractSchema = new mongoose.Schema(
  {
    contractNumber: {
      type: String,
      unique: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      index: true,
    },
    value: {
      type: Number,
      default: 0,
    },
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
    },
    terms: [ContractTermItemSchema], // Single array for all terms with ordering
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    contractBody: {
      type: String,
    },
    contractBodyAr: {
      type: String,
    },
    contractImage: {
      type: String,
    },
    clientNameAr: {
      type: String,
    },
    clientName: {
      type: String,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'completed', 'cancelled', 'renewed'],
      default: 'draft',
    },
    signedDate: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    note: {
      type: String,
    },
  },
  { timestamps: true }
);

ContractSchema.index({ 'terms.term': 1 });

module.exports = mongoose.model('Contract', ContractSchema);
