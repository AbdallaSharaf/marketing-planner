const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function (req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer '))
    return res
      .status(401)
      .json({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || 'change-me-min-32-chars'
    );
    const user = await User.findById(payload.userId).select('-password');
    if (!user)
      return res
        .status(401)
        .json({ error: { code: 'UNAUTHORIZED', message: 'User not found' } });
    req.user = user;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'Invalid or expired token',
        },
      });
  }
};
