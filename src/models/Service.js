const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema(
  {
    en: { type: String, required: true },
    ar: { type: String, required: true },
    description: { type: String },
    price: { type: Number, min: 0 },
    deleted: { type: Boolean, default: false },
    packages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Package' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', ServiceSchema);
