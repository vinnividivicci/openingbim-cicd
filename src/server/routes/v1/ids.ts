import { Router, Request, Response } from 'express';
import { uploadForIDS, handleMulterError } from '../../middleware/upload';
import { idsValidationService } from '../../services/IDSValidationService';

const router = Router();

// POST /api/v1/ids/check - Run IDS validation
router.post('/check', uploadForIDS, handleMulterError, async (req: Request, res: Response) => {
  try {
    // Check if files were uploaded
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files || !files.fragmentsFile || !files.fragmentsFile[0]) {
      return res.status(400).json({ error: 'No fragments file provided' });
    }

    if (!files.idsFile || !files.idsFile[0]) {
      return res.status(400).json({ error: 'No IDS file provided' });
    }

    const fragmentsFile = files.fragmentsFile[0];
    const idsFile = files.idsFile[0];

    console.log(`Received files for IDS validation:`);
    console.log(`  - Fragments: ${fragmentsFile.originalname}, size: ${fragmentsFile.size} bytes`);
    console.log(`  - IDS: ${idsFile.originalname}, size: ${idsFile.size} bytes`);

    // Start the validation process
    const jobId = await idsValidationService.runValidation(
      fragmentsFile.buffer,
      idsFile.buffer
    );

    // Return 202 Accepted with job ID
    res.status(202).json({ jobId });
  } catch (error) {
    console.error('Error initiating IDS validation:', error);
    res.status(500).json({
      error: 'Failed to start IDS validation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
