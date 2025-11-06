const AuditLog = require('../models/AuditLog');

async function logAudit({
  userId,
  action,
  entityType,
  entityId,
  changes,
  ipAddress,
  userAgent,
}) {
  try {
    await AuditLog.create({
      userId,
      action,
      entityType,
      entityId,
      changes,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    // swallow errors to avoid blocking main flow; in production log to monitoring
    console.error('Failed to write audit log', err.message);
  }
}

module.exports = { logAudit };
