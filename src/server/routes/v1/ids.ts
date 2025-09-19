import { Router, Request, Response } from 'express';
import { uploadForIDS, handleMulterError } from '../../middleware/upload';
import { ifcTesterService } from '../../services/IfcTesterService';

const router = Router();

// POST /api/v1/ids/check - Run IDS validation
router.post('/check', uploadForIDS, handleMulterError, async (req: Request, res: Response) => {
  try {
    // Check if files were uploaded
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files || !files.ifcFile || !files.ifcFile[0]) {
      return res.status(400).json({ error: 'No IFC file provided' });
    }

    if (!files.idsFile || !files.idsFile[0]) {
      return res.status(400).json({ error: 'No IDS file provided' });
    }

    const ifcFile = files.ifcFile[0];
    const idsFile = files.idsFile[0];

    console.log(`Received files for IDS validation:`);
    console.log(`  - IFC: ${ifcFile.originalname}, size: ${ifcFile.size} bytes`);
    console.log(`  - IDS: ${idsFile.originalname}, size: ${idsFile.size} bytes`);

    // Check if IfcTesterService is available
    if (!ifcTesterService.isServiceAvailable()) {
      // Try to initialize if not already done
      try {
        await ifcTesterService.initialize();
      } catch (initError) {
        return res.status(503).json({
          error: 'IDS validation service unavailable',
          details: 'Python or required packages (ifctester, ifcopenshell) not installed',
        });
      }
    }

    // Start the validation process using IfcTesterService with IFC file
    const jobId = await ifcTesterService.runValidation(
      ifcFile.buffer,
      idsFile.buffer,
      ifcFile.originalname
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

// GET /api/v1/ids/results/:fileId - Download validation results
router.get('/results/:fileId', async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;

    // Get the validation results file
    const fileData = await ifcTesterService.getValidationResults(fileId);

    if (!fileData) {
      return res.status(404).json({ error: 'Validation results not found' });
    }

    // Set appropriate headers for JSON download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="validation-results-${fileId}.json"`);

    // Send the file
    res.send(fileData);
  } catch (error) {
    console.error('Error downloading validation results:', error);
    res.status(500).json({
      error: 'Failed to download validation results',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
