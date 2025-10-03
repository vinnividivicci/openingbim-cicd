# Research: Direct IFC to IDS Validation Workflow

**Date**: 2025-10-03
**Feature**: 001-ids-validation-via
**Purpose**: Validate technical approach for eliminating unnecessary IFC-to-fragments conversion in validation workflow

---

## 1. Current IDS Validation Flow Analysis

### Finding

The current implementation already accepts IFC files directly for validation, but the frontend workflow unnecessarily converts IFC → fragments before validation.

**Current Backend Flow** (src/server/routes/v1/ids.ts):
```
1. POST /api/v1/ids/check receives multipart/form-data with:
   - ifcFile: Buffer (IFC file)
   - idsFile: Buffer (IDS specification)
2. IfcTesterService.runValidation(ifcFile.buffer, idsFile.buffer, filename)
3. Python subprocess spawns with IFC file directly (no fragments involved)
4. Returns jobId (202 Accepted)
```

**Current Frontend Flow** (inferred from components):
```
1. User uploads IFC file in browser
2. Frontend converts IFC → fragments using @thatopen/components-front
3. Frontend sends fragments to backend for validation (UNNECESSARY)
4. Results displayed with 3D visualization
```

### Decision

**Backend requires NO changes to IDS validation logic**. The IfcTesterService already accepts IFC files directly (line 42-46 in src/server/routes/v1/ids.ts). The issue is in the frontend workflow, which unnecessarily converts to fragments before calling the API.

### Rationale

- IfcTesterService.runValidation() signature: `runValidation(ifcBuffer: Buffer, idsBuffer: Buffer, ifcFilename: string)`
- Python ifctester library operates on IFC files, not fragments
- Current API endpoint already supports the optimized workflow
- No backend refactoring needed for validation path

### Alternatives Considered

- **Alternative 1**: Modify IfcTesterService to accept fragments → Rejected (ifctester requires IFC format)
- **Alternative 2**: Convert fragments back to IFC before validation → Rejected (adds conversion overhead)
- **Alternative 3**: Support both IFC and fragments inputs → Rejected (unnecessary complexity)

### References

- src/server/routes/v1/ids.ts (lines 8-56): Current IDS validation endpoint
- src/server/services/IfcTesterService.ts (lines 1-100): Service implementation
- Python ifctester documentation: https://docs.ifcopenshell.org/ifctester/

---

## 2. File Caching Strategy

### Finding

FileStorageService already implements 1-hour TTL auto-cleanup with Map-based registry. It supports three storage types: 'fragments', 'uploads', 'validation-results'.

**Current Implementation** (src/server/services/FileStorageService.ts):
```typescript
interface StoredFile {
  id: string;
  originalName: string;
  path: string;  // Physical file path
  size: number;
  mimeType: string;
  createdAt: Date;
}

private fileRegistry: Map<string, StoredFile>
private cleanupInterval: setInterval(() => cleanupOldFiles(), 30min)

cleanupOldFiles(maxAgeHours: number = 1) {
  // Deletes files older than 1 hour
  for (const [id, file] of fileRegistry) {
    if (age > 1 hour) deleteFile(id)
  }
}
```

### Decision

**Extend FileStorageService to cache uploaded IFC files** under a new storage type: 'ifc-cache'. When validation completes, link the IFC fileId to the validation results. When visualization is requested, retrieve the cached IFC file.

**New workflow**:
1. POST /api/v1/ids/check → Store IFC file with `storeFile(buffer, name, 'ifc-cache')`
2. Link ifcFileId to validationJobId in JobQueue
3. POST /api/v1/fragments/visualize → Retrieve IFC from cache using ifcFileId
4. Auto-deletion after 1 hour handled by existing cleanup mechanism

### Rationale

- Reuses proven auto-cleanup mechanism (no new timers needed)
- Minimal code changes: Add 'ifc-cache' type to existing mkdir (line 46)
- Map-based registry already handles metadata lookups efficiently
- Physical file storage at `temp/storage/ifc-cache/` matches existing pattern

### Alternatives Considered

- **Alternative 1**: Store IFC files in-memory (no disk) → Rejected (1 GB files exceed practical RAM limits for concurrent requests)
- **Alternative 2**: Use Redis/database for caching → Rejected (violates Constitution Principle I: no persistent storage)
- **Alternative 3**: Require user to re-upload IFC for visualization → Rejected (poor UX, violates FR-006 caching requirement)

### References

- src/server/services/FileStorageService.ts (lines 42-52): Storage initialization
- src/server/services/FileStorageService.ts (lines 67-81): Cleanup mechanism
- Constitution Principle I: Temporary storage with 1-hour TTL

---

## 3. API Endpoint Design

### Finding

Current endpoints follow REST conventions with 202 Accepted for async jobs:
- POST /api/v1/fragments → Convert IFC to fragments (returns jobId)
- POST /api/v1/ids/check → Validate IFC with IDS (returns jobId)
- GET /api/v1/jobs/:jobId → Poll job status
- GET /api/v1/fragments/:fileId → Download fragments file
- GET /api/v1/ids/results/:fileId → Download validation results

### Decision

**Use separate endpoints approach** with minimal modifications:

**Modified**: POST /api/v1/ids/check
- No changes to request/response format
- Backend caches uploaded IFC file with 1-hour TTL
- Returns: `{ jobId: string }`

**New**: POST /api/v1/fragments/visualize
- Accepts IFC file + optional validationJobId parameter
- If validationJobId provided, links fragments to validation results
- Returns: `{ jobId: string, fragmentsFileId: string }`
- Reuses DirectFragmentsService.convertToFragments() logic

**No changes**: All GET endpoints remain unchanged

### Rationale

