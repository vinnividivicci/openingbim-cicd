# Implementation Plan: Direct IFC to IDS Validation Workflow

**Branch**: `001-ids-validation-via` | **Date**: 2025-10-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-ids-validation-via/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code, or `AGENTS.md` for all other agents).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Optimize IDS validation workflow by eliminating unnecessary IFC-to-fragments conversion when only validation results are needed. The current system converts IFC → fragments → validation for all requests. The optimized approach validates IFC files directly using IfcTester (Python), only converting to fragments when 3D visualization is explicitly requested. This reduces processing time and enables independent validation and visualization operations.

**Key Changes**:
- Remove mandatory fragments conversion from validation workflow
- Support validation-only requests (IFC + IDS → results)
- Support visualization-only requests (IFC → fragments → 3D view)
- Support combined workflow (validate → visualize with highlighted results)
- Cache uploaded IFC files for 1 hour to enable later visualization requests
- Maintain backward compatibility with existing IfcTesterService

## Technical Context

**Language/Version**: TypeScript 5.2.2 (Node.js backend + browser frontend), Python 3.9-3.13 (IDS validation)
**Primary Dependencies**:
- Backend: Express 4.19, @thatopen/fragments 3.1, @thatopen/components 3.1, web-ifc 0.0.69, multer, uuid
- Python: ifctester 0.8.3, ifcopenshell 0.8.3.post2
- Frontend: @thatopen/components-front 3.1, @thatopen/ui 3.1, Three.js 0.175.0, Vite 5.2
- Testing: Vitest 3.2.4, jsdom 26.1
**Storage**: Temporary file storage with 1-hour auto-deletion (FileStorageService), in-memory job queue (Map-based, non-persistent)
**Testing**: Vitest (unit + integration), contract tests for API endpoints
**Target Platform**: Linux/Windows/macOS server (backend), modern browsers (frontend)
**Project Type**: web (frontend + backend)
**Performance Goals**: Any measurable improvement over current IFC → fragments → validation workflow (no specific numeric target)
**Constraints**:
- Maximum file size: 1 GB (increased from current 500 MB)
- File retention: 1 hour automatic deletion
- Must maintain validation accuracy and completeness
- Error messages must include error type and brief reason
**Scale/Scope**:
- Support large IFC models up to 1 GB
- Handle concurrent validation/visualization requests
- Minimal API changes to existing `/api/v1/ids/check` endpoint

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Backend-First Architecture with Temporary Storage
- ✅ **COMPLIANT**: All IFC processing remains server-side via Express API
- ✅ **COMPLIANT**: Maintains 1-hour TTL file cleanup (existing FileStorageService)
- ✅ **COMPLIANT**: No database persistence of BIM models
- ✅ **COMPLIANT**: Extends temporary storage to cache original IFC files for visualization

### Principle II: API Service with Frontend Viewer
- ✅ **COMPLIANT**: Backend handles all computation (IFC validation, fragments conversion)
- ✅ **COMPLIANT**: Frontend remains visualization-only layer
- ✅ **COMPLIANT**: Uses @thatopen/fragments (backend) and @thatopen/components-front (frontend)

### Principle III: Component-Based Architecture
- ✅ **COMPLIANT**: Frontend components extend OBC.Component pattern
- ✅ **COMPLIANT**: Uses @thatopen/ui template literals for UI
- ✅ **COMPLIANT**: No changes to existing component architecture

### Principle IV: Zero External Dependencies for IFC Parsing
- ✅ **COMPLIANT**: Continues using web-ifc (WASM) for IFC parsing
- ✅ **COMPLIANT**: Python ifctester only for IDS validation (existing pattern)
- ✅ **COMPLIANT**: No new IFC parsers introduced

### Principle V: Test Coverage for Validation Logic
- ⚠️ **ACTION REQUIRED**: Must add contract tests for modified `/api/v1/ids/check` endpoint
- ⚠️ **ACTION REQUIRED**: Must add integration tests for new caching behavior
- ⚠️ **ACTION REQUIRED**: Must test file size limit increase to 1 GB
- ✅ **PLANNED**: Vitest tests colocated with source files

