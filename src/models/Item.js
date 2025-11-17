const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Item', ItemSchema);
