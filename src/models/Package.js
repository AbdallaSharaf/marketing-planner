const mongoose = require('mongoose');

const PackageSchema = new mongoose.Schema(
  {
    nameEn: { type: String, required: true },
    nameAr: { type: String, required: true },
    description: { type: String }, // Fixed typo
    price: { type: Number, required: true, min: 0 },
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
    deleted: { type: Boolean, default: false }, // Changed to boolean
  },
  { timestamps: true }
);

module.exports = mongoose.model('Package', PackageSchema);
