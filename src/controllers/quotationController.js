const Quotation = require('../models/Quotation');
const Service = require('../models/Service');
const Client = require('../models/Client'); // Import Client model
const Joi = require('joi');
const { quotationNumber } = require('../utils/identifier');
const { calculateQuotationTotal } = require('../utils/pricing');
const { logAudit } = require('../utils/audit');

const createSchema = Joi.object({
  clientId: Joi.string().allow(null),
  clientName: Joi.string().allow('', null), // Add clientName field
  services: Joi.array().items(Joi.string()),
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
  overriddenTotal: Joi.number().min(0).allow(null),
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
    const filter = { deleted: false };
    if (req.query.clientId) filter.clientId = req.query.clientId;
    if (req.query.status) filter.status = req.query.status;
    const total = await Quotation.countDocuments(filter);
    const items = await Quotation.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate({
        path: 'services',
        populate: {
          path: 'packages',
          populate: {
            path: 'items',
          },
        },
      });
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
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: error.message },
      });

    let clientId = null;
    let clientName = null;

    // Handle client identification - either clientId OR clientName
    if (value.clientId) {
      // Validate client exists if clientId is provided
      const clientExists = await Client.findOne({
        _id: value.clientId,
        deleted: false,
      });

      if (!clientExists) {
        return res.status(400).json({
          error: {
            code: 'INVALID_CLIENT',
            message: 'Client not found or has been deleted',
          },
        });
      }
      clientId = value.clientId;
    } else if (value.clientName) {
      // Use clientName for non-existing clients
      clientName = value.clientName;
    }
    // If neither clientId nor clientName provided, quotation will be created without client reference

    // Prepare servicesPricing array with validation
    const servicesPricingArr = [];
    if (value.services && value.services.length) {
      for (const id of value.services) {
        const service = await Service.findOne({
          _id: id,
          deleted: false,
        });

        if (!service) {
          return res.status(400).json({
            error: {
              code: 'INVALID_SERVICE',
              message: `Service with ID ${id} not found or has been deleted`,
            },
          });
        }

        servicesPricingArr.push({
          service: service._id,
          customPrice:
            (value.servicesPricing && value.servicesPricing[id]) ||
            service.price,
        });
      }
    }

    const customServices = value.customServices || [];
    const totals = calculateQuotationTotal(
      servicesPricingArr.map((sp) => ({
        price: sp.customPrice,
        discount: 0,
        discountType: 'fixed',
      })),
      customServices,
      value.discountValue,
      value.discountType
    );

    // Determine final total - use overriddenTotal if provided, otherwise use calculated total
    const finalTotal =
      value.overriddenTotal !== undefined && value.overriddenTotal !== null
        ? value.overriddenTotal
        : totals.total;

    const isTotalOverridden =
      value.overriddenTotal !== undefined && value.overriddenTotal !== null;

    const doc = new Quotation({
      quotationNumber: quotationNumber(),
      clientId: clientId, // Will be null if no clientId provided
      clientName: clientName, // Store clientName for non-existing clients
      servicesPricing: servicesPricingArr,
      customServices,
      subtotal: totals.subtotal,
      discountValue: value.discountValue,
      discountType: value.discountType,
      total: finalTotal,
      overriddenTotal: value.overriddenTotal,
      isTotalOverridden: isTotalOverridden,
      services: value.services,
      note: value.note,
      validUntil: value.validUntil,
      createdBy: req.user._id,
      deleted: false,
    });

    await doc.save();

    // Populate after save for response
    await doc.populate('servicesPricing.service');
    if (clientId) {
      await doc.populate('clientId', 'business.name personal.fullName');
    }
    await doc.populate('createdBy', 'fullName');
    await doc.populate({
      path: 'services',
      populate: {
        path: 'packages',
        populate: {
          path: 'items',
        },
      },
    });

    await logAudit({
      userId: req.user._id,
      action: 'create',
      entityType: 'Quotation',
      entityId: doc._id,
      changes: doc.toObject(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(201).json({ data: doc });
  } catch (err) {
    // Handle invalid ObjectId format
    if (err.name === 'CastError') {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID_FORMAT',
          message: 'Invalid ID format provided',
        },
      });
    }
    next(err);
  }
};

// Also update the get method to handle clientName
exports.get = async (req, res, next) => {
  try {
    const q = await Quotation.findById(req.params.id)
      .populate('servicesPricing.service')
      .populate('clientId', 'business.name personal.fullName')
      .populate('createdBy', 'fullName')
      .populate({
        path: 'services',
        populate: {
          path: 'packages',
          populate: {
            path: 'items',
          },
        },
      });
    if (!q || q.deleted)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Quotation not found' } });
    res.json({ data: q });
  } catch (err) {
    next(err);
  }
};

