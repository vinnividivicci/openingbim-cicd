# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend Development
- `npm run dev` - Start development server on http://localhost:5173 with hot reloading
- `npm run build` - TypeScript check + Vite production build
- `npm run preview` - Preview production build locally
- `npm test` - Run Vitest tests
- `npm run test:ui` - Run tests with UI interface
- `npm run test:coverage` - Generate test coverage report

### Backend Server
- `npm run server` - Start Express backend server with hot reloading (port 3000)
- `npm run server:build` - Build backend TypeScript to dist/server

### Code Quality
- `npx eslint src/**/*.ts` - Lint TypeScript files (Airbnb + Prettier config)
- `npx prettier --write src/**/*.ts` - Format code
- `npx tsc --noEmit` - Type check without emitting files

### Python Environment (for IDS validation)
- `pip install -r requirements.txt` - Install Python dependencies (ifctester, ifcopenshell)
- Python path configured via `PYTHON_PATH` env var or defaults to `.venv/Scripts/python`

## Architecture Overview

### Dual Architecture: Frontend + Backend API

The application operates in two modes:

1. **Client-Side Mode** (Original)
   - All processing in browser using `@thatopen/components-front`
   - WebAssembly (web-ifc) for IFC parsing
   - Direct 3D visualization with Three.js
   - Zero data leaves the browser

2. **Backend API Mode** (New)
   - Express.js server exposing REST endpoints
   - Headless IFC processing using `@thatopen/fragments`
   - Python integration for IDS validation (ifctester)
   - Docker containerization support

### Core Component System

The application uses `@thatopen/components` ecosystem with a component-based architecture:

- **OBC.Component**: Base class for all custom components
- **Worlds**: Manages 3D scenes and rendering contexts
- **Fragments**: Optimized geometry representation for large BIM models
- **UI Components**: Built with `@thatopen/ui` using template literals

### Key Services

#### Frontend Components (`src/bim-components/`)
- **IDSIntegration**: Core IDS validation component handling specification loading and model testing
- **IDSUIStateManager**: Manages UI state for validation results and user interactions
- **CustomComponent**: Base template for creating new OBC components

#### Backend Services (`src/server/services/`)
- **DirectFragmentsService**: Converts IFC to fragments using headless IfcImporter
- **IfcTesterService**: Python subprocess management for IDS validation
- **JobQueue**: In-memory job tracking (Map-based, non-persistent)
- **FileStorageService**: Temporary file management with auto-cleanup

### API Endpoints (Backend)

Base URL: `/api/v1/`

- `POST /fragments` - IFC to fragments conversion (multipart/form-data)
- `GET /fragments/:fileId` - Download fragments file
- `POST /ids/check` - Run IDS validation (requires fragmentsFile + idsFile)
- `GET /ids/results/:fileId` - Get validation results JSON
- `GET /jobs/:jobId` - Check async job status

### Critical Integration Points

1. **Web-IFC WASM Loading**
   - Frontend: Auto-loaded via Vite
   - Backend: Manual path configuration in DirectFragmentsService
   - WASM files location: `node_modules/web-ifc/`

2. **Python-Node.js Bridge**
   - Communication via JSON through stdout/stderr
   - Temporary files created in `temp/validation/`
   - Auto-cleanup after processing

3. **Polyfills for Node.js**
   - Minimal polyfills in `src/server/polyfills/`
   - `node-fetch` for fetch API
   - Basic performance.now() implementation

### File Upload Limits
- Maximum file size: 500MB (configured in Multer)
- Supported formats: .ifc, .ids, .xml, .frag
- Files auto-deleted after 1 hour

### Docker Deployment
- `Dockerfile.server`: Multi-stage build with Node.js + Python
- `docker-compose.yml`: Orchestrates frontend + backend
- Python virtual environment at `/opt/venv`
- Persistent volumes for validation data

### TypeScript Configuration
- Frontend: ES2020 target, ESNext modules, DOM libs
- Backend: ES2022 target, NodeNext modules
- Strict mode enabled
- Path aliases not configured (use relative imports)

### Testing Strategy
- Framework: Vitest with jsdom environment
- Test files: `*.test.ts` alongside source files
- Setup file: `src/test/setup.ts`
- Coverage excludes: node_modules, test files

### Known Constraints
- IDS validation currently uses fragments as IFC input (conversion needed)
- Job queue is in-memory only (loses state on restart)
- No authentication implemented yet
- Console.log statements need removal for production
- CSV export exists but not exposed in UI

### Code Style Requirements
- PascalCase: Classes and components
- camelCase: Functions and variables
- UPPER_CASE: Constants
- Three.js imports: `import * as THREE`
- UI templates: Use BUI.html template literals
- No semicolons (Prettier handles)
- Organize imports: external → @thatopen → local
