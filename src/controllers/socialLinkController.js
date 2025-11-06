const SocialLink = require('../models/SocialLink');
const Joi = require('joi');

const schema = Joi.object({
  platform: Joi.string().required(),
  platformName: Joi.string().allow('', null),
  url: Joi.string().required(),
  type: Joi.string().valid('business', 'personal').default('business'),
});

exports.list = async (req, res, next) => {
  try {
    const items = await SocialLink.find({ clientId: req.params.clientId });
    res.json({ socialLinks: items });
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
    const sl = new SocialLink({ clientId: req.params.clientId, ...value });
    await sl.save();
    res.status(201).json({ socialLink: sl });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const updates = req.body;
    const sl = await SocialLink.findByIdAndUpdate(req.params.linkId, updates, {
      new: true,
    });
    if (!sl)
      return res
        .status(404)
        .json({
          error: { code: 'NOT_FOUND', message: 'Social link not found' },
        });
    res.json({ socialLink: sl });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const sl = await SocialLink.findByIdAndDelete(req.params.linkId);
    if (!sl)
      return res
        .status(404)
        .json({
          error: { code: 'NOT_FOUND', message: 'Social link not found' },
        });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
