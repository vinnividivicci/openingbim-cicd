import multer from 'multer';
import path from 'path';
import { Request } from 'express';

// Configure storage
const storage = multer.memoryStorage();

// File filter for IFC files
const ifcFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.ifc') {
    cb(null, true);
  } else {
    cb(new Error('Only IFC files are allowed'));
  }
};

// File filter for IDS files
const idsFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.ids' || ext === '.xml') {
    cb(null, true);
  } else {
    cb(new Error('Only IDS/XML files are allowed'));
  }
};

// File filter for fragments files
const fragmentsFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.frag') {
    cb(null, true);
  } else {
    cb(new Error('Only fragments (.frag) files are allowed'));
  }
};

// Configure multer for IFC upload
export const uploadIFC = multer({
  storage: storage,
  fileFilter: ifcFileFilter,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB max file size
  },
}).single('ifcFile');

// Configure multer for IDS validation (IFC + IDS file)
export const uploadForIDS = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB max file size
  },
}).fields([
  { name: 'ifcFile', maxCount: 1 },
  { name: 'idsFile', maxCount: 1 },
]);

// Error handler middleware for multer
export const handleMulterError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 1GB.' });
    }
    return res.status(400).json({ error: `Upload error: ${error.message}` });
  } else if (error) {
    return res.status(400).json({ error: error.message });
  }
  next();
};