const Competitor = require('../models/Competitor');
const Joi = require('joi');

const schema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow('', null),
  swot: Joi.object().default({
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: [],
  }),
});

exports.list = async (req, res, next) => {
  try {
    const items = await Competitor.find({ clientId: req.params.clientId });
    res.json({ competitors: items });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { error, value } = schema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ error: { code: 'VALIDATION_ERROR', message: error.message } });
    const c = new Competitor({
      clientId: req.params.clientId,
      name: value.name,
      description: value.description,
      swot_strengths: value.swot.strengths || [],
      swot_weaknesses: value.swot.weaknesses || [],
      swot_opportunities: value.swot.opportunities || [],
      swot_threats: value.swot.threats || [],
    });
    await c.save();
    res.status(201).json({ competitor: c });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const updates = req.body;
    const c = await Competitor.findByIdAndUpdate(
      req.params.competitorId,
      updates,
      { new: true }
    );
    if (!c)
      return res
        .status(404)
        .json({
          error: { code: 'NOT_FOUND', message: 'Competitor not found' },
        });
    res.json({ competitor: c });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const c = await Competitor.findByIdAndDelete(req.params.competitorId);
    if (!c)
      return res
        .status(404)
        .json({
          error: { code: 'NOT_FOUND', message: 'Competitor not found' },
        });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
