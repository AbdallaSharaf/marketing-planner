const Segment = require('../models/Segment');
const Joi = require('joi');

const schema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow('', null),
  ageRange: Joi.array().items(Joi.string()).default([]),
  gender: Joi.array()
    .items(Joi.string().valid('all', 'male', 'female', 'other'))
    .default(['all']),
  area: Joi.array().items(Joi.string()).default([]),
  governorate: Joi.array().items(Joi.string()).default([]),
  note: Joi.string().allow('', null),
  productName: Joi.string().allow('', null),
});

// Bulk schema for multiple segments
const bulkSchema = Joi.array().items(schema).max(50); // Limit to 50 per batch

exports.list = async (req, res, next) => {
  try {
    const segments = await Segment.find({
      clientId: req.params.clientId,
      deleted: false,
    });
    res.json({ data: segments });
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

    const segment = new Segment({
      ...value,
      clientId: req.params.clientId,
      deleted: false,
    });

    await segment.save();
    res.status(201).json({ data: segment });
  } catch (err) {
    next(err);
  }
};

exports.bulkCreate = async (req, res, next) => {
  try {
    const { error, value } = bulkSchema.validate(req.body);

    if (error)
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: error.message },
      });

    const results = {
      successful: [],
      failed: [],
    };

    // Process each segment individually for better error handling
    for (const segmentData of value) {
      try {
        const segment = new Segment({
          ...segmentData,
          clientId: req.params.clientId,
          deleted: false,
        });

        await segment.save();
        results.successful.push(segment);
      } catch (err) {
        results.failed.push({
          data: segmentData,
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

exports.update = async (req, res, next) => {
  try {
    const { error, value } = schema.validate(req.body);
    if (error)
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: error.message },
      });

    const segment = await Segment.findOneAndUpdate(
      {
        _id: req.params.segmentId,
        clientId: req.params.clientId,
      },
      value,
      { new: true }
    );

    if (!segment)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Segment not found' },
      });

    res.json({ data: segment });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const segment = await Segment.findOneAndUpdate(
      {
        _id: req.params.segmentId,
        clientId: req.params.clientId,
      },
      { deleted: true },
      { new: true }
    );

    if (!segment)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Segment not found' },
      });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
