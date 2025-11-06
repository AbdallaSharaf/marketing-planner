const mongoose = require('mongoose');

const FeatureSchema = new mongoose.Schema(
  { en: String, ar: String, quantity: String },
  { _id: false }
);

const PackageSchema = new mongoose.Schema(
  {
    nameEn: { type: String, required: true },
    nameAr: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage',
    },
    features: { type: [FeatureSchema], default: [] },
    isActive: { type: Boolean, default: true },
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

PackageSchema.index({ isActive: 1 });

module.exports = mongoose.model('Package', PackageSchema);
