const mongoose = require('mongoose');

const BranchSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      index: true,
    },
    name: { type: String, required: true },
    address: { type: String },
    phone: { type: String },
    city: { type: String },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Branch', BranchSchema);
