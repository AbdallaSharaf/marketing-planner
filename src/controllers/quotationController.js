const Quotation = require('../models/Quotation');
const Service = require('../models/Service');
const Joi = require('joi');
const { quotationNumber } = require('../utils/identifier');
const { calculateQuotationTotal } = require('../utils/pricing');
const { logAudit } = require('../utils/audit');

const createSchema = Joi.object({
  clientId: Joi.string().allow(null),
  clientName: Joi.string().allow('', null),
  serviceIds: Joi.array().items(Joi.string()),
  servicesPricing: Joi.object().default({}),
  customServices: Joi.array().items(
    Joi.object({
      id: Joi.string(),
      en: Joi.string(),
      ar: Joi.string(),
      price: Joi.number(),
      discount: Joi.number(),
      discountType: Joi.string(),
    })
  ),
  discountValue: Joi.number().min(0).default(0),
  discountType: Joi.string().valid('percentage', 'fixed').default('percentage'),
  note: Joi.string().allow('', null),
  validUntil: Joi.date().iso().allow(null),
});

exports.list = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const skip = (page - 1) * limit;
    const filter = { deletedAt: null };
    if (req.query.clientId) filter.clientId = req.query.clientId;
    if (req.query.status) filter.status = req.query.status;
    const total = await Quotation.countDocuments(filter);
    const items = await Quotation.find(filter)
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
    // prepare servicesPricing array
    const servicesPricingArr = [];
    if (value.serviceIds && value.serviceIds.length) {
      for (const id of value.serviceIds) {
        const s = await Service.findById(id);
        if (s)
          servicesPricingArr.push({
            service: s._id,
            customPrice:
              (value.servicesPricing && value.servicesPricing[id]) || s.price,
          });
      }
    }
    const customServices = value.customServices || [];
    const totals = calculateQuotationTotal(
      servicesPricingArr.map((sp) => ({ price: sp.customPrice })),
      customServices,
      value.discountValue,
      value.discountType
    );
    const doc = new Quotation({
      quotationNumber: quotationNumber(),
      clientId: value.clientId,
      clientName: value.clientName,
      servicesPricing: servicesPricingArr,
      customServices,
      subtotal: totals.subtotal,
      discountValue: value.discountValue,
      discountType: value.discountType,
      total: totals.total,
      note: value.note,
      validUntil: value.validUntil,
      createdBy: req.user._id,
    });
    await doc.save();
    await logAudit({
      userId: req.user._id,
      action: 'create',
      entityType: 'Quotation',
      entityId: doc._id,
      changes: doc.toObject(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
    res.status(201).json({ quotation: doc });
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const q = await Quotation.findById(req.params.id).populate(
      'servicesPricing.service'
    );
    if (!q || q.deletedAt)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Quotation not found' } });
    res.json({ quotation: q });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const updates = req.body;
    const q = await Quotation.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });
    if (!q)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Quotation not found' } });
    await logAudit({
      userId: req.user._id,
      action: 'update',
      entityType: 'Quotation',
      entityId: q._id,
      changes: updates,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
    res.json({ quotation: q });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const q = await Quotation.findByIdAndUpdate(req.params.id, {
      deletedAt: new Date(),
    });
    if (!q)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Quotation not found' } });
    await logAudit({
      userId: req.user._id,
      action: 'delete',
      entityType: 'Quotation',
      entityId: q._id,
      changes: null,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.send = async (req, res, next) => {
  try {
    // placeholder: would integrate email service
    const q = await Quotation.findById(req.params.id);
    if (!q)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Quotation not found' } });
    q.status = 'sent';
    q.sentAt = new Date();
    await q.save();
    res.json({ message: 'Quotation sent (placeholder)', quotation: q });
  } catch (err) {
    next(err);
  }
};

exports.approve = async (req, res, next) => {
  try {
    const q = await Quotation.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedAt: new Date() },
      { new: true }
    );
    if (!q)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Quotation not found' } });
    res.json({ quotation: q });
  } catch (err) {
    next(err);
  }
};

exports.reject = async (req, res, next) => {
  try {
    const reason = req.body.reason || '';
    const q = await Quotation.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        rejectedAt: new Date(),
        note: ((q) => q || '')(reason),
      },
      { new: true }
    );
    if (!q)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Quotation not found' } });
    res.json({ quotation: q });
  } catch (err) {
    next(err);
  }
};

exports.pdf = async (req, res, next) => {
  try {
    // placeholder: return a simple text/pdf emulation
    const q = await Quotation.findById(req.params.id);
    if (!q)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Quotation not found' } });
    res.setHeader('Content-Type', 'application/pdf');
    res.send(Buffer.from(`Quotation PDF placeholder for ${q.quotationNumber}`));
  } catch (err) {
    next(err);
  }
};

exports.convertToContract = async (req, res, next) => {
  try {
    const q = await Quotation.findById(req.params.id);
    if (!q)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Quotation not found' } });
    // create a contract using quotation totals and provided body
    const { startDate, endDate, contractTerms } = req.body;
    const Contract = require('../models/Contract');
    const { contractNumber } = require('../utils/identifier');
    if (!startDate || !endDate)
      return res
        .status(400)
        .json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'startDate and endDate required',
          },
        });
    if (new Date(endDate) <= new Date(startDate))
      return res
        .status(400)
        .json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'endDate must be after startDate',
          },
        });
    const c = new Contract({
      contractNumber: contractNumber(),
      clientId: q.clientId,
      quotationId: q._id,
      contractTerms: contractTerms || q.note || '',
      startDate,
      endDate,
      value: q.total,
      createdBy: req.user._id,
    });
    await c.save();
    q.status = 'approved';
    await q.save();
    res.json({ contract: c });
  } catch (err) {
    next(err);
  }
};
