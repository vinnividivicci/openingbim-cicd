import { Router, Request, Response } from 'express';
import { uploadIFC, handleMulterError } from '../../middleware/upload';
import { directFragmentsService } from '../../services/DirectFragmentsService';

const router = Router();

// POST /api/v1/fragments - Convert IFC to fragments
router.post('/', uploadIFC, handleMulterError, async (req: Request, res: Response) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No IFC file provided' });
    }

    console.log(`Received IFC file for conversion: ${req.file.originalname}, size: ${req.file.size} bytes`);

    // Start the conversion process using DirectFragmentsService
    const jobId = await directFragmentsService.convertToFragments(
      req.file.buffer,
      req.file.originalname
    );

    // Return 202 Accepted with job ID
    res.status(202).json({ jobId });
  } catch (error) {
    console.error('Error initiating IFC conversion:', error);
    res.status(500).json({
      error: 'Failed to start IFC conversion',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/fragments/:fileId - Download fragments file
router.get('/:fileId', async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;

    // Get the fragments file using DirectFragmentsService
    const fileData = await directFragmentsService.getFragmentsFile(fileId);

    if (!fileData) {
      return res.status(404).json({ error: 'Fragments file not found' });
    }

    // Set appropriate headers for file download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileId}.frag"`);

    // Send the file
    res.send(fileData);
  } catch (error) {
    console.error('Error downloading fragments file:', error);
    res.status(500).json({
      error: 'Failed to download fragments file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
