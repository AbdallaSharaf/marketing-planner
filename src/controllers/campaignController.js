const CampaignPlan = require('../models/CampaignPlan');
const Client = require('../models/Client');
const Segment = require('../models/Segment');
const Competitor = require('../models/Competitor');
const Branch = require('../models/Branch');
const Package = require('../models/Package'); // Add Package import
const Joi = require('joi');
const { logAudit } = require('../utils/audit');
const { calculateQuotationTotal } = require('../utils/pricing');


const createSchema = Joi.object({
  clientId: Joi.string().required(),
  description: Joi.string().allow('', null),
  objectives: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      ar: Joi.string().required(),
      description: Joi.string().allow('', null),
      descriptionAr: Joi.string().allow('', null),
    })
  ),
  strategy: Joi.object({
    timeline: Joi.array().items(
      Joi.object({
        timelineStart: Joi.string(),
        timelineEnd: Joi.string(),
        objectiveEn: Joi.string(),
        objectiveAr: Joi.string(),
      })
    ),
    description: Joi.string().allow('', null),
    descriptionAr: Joi.string().allow('', null),
  }),
  swot: Joi.object({
    strengths: Joi.array().items(Joi.string()).default([]),
    weaknesses: Joi.array().items(Joi.string()).default([]),
    opportunities: Joi.array().items(Joi.string()).default([]),
    threats: Joi.array().items(Joi.string()).default([]),
  }),
  segments: Joi.array().items(Joi.string()).default([]),
  branches: Joi.array().items(Joi.string()).default([]),
  competitors: Joi.array().items(Joi.string()).default([]),
  // Added pricing fields
  packages: Joi.array().items(Joi.string()).default([]),
  customServices: Joi.array()
    .items(
      Joi.object({
        id: Joi.string(),
        en: Joi.string(),
        ar: Joi.string(),
        price: Joi.number().min(0),
        discount: Joi.number().min(0).default(0),
        discountType: Joi.string()
          .valid('percentage', 'fixed')
          .default('fixed'),
      })
    )
    .default([]),
  overriddenTotal: Joi.number().min(0).allow(null),
  discountValue: Joi.number().min(0).default(0),
  discountType: Joi.string().valid('percentage', 'fixed').default('percentage'),
});

// Helper function to validate related entities
const validateRelatedEntities = async (clientId, entities, entityType) => {
  if (!entities || entities.length === 0) return { valid: true };

  let Model;
  let fieldName;

  switch (entityType) {
    case 'segments':
      Model = Segment;
      fieldName = 'clientId';
      break;
    case 'competitors':
      Model = Competitor;
      fieldName = 'clientId';
      break;
    case 'branches':
      Model = Branch;
      fieldName = 'clientId';
      break;
    default:
      return { valid: false, error: `Unknown entity type: ${entityType}` };
  }

  const existingEntities = await Model.find({
    _id: { $in: entities },
    deleted: false,
  });

  const foundIds = existingEntities.map((entity) => entity._id.toString());
  const invalidIds = entities.filter((id) => !foundIds.includes(id));

  if (invalidIds.length > 0) {
    return {
      valid: false,
      error: `The following ${entityType} do not exist: ${invalidIds.join(
        ', '
      )}`,
    };
  }

  const entitiesWithDifferentClient = existingEntities.filter(
    (entity) => entity[fieldName].toString() !== clientId.toString()
  );

  if (entitiesWithDifferentClient.length > 0) {
    const invalidEntityIds = entitiesWithDifferentClient.map((entity) =>
      entity._id.toString()
    );
    return {
      valid: false,
      error: `The following ${entityType} do not belong to the specified client: ${invalidEntityIds.join(
        ', '
      )}`,
    };
  }

  return { valid: true };
};

