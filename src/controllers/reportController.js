const Report = require('../models/Report');
const Joi = require('joi');
const { logAudit } = require('../utils/audit');

const schema = Joi.object({
  clientId: Joi.string().required(),
  reportType: Joi.string()
    .valid('monthly', 'quarterly', 'campaign', 'custom')
    .default('custom'),
  period: Joi.string().allow('', null),
  title: Joi.string().allow('', null),
  metrics: Joi.object().default({}),
  platforms: Joi.array().items(Joi.object()),
  topPosts: Joi.array().items(Joi.object()),
});

exports.list = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const skip = (page - 1) * limit;
    const filter = { deletedAt: null };
    if (req.query.clientId) filter.clientId = req.query.clientId;
    if (req.query.reportType) filter.reportType = req.query.reportType;
    const total = await Report.countDocuments(filter);
    const items = await Report.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    res.json({
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { error, value } = schema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ error: { code: 'VALIDATION_ERROR', message: error.message } });
    const doc = new Report({ ...value, generatedBy: req.user._id });
    await doc.save();
    await logAudit({
      userId: req.user._id,
      action: 'create',
      entityType: 'Report',
      entityId: doc._id,
      changes: doc.toObject(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
    res.status(201).json({ report: doc });
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const doc = await Report.findById(req.params.id);
    if (!doc || doc.deletedAt)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Report not found' } });
    res.json({ report: doc });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const updates = req.body;
    const doc = await Report.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });
    if (!doc)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Report not found' } });
    await logAudit({
      userId: req.user._id,
      action: 'update',
      entityType: 'Report',
      entityId: doc._id,
      changes: updates,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
    res.json({ report: doc });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const doc = await Report.findByIdAndUpdate(req.params.id, {
      deletedAt: new Date(),
    });
    if (!doc)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Report not found' } });
    await logAudit({
      userId: req.user._id,
      action: 'delete',
      entityType: 'Report',
      entityId: doc._id,
      changes: null,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.pdf = async (req, res, next) => {
  try {
    const doc = await Report.findById(req.params.id);
    if (!doc)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Report not found' } });
    res.setHeader('Content-Type', 'application/pdf');
    res.send(Buffer.from(`Report PDF placeholder for ${doc.title || doc._id}`));
  } catch (err) {
    next(err);
  }
};

exports.excel = async (req, res, next) => {
  try {
    const doc = await Report.findById(req.params.id);
    if (!doc)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Report not found' } });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.send(Buffer.from(`Excel placeholder for ${doc.title || doc._id}`));
  } catch (err) {
    next(err);
  }
};
