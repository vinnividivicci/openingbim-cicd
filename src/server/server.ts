import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import yaml from 'yaml';
import v1Router from './routes/v1/index.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1024mb' }));
app.use(express.urlencoded({ limit: '1024mb', extended: true }));

// Load OpenAPI specification
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const openapiPath = join(__dirname, '../../openapi.yaml');
const openapiFile = readFileSync(openapiPath, 'utf8');
const openapiDocument = yaml.parse(openapiFile);

// Dynamic server URL for Railway deployment
if (process.env.RAILWAY_PUBLIC_DOMAIN) {
  openapiDocument.servers = [{
    url: `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`,
    description: 'Production server (Railway)'
  }];
}

// Setup Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'BIM-IDS Validator API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true
  }
}));

app.use('/api/v1', v1Router);

app.get('/', (req, res) => {
  res.send('BIM-IDS Validator Backend is running!');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
