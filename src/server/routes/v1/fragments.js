import { Router } from 'express';
const router = Router();
// POST /api/v1/fragments
router.post('/', (req, res) => {
    // TODO: Implement IFC to Fragments conversion
    res.status(202).json({ jobId: 'not-implemented' });
});
// GET /api/v1/fragments/:fileId
router.get('/:fileId', (req, res) => {
    // TODO: Implement fragment download
    res.status(501).send('Not Implemented');
});
export default router;
