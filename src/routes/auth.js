const express = require('express');
const Joi = require('joi');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { generateAccessToken, generateRefreshToken } = require('../utils/token');
const jwt = require('jsonwebtoken');

const router = express.Router();

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  fullName: Joi.string().allow(''),
  role: Joi.string().valid('admin', 'manager', 'employee').default('employee'),
});
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

router.post('/register', async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ error: { code: 'VALIDATION_ERROR', message: error.message } });
    const existing = await User.findOne({ email: value.email });
    if (existing)
      return res
        .status(409)
        .json({
          error: { code: 'DUPLICATE_ENTRY', message: 'Email already exists' },
        });
    const user = new User(value);
    await user.save();

    const accessToken = generateAccessToken(user);
    const { tokenId, token: refreshToken } = generateRefreshToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({ tokenId, user: user._id, expiresAt });

    res
      .status(201)
      .json({
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
        accessToken,
        refreshToken,
      });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ error: { code: 'VALIDATION_ERROR', message: error.message } });
    const user = await User.findOne({ email: value.email });
    if (!user)
      return res
        .status(401)
        .json({
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Invalid credentials',
          },
        });
    const ok = await user.comparePassword(value.password);
    if (!ok)
      return res
        .status(401)
        .json({
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Invalid credentials',
          },
        });
    user.lastLogin = new Date();
    await user.save();

    const accessToken = generateAccessToken(user);
    const { tokenId, token: refreshToken } = generateRefreshToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({ tokenId, user: user._id, expiresAt });

    res.json({
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res
        .status(400)
        .json({
          error: { code: 'VALIDATION_ERROR', message: 'Missing refreshToken' },
        });
    let payload;
    try {
      payload = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'change-refresh-min-32-chars'
      );
    } catch (e) {
      return res
        .status(401)
        .json({
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Invalid refresh token',
          },
        });
    }
    const dbToken = await RefreshToken.findOne({
      tokenId: payload.tokenId,
      revoked: false,
    });
    if (!dbToken)
      return res
        .status(401)
        .json({
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Invalid refresh token',
          },
        });
    // rotate: revoke old and issue new
    dbToken.revoked = true;
    await dbToken.save();
    const user = await User.findById(dbToken.user);
    if (!user)
      return res
        .status(401)
        .json({
          error: { code: 'AUTHENTICATION_FAILED', message: 'User not found' },
        });
    const accessToken = generateAccessToken(user);
    const { tokenId, token: newRefreshToken } = generateRefreshToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({ tokenId, user: user._id, expiresAt });
    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      try {
        const payload = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET || 'change-refresh-min-32-chars'
        );
        await RefreshToken.updateOne(
          { tokenId: payload.tokenId },
          { revoked: true }
        );
      } catch (_) {
        /* ignore */
      }
    }
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});

router.get('/me', async (req, res, next) => {
  // expects Authorization header handled by frontend; short helper
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer '))
    return res
      .status(401)
      .json({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
  try {
    const token = auth.split(' ')[1];
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || 'change-me-min-32-chars'
    );
    const user = await User.findById(payload.userId).select('-password');
    if (!user)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    res.json({ user });
  } catch (err) {
    return res
      .status(401)
      .json({
        error: { code: 'AUTHENTICATION_FAILED', message: 'Invalid token' },
      });
  }
});

module.exports = router;
