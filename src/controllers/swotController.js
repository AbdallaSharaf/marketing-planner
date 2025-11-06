const Swot = require('../models/SwotAnalysis');
const Joi = require('joi');

const schema = Joi.object({
  strengths: Joi.array().items(Joi.string()).default([]),
  weaknesses: Joi.array().items(Joi.string()).default([]),
  opportunities: Joi.array().items(Joi.string()).default([]),
  threats: Joi.array().items(Joi.string()).default([]),
});

exports.get = async (req, res, next) => {
  try {
    const s = await Swot.findOne({ clientId: req.params.clientId });
    if (!s)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'SWOT not found' } });
    res.json({ swot: s });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { error, value } = schema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ error: { code: 'VALIDATION_ERROR', message: error.message } });
    let s = await Swot.findOne({ clientId: req.params.clientId });
    if (!s) {
      s = new Swot({ clientId: req.params.clientId, ...value });
    } else {
      s.strengths = value.strengths;
      s.weaknesses = value.weaknesses;
      s.opportunities = value.opportunities;
      s.threats = value.threats;
    }
    await s.save();
    res.json({ swot: s });
  } catch (err) {
    next(err);
  }
};
