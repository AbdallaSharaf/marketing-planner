const Service = require('../models/Service');
const Package = require('../models/Package');
const Joi = require('joi');

const createSchema = Joi.object({
  en: Joi.string().required(),
  ar: Joi.string().required(),
  description: Joi.string().allow('', null),
  price: Joi.number().min(0).optional(),
  packages: Joi.array().items(Joi.string()),
});

exports.list = async function (req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const skip = (page - 1) * limit;
    const filter = { deleted: false }; // Changed from deletedAt to deleted

    // Add search/filter functionality
    if (req.query.search) {
      filter.$or = [
        { en: { $regex: req.query.search, $options: 'i' } },
        { ar: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    // Price range filters
    if (req.query.minPrice) {
      filter.price = { ...filter.price, $gte: parseFloat(req.query.minPrice) };
    }
    if (req.query.maxPrice) {
      filter.price = { ...filter.price, $lte: parseFloat(req.query.maxPrice) };
    }

    const total = await Service.countDocuments(filter);
    const services = await Service.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate({
        path: 'packages',
        match: { deleted: false }, // Only non-deleted packages
        populate: {
          path: 'items',
          match: { deleted: false }, // Only non-deleted items
        },
      });

    res.json({
      data: services,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

exports.create = async function (req, res, next) {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ error: { code: 'VALIDATION_ERROR', message: error.message } });

    // Validate all items exist and are not deleted
    const validPackages = [];
    const invalidPackages = [];
    let totalPackagesPrice = 0;

    if (value.packages && value.packages.length) {
      for (const packageId of value.packages) {
        const package = await Package.findOne({
          _id: packageId,
          deleted: false,
        });

        if (package) {
          validPackages.push(package._id);
          totalPackagesPrice += package.price; // Sum up package prices
        } else {
          invalidPackages.push(packageId);
        }
      }

      // If any invalid packages found, return error
      if (invalidPackages.length > 0) {
        return res.status(400).json({
          error: {
            code: 'INVALID_PACKAGES',
            message: `The following packages are invalid or deleted: ${invalidPackages.join(
              ', '
            )}`,
          },
        });
      }
    }

    // Determine the final price: use provided price OR sum of package prices
    const finalPrice =
      value.price !== undefined ? value.price : totalPackagesPrice;

    const service = new Service({
      ...value,
      price: finalPrice, // Use calculated or provided price
      deleted: false,
    });

    await service.save();
    // Populate items for response
    await service.populate({
      path: 'packages',
      match: { deleted: false }, // Only non-deleted packages
      populate: {
        path: 'items',
        match: { deleted: false }, // Only non-deleted items
      },
    });

    res.status(201).json({ data: service });
  } catch (err) {
    next(err);
  }
};

exports.get = async function (req, res, next) {
  try {
    const service = await Service.findById(req.params.id).populate({
      path: 'packages',
      match: { deleted: false }, // Only non-deleted packages
      populate: {
        path: 'items',
        match: { deleted: false }, // Only non-deleted items
      },
    });
    if (!service || service.deleted)
      // Changed from deletedAt to deleted
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Service not found' } });
    res.json({ data: service });
  } catch (err) {
    next(err);
  }
};

exports.update = async function (req, res, next) {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error)
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: error.message },
      });
    const updates = { ...value };

    // Validate packages if being updated
    if (updates.packages) {
      const validPackages = [];
      const invalidPackages = [];
      let totalPackagesPrice = 0;

      for (const packageId of updates.packages) {
        const package = await Package.findOne({
          _id: packageId,
          deleted: false,
        });

        if (package) {
          validPackages.push(package._id);
          totalPackagesPrice += package.price; // Sum up package prices
        } else {
          invalidPackages.push(packageId);
        }
      }

      // If any invalid packages found, return error
      if (invalidPackages.length > 0) {
        return res.status(400).json({
          error: {
            code: 'INVALID_PACKAGES',
            message: `The following packages are invalid or deleted: ${invalidPackages.join(
              ', '
            )}`,
          },
        });
      }

      updates.packages = validPackages;

      // If price is not explicitly provided, calculate from packages
      if (updates.price === undefined) {
        updates.price = totalPackagesPrice;
      }
    } else if (updates.price === undefined) {
      // If packages aren't being updated but price isn't provided, keep existing price
      const existingService = await Service.findById(req.params.id);
      updates.price = existingService.price;
    }

    const service = await Service.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    }).populate({
      path: 'packages',
      match: { deleted: false }, // Only non-deleted packages
      populate: {
        path: 'items',
        match: { deleted: false }, // Only non-deleted items
      },
    });

    if (!service || service.deleted)
      // Added deleted check
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Service not found' } });

    res.json({ data: service });
  } catch (err) {
    next(err);
  }
};

exports.remove = async function (req, res, next) {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { deleted: true }, // Changed from deletedAt to deleted
      { new: true }
    );

    if (!service)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Service not found' } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
