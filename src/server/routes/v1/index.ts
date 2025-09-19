import { Router } from 'express';
import fragmentsRouter from './fragments.js';
import idsRouter from './ids.js';
import jobsRouter from './jobs.js';

const router = Router();

router.use('/fragments', fragmentsRouter);
router.use('/ids', idsRouter);
router.use('/jobs', jobsRouter);

export default router;
