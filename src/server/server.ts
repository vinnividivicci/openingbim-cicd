import express from 'express';
import cors from 'cors';
import v1Router from './routes/v1/index.js';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.use('/api/v1', v1Router);

app.get('/', (req, res) => {
  res.send('BIM-IDS Validator Backend is running!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
