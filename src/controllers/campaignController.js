const CampaignPlan = require('../models/CampaignPlan');
const Client = require('../models/Client');
const Joi = require('joi');
const { logAudit } = require('../utils/audit');

const createSchema = Joi.object({
  clientId: Joi.string().required(),
  description: Joi.string().allow('', null),
  objectives: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      description: Joi.string().allow('', null),
    })
  ),
  strategy: Joi.object({
    budget: Joi.number().min(0),
    timeline: Joi.string().allow('', null),
    description: Joi.string().allow('', null),
  }),
});

exports.list = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const skip = (page - 1) * limit;
    const filter = { deleted: false }; // Changed from deletedAt to deleted

    // Add filtering
    if (req.query.clientId) filter.clientId = req.query.clientId;
    if (req.query.search) {
      filter.$or = [
        { description: { $regex: req.query.search, $options: 'i' } },
        { 'objectives.name': { $regex: req.query.search, $options: 'i' } },
        { 'strategy.description': { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const total = await CampaignPlan.countDocuments(filter);
    const items = await CampaignPlan.find(filter)
      .populate('clientId', 'business.name personal.fullName') // Populate client info
      .populate('createdBy', 'fullName') // Populate creator info
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

    const doc = new CampaignPlan({
      ...value,
      createdBy: req.user._id,
      deleted: false,
    });

    await doc.save();

    // Populate before response
    await doc.populate('clientId', 'business.name personal.fullName');
    await doc.populate('createdBy', 'fullName');

    await logAudit({
      userId: req.user._id,
      action: 'create',
      entityType: 'CampaignPlan',
      entityId: doc._id,
      changes: doc.toObject(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(201).json({ data: doc }); // Changed from campaign to data
  } catch (err) {
    // Handle invalid ObjectId format
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
      .populate('createdBy', 'fullName');

    if (!item || item.deleted)
      // Changed from deletedAt to deleted
      return res
        .status(404)
        .json({
          error: { code: 'NOT_FOUND', message: 'Campaign plan not found' },
        });

    res.json({ data: item }); // Changed from campaign to data
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

    const item = await CampaignPlan.findByIdAndUpdate(req.params.id, value, {
      new: true,
    }).populate('clientId', 'business.name personal.fullName').populate('createdBy', 'fullName');
    

    if (!item || item.deleted)
      // Added deleted check
      return res
        .status(404)
        .json({
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

    res.json({ data: item }); // Changed from campaign to data
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
      { deleted: true }, // Changed from deletedAt to deleted
      { new: true }
    );

    if (!item)
      return res
        .status(404)
        .json({
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

