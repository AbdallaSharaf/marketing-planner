const Branch = require('../models/Branch');
const Joi = require('joi');

const schema = Joi.object({
  name: Joi.string().required(),
  address: Joi.string().allow('', null),
  phone: Joi.string().allow('', null),
});

exports.list = async (req, res, next) => {
  try {
    const branches = await Branch.find({ clientId: req.params.clientId });
    res.json({ branches });
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
    const branch = new Branch({ ...value, clientId: req.params.clientId });
    await branch.save();
    res.status(201).json({ branch });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const updates = req.body;
    const branch = await Branch.findByIdAndUpdate(
      req.params.branchId,
      updates,
      { new: true }
    );
    if (!branch)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Branch not found' } });
    res.json({ branch });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const branch = await Branch.findByIdAndDelete(req.params.branchId);
    if (!branch)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Branch not found' } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
