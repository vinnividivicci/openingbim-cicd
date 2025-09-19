import { Router } from 'express';

const router = Router();

// GET /api/v1/jobs/:jobId
router.get('/:jobId', (req, res) => {
  // TODO: Implement job status check
  res.status(501).send('Not Implemented');
});

export default router;
