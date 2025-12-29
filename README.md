# BIM/IDS Validation API
**🚧 WIP - WORK IN PROGRESS 🚧**

A production-ready REST API for validating Building Information Modeling (BIM) data from IFC files against Information Delivery Specification (IDS) requirements. Built with Node.js, Express, Python, and Docker.

## 🐋 Quick Start with Docker

**Get started in seconds with a single command:**

```bash
git clone https://github.com/vinnividivicci/openingbim-cicd.git
cd openingbim-cicd
docker compose up
```

This starts the complete stack:
- **Backend API**: `http://localhost:3001/api/v1` - REST endpoints for IFC validation
- **Web Interface**: `http://localhost` (port 80) - Testing and demonstration UI

No Python installation, no Node.js setup required. Just Docker.

## 🎯 What This API Does

- **Validate IFC files** against IDS (Information Delivery Specification) requirements
- **Convert IFC to Fragments** - Optimized geometry representation for web/mobile
- **Python-powered validation** - Industry-standard ifctester and ifcopenshell libraries
- **Async job processing** - Track long-running validations with job status endpoints
- **Web interface included** - Test API endpoints through an interactive 3D viewer
- **Dual architecture** - Backend API or optional client-side browser mode

Built for developers integrating BIM validation into their applications, CI/CD pipelines, and automated workflows.

## ✨ Key Features

- **Production-Ready API**: Express.js REST endpoints with JSON responses, ready for integration
- **Docker Deployment**: Single-command setup with docker-compose, includes Node.js + Python runtime
- **Python Integration**: Leverages industry-standard ifctester (0.8.4) and ifcopenshell (0.8.4) for IDS validation
- **Dual Architecture**: Backend API for scalable deployments + client-side browser mode for offline use
- **Developer-Friendly**: RESTful design, clear error messages, job tracking for async operations
- **Open Source Foundation**: Built exclusively on open-source libraries and standards

## 📡 API Reference

### Base URL
```
http://localhost:3001/api/v1
```

### Endpoints

#### IFC to Fragments Conversion
- **`POST /fragments`** - Convert IFC file to fragments format
  - Body: `multipart/form-data` with `ifcFile` field
  - Returns: `{ success: true, fileId: string, downloadUrl: string }`

- **`GET /fragments/:fileId`** - Download converted fragments file
  - Returns: Binary fragments file

#### IDS Validation
- **`POST /ids/check`** - Validate IFC against IDS specification
  - Body: `multipart/form-data` with `fragmentsFile` and `idsFile` fields
  - Returns: `{ success: true, jobId: string, resultsUrl: string }`

- **`GET /ids/results/:fileId`** - Get validation results
  - Returns: JSON with validation results and specifications

#### Job Management
- **`GET /jobs/:jobId`** - Check async job status
  - Returns: `{ status: "pending" | "processing" | "completed" | "failed", result?: any }`

### Example Usage

**Complete validation workflow:**

```bash
# Step 1: Convert IFC to fragments
curl -X POST http://localhost:3001/api/v1/fragments \
  -F "ifcFile=@model.ifc"
# Response: {"success":true,"fileId":"abc123","downloadUrl":"/api/v1/fragments/abc123"}

# Step 2: Run IDS validation
curl -X POST http://localhost:3001/api/v1/ids/check \
  -F "fragmentsFile=@fragments.frag" \
  -F "idsFile=@specification.ids"
# Response: {"success":true,"jobId":"job456","resultsUrl":"/api/v1/ids/results/results789"}

# Step 3: Get validation results
curl http://localhost:3001/api/v1/ids/results/results789
# Response: { "specifications": [...], "results": [...], "summary": {...} }
```

## 🚀 Installation & Deployment

### Option 1: Docker (Recommended for Production)

**Prerequisites:**
- Docker
- Docker Compose

**Installation:**

```bash
# Clone repository
git clone https://github.com/vinnividivicci/openingbim-cicd.git
cd openingbim-cicd

# Start full stack (frontend + backend)
docker compose up

# Or start backend API only
docker compose up backend
```

**Access:**
- Backend API: `http://localhost:3001/api/v1`
- Web Interface: `http://localhost` (port 80)

**Development mode with hot reloading:**
```bash
docker compose --profile dev up backend-dev
```

