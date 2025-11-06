const User = require('../models/User');

exports.list = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.json({ users });
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const allowed = ['fullName', 'email', 'role', 'isActive'];
    const updates = {};
    for (const k of allowed)
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    }).select('-password');
    if (!user)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, {
      deletedAt: new Date(),
    });
    if (!user)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