// Update the update method to handle clientName
exports.update = async (req, res, next) => {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error)
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: error.message },
      });

    // Get the existing quotation first
    const existingQuotation = await Quotation.findById(req.params.id);
    if (!existingQuotation)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Quotation not found' },
      });

    let clientId = existingQuotation.clientId;
    let clientName = existingQuotation.clientName;

    // Handle client identification updates
    if (value.clientId !== undefined) {
      if (value.clientId) {
        // Validate client exists if clientId is provided
        const clientExists = await Client.findOne({
          _id: value.clientId,
          deleted: false,
        });

        if (!clientExists) {
          return res.status(400).json({
            error: {
              code: 'INVALID_CLIENT',
              message: 'Client not found or has been deleted',
            },
          });
        }
        clientId = value.clientId;
        clientName = null; // Clear clientName if clientId is set
      } else {
        clientId = null; // Clear clientId if empty string or null
      }
    }

    if (value.clientName !== undefined) {
      clientName = value.clientName;
      // If setting clientName, clear clientId unless explicitly provided
      if (value.clientId === undefined) {
        clientId = null;
      }
    }

    // Prepare servicesPricing array with validation (same as create)
    const servicesPricingArr = [];
    if (value.services && value.services.length) {
      for (const id of value.services) {
        const service = await Service.findOne({
          _id: id,
          deleted: false,
        });

        if (!service) {
          return res.status(400).json({
            error: {
              code: 'INVALID_SERVICE',
              message: `Service with ID ${id} not found or has been deleted`,
            },
          });
        }

        servicesPricingArr.push({
          service: service._id,
          customPrice: service.price,
        });
      }
    }

    const customServices = value.customServices || [];

    // Recalculate totals (same as create)
    const totals = calculateQuotationTotal(
      servicesPricingArr.map((sp) => ({
        price: sp.customPrice,
        discount: 0,
        discountType: 'fixed',
      })),
      customServices,
      value.discountValue,
      value.discountType
    );

    // Determine final total - use overriddenTotal if provided, otherwise use calculated total
    const finalTotal =
      value.overriddenTotal !== undefined && value.overriddenTotal !== null
        ? value.overriddenTotal
        : totals.total;

    const isTotalOverridden =
      value.overriddenTotal !== undefined && value.overriddenTotal !== null;

    // Update the quotation with recalculated totals
    const updates = {
      ...value,
      clientId: clientId,
      clientName: clientName,
      servicesPricing: servicesPricingArr,
      subtotal: totals.subtotal,
      total: finalTotal,
      overriddenTotal: value.overriddenTotal,
      isTotalOverridden: isTotalOverridden,
    };

    const q = await Quotation.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    })
      .populate('servicesPricing.service')
      .populate('clientId', 'business.name personal.fullName')
      .populate('createdBy', 'fullName')
      .populate({
        path: 'services',
        populate: {
          path: 'packages',
          populate: {
            path: 'items',
          },
        },
      });

    if (!q)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Quotation not found' },
      });

    await logAudit({
      userId: req.user._id,
      action: 'update',
      entityType: 'Quotation',
      entityId: q._id,
      changes: updates,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({ data: q });
  } catch (err) {
    next(err);
  }
};

// Other methods remain the same...
exports.remove = async (req, res, next) => {
  try {
    const q = await Quotation.findByIdAndUpdate(req.params.id, {
      deleted: true,
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
    if (!q || q.deleted)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Quotation not found' },
      });

    // Validate client exists before creating contract (only if clientId is present)
    if (q.clientId) {
      const clientExists = await Client.findOne({
        _id: q.clientId,
        deleted: false,
      });

      if (!clientExists) {
        return res.status(400).json({
          error: {
            code: 'INVALID_CLIENT',
            message:
              'Client associated with this quotation not found or has been deleted',
          },
        });
      }
    }

    const { startDate, endDate, contractTerms } = req.body;
    const Contract = require('../models/Contract');
    const { contractNumber } = require('../utils/identifier');

    if (!startDate || !endDate)
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'startDate and endDate required',
        },
      });

    if (new Date(endDate) <= new Date(startDate))
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'endDate must be after startDate',
        },
      });

    const c = new Contract({
      contractNumber: contractNumber(),
      clientId: q.clientId,
      clientName: q.clientName, // Pass clientName to contract as well
      quotationId: q._id,
      contractTerms: contractTerms || q.note || '',
      startDate,
      endDate,
      value: q.total,
      createdBy: req.user._id,
      deleted: false,
    });

    await c.save();
    if (q.clientId) {
      await c.populate('clientId', 'business.name personal.fullName');
    }
    await c.populate('createdBy', 'fullName');
    await c.populate({
      path: 'quotationId',
      populate: {
        path: 'services',
        populate: {
          path: 'packages',
          populate: {
            path: 'items',
          },
        },
      },
    });

    await logAudit({
      userId: req.user._id,
      action: 'convert_to_contract',
      entityType: 'Quotation',
      entityId: q._id,
      changes: null,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Update quotation status
    q.status = 'approved';
    await q.save();

    res.json({ data: c });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID_FORMAT',
          message: 'Invalid ID format',
        },
      });
    }
    next(err);
  }
};
