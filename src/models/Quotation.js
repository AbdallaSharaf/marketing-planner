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
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
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
    servicesPricing: { type: [ServicePricingSchema], default: [] },
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

QuotationSchema.virtual('services', {
  ref: 'Service',
  localField: '_id',
  foreignField: 'clientId',
});


QuotationSchema.index({ clientId: 1, status: 1 });

module.exports = mongoose.model('Quotation', QuotationSchema);
