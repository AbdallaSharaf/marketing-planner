const CampaignPlan = require('../models/CampaignPlan');
const Joi = require('joi');
const { logAudit } = require('../utils/audit');

const schema = Joi.object({
  clientId: Joi.string().required(),
  planName: Joi.string().required(),
  objectives: Joi.array().items(
    Joi.object({ id: Joi.string(), en: Joi.string(), ar: Joi.string() })
  ),
  strategies: Joi.array().items(
    Joi.object({ id: Joi.string(), en: Joi.string(), ar: Joi.string() })
  ),
  serviceIds: Joi.array().items(Joi.string()),
  servicesPricing: Joi.object(),
  budget: Joi.number().min(0),
  timeline: Joi.string(),
  startDate: Joi.date().iso(),
  duration: Joi.string(),
});

exports.list = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const skip = (page - 1) * limit;
    const filter = { deletedAt: null };
    if (req.query.clientId) filter.clientId = req.query.clientId;
    if (req.query.status) filter.status = req.query.status;
    const total = await CampaignPlan.countDocuments(filter);
    const items = await CampaignPlan.find(filter)
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
    const doc = new CampaignPlan({ ...value, createdBy: req.user._id });
    await doc.save();
    await logAudit({
      userId: req.user._id,
      action: 'create',
      entityType: 'CampaignPlan',
      entityId: doc._id,
      changes: value,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
    res.status(201).json({ campaign: doc });
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const item = await CampaignPlan.findById(req.params.id);
    if (!item || item.deletedAt)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Campaign not found' } });
    res.json({ campaign: item });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const updates = req.body;
    const item = await CampaignPlan.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });
    if (!item)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Campaign not found' } });
    await logAudit({
      userId: req.user._id,
      action: 'update',
      entityType: 'CampaignPlan',
      entityId: item._id,
      changes: updates,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
    res.json({ campaign: item });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const item = await CampaignPlan.findByIdAndUpdate(req.params.id, {
      deletedAt: new Date(),
    });
    if (!item)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Campaign not found' } });
    await logAudit({
      userId: req.user._id,
      action: 'delete',
      entityType: 'CampaignPlan',
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

exports.generateStrategy = async (req, res, next) => {
  try {
    // placeholder: generate a simple finalStrategy text
    const item = await CampaignPlan.findById(req.params.id);
    if (!item)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Campaign not found' } });
    const language = req.body.language === 'ar' ? 'ar' : 'en';
    const finalStrategy = `Generated strategy (${language}) for plan ${item.planName}`;
    item.finalStrategy = finalStrategy;
    await item.save();
    res.json({ finalStrategy });
  } catch (err) {
    next(err);
  }
};
