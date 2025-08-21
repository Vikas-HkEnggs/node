// middlewares/uploadFile.js
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../../config/cloudinary.js';

const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'challanFiles', // Optional: Cloudinary folder to store files in
    allowed_formats: ['jpg', 'png', 'pdf'],
    public_id: (req, file) => {
      const ext = file.originalname.split('.').pop();
      return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
    },
  },
});

const uploadFile = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 1 MB
  },
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and PDF files are allowed.'));
    }
  },
});

export { uploadFile };