### Principle VI: Production-Ready Code Quality
- ✅ **COMPLIANT**: TypeScript strict mode (frontend), ESLint, Prettier
- ⚠️ **ACTION REQUIRED**: Remove console.log statements before production (existing debt, not introduced)
- ✅ **COMPLIANT**: Error handling returns meaningful error type + reason

### Architecture Constraints
- ✅ **COMPLIANT**: File upload limit is already 1 GB (verified in research.md); only HTTP status code needs correction from 400 to 413 (Multer config at `src/server/middleware/upload.ts`)
- ✅ **COMPLIANT**: No path aliases (relative imports)
- ✅ **COMPLIANT**: `import * as THREE` pattern
- ✅ **COMPLIANT**: In-memory job queue (existing)
- ✅ **COMPLIANT**: WASM path management (existing DirectFragmentsService)
- ✅ **COMPLIANT**: Configurable Python path via PYTHON_PATH env var

### Quality Standards
- ✅ **COMPLIANT**: All naming conventions followed
- ✅ **COMPLIANT**: Import organization enforced by linting
- ✅ **COMPLIANT**: BUI.html template literals for UI
- ✅ **COMPLIANT**: No semicolons (Prettier)

### Known Constraints Acknowledgment
- Console logging debt acknowledged (not introduced by this feature)
- Test coverage gaps acknowledged (addressed in Phase 1)
- No authentication required for this feature (out of scope)

**Initial Gate Status**: PASS with action items (test coverage, file size limit update)

## Project Structure

### Documentation (this feature)
```
specs/001-ids-validation-via/
├── plan.md              # This file (/plan command output)
├── spec.md              # Feature specification (already exists)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
src/
├── bim-components/              # Frontend OBC components
│   ├── IDSIntegration/          # Core IDS validation component
│   └── IDSUIStateManager.ts     # UI state management
├── server/
│   ├── middleware/
│   │   └── upload.ts            # [MODIFY] Increase file size limit to 1 GB
│   ├── routes/v1/
│   │   ├── ids.ts               # [MODIFY] Support optional fragments, cache IFC files
│   │   └── fragments.ts         # [NEW] Add visualization-only endpoint
│   ├── services/
│   │   ├── IfcTesterService.ts  # [EXISTING] Already accepts IFC files directly
│   │   ├── FileStorageService.ts # [MODIFY] Cache IFC files with 1-hour TTL
│   │   ├── DirectFragmentsService.ts # [EXISTING] IFC to fragments conversion
│   │   └── JobQueue.ts          # [EXISTING] In-memory job tracking
│   └── server.ts                # [EXISTING] Express app

tests/
├── contract/                     # [NEW] API contract tests
│   ├── ids-validation.test.ts   # POST /api/v1/ids/check contract
│   └── fragments.test.ts        # POST /api/v1/fragments contract
└── integration/                  # [NEW] Integration tests
    ├── ids-caching.test.ts      # IFC file caching behavior
    └── file-size-limits.test.ts # 1 GB limit validation
```

**Structure Decision**: Web application architecture (frontend + backend). Backend at `src/server/`, frontend components at `src/bim-components/`. Tests colocated with source using `*.test.ts` pattern and centralized in `tests/` for contract/integration tests. This feature primarily modifies backend API routes and services, with minimal frontend component changes.

## Phase 0: Outline & Research

**Objective**: Validate technical approach and resolve any remaining unknowns about the current implementation.

### Research Tasks

1. **Current IDS Validation Flow Analysis**
   - Map current workflow: Upload → Fragments conversion → IfcTester validation
   - Identify where fragments conversion is required vs. optional
   - Document IfcTesterService's current input expectations

2. **File Caching Strategy**
   - Review FileStorageService implementation
   - Determine how to extend for 1-hour IFC file caching
   - Verify auto-cleanup mechanisms work with 1 GB files

3. **API Endpoint Design**
   - Decide: Separate endpoints vs. optional parameters
   - Review existing `/api/v1/ids/check` contract
   - Design visualization-only endpoint (if separate)

4. **File Size Limit Update**
   - Review Multer configuration at `src/server/middleware/upload.ts`
   - Verify Node.js memory limits support 1 GB files
   - Test file upload performance with large files

