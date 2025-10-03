<!--
SYNC IMPACT REPORT
==================
Version Change: 1.0.0 → 2.0.0
Constitution Amended to Reflect Actual Architecture

Modified Principles:
- Principle I: "Privacy-First Architecture" → "Backend-First Architecture with Temporary Storage"
- Principle II: "Dual-Mode Operation" → "API Service with Frontend Viewer"

Added Sections:
- Known Constraints (production readiness items)

Removed Sections:
- None

Architecture Constraints Updated:
- File upload limit: 500MB → 1GB (matches actual implementation)
- Backend TypeScript module: "NodeNext" → "ES2022" (matches tsconfig.server.json)
- Added noImplicitAny: false documentation

Templates Requiring Updates:
- ✅ plan-template.md: No changes needed (dynamically references constitution)
- ✅ spec-template.md: No changes needed (no principle-specific requirements)
- ✅ tasks-template.md: No changes needed (task structure unchanged)
- ✅ agent-file-template.md: No changes needed (no agent-specific references)

Follow-up TODOs:
- Consider implementing client-side processing mode in future releases
- Address console.log statements before production deployment
- Add missing API endpoint contract tests
- Add integration tests for DirectFragmentsService and IfcTesterService
-->

# BIM/IDS Validation Tool Constitution

## Core Principles

### I. Backend-First Architecture with Temporary Storage
All IFC file processing and IDS validation MUST occur server-side through the Express.js API. The backend MUST implement automatic file cleanup with 1-hour TTL for all uploaded files. The system MUST NOT persist user data beyond validation execution. Files MUST be stored in-memory with automatic expiration. No database persistence of BIM models or validation results.

**Rationale**: Large BIM files (often 100MB-1GB) exceed practical browser memory limits for WebAssembly processing. Centralized backend processing ensures consistent validation results, supports enterprise CI/CD integration, and enables Python-based IDS validation (ifctester) which has no browser equivalent. Temporary storage with automatic cleanup addresses privacy concerns while enabling scalable processing.

### II. API Service with Frontend Viewer
The application operates as a backend API service exposing REST endpoints for IFC processing and IDS validation, paired with a frontend visualization layer for viewing results. Backend uses `@thatopen/fragments` for headless IFC-to-fragments conversion. Frontend uses `@thatopen/components-front` exclusively for 3D visualization of processed models. All computational processing (parsing, validation, conversion) occurs server-side.

**Rationale**: This architecture separates concerns: backend handles computation-heavy BIM operations, frontend provides interactive visualization. Enables API-first workflows for enterprise automation while maintaining user-friendly browser interface for manual review. Consistent server-side validation prevents client environment variability issues.

### III. Component-Based Architecture
All BIM functionality MUST extend `OBC.Component` from `@thatopen/components`. Components MUST be self-contained with clear responsibilities. UI components MUST use `@thatopen/ui` template literals. Custom components MUST follow the established IDSIntegration/IDSUIStateManager pattern.

**Rationale**: The `@thatopen/components` ecosystem provides battle-tested BIM patterns. Consistency with this architecture ensures maintainability and leverages community tooling.

### IV. Zero External Dependencies for IFC Parsing
IFC file parsing MUST use only web-ifc (WebAssembly) and @thatopen ecosystem libraries. MUST NOT introduce alternative IFC parsers or geometry engines. Python integration is permitted exclusively for IDS validation via ifctester.

**Rationale**: IFC parsing is complex and error-prone. web-ifc is the most mature open-source WASM solution. Multiple parsers create inconsistency and bloat.

### V. Test Coverage for Validation Logic
All IDS validation logic MUST have corresponding Vitest tests. Contract tests MUST exist for all API endpoints. Integration tests MUST cover IFC-to-fragments conversion and Python bridge communication. Test files MUST be colocated with source (`*.test.ts`).

**Rationale**: Validation correctness is critical—incorrect results undermine trust. The Python bridge and WASM loading are complex integration points requiring explicit coverage.

### VI. Production-Ready Code Quality
Code MUST pass TypeScript strict mode checks (frontend), ESLint (Airbnb config), and Prettier formatting. Console.log statements MUST be removed before production deployment. No authentication bypass or development-only code paths in production builds.

**Rationale**: This is a professional tool for regulated industries. Code quality directly impacts reliability and security posture.

## Architecture Constraints

- **File Upload Limits**: Maximum 1GB per file (IFC/IDS/fragments). Configured via Multer middleware at `src/server/middleware/upload.ts`.
- **No Path Aliases**: Use relative imports only (`../../services/foo`), not path mappings.
- **Three.js Import Pattern**: MUST use `import * as THREE from 'three'` (not default import).
- **Job Queue Scope**: In-memory only (Map-based). Loses state on restart. Document this limitation for users.
- **WASM Path Management**: Frontend auto-loads via Vite. Backend requires manual `web-ifc` path configuration in DirectFragmentsService.
- **Python Environment**: Backend MUST support configurable Python path via `PYTHON_PATH` env var. Default to `.venv/Scripts/python`.

## Quality Standards

- **TypeScript Configuration**:
  - Frontend: ES2020 target, ESNext modules, DOM libs, strict mode enabled
  - Backend: ES2022 target, ES2022 modules, strict mode with `noImplicitAny: false` (intentional for Express middleware compatibility)
- **Naming Conventions**:
  - PascalCase: Classes and components
  - camelCase: Functions and variables
  - UPPER_CASE: Constants
- **Import Organization**: External → @thatopen → local (enforced by linting)
- **UI Templates**: Use `BUI.html` template literals for consistency
- **No Semicolons**: Prettier handles formatting

## Known Constraints

The following technical debt items are acknowledged and pending resolution:

- **Console Logging**: Development console.log/warn/error statements exist throughout codebase (237+ occurrences). MUST be replaced with proper logging framework before production deployment.
- **Test Coverage Gaps**: Missing contract tests for API endpoints (`/api/v1/fragments`, `/api/v1/ids/check`, `/api/v1/jobs`). Missing integration tests for DirectFragmentsService and IfcTesterService.
- **ESLint Configuration**: Currently set to `"no-console": "off"` for development. MUST change to `"error"` for production builds.
- **No Authentication**: API endpoints are currently unauthenticated. Authentication required for production deployment.

## Governance

**Amendment Procedure**:
1. Propose changes via pull request updating this constitution
2. Document rationale for version bump (MAJOR/MINOR/PATCH)
3. Update all dependent templates in `.specify/templates/` to reflect changes
4. Obtain approval from project maintainers before merge

**Versioning Policy**:
- MAJOR: Remove/redefine core principles (e.g., switch from backend-first back to client-side)
- MINOR: Add new principle or materially expand existing guidance
- PATCH: Clarify wording, fix typos, non-semantic refinements

**Compliance Review**:
- All PRs MUST verify adherence to Core Principles I-VI
- Architecture Constraints violations MUST be justified in PR description
- Known Constraints (documented above) are acknowledged exceptions pending resolution

**Runtime Guidance**:
- Developers MUST consult `CLAUDE.md` for operational commands, API endpoints, and current technical constraints
- Agent-specific files (CLAUDE.md for Claude Code, etc.) supplement but do not override this constitution

**Version**: 2.0.0 | **Ratified**: 2025-10-03 | **Last Amended**: 2025-10-03
