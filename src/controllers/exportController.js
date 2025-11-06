const Client = require('../models/Client');

function toCSV(records) {
  if (!records || !records.length) return '';
  const headers = Object.keys(records[0]);
  const rows = records.map((r) =>
    headers
      .map((h) =>
        r[h] !== undefined && r[h] !== null
          ? String(r[h]).replace(/"/g, '""')
          : ''
      )
      .map((v) => `"${v}"`)
      .join(',')
  );
  return `"${headers.join('","')}"\n` + rows.join('\n');
}

exports.exportClients = async (req, res, next) => {
  try {
    const clients = await Client.find({ deletedAt: null }).lean();
    const rows = clients.map((c) => ({
      id: c._id,
      name: c.business && c.business.name,
      email: c.personal && c.personal.email,
      phone: c.personal && c.personal.phone,
      status: c.status,
    }));
    const csv = toCSV(rows);
    res.setHeader('Content-Disposition', 'attachment; filename="clients.csv"');
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
};
