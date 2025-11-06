const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

function generateAccessToken(user) {
  const payload = { userId: user._id, email: user.email, role: user.role };
  const secret = process.env.JWT_SECRET || 'change-me-min-32-chars';
  const expiresIn = process.env.JWT_EXPIRY || '15m';
  return jwt.sign(payload, secret, { expiresIn });
}

function generateRefreshToken() {
  // we'll store tokenId in DB and return token containing tokenId
  const tokenId = uuidv4();
  const secret =
    process.env.JWT_REFRESH_SECRET || 'change-refresh-min-32-chars';
  const expiresIn = process.env.JWT_REFRESH_EXPIRY || '7d';
  const token = jwt.sign({ tokenId }, secret, { expiresIn });
  return { tokenId, token };
}

module.exports = { generateAccessToken, generateRefreshToken };
