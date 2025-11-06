const Service = require('../models/Service');
const Joi = require('joi');

const createSchema = Joi.object({
  en: Joi.string().required(),
  ar: Joi.string().required(),
  description: Joi.string().allow('', null),
  category: Joi.string()
    .valid('photography', 'web', 'reels', 'other')
    .default('other'),
  price: Joi.number().min(0),
  discount: Joi.number().min(0).default(0),
  discountType: Joi.string().valid('percentage', 'fixed').default('percentage'),
  isGlobal: Joi.boolean().default(true),
  clientId: Joi.string().allow(null),
});

exports.list = async function (req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const skip = (page - 1) * limit;
    const filter = { deletedAt: null };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.isGlobal !== undefined)
      filter.isGlobal = req.query.isGlobal === 'true';
    if (req.query.clientId) filter.clientId = req.query.clientId;
    const total = await Service.countDocuments(filter);
    const services = await Service.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    res.json({
      data: services,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

exports.create = async function (req, res, next) {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ error: { code: 'VALIDATION_ERROR', message: error.message } });
    // Enforce isGlobal/clientId rule
    if (value.isGlobal && value.clientId)
      return res
        .status(400)
        .json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Global service cannot have clientId',
          },
        });
    if (!value.isGlobal && !value.clientId)
      return res
        .status(400)
        .json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Client-specific service must have clientId',
          },
        });
    const service = new Service(value);
    await service.save();
    res.status(201).json({ service });
  } catch (err) {
    next(err);
  }
};

exports.get = async function (req, res, next) {
  try {
    const service = await Service.findById(req.params.id);
    if (!service || service.deletedAt)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Service not found' } });
    res.json({ service });
  } catch (err) {
    next(err);
  }
};

exports.update = async function (req, res, next) {
  try {
    const allowed = [
      'en',
      'ar',
      'description',
      'category',
      'price',
      'discount',
      'discountType',
      'isGlobal',
    ];
    const updates = {};
    for (const k of allowed)
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    const service = await Service.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });
    if (!service)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Service not found' } });
    res.json({ service });
  } catch (err) {
    next(err);
  }
};

exports.remove = async function (req, res, next) {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, {
      deletedAt: new Date(),
    });
    if (!service)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Service not found' } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