5. **Error Handling Patterns**
   - Review existing error response formats
   - Ensure error type + brief reason pattern is consistent
   - Document error scenarios (file too large, invalid IFC, missing IDS)

### Research Output
All findings will be documented in `research.md` with:
- **Decision**: Technical choice made
- **Rationale**: Why this approach was selected
- **Alternatives Considered**: What else was evaluated
- **References**: Links to relevant code, docs, or examples

## Phase 1: Design & Contracts

*Prerequisites: research.md complete*

### 1. Data Model (`data-model.md`)

Extract entities from feature specification and research:

**Entities**:
- **UploadedFile**: fileId (UUID), originalName, size, mimeType, buffer, uploadTimestamp, expiryTimestamp
- **ValidationJob**: jobId (UUID), ifcFileId, idsFileId, status, createdAt, completedAt, results
- **ValidationResults**: specifications[], summary, error?, message?
- **CachedIFC**: fileId (UUID), ifcFile (UploadedFile), cachedAt, expiresAt, validationResults?

**Relationships**:
- ValidationJob references UploadedFile (IFC) and UploadedFile (IDS)
- CachedIFC contains UploadedFile and optional ValidationResults
- FileStorageService manages CachedIFC lifecycle (1-hour TTL)

**State Transitions**:
- UploadedFile: uploaded → cached → expired (auto-deleted)
- ValidationJob: queued → processing → completed/failed
- CachedIFC: active → expired (triggers auto-deletion)

**Validation Rules**:
- File size ≤ 1 GB (enforced at upload)
- IFC file required for validation or visualization
- IDS file required only for validation
- Cached files auto-delete after 1 hour

### 2. API Contracts (`contracts/`)

Based on functional requirements, generate OpenAPI-style contracts:

**Modified Endpoint**: `POST /api/v1/ids/check`
```yaml
Request:
  Content-Type: multipart/form-data
  Fields:
    - ifcFile: binary (required, max 1GB)
    - idsFile: binary (required, max 1GB)
Responses:
  202: { jobId: string }
  400: { error: string } # Missing file, invalid format
  413: { error: string, details: string } # File too large (>1GB)
  503: { error: string, details: string } # Python validation unavailable
```

**New Endpoint**: `POST /api/v1/fragments/visualize`
```yaml
Request:
  Content-Type: multipart/form-data
  Fields:
    - ifcFile: binary (required, max 1GB)
    - validationJobId: string (optional) # Link to validation results
Responses:
  202: { jobId: string, fragmentsFileId: string }
  400: { error: string }
  413: { error: string, details: string }
```

**Existing Endpoint (No Changes)**: `GET /api/v1/ids/results/:fileId`
**Existing Endpoint (No Changes)**: `GET /api/v1/jobs/:jobId`

### 3. Contract Tests (`tests/contract/`)

Generate failing tests for each endpoint:

- `ids-validation.test.ts`: Assert POST /ids/check request/response schemas
- `fragments-visualize.test.ts`: Assert POST /fragments/visualize schemas
- `file-size-limits.test.ts`: Assert 1 GB limit rejection with 413 status

Tests will fail initially (no implementation yet) and pass after Phase 4.

### 4. Integration Test Scenarios (`tests/integration/`)

From user stories in spec:

- **Scenario 1**: Upload IFC + IDS → validate → receive results (no fragments)
- **Scenario 2**: Upload IFC + IDS → validate → request visualization → receive highlighted 3D
- **Scenario 3**: Upload IFC only → request visualization → receive plain 3D view
- **Scenario 4**: Upload 1.1 GB IFC → receive 413 error with size limit message
- **Scenario 5**: Upload corrupt IFC → receive error with type + brief reason

### 5. Quickstart (`quickstart.md`)

Manual test procedure matching primary user story:

```markdown
# Quickstart: IDS Validation Workflow Test

## Prerequisites
- Backend server running (`npm run server`)
- Python venv with ifctester installed

## Test 1: Validation Only
1. Upload IFC + IDS to POST /api/v1/ids/check
2. Poll GET /api/v1/jobs/:jobId until complete
3. Download GET /api/v1/ids/results/:fileId
4. Verify: Results contain specifications[], summary, no fragments file

## Test 2: Validation + Visualization
1. Upload IFC + IDS to POST /api/v1/ids/check
2. Wait for validation to complete (within 1 hour cache window)
3. Upload to POST /api/v1/fragments/visualize with validationJobId
4. Verify: Fragments file links to validation results

## Test 3: File Size Limit
1. Attempt to upload 1.1 GB IFC file
2. Verify: 413 error with "File exceeds 1 GB limit" message
```

