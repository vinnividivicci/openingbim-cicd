import { Router } from 'express';
const router = Router();
// POST /api/v1/ids/check
router.post('/check', (req, res) => {
    // TODO: Implement IDS check
    res.status(202).json({ jobId: 'not-implemented' });
});
export default router;
