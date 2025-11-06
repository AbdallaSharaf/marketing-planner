const Contract = require('../models/Contract');
const Joi = require('joi');
const { logAudit } = require('../utils/audit');

const createSchema = Joi.object({
  clientId: Joi.string().required(),
  packageId: Joi.string().allow(null),
  campaignPlanId: Joi.string().allow(null),
  quotationId: Joi.string().allow(null),
  contractTerms: Joi.string().allow('', null),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
  value: Joi.number().min(0).required(),
});

exports.list = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const skip = (page - 1) * limit;
    const filter = { deletedAt: null };
    if (req.query.clientId) filter.clientId = req.query.clientId;
    if (req.query.status) filter.status = req.query.status;
    const total = await Contract.countDocuments(filter);
    const items = await Contract.find(filter)
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
    const { error, value } = createSchema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ error: { code: 'VALIDATION_ERROR', message: error.message } });
    // require at least one of packageId, campaignPlanId, quotationId
    if (!value.packageId && !value.campaignPlanId && !value.quotationId)
      return res
        .status(400)
        .json({
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'At least one of packageId, campaignPlanId, or quotationId is required',
          },
        });
    if (new Date(value.endDate) <= new Date(value.startDate))
      return res
        .status(400)
        .json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'endDate must be after startDate',
          },
        });
    const doc = new Contract({ ...value, createdBy: req.user._id });
    await doc.save();
    await logAudit({
      userId: req.user._id,
      action: 'create',
      entityType: 'Contract',
      entityId: doc._id,
      changes: doc.toObject(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
    res.status(201).json({ contract: doc });
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const item = await Contract.findById(req.params.id);
    if (!item || item.deletedAt)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Contract not found' } });
    res.json({ contract: item });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const updates = req.body;
    if (
      updates.startDate &&
      updates.endDate &&
      new Date(updates.endDate) <= new Date(updates.startDate)
    )
      return res
        .status(400)
        .json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'endDate must be after startDate',
          },
        });
    const item = await Contract.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });
    if (!item)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Contract not found' } });
    await logAudit({
      userId: req.user._id,
      action: 'update',
      entityType: 'Contract',
      entityId: item._id,
      changes: updates,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
    res.json({ contract: item });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const item = await Contract.findByIdAndUpdate(req.params.id, {
      deletedAt: new Date(),
    });
    if (!item)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Contract not found' } });
    await logAudit({
      userId: req.user._id,
      action: 'delete',
      entityType: 'Contract',
      entityId: item._id,
      changes: null,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.sign = async (req, res, next) => {
  try {
    const signedDate = req.body.signedDate
      ? new Date(req.body.signedDate)
      : new Date();
    const item = await Contract.findByIdAndUpdate(
      req.params.id,
      { signedDate },
      { new: true }
    );
    if (!item)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Contract not found' } });
    res.json({ contract: item });
  } catch (err) {
    next(err);
  }
};

exports.activate = async (req, res, next) => {
  try {
    const item = await Contract.findByIdAndUpdate(
      req.params.id,
      { status: 'active' },
      { new: true }
    );
    if (!item)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Contract not found' } });
    res.json({ contract: item });
  } catch (err) {
    next(err);
  }
};

exports.complete = async (req, res, next) => {
  try {
    const item = await Contract.findByIdAndUpdate(
      req.params.id,
      { status: 'completed' },
      { new: true }
    );
    if (!item)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Contract not found' } });
    res.json({ contract: item });
  } catch (err) {
    next(err);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const reason = req.body.reason || '';
    const item = await Contract.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled', note: reason },
      { new: true }
    );
    if (!item)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Contract not found' } });
    res.json({ contract: item });
  } catch (err) {
    next(err);
  }
};

exports.renew = async (req, res, next) => {
  try {
    const { newStartDate, newEndDate, newValue } = req.body;
    if (!newStartDate || !newEndDate)
      return res
        .status(400)
        .json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'newStartDate and newEndDate required',
          },
        });
    if (new Date(newEndDate) <= new Date(newStartDate))
      return res
        .status(400)
        .json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'endDate must be after startDate',
          },
        });
    const item = await Contract.findByIdAndUpdate(
      req.params.id,
      {
        startDate: newStartDate,
        endDate: newEndDate,
        value: newValue,
        status: 'renewed',
      },
      { new: true }
    );
    if (!item)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Contract not found' } });
    res.json({ contract: item });
  } catch (err) {
    next(err);
  }
};
