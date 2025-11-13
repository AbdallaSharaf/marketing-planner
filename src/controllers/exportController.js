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
    const clients = await Client.find({ deleted: false })
      .populate('createdBy', 'fullName') // Populate creator info
      .lean();

    const rows = clients.map((c) => ({
      // ID & Basic Info
      id: c._id,
      status: c.status,
      createdBy: c.createdBy ? c.createdBy.fullName : '',
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,

      // Personal Information
      personal_fullName: c.personal?.fullName || '',
      personal_email: c.personal?.email || '',
      personal_phone: c.personal?.phone || '',
      personal_position: c.personal?.position || '',

      // Business Information
      business_name: c.business?.name || '',
      business_category: c.business?.category || '',
      business_description: c.business?.description || '',
      business_mainOfficeAddress: c.business?.mainOfficeAddress || '',
      business_establishedYear: c.business?.establishedYear || '',

      // Contact Information
      contact_businessPhone: c.contact?.businessPhone || '',
      contact_businessWhatsApp: c.contact?.businessWhatsApp || '',
      contact_businessEmail: c.contact?.businessEmail || '',
      contact_website: c.contact?.website || '',
    }));

    const csv = toCSV(rows);

    // Set filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="clients_export_${timestamp}.csv"`
    );
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
};
