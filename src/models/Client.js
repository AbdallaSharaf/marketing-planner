const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'active',
    },
    personal: {
      fullName: String,
      email: String,
      phone: String,
      position: String,
    },
    business: {
      name: { type: String, index: true },
      category: { type: String },
      description: String,
      mainOfficeAddress: String,
      establishedYear: Number,
    },
    contact: {
      businessPhone: String,
      businessWhatsApp: String,
      businessEmail: String,
      website: String,
    },
    deleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }

  }
);

// Add virtual for competitors
ClientSchema.virtual('competitors', {
  ref: 'Competitor',
  localField: '_id',
  foreignField: 'clientId'
});

ClientSchema.virtual('segments', {
  ref: 'Segment',
  localField: '_id',
  foreignField: 'clientId'
});

module.exports = mongoose.model('Client', ClientSchema);
