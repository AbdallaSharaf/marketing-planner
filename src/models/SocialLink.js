const mongoose = require('mongoose');

const SocialLinkSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      index: true,
    },
    platform: { type: String },
    platformName: { type: String },
    url: { type: String },
    type: { type: String, enum: ['business', 'personal'], default: 'business' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SocialLink', SocialLinkSchema);
