module.exports = function (allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user)
      return res
        .status(401)
        .json({ error: { code: 'UNAUTHORIZED', message: 'Missing user' } });
    if (!allowedRoles || !allowedRoles.length) return next();
    if (allowedRoles.includes(req.user.role)) return next();
    return res
      .status(403)
      .json({
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
  };
};