- Separate endpoints provide clear separation of concerns (validation vs. visualization)
- POST /api/v1/fragments already exists for IFC → fragments conversion
- New /visualize endpoint is a specialized version with validation linking
- Avoids breaking changes to existing /ids/check contract
- Enables independent operations (validate without visualize, visualize without validate)

### Alternatives Considered

- **Alternative 1**: Single endpoint with optional parameters (`POST /api/v1/process?mode=validate|visualize|both`) → Rejected (violates REST single-responsibility, harder to test)
- **Alternative 2**: Modify POST /api/v1/fragments to accept validationJobId → Rejected (changes existing public API contract)
- **Alternative 3**: PATCH /api/v1/jobs/:jobId to add visualization → Rejected (jobs are immutable; visualization is a new operation)

### References

- src/server/routes/v1/ids.ts: Current validation endpoint
- src/server/routes/v1/fragments.ts: Current fragments conversion endpoint
- REST API design best practices: https://restfulapi.net/

---

## 4. File Size Limit Update

### Finding

**Current Configuration** (src/server/middleware/upload.ts):
```typescript
limits: {
  fileSize: 1024 * 1024 * 1024, // 1GB max file size (line 43)
}
```

**Existing Error Handling** (lines 61-62):
```typescript
if (error.code === 'LIMIT_FILE_SIZE') {
  return res.status(400).json({ error: 'File too large. Maximum size is 1GB.' });
}
```

### Decision

**File size limit is ALREADY 1 GB**. No changes required to Multer configuration.

**Action required**: Update error response to use 413 status code instead of 400 (per HTTP spec for payload too large).

**Modified error handler**:
```typescript
if (error.code === 'LIMIT_FILE_SIZE') {
  return res.status(413).json({
    error: 'File exceeds size limit',
    details: 'Maximum file size is 1 GB'
  });
}
```

### Rationale

- Current 1 GB limit matches feature requirement (FR-009)
- HTTP 413 Payload Too Large is semantically correct status for file size rejection
- Consistent error format: `{ error: string, details: string }` matches FR-010 requirement
- Node.js default memory limit (512 MB) is insufficient for 1 GB files; server must be started with `--max-old-space-size=2048` flag (documented in CLAUDE.md)

### Alternatives Considered

- **Alternative 1**: Increase limit to 2 GB → Rejected (no user requirement for >1 GB files)
- **Alternative 2**: Streaming upload without size limit → Rejected (requires architecture change, out of scope)
- **Alternative 3**: Compress IFC files before upload → Rejected (client-side complexity, not requested)

### References

- src/server/middleware/upload.ts (lines 42-44): Current file size config
- RFC 7231 Section 6.5.11: HTTP 413 status code definition
- Node.js memory management: https://nodejs.org/api/cli.html#--max-old-space-sizesize-in-megabytes

---

## 5. Error Handling Patterns

### Finding

Current error responses follow inconsistent patterns:

**Pattern 1** (simple error):
```json
{ "error": "No IFC file provided" }
```

**Pattern 2** (error with details):
```json
{
  "error": "Failed to start IDS validation",
  "details": "Python or required packages not installed"
}
```

**Pattern 3** (Multer errors):
```json
{ "error": "File too large. Maximum size is 1GB." }
```

### Decision

**Standardize on error type + brief reason pattern** for all error responses:

```typescript
// File validation errors (400)
{ error: "Invalid file format", details: "Only IFC files are allowed" }
{ error: "Missing required file", details: "IFC file is required for validation" }

// File size errors (413)
{ error: "File exceeds size limit", details: "Maximum file size is 1 GB" }

// Processing errors (500)
{ error: "IFC parsing failed", details: "Invalid IFC structure at line 42" }
{ error: "Validation service unavailable", details: "Python ifctester not installed" }

// Not found errors (404)
{ error: "Resource not found", details: "Validation results for job abc123 not found" }
```

### Rationale

- Consistent `{ error, details }` structure matches FR-010 requirement
- `error` field provides error type (machine-readable category)
- `details` field provides brief reason (human-readable explanation)
- Aligns with existing Pattern 2 in codebase
- HTTP status codes indicate error category (400/413/404/500)

### Alternatives Considered

- **Alternative 1**: Error codes (`{ code: "ERR_FILE_TOO_LARGE", message: "..." }`) → Rejected (over-engineering for current scale)
- **Alternative 2**: Stack traces in production → Rejected (security risk, violates Principle VI)
- **Alternative 3**: Localized error messages → Rejected (not a current requirement, adds complexity)

### References

- src/server/routes/v1/ids.ts (lines 34-37): Current error pattern example
- Feature Specification FR-010: Error message requirements
- HTTP status code best practices: https://httpstatuses.com/

---

## Summary of Research Findings

| Research Area | Status | Decision |
|---------------|--------|----------|
| **IDS Validation Flow** | ✅ Ready | Backend already accepts IFC directly; no changes needed |
| **File Caching** | ✅ Ready | Extend FileStorageService with 'ifc-cache' storage type |
| **API Endpoints** | ✅ Ready | Add POST /api/v1/fragments/visualize, modify /ids/check to cache IFC |
| **File Size Limit** | ✅ Ready | Already 1 GB; change error status to 413 |
| **Error Handling** | ✅ Ready | Standardize on `{ error, details }` pattern |

**No blockers identified**. All technical approaches validated and ready for Phase 1 design.

**Performance Note**: Validation-only workflow will be faster than current workflow because it skips fragments conversion entirely. Current flow: IFC → fragments (30-60s for large models) → validation. New flow: IFC → validation directly. Expected improvement: 30-60s reduction for validation-only requests.

---
*Research completed: 2025-10-03*
*Ready for Phase 1: Design & Contracts*
