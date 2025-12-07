// controllers/contractTermController.js
const Joi = require('joi');
const ContractTerm = require('../models/ContractTerm');

const createSchema = Joi.object({
    key: Joi.string().required(),
    keyAr: Joi.string().required(),
    value: Joi.string().allow(''),
    valueAr: Joi.string().allow(''),
});

exports.list = async (req, res, next) => {
  try {
    const filter = { deleted: false };
    if (req.query.search) {
        filter.$or = [
            { key: new RegExp(req.query.search, 'i') },
            { keyAr: new RegExp(req.query.search, 'i') },
            { value: new RegExp(req.query.search, 'i') },
            { valueAr: new RegExp(req.query.search, 'i') },
      ];
    }

    const total = await ContractTerm.countDocuments(filter);
    const terms = await ContractTerm.find(filter)
      .sort({ createdAt: -1 });

    res.json({
      data: terms,
      meta: {
        total
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

    const term = new ContractTerm({
      ...value,
      deleted: false,
    });

    await term.save();
    res.status(201).json({ data: term });
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const term = await ContractTerm.findById(req.params.id);
    if (!term || term.deleted)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Contract term not found' },
      });
    res.json({ data: term });
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

    const term = await ContractTerm.findByIdAndUpdate(req.params.id, value, {
      new: true,
    });

    if (!term || term.deleted)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Contract term not found' },
      });

    res.json({ data: term });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const term = await ContractTerm.findByIdAndUpdate(
      req.params.id,
      { deleted: true },
      { new: true }
    );

    if (!term)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Contract term not found' },
      });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.bulkCreate = async (req, res, next) => {
  try {
    const bulkSchema = Joi.array().items(createSchema).max(50);
    const { error, value } = bulkSchema.validate(req.body);

    if (error)
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: error.message },
      });

    const results = { successful: [], failed: [] };

    for (const termData of value) {
      try {
        const term = new ContractTerm({
          ...termData,
          deleted: false,
        });
        await term.save();
        results.successful.push(term);
      } catch (err) {
        results.failed.push({
          data: termData,
          error: err.message,
        });
      }
    }

    res.status(201).json({
      data: results.successful,
      meta: {
        totalProcessed: value.length,
        successful: results.successful.length,
        failed: results.failed.length,
        failures: results.failed,
      },
    });
  } catch (err) {
    next(err);
  }
};
