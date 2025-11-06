const express = require('express');
const Joi = require('joi');
const Client = require('../models/Client');
const auth = require('../middleware/auth');

const router = express.Router();
const exportController = require('../controllers/exportController');

const createSchema = Joi.object({
  personal: Joi.object({
    fullName: Joi.string().max(255).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().required(),
    position: Joi.string().allow('', null),
  }).required(),
  business: Joi.object({
    name: Joi.string().max(255).required(),
    category: Joi.string().required(),
    description: Joi.string().allow('', null),
  }).required(),
  contact: Joi.object().allow(null),
});

// List with simple pagination
router.get('/', auth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const skip = (page - 1) * limit;
    const filter = { deletedAt: null };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search)
      filter['business.name'] = { $regex: req.query.search, $options: 'i' };
    const total = await Client.countDocuments(filter);
    const clients = await Client.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    res.json({
      data: clients,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, async (req, res, next) => {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ error: { code: 'VALIDATION_ERROR', message: error.message } });
    const client = new Client({ ...value, createdBy: req.user._id });
    await client.save();
    res.status(201).json({ client });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', auth, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client || client.deletedAt)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Client not found' } });
    res.json({ client });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    const allowed = ['personal', 'business', 'contact', 'status'];
    const updates = {};
    for (const k of allowed)
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    const client = await Client.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });
    if (!client)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Client not found' } });
    res.json({ client });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, {
      deletedAt: new Date(),
    });
    if (!client)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Client not found' } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Export clients CSV
router.get('/export', auth, exportController.exportClients);

module.exports = router;
