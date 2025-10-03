<!--
SYNC IMPACT REPORT
==================
Version Change: 0.0.0 → 1.0.0
Initial Constitution Ratification

Modified Principles:
- N/A (initial creation)

Added Sections:
- Core Principles (6 principles)
- Architecture Constraints
- Quality Standards
- Governance

Removed Sections:
- N/A (initial creation)

Templates Requiring Updates:
- ✅ plan-template.md: Verified Constitution Check section aligns with principles
- ✅ spec-template.md: Verified scope/requirements alignment
- ✅ tasks-template.md: Verified task categorization reflects principles
- ✅ agent-file-template.md: Verified no outdated references

Follow-up TODOs:
- None
-->

# BIM/IDS Validation Tool Constitution

## Core Principles

### I. Privacy-First Architecture
All client-side processing MUST remain fully local with zero server uploads in frontend mode. Users MUST have explicit choice between client-side and server-side modes. Backend API mode MUST implement automatic file cleanup (1-hour TTL) and MUST NOT persist user data beyond validation execution.

**Rationale**: BIM files contain sensitive building designs and proprietary information. Privacy is a non-negotiable requirement for professional adoption in construction and architecture industries.

### II. Dual-Mode Operation
The application MUST maintain both client-side (browser-only) and server-side (API) execution paths. Frontend mode uses `@thatopen/components-front` with WebAssembly. Backend mode uses `@thatopen/fragments` with headless processing. Both modes MUST support identical IDS validation capabilities.

**Rationale**: Different use cases demand different architectures. Individual users need privacy (client-side), while enterprise integrations need automation (API). Maintaining both ensures maximum adoption.

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
Code MUST pass TypeScript strict mode checks, ESLint (Airbnb config), and Prettier formatting. Console.log statements MUST be removed before merge. No authentication bypass or development-only code paths in production builds.

**Rationale**: This is a professional tool for regulated industries. Code quality directly impacts reliability and security posture.

## Architecture Constraints

- **File Upload Limits**: Maximum 500MB per file (IFC/IDS/fragments). Configurable via Multer middleware.
- **No Path Aliases**: Use relative imports only (`../../services/foo`), not path mappings.
- **Three.js Import Pattern**: MUST use `import * as THREE from 'three'` (not default import).
- **Job Queue Scope**: In-memory only (Map-based). Loses state on restart. Document this limitation for users.
- **WASM Path Management**: Frontend auto-loads via Vite. Backend requires manual `web-ifc` path configuration in DirectFragmentsService.
- **Python Environment**: Backend MUST support configurable Python path via `PYTHON_PATH` env var. Default to `.venv/Scripts/python`.

## Quality Standards

- **TypeScript Configuration**:
  - Frontend: ES2020 target, ESNext modules, DOM libs
  - Backend: ES2022 target, NodeNext modules
  - Strict mode enabled for both
- **Naming Conventions**:
  - PascalCase: Classes and components
  - camelCase: Functions and variables
  - UPPER_CASE: Constants
- **Import Organization**: External → @thatopen → local (enforced by linting)
- **UI Templates**: Use `BUI.html` template literals for consistency
- **No Semicolons**: Prettier handles formatting

## Governance

**Amendment Procedure**:
1. Propose changes via pull request updating this constitution
2. Document rationale for version bump (MAJOR/MINOR/PATCH)
3. Update all dependent templates in `.specify/templates/` to reflect changes
4. Obtain approval from project maintainers before merge

**Versioning Policy**:
- MAJOR: Remove/redefine core principles (e.g., drop dual-mode requirement)
- MINOR: Add new principle or materially expand existing guidance
- PATCH: Clarify wording, fix typos, non-semantic refinements

**Compliance Review**:
- All PRs MUST verify adherence to Core Principles I-VI
- Architecture Constraints violations MUST be justified in PR description
- Known Constraints (documented in CLAUDE.md) are acknowledged exceptions pending resolution

**Runtime Guidance**:
- Developers MUST consult `CLAUDE.md` for operational commands, API endpoints, and current technical constraints
- Agent-specific files (CLAUDE.md for Claude Code, etc.) supplement but do not override this constitution

**Version**: 1.0.0 | **Ratified**: 2025-10-03 | **Last Amended**: 2025-10-03
