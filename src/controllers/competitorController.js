const Competitor = require('../models/Competitor');
const Joi = require('joi');

const schema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow('', null),
  swot_strengths: Joi.array().items(Joi.string()).default([]),
  swot_weaknesses: Joi.array().items(Joi.string()).default([]),
  swot_opportunities: Joi.array().items(Joi.string()).default([]),
  swot_threats: Joi.array().items(Joi.string()).default([]),
});

exports.list = async (req, res, next) => {
  try {
    const items = await Competitor.find({
      clientId: req.params.clientId,
      deleted: false,
    });
    res.json({ competitors: items });
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

    const competitor = new Competitor({
      clientId: req.params.clientId,
      deleted: false,
      ...value,
    });

    await competitor.save();
    res.status(201).json({ competitor });
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

    const competitor = await Competitor.findOneAndUpdate(
      {
        _id: req.params.competitorId,
        clientId: req.params.clientId,
      },
      value,
      { new: true }
    );

    if (!competitor)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Competitor not found' },
      });

    res.json({ competitor });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const competitor = await Competitor.findOneAndUpdate(
      {
        _id: req.params.competitorId,
        clientId: req.params.clientId,
      },
      { deleted: true },
      { new: true }
    );

    if (!competitor)
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Competitor not found' },
      });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
