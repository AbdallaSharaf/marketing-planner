const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    action: {
      type: String,
      enum: ['create', 'read', 'update', 'delete'],
      required: true,
    },
    entityType: { type: String },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    changes: { type: Object },
    ipAddress: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', AuditLogSchema);
