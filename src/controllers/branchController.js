const Branch = require('../models/Branch');
const Joi = require('joi');

const schema = Joi.object({
  name: Joi.string().required(),
  address: Joi.string().allow('', null),
  phone: Joi.string().allow('', null),
});

exports.list = async (req, res, next) => {
  try {
    const items = await Branch.find({
      clientId: req.params.clientId,
      deleted: false,
    });
    res.json({ data: items });
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

    const branch = new Branch({
      ...value,
      clientId: req.params.clientId,
      deleted: false,
    });

    await branch.save();
    res.status(201).json({ data: branch });
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

    const branch = await Branch.findOneAndUpdate(
      {
        _id: req.params.branchId,
        clientId: req.params.clientId, // Security: ensure branch belongs to client
      },
      value,
      {
        new: true,
      }
    );
    if (!branch)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Branch not found' } });
    res.json({ data: branch });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const branch = await Branch.findOneAndUpdate(
      {
        _id: req.params.branchId,
        clientId: req.params.clientId,
      },
      { deleted: true },
      { new: true }
    );
    if (!branch)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Branch not found' } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
