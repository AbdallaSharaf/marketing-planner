// models/ContractTerm.js
const mongoose = require('mongoose');

const ContractTermSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
    },
    keyAr: {
      type: String,
      required: true,
    },
    value: {
      type: String,
    },
    valueAr: {
      type: String,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

ContractTermSchema.index({ category: 1, isStandard: 1 });

module.exports = mongoose.model('ContractTerm', ContractTermSchema);
