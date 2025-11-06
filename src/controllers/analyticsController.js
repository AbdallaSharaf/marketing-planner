const Client = require('../models/Client');
const Contract = require('../models/Contract');
const Quotation = require('../models/Quotation');

exports.clients = async (req, res, next) => {
  try {
    const start = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const end = req.query.endDate ? new Date(req.query.endDate) : new Date();
    // group by day/month based on groupBy
    const groupBy = req.query.groupBy || 'month';
    const match = { createdAt: { $gte: start, $lte: end }, deletedAt: null };
    const projectFormat =
      groupBy === 'day'
        ? { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
        : { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
    const agg = await Client.aggregate([
      { $match: match },
      { $group: { _id: projectFormat, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ clientGrowth: agg });
  } catch (err) {
    next(err);
  }
};

exports.revenue = async (req, res, next) => {
  try {
    const start = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const end = req.query.endDate ? new Date(req.query.endDate) : new Date();
    const groupBy = req.query.groupBy || 'month';
    const projectFormat =
      groupBy === 'day'
        ? { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
        : { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
    const agg = await Contract.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, deletedAt: null } },
      { $group: { _id: projectFormat, total: { $sum: '$value' } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ revenueByPeriod: agg });
  } catch (err) {
    next(err);
  }
};

exports.services = async (req, res, next) => {
  try {
    // placeholder: count quotations by service usage
    const agg = await Quotation.aggregate([
      { $match: { deletedAt: null } },
      {
        $unwind: { path: '$servicesPricing', preserveNullAndEmptyArrays: true },
      },
      { $group: { _id: '$servicesPricing.service', usage: { $sum: 1 } } },
      { $sort: { usage: -1 } },
    ]);
    res.json({ serviceUsage: agg });
  } catch (err) {
    next(err);
  }
};
