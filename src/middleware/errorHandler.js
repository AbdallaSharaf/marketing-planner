module.exports = function (err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  res
    .status(status)
    .json({ error: { code, message: err.message || 'Internal server error' } });
};