### Option 2: Local Development Setup

**Prerequisites:**
- Node.js 16+ ([nodejs.org](https://nodejs.org/))
- Python 3.9-3.13 ([python.org](https://www.python.org/))

**Installation:**

```bash
# Clone repository
git clone https://github.com/vinnividivicci/openingbim-cicd.git
cd openingbim-cicd

# Install Node.js dependencies
npm install

# Create Python virtual environment
python -m venv .venv

# Activate virtual environment
# On macOS/Linux:
source .venv/bin/activate
# On Windows:
.venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

**Running the application:**

```bash
# Terminal 1: Start backend API server
npm run server
# Runs on http://localhost:3001

# Terminal 2: Start frontend dev server (optional)
npm run dev
# Runs on http://localhost:5173
```

### Option 3: Cloud Deployment with Railway

Deploy the backend API to Railway with a single click:

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new?template=https://github.com/vinnividivicci/openingbim-cicd)

This will:
- Deploy backend API only (not frontend) to Railway
- Configure Node.js + Python 3 environment with all dependencies
- Set up environment variables (PORT, NODE_ENV, PYTHON_PATH)
- Enable health checks for container monitoring
- Apply ifctester patch for IDS validation

**After deployment:**
- Backend API accessible at your Railway domain (e.g., `https://your-app.railway.app/api/v1`)
- Access API endpoints directly or configure a frontend to point to your Railway backend
- Validation data persists in Railway's volume storage

**Limitations:**
- Railway has a 500MB file upload limit (API supports up to 1GB locally)
- In-memory job queue (state lost on container restart)
- Temporary files auto-delete after 1 hour

### Option 4: Client-Side Browser Mode

For users who prefer a zero-server setup, the frontend can operate standalone:

```bash
npm run dev
```

The web interface uses WebAssembly (web-ifc) to process IFC files entirely in the browser. No backend required, no data leaves your computer. Note: This mode does not include Python-based IDS validation.

## 🛠️ Technology Stack

- **Backend**: Node.js + Express.js REST API (TypeScript)
- **Validation**: Python (ifctester 0.8.4, ifcopenshell 0.8.4)
- **Frontend**: Vanilla TypeScript + Vite (for testing UI)
- **3D Rendering**: Three.js + @thatopen/components ecosystem
- **IFC Processing**: web-ifc (WebAssembly) + @thatopen/fragments
- **Deployment**: Docker + Docker Compose (multi-stage builds)
- **Build Tools**: Vite (frontend), tsc (backend TypeScript compilation)

## 📁 Project Structure

```
openingbim-cicd/
├── src/
│   ├── main.ts                    # Frontend entry point
│   ├── bim-components/            # Frontend BIM components
│   │   ├── IDSIntegration/        # IDS validation component
│   │   └── IDSUIStateManager/     # UI state management
│   ├── server/                    # Backend API server
│   │   ├── server.ts              # Express app (port 3001)
│   │   ├── routes/v1/             # API v1 endpoints
│   │   │   ├── fragments.ts       # IFC conversion routes
│   │   │   ├── ids.ts             # IDS validation routes
│   │   │   └── jobs.ts            # Job status routes
│   │   ├── services/              # Business logic
│   │   │   ├── DirectFragmentsService.ts   # IFC to fragments conversion
│   │   │   ├── IfcTesterService.ts         # Python integration
│   │   │   ├── JobQueue.ts                 # Async job tracking
│   │   │   └── FileStorageService.ts       # Temp file management
│   │   ├── middleware/            # Express middleware
│   │   └── polyfills/             # Node.js compatibility
├── requirements.txt               # Python dependencies
├── docker-compose.yml             # Full stack orchestration
├── Dockerfile.server              # Backend + Python container
├── Dockerfile                     # Frontend nginx container
├── package.json                   # Node.js dependencies
└── README.md                      # This file
```

## 🔧 Available Commands

### Development
```bash
npm run dev          # Frontend dev server (http://localhost:5173)
npm run server       # Backend API server (http://localhost:3001)
npm run build        # Build frontend for production
npm run preview      # Preview production build
```

### Backend
```bash
npm run server:build # Compile TypeScript backend to dist/
```

### Testing
```bash
npm test             # Run Vitest tests
npm run test:ui      # Run tests with UI interface
npm run test:coverage # Generate test coverage report
```

### Docker
```bash
docker compose up                          # Start full stack
docker compose up backend                  # API only
docker compose --profile dev up backend-dev # Dev mode with hot reload
docker compose down                        # Stop all services
```

### Code Quality
```bash
npx eslint src/**/*.ts              # Lint TypeScript files
npx prettier --write src/**/*.ts    # Format code
npx tsc --noEmit                    # Type check
```

## 🚢 Production Deployment

### Environment Variables

Configure these in your deployment environment or `.env` file:

```bash
# Backend Server
PORT=3001                           # API server port
NODE_ENV=production                 # Environment mode
PYTHON_PATH=/opt/venv/bin/python3   # Python executable path (Docker default)

# Frontend (if serving separately)
API_URL=http://backend:3001         # Backend API URL
```

### Docker Compose Configuration

The `docker-compose.yml` includes:

- **Persistent volumes** for validation data, storage, and fragments
- **Health checks** built into backend container
- **Network isolation** via bridge network
- **Automatic restart** policy for backend service

### Scaling Considerations

- **Job Queue**: Currently in-memory (Map-based). State is lost on restart. Consider Redis for production.
- **File Storage**: Temporary files auto-delete after 1 hour. Configure persistent volume for longer retention.
- **Upload Limits**: Maximum file size is 500MB (configurable in `src/server/middleware/upload.ts`)

## 🆘 Troubleshooting

### Docker Issues

**Port already in use:**
```bash
# Check what's using the port
lsof -i :3001  # or :80
# Change port in docker-compose.yml or stop conflicting service
```

**Volume permission errors:**
```bash
# Fix volume permissions (Linux)
sudo chown -R $USER:$USER ./temp
```

### Python Environment Issues

**Wrong Python version:**
```bash
python --version  # Must be 3.9-3.13
# Use pyenv or conda to install correct version
```

**ifcopenshell installation fails:**
- Ensure you're using a supported Python version (3.9-3.13)
- Try upgrading pip: `pip install --upgrade pip`
- On Windows: May require Visual C++ Build Tools

### Backend API Issues

**Connection refused:**
- Verify server is running: `curl http://localhost:3001`
- Check server logs: `docker compose logs backend`
- Ensure CORS is enabled (configured in `src/server/server.ts`)

**CORS errors when running frontend separately:**
- Backend includes CORS middleware for all origins (development)
- For production, configure allowed origins in `src/server/server.ts`

### Build Issues

**TypeScript errors:**
```bash
npx tsc --noEmit  # Check for type errors
```

**WebAssembly not loading:**
- In Docker: Ensure `web-ifc` WASM files are copied correctly
- In local dev: Vite auto-handles WASM, check browser console

## 🤝 Contributing

This project welcomes contributions from the BIM and open-source communities.

### For API Integration

- **RESTful Design**: Endpoints follow REST conventions (POST for creation, GET for retrieval)
- **JSON Responses**: All responses return JSON with consistent structure
- **Error Handling**: Errors include status codes and descriptive messages
- **Async Operations**: Long-running tasks return job IDs for status tracking

### Adding New Endpoints

1. Create route handler in `src/server/routes/v1/`
2. Implement business logic in `src/server/services/`
3. Add route to `src/server/routes/v1/index.ts`
4. Update API documentation in this README

### Testing Strategy

- Framework: Vitest with jsdom environment
- Test files: `*.test.ts` alongside source files
- Run tests: `npm test`
- Coverage: `npm run test:coverage`

## 📄 License

GNU GPL v3: https://www.gnu.org/licenses/gpl-3.0.html

## 📚 Additional Resources

- **ifctester**: [GitHub - buildingSMART/ifctester](https://github.com/buildingSMART/ifctester)
- **ifcopenshell**: [ifcopenshell.org](https://ifcopenshell.org/)
- **@thatopen/components**: [docs.thatopen.com](https://docs.thatopen.com/)
- **IDS Specification**: [buildingSMART IDS](https://technical.buildingsmart.org/projects/information-delivery-specification-ids/)

---

**REST API for BIM validation | Production-ready | Docker-first | Python-powered**
