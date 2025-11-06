const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema(
  {
    en: { type: String, required: true },
    ar: { type: String, required: true },
    description: { type: String },
    category: {
      type: String,
      enum: ['photography', 'web', 'reels', 'other'],
      default: 'other',
    },
    price: { type: Number, min: 0 },
    discount: { type: Number, min: 0, default: 0 },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage',
    },
    isGlobal: { type: Boolean, default: true },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ServiceSchema.index({ category: 1 });
ServiceSchema.index({ clientId: 1 });

module.exports = mongoose.model('Service', ServiceSchema);
