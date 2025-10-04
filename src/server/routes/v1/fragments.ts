import { Router, Request, Response } from 'express';
import { uploadIFC, handleMulterError } from '../../middleware/upload';
import { directFragmentsService } from '../../services/DirectFragmentsService';
import { fileStorageService } from '../../services/FileStorageService';

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

// POST /api/v1/fragments/visualize - Convert IFC to fragments with optional validation linking
router.post('/visualize', uploadIFC, handleMulterError, async (req: Request, res: Response) => {
  try {
    const { validationJobId } = req.body
    let ifcBuffer: Buffer
    let ifcFilename: string

    if (req.file) {
      // IFC file uploaded directly
      ifcBuffer = req.file.buffer
      ifcFilename = req.file.originalname
    } else if (validationJobId) {
      // Retrieve cached IFC from validation job
      const cachedIfc = await fileStorageService.getCachedIfc(validationJobId)
      if (!cachedIfc) {
        return res.status(400).json({
          error: 'Invalid validation job ID',
          details: 'Validation job not found or IFC cache expired'
        })
      }
      ifcBuffer = cachedIfc.buffer
      ifcFilename = cachedIfc.metadata.originalName
    } else {
      return res.status(400).json({
        error: 'Missing required file',
        details: 'IFC file is required for visualization'
      })
    }

    console.log(`Starting fragments conversion for: ${ifcFilename}`)

    // Start fragments conversion
    const jobId = await directFragmentsService.convertToFragments(ifcBuffer, ifcFilename)
    const fragmentsFileId = `frag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const response: any = {
      jobId,
      fragmentsFileId
    }

    if (validationJobId) {
      response.validationJobId = validationJobId
    }

    return res.status(202).json(response)
  } catch (error) {
    console.error('Error initiating fragments visualization:', error)
    res.status(500).json({
      error: 'Failed to start fragments conversion',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

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
