const Package = require('../models/Package');
const Item = require('../models/Item');
const Joi = require('joi');

const packageItemSchema = Joi.object({
  item: Joi.string().required(),
  quantity: Joi.number().min(1).default(1),
});

const createSchema = Joi.object({
  nameEn: Joi.string().required(),
  nameAr: Joi.string().required(),
  price: Joi.number().min(0).required(),
  description: Joi.string().allow('', null),
  items: Joi.array().items(packageItemSchema).default([]),
});

exports.list = async function (req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const skip = (page - 1) * limit;
    const filter = { deleted: false };

    // Add search functionality
    if (req.query.search) {
      filter.$or = [
        { nameEn: { $regex: req.query.search, $options: 'i' } },
        { nameAr: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    // Price range filters
    if (req.query.minPrice) {
      filter.price = { ...filter.price, $gte: parseFloat(req.query.minPrice) };
    }
    if (req.query.maxPrice) {
      filter.price = { ...filter.price, $lte: parseFloat(req.query.maxPrice) };
    }

    const total = await Package.countDocuments(filter);
    const packages = await Package.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate('items.item'); // Updated population path

    res.json({
      data: packages,
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

exports.create = async function (req, res, next) {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ error: { code: 'VALIDATION_ERROR', message: error.message } });

    // Validate all items exist and are not deleted
    const validItems = [];
    const invalidItems = [];

    if (value.items && value.items.length) {
      for (const itemData of value.items) {
        const item = await Item.findOne({
          _id: itemData.item,
          deleted: false,
        });

        if (item) {
          validItems.push({
            item: item._id,
            quantity: itemData.quantity || 1,
          });
        } else {
          invalidItems.push(itemData.item);
        }
      }

      // If any invalid items found, return error
      if (invalidItems.length > 0) {
        return res.status(400).json({
          error: {
            code: 'INVALID_ITEMS',
            message: `The following items are invalid or deleted: ${invalidItems.join(
              ', '
            )}`,
          },
        });
      }
    }

    const pack = new Package({
      nameEn: value.nameEn,
      nameAr: value.nameAr,
      price: value.price,
      description: value.description,
      items: validItems,
      deleted: false,
    });

    await pack.save();

    // Populate items for response
    await pack.populate('items.item');

    res.status(201).json({ data: pack });
  } catch (err) {
    // Handle invalid ObjectId format
    if (err.name === 'CastError') {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID_FORMAT',
          message: 'Invalid item ID format',
        },
      });
    }
    next(err);
  }
};

exports.get = async function (req, res, next) {
  try {
    const pack = await Package.findById(req.params.id).populate('items.item');
    if (!pack || pack.deleted)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Package not found' } });
    res.json({ data: pack });
  } catch (err) {
    next(err);
  }
};

exports.update = async function (req, res, next) {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error)
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: error.message },
      });

    const updates = { ...value };

    // Validate items if being updated
    if (updates.items) {
      const validItems = [];
      const invalidItems = [];

      for (const itemData of updates.items) {
        const item = await Item.findOne({
          _id: itemData.item,
          deleted: false,
        });

        if (item) {
          validItems.push({
            item: item._id,
            quantity: itemData.quantity || 1,
          });
        } else {
          invalidItems.push(itemData.item);
        }
      }

      // If any invalid items found, return error
      if (invalidItems.length > 0) {
        return res.status(400).json({
          error: {
            code: 'INVALID_ITEMS',
            message: `The following items are invalid or deleted: ${invalidItems.join(
              ', '
            )}`,
          },
        });
      }

      updates.items = validItems;
    }

    const pack = await Package.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    }).populate('items.item');

    if (!pack || pack.deleted)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Package not found' } });

    res.json({ data: pack });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID_FORMAT',
          message: 'Invalid item ID format',
        },
      });
    }
    next(err);
  }
};

exports.remove = async function (req, res, next) {
  try {
    const pack = await Package.findByIdAndUpdate(
      req.params.id,
      { deleted: true },
      { new: true }
    );

    if (!pack)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Package not found' } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
