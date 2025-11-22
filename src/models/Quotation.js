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
    package: { type: mongoose.Schema.Types.ObjectId, ref: 'Ppackage' },
    customPrice: Number,
  },
  { _id: false }
);

const QuotationSchema = new mongoose.Schema(
  {
    quotationNumber: { type: String, unique: true },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      index: true,
    },
    clientName: { type: String }, // Add clientName field for non-existing clients
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
    note: { type: String },
    status: {
      type: String,
      enum: ['draft', 'sent', 'approved', 'rejected'],
      default: 'draft',
    },
    validUntil: { type: Date },
    sentAt: { type: Date },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    overriddenTotal: { type: Number, default: null },
    isTotalOverridden: { type: Boolean, default: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

QuotationSchema.index({ clientId: 1, status: 1 });
QuotationSchema.index({ clientName: 1 }); // Add index for clientName

module.exports = mongoose.model('Quotation', QuotationSchema);
