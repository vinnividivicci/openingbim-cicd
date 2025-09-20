import express from 'express';
import cors from 'cors';
import v1Router from './routes/v1/index.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1024mb' }));
app.use(express.urlencoded({ limit: '1024mb', extended: true }));

app.use('/api/v1', v1Router);

app.get('/', (req, res) => {
  res.send('BIM-IDS Validator Backend is running!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