### 6. Update Agent Context (CLAUDE.md)

Run script to incrementally update CLAUDE.md:
```bash
.specify/scripts/bash/update-agent-context.sh claude
```

Expected additions:
- New API endpoint: `POST /api/v1/fragments/visualize`
- Modified behavior: `/api/v1/ids/check` no longer requires fragments
- File size limit: 500 MB → 1 GB
- Caching policy: IFC files cached for 1 hour
- Recent changes: Direct IFC validation workflow (001-ids-validation-via)

**Output**: data-model.md, contracts/*, failing tests, quickstart.md, CLAUDE.md (updated)

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base structure
2. Generate tasks from Phase 1 design artifacts:
   - Contract tests → Test creation tasks (TDD approach)
   - Data model entities → Service modification tasks
   - API contracts → Route handler modification tasks
   - Quickstart scenarios → Integration test tasks

**Task Breakdown**:

**Foundation Tasks** (Must complete first):
1. Update Multer config to 1 GB limit [P]
2. Create contract test: POST /ids/check schema [P]
3. Create contract test: POST /fragments/visualize schema [P]
4. Create contract test: File size 413 rejection [P]

**Backend Service Tasks** (Depends on foundation):
5. Extend FileStorageService for IFC caching (1-hour TTL)
6. Modify IfcTesterService to cache original IFC file on validation
7. Create new route: POST /api/v1/fragments/visualize
8. Modify route: POST /api/v1/ids/check to skip fragments requirement
9. Add error handling for file size limit with type + reason

**Integration Tasks** (Depends on services):
10. Create integration test: Validation-only workflow (IFC + IDS → results)
11. Create integration test: Cached IFC retrieval for visualization
12. Create integration test: 1 GB file upload and validation
13. Create integration test: Visualization without prior validation

**Frontend Tasks** (If needed):
14. Update IDSIntegration component to handle new API responses [P]
15. Add UI handling for file size limit errors [P]

**Documentation Tasks** (Can run in parallel):
16. Update CLAUDE.md with new endpoints and behavior [P]
17. Create quickstart.md test procedure [P]
18. Document data-model.md entities [P]

**Validation Tasks** (Final):
19. Run all contract tests (should pass)
20. Run all integration tests (should pass)
21. Execute quickstart.md manual test
22. Verify performance: Validation faster than old workflow

**Ordering Strategy**:
- TDD order: Contract tests before implementation (tasks 2-4 before 5-9)
- Dependency order: Foundation → Services → Integration
- Mark [P] for parallel execution (independent tasks)

**Estimated Output**: ~22 numbered, dependency-ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

No constitutional violations detected. All changes align with existing architecture:
- Backend-first processing maintained
- Temporary storage with 1-hour TTL preserved
- Component-based architecture unchanged
- web-ifc and @thatopen ecosystem continue as sole IFC parsers
- Test coverage gaps addressed in Phase 1 (contract + integration tests)
- File size limit increase (500 MB → 1 GB) requires only Multer config change

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command) - 25 tasks created (T001-T024 + T020a)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (with action items documented)
- [x] Post-Design Constitution Check: PASS (all action items addressed in Phase 1 design)
- [x] All NEEDS CLARIFICATION resolved (5 clarifications completed in spec.md)
- [x] Complexity deviations documented (none - fully compliant with constitution)

**Artifacts Generated**:
- [x] research.md (Phase 0)
- [x] data-model.md (Phase 1)
- [x] contracts/ids-check.yaml (Phase 1)
- [x] contracts/fragments-visualize.yaml (Phase 1)
- [x] quickstart.md (Phase 1)
- [x] CLAUDE.md updated (Phase 1)
- [x] tasks.md (Phase 3) - 25 implementation tasks (T001-T024 + T020a)

---
*Based on Constitution v2.0.0 - See `.specify/memory/constitution.md`*
