const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Use a writable directory by default. In serverless environments (Vercel,
// Lambda) the project filesystem (e.g. /var/task) is read-only — prefer
// the OS temp dir. Allow overriding with UPLOAD_DIR env var for local/dev.
const uploadDir =
  process.env.UPLOAD_DIR || path.join(os.tmpdir(), 'marketing-planner-uploads');

// Do NOT create directories at module-import time (this runs on every
// serverless cold start and can crash if the path is not writable). Move
// directory creation into the multer destination callback where we can
// handle errors gracefully.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    fs.mkdir(uploadDir, { recursive: true }, (err) => {
      if (err) {
        // If we can't write to disk, fallback to memory storage by
        // signalling an error here — multer will propagate it and the
        // route can return a helpful message. In many serverless setups
        // it's preferable to use memoryStorage and then upload to S3.
        return cb(err);
      }
      cb(null, uploadDir);
    });
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10) },
});

exports.uploadMiddleware = upload.single('file');

exports.upload = async (req, res, next) => {
  try {
    if (!req.file)
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' },
      });
    res.status(201).json({
      file: {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
      },
    });
  } catch (err) {
    next(err);
  }
};
