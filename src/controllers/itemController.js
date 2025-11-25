const Item = require('../models/Item');
const Joi = require('joi');

const schema = Joi.object({
  name: Joi.string().required(),
  ar: Joi.string().required(),
  description: Joi.string().allow('', null),
  descriptionAr: Joi.string().allow('', null),
});

exports.list = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const skip = (page - 1) * limit;

    const filter = { deleted: false };

    // Search functionality
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { ar: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    // Sorting
    const sortField = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortOrder };

    const total = await Item.countDocuments(filter);
    const items = await Item.find(filter).skip(skip).limit(limit).sort(sort);

    res.json({
      data: items,
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
    const { error, value } = schema.validate(req.body);
    if (error)
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: error.message },
      });

    const item = new Item({
      ...value,
      deleted: false,
    });

    await item.save();
    res.status(201).json({ data: item });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { error, value } = schema.validate(req.body);
    if (error)
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: error.message },
      });

    const item = await Item.findOneAndUpdate(
      {
        _id: req.params.itemId,
      },
      value,
      { new: true }
    );

    if (!item)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Item not found' },
      });

    res.json({ data: item });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const item = await Item.findOneAndUpdate(
      {
        _id: req.params.itemId,
      },
      { deleted: true },
      { new: true }
    );

    if (!item)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Item not found' },
      });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
