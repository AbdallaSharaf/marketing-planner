const Client = require('../models/Client');
const Joi = require('joi');

const createSchema = Joi.object({
  personal: Joi.object({
    fullName: Joi.string().max(255).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().required(),
    position: Joi.string().allow('', null),
  }).required(),
  business: Joi.object({
    name: Joi.string().max(255).required(),
    category: Joi.string().required(),
    description: Joi.string().allow('', null),
    mainOfficeAddress: Joi.string().allow('', null),
    establishedYear: Joi.number()
      .integer()
      .min(1900)
      .max(new Date().getFullYear())
      .allow(null),
  }).required(),
  contact: Joi.object({
    businessPhone: Joi.string().allow('', null),
    businessWhatsApp: Joi.string().allow('', null),
    businessEmail: Joi.string().email().allow('', null),
    website: Joi.string().uri().allow('', null),
  }).optional(),
  swot: Joi.object({
    strengths: Joi.array().items(Joi.string()).default([]),
    weaknesses: Joi.array().items(Joi.string()).default([]),
    opportunities: Joi.array().items(Joi.string()).default([]),
    threats: Joi.array().items(Joi.string()).default([]),
  }).optional(),
  socialLinks: Joi.array()
    .items(
      Joi.object({
        platform: Joi.string().required(),
        url: Joi.string().uri().required(),
      })
    )
    .default([]),
  status: Joi.string().valid('active', 'inactive', 'pending').default('active'),
});

// List with enhanced pagination and filtering
exports.list = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const skip = (page - 1) * limit;

    // Build comprehensive filter
    const filter = { deleted: false };

    // Basic filters
    if (req.query.status) filter.status = req.query.status;
    if (req.query.createdBy) filter.createdBy = req.query.createdBy;

    // Date range filters
    if (req.query.createdAfter) {
      filter.createdAt = {
        ...filter.createdAt,
        $gte: new Date(req.query.createdAfter),
      };
    }
    if (req.query.createdBefore) {
      filter.createdAt = {
        ...filter.createdAt,
        $lte: new Date(req.query.createdBefore),
      };
    }
    if (req.query.updatedAfter) {
      filter.updatedAt = {
        ...filter.updatedAt,
        $gte: new Date(req.query.updatedAfter),
      };
    }
    if (req.query.updatedBefore) {
      filter.updatedAt = {
        ...filter.updatedAt,
        $lte: new Date(req.query.updatedBefore),
      };
    }

    // Personal information filters
    if (req.query.personalFullName) {
      filter['personal.fullName'] = {
        $regex: req.query.personalFullName,
        $options: 'i',
      };
    }
    if (req.query.personalEmail) {
      filter['personal.email'] = {
        $regex: req.query.personalEmail,
        $options: 'i',
      };
    }
    if (req.query.personalPhone) {
      filter['personal.phone'] = {
        $regex: req.query.personalPhone,
        $options: 'i',
      };
    }
    if (req.query.personalPosition) {
      filter['personal.position'] = {
        $regex: req.query.personalPosition,
        $options: 'i',
      };
    }

    // Business information filters
    if (req.query.businessName) {
      filter['business.name'] = {
        $regex: req.query.businessName,
        $options: 'i',
      };
    }
    if (req.query.businessCategory) {
      filter['business.category'] = req.query.businessCategory;
    }
    if (req.query.businessDescription) {
      filter['business.description'] = {
        $regex: req.query.businessDescription,
        $options: 'i',
      };
    }
    if (req.query.businessAddress) {
      filter['business.mainOfficeAddress'] = {
        $regex: req.query.businessAddress,
        $options: 'i',
      };
    }
    if (req.query.establishedYear) {
      filter['business.establishedYear'] = parseInt(req.query.establishedYear);
    }
    if (req.query.establishedAfter) {
      filter['business.establishedYear'] = {
        ...filter['business.establishedYear'],
        $gte: parseInt(req.query.establishedAfter),
      };
    }
    if (req.query.establishedBefore) {
      filter['business.establishedYear'] = {
        ...filter['business.establishedYear'],
        $lte: parseInt(req.query.establishedBefore),
      };
    }

    // Contact information filters
    if (req.query.businessPhone) {
      filter['contact.businessPhone'] = {
        $regex: req.query.businessPhone,
        $options: 'i',
      };
    }
    if (req.query.businessWhatsApp) {
      filter['contact.businessWhatsApp'] = {
        $regex: req.query.businessWhatsApp,
        $options: 'i',
      };
    }
    if (req.query.businessEmail) {
      filter['contact.businessEmail'] = {
        $regex: req.query.businessEmail,
        $options: 'i',
      };
    }
    if (req.query.website) {
      filter['contact.website'] = { $regex: req.query.website, $options: 'i' };
    }

    // Global search across multiple fields
    if (req.query.search) {
      const searchRegex = { $regex: req.query.search, $options: 'i' };
      filter.$or = [
        { 'personal.fullName': searchRegex },
        { 'personal.email': searchRegex },
        { 'personal.phone': searchRegex },
        { 'business.name': searchRegex },
        { 'business.category': searchRegex },
        { 'business.description': searchRegex },
        { 'business.mainOfficeAddress': searchRegex },
        { 'contact.businessPhone': searchRegex },
        { 'contact.businessEmail': searchRegex },
        { 'contact.website': searchRegex },
      ];
    }

    // Sorting
    const sortField = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortOrder };

    const total = await Client.countDocuments(filter);
    const clients = await Client.find(filter)
      .populate('createdBy', 'fullName')
      .skip(skip)
      .limit(limit)
      .sort(sort);

    res.json({
      data: clients,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
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
    const client = new Client({ ...value, createdBy: req.user._id });
    await client.save();
    res.status(201).json({ data: client });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate('createdBy', 'fullName')
      .populate({
        path: 'competitors',
        match: { deleted: false },
        options: { sort: { createdAt: -1 } },
      })
      .populate({
        path: 'segments',
        match: { deleted: false },
        options: { sort: { createdAt: -1 } },
      })
      .populate({
        path: 'branches',
        match: { deleted: false },
        options: { sort: { createdAt: -1 } },
      })
      .populate({
        path: 'contracts',
        match: { deleted: false },
        options: { sort: { createdAt: -1 } },
        populate: {
          path: 'quotations',
          populate: {
            path: 'services',
            populate: {
              path: 'packages',
              populate: {
                path: 'items',
              },
            },
          },
        }
      })
      .populate({
        path: 'quotations',
        match: { deleted: false },
        options: { sort: { createdAt: -1 } },
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

    if (!client || client.deleted)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Client not found' } });
    res.json({ data: client });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const allowed = ['personal', 'business', 'contact', 'status', 'deleted', 'swot', 'socialLinks'];
    const updates = {};
    for (const k of allowed)
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    const client = await Client.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });
    if (!client)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Client not found' } });
    res.json({ data: client });
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, {
      deleted: true,
    });
    if (!client)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Client not found' } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
