const Contract = require('../models/Contract');
const Joi = require('joi');
const { logAudit } = require('../utils/audit');
const Client = require('../models/Client'); // Import Client model
const { contractNumber } = require('../utils/identifier');

const createSchema = Joi.object({
  clientId: Joi.string().required(),
  quotationId: Joi.string().allow(null),
  contractTerms: Joi.array().items(Joi.string()).default([]),
  contractBody: Joi.string().allow('', null),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  value: Joi.number().min(0).default(0).allow(null),
  contractImage: Joi.string().uri().allow('', null),
  status: Joi.string()
    .valid('draft', 'active', 'completed', 'cancelled', 'renewed')
    .default('draft'),
  signedDate: Joi.date().iso().allow(null),
  note: Joi.string().allow('', null),
});

exports.list = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { deleted: false };

    // Basic filters
    if (req.query.status) filter.status = req.query.status;
    if (req.query.clientId) filter.clientId = req.query.clientId;
    if (req.query.quotationId) filter.quotationId = req.query.quotationId;
    if (req.query.createdBy) filter.createdBy = req.query.createdBy;

    // Contract number search
    if (req.query.contractNumber) {
      filter.contractNumber = {
        $regex: req.query.contractNumber,
        $options: 'i',
      };
    }

    // Date range filters
    if (req.query.startDateFrom) {
      filter.startDate = {
        ...filter.startDate,
        $gte: new Date(req.query.startDateFrom),
      };
    }
    if (req.query.startDateTo) {
      filter.startDate = {
        ...filter.startDate,
        $lte: new Date(req.query.startDateTo),
      };
    }
    if (req.query.endDateFrom) {
      filter.endDate = {
        ...filter.endDate,
        $gte: new Date(req.query.endDateFrom),
      };
    }
    if (req.query.endDateTo) {
      filter.endDate = {
        ...filter.endDate,
        $lte: new Date(req.query.endDateTo),
      };
    }
    if (req.query.signedDateFrom) {
      filter.signedDate = {
        ...filter.signedDate,
        $gte: new Date(req.query.signedDateFrom),
      };
    }
    if (req.query.signedDateTo) {
      filter.signedDate = {
        ...filter.signedDate,
        $lte: new Date(req.query.signedDateTo),
      };
    }

    // Created/Updated date filters
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

    // Active/expired contracts
    if (req.query.expired === 'true') {
      filter.endDate = { ...filter.endDate, $lt: new Date() };
    }
    if (req.query.active === 'true') {
      filter.status = 'active';
      filter.endDate = { ...filter.endDate, $gte: new Date() };
    }
    if (req.query.upcomingRenewal === 'true') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      filter.endDate = {
        $gte: new Date(),
        $lte: thirtyDaysFromNow,
      };
      filter.status = 'active';
    }

    // Global search across multiple fields
    if (req.query.search) {
      const searchRegex = { $regex: req.query.search, $options: 'i' };
      filter.$or = [
        { contractNumber: searchRegex },
        { 'clientId.business.name': searchRegex }, // Search in populated client name
        { contractTerms: { $in: [searchRegex] } }, // Search in contract terms
      ];
    }

    // Sorting
    const sortField = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortOrder };

    // Get total count and paginated results
    const total = await Contract.countDocuments(filter);
    const contracts = await Contract.find(filter)
      .populate('clientId', 'business.name personal.fullName') // Selective population
      .populate({
        path: 'quotationId',
        populate: {
          path: 'services',
          populate: {
            path: 'packages',
            populate: {
              path: 'items'
            },
          }
        },
      })
      .populate('createdBy', 'fullName email')
      .skip(skip)
      .limit(limit)
      .sort(sort);

    res.json({
      data: contracts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
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
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: error.message },
      });

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

    let contractValue = value.value || 0;
    let quotationData = null;
    let valueSource = 'manual';

    // If quotation is provided, validate it exists
    if (value.quotationId) {
      const Quotation = require('../models/Quotation');
      quotationData = await Quotation.findOne({
        _id: value.quotationId,
        deleted: false,
      });

      if (!quotationData) {
        return res.status(400).json({
          error: {
            code: 'INVALID_QUOTATION',
            message: 'Quotation not found or has been deleted',
          },
        });
      }

      // Use manual value if provided, otherwise use quotation total
      if (!value.value && value.value !== 0) {
        contractValue = quotationData.total;
        valueSource = 'quotation';
      }

      // Update quotation status to "converted" regardless of value source
      quotationData.status = 'converted';
      await quotationData.save();
    }

    // Date validation
    if (new Date(value.endDate) <= new Date(value.startDate))
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'endDate must be after startDate',
        },
      });

    const contract = new Contract({
      ...value,
      contractNumber: contractNumber(),
      value: contractValue, // Manual value takes priority
      createdBy: req.user._id,
      deleted: false,
    });

    await contract.save();

    // Populate before returning
    await contract.populate(
      'clientId',
      'business.name personal.fullName personal.email'
    );
    await contract.populate({
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
      action: 'create',
      entityType: 'Contract',
      entityId: contract._id,
      changes: {
        ...contract.toObject(),
        valueSource: valueSource,
        originalQuotationTotal: quotationData ? quotationData.total : undefined,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(201).json({
      contract,
      meta: {
        valueSource: valueSource,
        quotationTotal: quotationData ? quotationData.total : undefined,
        note:
          valueSource === 'quotation'
            ? 'Value taken from quotation'
            : 'Manual value used',
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate('clientId', 'business.name personal.fullName personal.email') // Selective population
      .populate({
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
      })
      .populate('createdBy', 'fullName email');

    if (!contract || contract.deleted)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Contract not found' },
      });

    res.json({ data: contract });
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

    // Validate quotation exists if provided
    if (value.quotationId) {
      const Quotation = require('../models/Quotation'); // Import Quotation model
      const quotationExists = await Quotation.findOne({
        _id: value.quotationId,
        deleted: false,
      });

      if (!quotationExists) {
        return res.status(400).json({
          error: {
            code: 'INVALID_QUOTATION',
            message: 'Quotation not found or has been deleted',
          },
        });
      }
    }

    // Date validation
    if (
      value.startDate &&
      value.endDate &&
      new Date(value.endDate) <= new Date(value.startDate)
    )
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'endDate must be after startDate',
        },
      });

    const contract = await Contract.findByIdAndUpdate(req.params.id, value, {
      new: true,
    })
      .populate('clientId', 'business.name personal.fullName personal.email') // Selective population
      .populate({
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
    if (!contract)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Contract not found' },
      });

    await logAudit({
      userId: req.user._id,
      action: 'update',
      entityType: 'Contract',
      entityId: contract._id,
      changes: value,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({ data: contract });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const contract = await Contract.findByIdAndUpdate(
      req.params.id,
      { deleted: true },
      { new: true }
    )
      .populate('clientId', 'business.name personal.fullName personal.email') // Selective population
      .populate('quotationId');

    if (!contract)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Contract not found' },
      });

    await logAudit({
      userId: req.user._id,
      action: 'delete',
      entityType: 'Contract',
      entityId: contract._id,
      changes: null,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// Status management methods (unchanged but enhanced with population)
exports.sign = async (req, res, next) => {
  try {
    const signedDate = req.body.signedDate
      ? new Date(req.body.signedDate)
      : new Date();
    const contract = await Contract.findByIdAndUpdate(
      req.params.id,
      { signedDate, status: 'active' }, // Auto-activate when signed
      { new: true }
    )
      .populate('clientId', 'business.name personal.fullName personal.email') // Selective population
      .populate({
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
    if (!contract)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Contract not found' },
      });

    res.json({ data: contract });
  } catch (err) {
    next(err);
  }
};

exports.activate = async (req, res, next) => {
  try {
    const contract = await Contract.findByIdAndUpdate(
      req.params.id,
      { status: 'active' },
      { new: true }
    )
      .populate('clientId', 'business.name personal.fullName personal.email') // Selective population
      .populate({
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
    if (!contract)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Contract not found' },
      });

    res.json({ data: contract });
  } catch (err) {
    next(err);
  }
};

exports.complete = async (req, res, next) => {
  try {
    const contract = await Contract.findByIdAndUpdate(
      req.params.id,
      { status: 'completed' },
      { new: true }
    )
      .populate('clientId', 'business.name personal.fullName personal.email') // Selective population
      .populate({
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
    if (!contract)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Contract not found' },
      });

    res.json({ data: contract });
  } catch (err) {
    next(err);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const reason = req.body.reason || '';
    const contract = await Contract.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled', note: reason },
      { new: true }
    )
      .populate('clientId', 'business.name personal.fullName personal.email') // Selective population
      .populate({
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
    if (!contract)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Contract not found' },
      });

    res.json({ data: contract });
  } catch (err) {
    next(err);
  }
};

exports.renew = async (req, res, next) => {
  try {
    const { newStartDate, newEndDate } = req.body;
    if (!newStartDate || !newEndDate)
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'newStartDate and newEndDate required',
        },
      });

    if (new Date(newEndDate) <= new Date(newStartDate))
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'endDate must be after startDate',
        },
      });

    const contract = await Contract.findByIdAndUpdate(
      req.params.id,
      {
        startDate: newStartDate,
        endDate: newEndDate,
        status: 'renewed',
      },
      { new: true }
    )
      .populate('clientId', 'business.name personal.fullName personal.email') // Selective population
      .populate({
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
    if (!contract)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Contract not found' },
      });

    res.json({ data: contract });
  } catch (err) {
    next(err);
  }
};
