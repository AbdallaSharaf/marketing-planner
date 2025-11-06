const Client = require('../models/Client');
const Contract = require('../models/Contract');
const Quotation = require('../models/Quotation');
const CampaignPlan = require('../models/CampaignPlan');

exports.stats = async (req, res, next) => {
  try {
    const totalClients = await Client.countDocuments({ deletedAt: null });
    const activeClients = await Client.countDocuments({
      status: 'active',
      deletedAt: null,
    });
    const totalContracts = await Contract.countDocuments({ deletedAt: null });
    const activeContracts = await Contract.countDocuments({
      status: 'active',
      deletedAt: null,
    });
    const totalRevenueAgg = await Contract.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$value' } } },
    ]);
    const totalRevenue = (totalRevenueAgg[0] && totalRevenueAgg[0].total) || 0;
    const pendingQuotations = await Quotation.countDocuments({
      status: 'draft',
      deletedAt: null,
    });
    const completedCampaigns = await CampaignPlan.countDocuments({
      status: 'completed',
      deletedAt: null,
    });

    res.json({
      totalClients,
      activeClients,
      totalContracts,
      activeContracts,
      totalRevenue,
      pendingQuotations,
      completedCampaigns,
    });
  } catch (err) {
    next(err);
  }
};

exports.recentSales = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit || '10', 10);
    const contracts = await Contract.find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('clientId');
    res.json({
      recentSales: contracts.map((c) => ({
        id: c._id,
        client: c.clientId
          ? c.clientId.business && c.clientId.business.name
          : null,
        value: c.value,
        startDate: c.startDate,
      })),
    });
  } catch (err) {
    next(err);
  }
};

exports.topProducts = async (req, res, next) => {
  try {
    // placeholder: return top packages by count of contracts
    const agg = await Contract.aggregate([
      { $match: { packageId: { $ne: null }, deletedAt: null } },
      {
        $group: {
          _id: '$packageId',
          count: { $sum: 1 },
          revenue: { $sum: '$value' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: parseInt(req.query.limit || '10', 10) },
    ]);
    res.json({ topProducts: agg });
  } catch (err) {
    next(err);
  }
};
