const Package = require('../models/Package');
const Service = require('../models/Service');
const Joi = require('joi');
const { calculatePackagePrice } = require('../utils/pricing');

const createSchema = Joi.object({
  nameEn: Joi.string().required(),
  nameAr: Joi.string().required(),
  price: Joi.number().min(0).required(),
  discount: Joi.number().min(0).default(0),
  discountType: Joi.string().valid('percentage', 'fixed').default('percentage'),
  features: Joi.array().items(
    Joi.object({
      en: Joi.string(),
      ar: Joi.string(),
      quantity: Joi.string().allow('', null),
    })
  ),
  serviceIds: Joi.array().items(Joi.string()),
});

exports.list = async function (req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const skip = (page - 1) * limit;
    const filter = { deletedAt: null };
    if (req.query.isActive !== undefined)
      filter.isActive = req.query.isActive === 'true';
    const total = await Package.countDocuments(filter);
    const packages = await Package.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate('services');
    res.json({
      data: packages,
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
    const services = [];
    if (value.serviceIds && value.serviceIds.length) {
      for (const id of value.serviceIds) {
        const s = await Service.findById(id);
        if (s) services.push(s._id);
      }
    }
    const pack = new Package({
      nameEn: value.nameEn,
      nameAr: value.nameAr,
      price: value.price,
      discount: value.discount,
      discountType: value.discountType,
      features: value.features || [],
      services,
      isActive: true,
    });
    // computed finalPrice could be returned in response
    pack.finalPrice = calculatePackagePrice(
      pack.price,
      pack.discount,
      pack.discountType
    );
    await pack.save();
    res.status(201).json({ package: pack });
  } catch (err) {
    next(err);
  }
};

exports.get = async function (req, res, next) {
  try {
    const pack = await Package.findById(req.params.id).populate('services');
    if (!pack || pack.deletedAt)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Package not found' } });
    const finalPrice = calculatePackagePrice(
      pack.price,
      pack.discount,
      pack.discountType
    );
    res.json({ package: pack, finalPrice });
  } catch (err) {
    next(err);
  }
};

exports.update = async function (req, res, next) {
  try {
    const allowed = [
      'nameEn',
      'nameAr',
      'price',
      'discount',
      'discountType',
      'features',
      'serviceIds',
      'isActive',
    ];
    const updates = {};
    for (const k of allowed)
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    if (updates.serviceIds) {
      const services = [];
      for (const id of updates.serviceIds) {
        const s = await Service.findById(id);
        if (s) services.push(s._id);
      }
      updates.services = services;
      delete updates.serviceIds;
    }
    const pack = await Package.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    }).populate('services');
    if (!pack)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Package not found' } });
    res.json({ package: pack });
  } catch (err) {
    next(err);
  }
};

exports.activate = async function (req, res, next) {
  try {
    const pack = await Package.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );
    if (!pack)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Package not found' } });
    res.json({ package: pack });
  } catch (err) {
    next(err);
  }
};

exports.deactivate = async function (req, res, next) {
  try {
    const pack = await Package.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!pack)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Package not found' } });
    res.json({ package: pack });
  } catch (err) {
    next(err);
  }
};

exports.remove = async function (req, res, next) {
  try {
    const pack = await Package.findByIdAndUpdate(req.params.id, {
      deletedAt: new Date(),
    });
    if (!pack)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Package not found' } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
