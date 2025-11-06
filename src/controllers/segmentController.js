const Segment = require('../models/Segment');
const Joi = require('joi');

const schema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow('', null),
  ageRange: Joi.string().allow('', null),
  gender: Joi.string().valid('all', 'male', 'female', 'other').default('all'),
  interests: Joi.array().items(Joi.string()).default([]),
  incomeLevel: Joi.string()
    .valid('low', 'middle', 'high', 'varied')
    .allow(null),
});

exports.list = async (req, res, next) => {
  try {
    const segments = await Segment.find({ clientId: req.params.clientId });
    res.json({ segments });
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
    const seg = new Segment({ ...value, clientId: req.params.clientId });
    await seg.save();
    res.status(201).json({ segment: seg });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const updates = req.body;
    const seg = await Segment.findByIdAndUpdate(req.params.segmentId, updates, {
      new: true,
    });
    if (!seg)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Segment not found' } });
    res.json({ segment: seg });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const seg = await Segment.findByIdAndDelete(req.params.segmentId);
    if (!seg)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Segment not found' } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