exports.list = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const skip = (page - 1) * limit;
    const filter = { deleted: false };

    if (req.query.clientId) filter.clientId = req.query.clientId;
    if (req.query.search) {
      filter.$or = [
        { description: { $regex: req.query.search, $options: 'i' } },
        { 'objectives.name': { $regex: req.query.search, $options: 'i' } },
        { 'strategy.description': { $regex: req.query.search, $options: 'i' } },
        {
          'strategy.descriptionAr': { $regex: req.query.search, $options: 'i' },
        },
      ];
    }

    const total = await CampaignPlan.countDocuments(filter);
    const items = await CampaignPlan.find(filter)
      .populate('clientId', 'business.name personal.fullName')
      .populate('createdBy', 'fullName')
      .populate('branches')
      .populate('segments')
      .populate('competitors')
      .populate('packages') // Added packages population
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

    // Validate client exists
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

    // Validate related entities belong to the same client
    const segmentsValidation = await validateRelatedEntities(
      value.clientId,
      value.segments,
      'segments'
    );
    if (!segmentsValidation.valid) {
      return res.status(400).json({
        error: {
          code: 'INVALID_SEGMENTS',
          message: segmentsValidation.error,
        },
      });
    }

    const branchesValidation = await validateRelatedEntities(
      value.clientId,
      value.branches,
      'branches'
    );
    if (!branchesValidation.valid) {
      return res.status(400).json({
        error: {
          code: 'INVALID_BRANCHES',
          message: branchesValidation.error,
        },
      });
    }

    const competitorsValidation = await validateRelatedEntities(
      value.clientId,
      value.competitors,
      'competitors'
    );
    if (!competitorsValidation.valid) {
      return res.status(400).json({
        error: {
          code: 'INVALID_COMPETITORS',
          message: competitorsValidation.error,
        },
      });
    }

    // Prepare servicesPricing array with validation (similar to quotation)
    const servicesPricingArr = [];
    if (value.packages && value.packages.length) {
      for (const id of value.packages) {
        const package = await Package.findOne({
          _id: id,
          deleted: false,
        });

        if (!package) {
          return res.status(400).json({
            error: {
              code: 'INVALID_PACKAGE',
              message: `Package with ID ${id} not found or has been deleted`,
            },
          });
        }

        servicesPricingArr.push({
          package: package._id,
          customPrice: package.price, // Use package price as default
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

    const doc = new CampaignPlan({
      ...value,
      servicesPricing: servicesPricingArr,
      subtotal: totals.subtotal,
      total: finalTotal,
      overriddenTotal: value.overriddenTotal,
      isTotalOverridden: isTotalOverridden,
      createdBy: req.user._id,
      deleted: false,
    });

    await doc.save();

    // Populate before response
    await doc.populate('clientId', 'business.name personal.fullName');
    await doc.populate('createdBy', 'fullName');
    await doc.populate('branches');
    await doc.populate('segments');
    await doc.populate('competitors');
    await doc.populate('packages');
    await doc.populate('servicesPricing.package');

    await logAudit({
      userId: req.user._id,
      action: 'create',
      entityType: 'CampaignPlan',
      entityId: doc._id,
      changes: doc.toObject(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(201).json({ data: doc });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID_FORMAT',
          message: 'Invalid client ID format',
        },
      });
    }
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const item = await CampaignPlan.findById(req.params.id)
      .populate('clientId', 'business.name personal.fullName personal.email')
      .populate('createdBy', 'fullName')
      .populate('branches')
      .populate('segments')
      .populate('competitors')
      .populate('packages') // Added packages population
      .populate('servicesPricing.package'); // Added servicesPricing population

    if (!item || item.deleted)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Campaign plan not found' },
      });

    res.json({ data: item });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error)
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: error.message },
      });

    // Validate client if being updated
    if (value.clientId) {
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
    }

    // Validate related entities belong to the same client
    const segmentsValidation = await validateRelatedEntities(
      value.clientId,
      value.segments,
      'segments'
    );
    if (!segmentsValidation.valid) {
      return res.status(400).json({
        error: {
          code: 'INVALID_SEGMENTS',
          message: segmentsValidation.error,
        },
      });
    }

    const branchesValidation = await validateRelatedEntities(
      value.clientId,
      value.branches,
      'branches'
    );
    if (!branchesValidation.valid) {
      return res.status(400).json({
        error: {
          code: 'INVALID_BRANCHES',
          message: branchesValidation.error,
        },
      });
    }

    const competitorsValidation = await validateRelatedEntities(
      value.clientId,
      value.competitors,
      'competitors'
    );
    if (!competitorsValidation.valid) {
      return res.status(400).json({
        error: {
          code: 'INVALID_COMPETITORS',
          message: competitorsValidation.error,
        },
      });
    }

    // Prepare servicesPricing array with validation (similar to quotation)
    const servicesPricingArr = [];
    if (value.packages && value.packages.length) {
      for (const id of value.packages) {
        const package = await Package.findOne({
          _id: id,
          deleted: false,
        });

        if (!package) {
          return res.status(400).json({
            error: {
              code: 'INVALID_PACKAGE',
              message: `Package with ID ${id} not found or has been deleted`,
            },
          });
        }

        servicesPricingArr.push({
          package: package._id,
          customPrice: package.price, // Use package price as default
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

    const updateData = {
      ...value,
      servicesPricing: servicesPricingArr,
      subtotal: totals.subtotal,
      total: finalTotal,
      overriddenTotal: value.overriddenTotal,
      isTotalOverridden: isTotalOverridden,
    };

    const item = await CampaignPlan.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
      }
    )
      .populate('clientId', 'business.name personal.fullName')
      .populate('createdBy', 'fullName')
      .populate('branches')
      .populate('segments')
      .populate('competitors')
      .populate('packages')
      .populate('servicesPricing.package');

    if (!item || item.deleted)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Campaign plan not found' },
      });

    await logAudit({
      userId: req.user._id,
      action: 'update',
      entityType: 'CampaignPlan',
      entityId: item._id,
      changes: value,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({ data: item });
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

exports.remove = async (req, res, next) => {
  try {
    const item = await CampaignPlan.findByIdAndUpdate(
      req.params.id,
      { deleted: true },
      { new: true }
    );

    if (!item)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Campaign plan not found' },
      });

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