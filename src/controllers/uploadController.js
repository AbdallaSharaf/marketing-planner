const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
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
      return res
        .status(400)
        .json({
          error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' },
        });
    res
      .status(201)
      .json({
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
