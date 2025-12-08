const Contract = require('../models/Contract');
const Joi = require('joi');
const { logAudit } = require('../utils/audit');
const Client = require('../models/Client'); // Import Client model
const { contractNumber } = require('../utils/identifier');
const ContractTerm = require('../models/ContractTerm');

const contractTermItemSchema = Joi.object({
  term: Joi.string().allow(null), // Optional for custom terms
  customKey: Joi.string().allow('', null),
  customKeyAr: Joi.string().allow('', null),
  customValue: Joi.string().allow('', null),
  customValueAr: Joi.string().allow('', null),
  order: Joi.number().min(0).required(),
  isCustom: Joi.boolean().default(false),
});

const createSchema = Joi.object({
  clientId: Joi.string().allow(null, ''),
  clientName: Joi.string().allow('', null),
  clientNameAr: Joi.string().allow('', null),
  contractBodyAr: Joi.string().allow('', null),
  quotationId: Joi.string().allow(null),
  terms: Joi.array().items(contractTermItemSchema).default([]),
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
})
  .custom((value, helpers) => {
    // Custom validation to ensure either clientId OR clientName/clientNameAr
    if (!value.clientId && (!value.clientName || !value.clientNameAr)) {
      return helpers.error('client.required', {
        message:
          'Either clientId or both clientName and clientNameAr are required',
      });
    }
    return value;
  })
  .messages({
    'client.required':
      'Either clientId or both clientName and clientNameAr are required',
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
        path: 'terms.term',
      })
      .populate({
        path: 'quotationId',
        populate: {
          path: 'packages',
          populate: {
            path: 'items',
          },
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

    let clientId = null;
    let clientName = null;
    let clientNameAr = null;

    // Handle client identification - either clientId OR clientName/clientNameAr
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
    } else if (value.clientName || value.clientNameAr) {
      // Use clientName/clientNameAr for non-existing clients
      clientName = value.clientName;
      clientNameAr = value.clientNameAr;
    } else {
      // Neither clientId nor clientName provided
      return res.status(400).json({
        error: {
          code: 'CLIENT_REQUIRED',
          message: 'Either clientId or clientName/clientNameAr is required',
        },
      });
    }

    // Validate quotation exists if provided
    if (value.quotationId) {
      const Quotation = require('../models/Quotation');
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

    // Validate and process terms
    const validatedTerms = [];

    if (value.terms && value.terms.length) {
      // Check for duplicate order numbers
      const orders = value.terms.map((t) => t.order);
      const uniqueOrders = [...new Set(orders)];
      if (orders.length !== uniqueOrders.length) {
        return res.status(400).json({
          error: {
            code: 'DUPLICATE_ORDERS',
            message: 'Duplicate order numbers found in terms',
          },
        });
      }

      for (const termItem of value.terms) {
        if (termItem.term && !termItem.isCustom) {
          // Validate referenced term exists
          const term = await ContractTerm.findOne({
            _id: termItem.term,
            deleted: false,
          });

          if (!term) {
            return res.status(400).json({
              error: {
                code: 'INVALID_TERM',
                message: `Contract term with ID ${termItem.term} not found or deleted`,
              },
            });
          }

          validatedTerms.push({
            term: term._id,
            order: termItem.order,
            isCustom: false,
          });
        } else if (termItem.isCustom) {
          // Validate custom term has required fields
          if (!termItem.customKey || !termItem.customKeyAr) {
            return res.status(400).json({
              error: {
                code: 'INVALID_CUSTOM_TERM',
                message: 'Custom terms must have both key and keyAr fields',
              },
            });
          }

          validatedTerms.push({
            customKey: termItem.customKey,
            customKeyAr: termItem.customKeyAr,
            customValue: termItem.customValue || '',
            customValueAr: termItem.customValueAr || '',
            order: termItem.order,
            isCustom: true,
          });
        }
      }
    }

    // Generate contract number
    const contractNo = await contractNumber();

    const contract = new Contract({
      ...value,
      clientId: clientId,
      clientName: clientName,
      clientNameAr: clientNameAr,
      contractNumber: contractNo,
      terms: validatedTerms,
      createdBy: req.user._id,
      deleted: false,
    });

    await contract.save();

    // Populate referenced terms (custom terms don't need population)
    await contract.populate({
      path: 'terms.term',
      match: { deleted: false },
    });

    // Populate client if clientId exists
    if (clientId) {
      await contract.populate(
        'clientId',
        'business.name personal.fullName personal.email'
      );
    }
    await contract.populate('quotationId');

    await logAudit({
      userId: req.user._id,
      action: 'create',
      entityType: 'Contract',
      entityId: contract._id,
      changes: contract.toObject(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(201).json({ contract });
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

    // Get existing contract to preserve current values
    const existingContract = await Contract.findById(req.params.id);
    if (!existingContract || existingContract.deleted)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Contract not found' },
      });

    let clientId = existingContract.clientId;
    let clientName = existingContract.clientName;
    let clientNameAr = existingContract.clientNameAr;

    // Handle client identification updates
    if (
      value.clientId !== undefined ||
      value.clientName !== undefined ||
      value.clientNameAr !== undefined
    ) {
      // Clear all client fields first if any client-related field is being updated
      if (value.clientId === null || value.clientId === '') {
        clientId = null;
      } else if (value.clientId) {
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
        clientNameAr = null; // Clear clientNameAr if clientId is set
      }

      if (value.clientName !== undefined || value.clientNameAr !== undefined) {
        clientName =
          value.clientName !== undefined ? value.clientName : clientName;
        clientNameAr =
          value.clientNameAr !== undefined ? value.clientNameAr : clientNameAr;
        // If setting clientName/clientNameAr and no clientId provided, clear clientId
        if (
          value.clientId === undefined &&
          (value.clientName !== undefined || value.clientNameAr !== undefined)
        ) {
          clientId = null;
        }
      }
    }

    // Validate quotation exists if provided
    if (value.quotationId !== undefined) {
      if (value.quotationId) {
        const Quotation = require('../models/Quotation');
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

    // Prepare updates
    const updates = { ...value };
    updates.clientId = clientId;
    updates.clientName = clientName;
    updates.clientNameAr = clientNameAr;

    // Validate and update terms if being updated
    if (updates.terms) {
      const validatedTerms = [];

      // Check for duplicate order numbers
      const orders = updates.terms.map((t) => t.order);
      const uniqueOrders = [...new Set(orders)];
      if (orders.length !== uniqueOrders.length) {
        return res.status(400).json({
          error: {
            code: 'DUPLICATE_ORDERS',
            message: 'Duplicate order numbers found in terms',
          },
        });
      }

      for (const termItem of updates.terms) {
        if (termItem.term && !termItem.isCustom) {
          // Validate referenced term exists
          const term = await ContractTerm.findOne({
            _id: termItem.term,
            deleted: false,
          });

          if (!term) {
            return res.status(400).json({
              error: {
                code: 'INVALID_TERM',
                message: `Contract term with ID ${termItem.term} not found or deleted`,
              },
            });
          }

          validatedTerms.push({
            term: term._id,
            order: termItem.order,
            isCustom: false,
          });
        } else if (termItem.isCustom) {
          // Validate custom term has required fields
          if (!termItem.customKey || !termItem.customKeyAr) {
            return res.status(400).json({
              error: {
                code: 'INVALID_CUSTOM_TERM',
                message: 'Custom terms must have both key and keyAr fields',
              },
            });
          }

          validatedTerms.push({
            customKey: termItem.customKey,
            customKeyAr: termItem.customKeyAr,
            customValue: termItem.customValue || '',
            customValueAr: termItem.customValueAr || '',
            order: termItem.order,
            isCustom: true,
          });
        }
      }

      updates.terms = validatedTerms;
    }

    const contract = await Contract.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    })
      .populate('clientId', 'business.name personal.fullName personal.email')
      .populate('createdBy', 'fullName email')
      .populate('terms.term')
      .populate({
        path: 'quotationId',
        populate: {
          path: 'packages',
          populate: {
            path: 'items',
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
      changes: updates,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({ data: contract });
  } catch (err) {
    next(err);
  }
};

// New endpoint to reorder terms
exports.reorderTerms = async (req, res, next) => {
  try {
    const { termsOrder } = req.body;

    const orderSchema = Joi.array().items(
      Joi.object({
        id: Joi.string().required(), // This is the _id of the term item in the contract.terms array
        order: Joi.number().min(0).required(),
      })
    );

    const { error, value } = orderSchema.validate(termsOrder);
    if (error)
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: error.message },
      });

    // Get the contract
    const contract = await Contract.findById(req.params.id);
    if (!contract || contract.deleted)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Contract not found' },
      });

    // Create a map of new orders
    const orderMap = new Map();
    for (const item of value) {
      orderMap.set(item.id, item.order);
    }

    // Update term orders
    let updated = false;
    for (const termItem of contract.terms) {
      if (orderMap.has(termItem._id.toString())) {
        termItem.order = orderMap.get(termItem._id.toString());
        updated = true;
      }
    }

    if (!updated) {
      return res.status(400).json({
        error: {
          code: 'NO_TERMS_UPDATED',
          message: 'No matching terms found to update',
        },
      });
    }

    // Sort terms by order and save
    contract.terms.sort((a, b) => a.order - b.order);
    await contract.save();

    // Populate for response
    await contract.populate({
      path: 'terms.term',
      match: { deleted: false },
    });

    await logAudit({
      userId: req.user._id,
      action: 'reorder_terms',
      entityType: 'Contract',
      entityId: contract._id,
      changes: { termsOrder: value },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      contract,
      meta: {
        reorderedCount: value.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

// New endpoint to add term to contract
exports.addTerm = async (req, res, next) => {
  try {
    const termItemSchema = Joi.object({
      term: Joi.string().allow(null),
      customKey: Joi.string().allow('', null),
      customKeyAr: Joi.string().allow('', null),
      customValue: Joi.string().allow('', null),
      customValueAr: Joi.string().allow('', null),
      isCustom: Joi.boolean().default(false),
    });

    const { error, value } = termItemSchema.validate(req.body);
    if (error)
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: error.message },
      });

    const contract = await Contract.findById(req.params.id);
    if (!contract || contract.deleted)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Contract not found' },
      });

    let newTermItem;

    if (value.term && !value.isCustom) {
      const term = await ContractTerm.findOne({
        _id: value.term,
        deleted: false,
      });

      if (!term) {
        return res.status(400).json({
          error: {
            code: 'INVALID_TERM',
            message: `Contract term not found or deleted`,
          },
        });
      }

      newTermItem = {
        term: term._id,
        order: contract.terms.length, // Add at the end
        isCustom: false,
      };
    } else if (value.isCustom) {
      if (!value.customKey || !value.customKeyAr) {
        return res.status(400).json({
          error: {
            code: 'INVALID_CUSTOM_TERM',
            message: 'Custom terms must have both key and keyAr fields',
          },
        });
      }

      newTermItem = {
        customKey: value.customKey,
        customKeyAr: value.customKeyAr,
        customValue: value.customValue || '',
        customValueAr: value.customValueAr || '',
        order: contract.terms.length,
        isCustom: true,
      };
    } else {
      return res.status(400).json({
        error: {
          code: 'INVALID_TERM_TYPE',
          message: 'Must specify either a term reference or custom term data',
        },
      });
    }

    contract.terms.push(newTermItem);
    await contract.save();

    // Populate the new term
    if (newTermItem.term) {
      await contract.populate({
        path: 'terms.term',
        match: { deleted: false },
      });
    }

    res.status(201).json({
      contract,
      addedTerm: contract.terms[contract.terms.length - 1],
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
          path: 'packages',
          populate: {
            path: 'items',
          },
        },
      })
      .populate({
        path: 'terms.term',
        match: { deleted: false },
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
      .populate('createdBy', 'fullName email')
      .populate('terms.term')
      .populate({
        path: 'quotationId',
        populate: {
          path: 'packages',
          populate: {
            path: 'items',
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
      .populate('createdBy', 'fullName email')
      .populate('terms.term')
      .populate({
        path: 'quotationId',
        populate: {
          path: 'packages',
          populate: {
            path: 'items',
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
      .populate('createdBy', 'fullName email')
      .populate('terms.term')
      .populate({
        path: 'quotationId',
        populate: {
          path: 'packages',
          populate: {
            path: 'items',
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
      .populate('createdBy', 'fullName email')
      .populate('terms.term')
      .populate({
        path: 'quotationId',
        populate: {
          path: 'packages',
          populate: {
            path: 'items',
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
      .populate('createdBy', 'fullName email')
      .populate('terms.term')
      .populate({
        path: 'quotationId',
        populate: {
          path: 'packages',
          populate: {
            path: 'items',
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
