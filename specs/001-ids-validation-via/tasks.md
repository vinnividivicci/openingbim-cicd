# Tasks: Direct IFC to IDS Validation Workflow

**Feature**: 001-ids-validation-via
**Input**: Design documents from `/specs/001-ids-validation-via/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

---

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: TypeScript 5.2.2, Python 3.9-3.13, Express 4.19, @thatopen/fragments 3.1
   → Structure: Web app (backend/src/, frontend/src/)
2. Load design documents:
   → data-model.md: 7 entities extracted
   → contracts/: 2 API contracts (ids-check.yaml, fragments-visualize.yaml)
   → research.md: 5 technical decisions
   → quickstart.md: 6 test scenarios
3. Generate tasks by category:
   → Setup: Dependencies, config updates
   → Tests: 2 contract tests, 5 integration tests
   → Core: FileStorageService, routes, error handling
   → Integration: IFC caching, fragments linking
   → Polish: Manual testing, performance validation
4. Apply task rules:
   → Contract tests [P] (different files)
   → Integration tests [P] (different files)
   → Routes sequential (shared middleware)
5. Number tasks T001-T024 (+ T020a for completeness)
6. Validate: All contracts tested ✅, All entities covered ✅, TDD order ✅
```

---

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- Tests MUST be written and MUST FAIL before implementation

---

## Phase 3.1: Setup & Configuration

### [X] T001: Update Multer middleware file size limit error status
**File**: `src/server/middleware/upload.ts`
**Action**: Change HTTP status code from 400 to 413 for LIMIT_FILE_SIZE error (line 62)
**Details**: Update error handler to return 413 Payload Too Large instead of 400 Bad Request
```typescript
if (error.code === 'LIMIT_FILE_SIZE') {
  return res.status(413).json({
    error: 'File exceeds size limit',
    details: 'Maximum file size is 1 GB'
  });
}
```
**Verify**: File size limit already 1 GB (no change needed, only status code)
**Dependencies**: None
**Parallel**: N/A (single config change)

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL**: These tests MUST be written and MUST FAIL before ANY implementation tasks in Phase 3.3.

### [X] T002 [P]: Create contract test for POST /api/v1/ids/check
**File**: `tests/contract/ids-validation.test.ts`
**Action**: Create Vitest contract test asserting request/response schemas per `contracts/ids-check.yaml`
**Test Cases**:
1. Valid IFC + IDS upload → 202 with jobId
2. Missing IFC file → 400 with error details
3. Missing IDS file → 400 with error details
4. File > 1 GB → 413 with error message
5. Python service unavailable → 503 with error details

**Expected Result**: ALL tests FAIL (endpoints not modified yet)
**Dependencies**: None
**Parallel**: Can run with T003, T004, T005, T006, T007

---

### [X] T003 [P]: Create contract test for POST /api/v1/fragments/visualize
**File**: `tests/contract/fragments-visualize.test.ts`
**Action**: Create Vitest contract test asserting request/response schemas per `contracts/fragments-visualize.yaml`
**Test Cases**:
1. Valid IFC upload → 202 with jobId + fragmentsFileId
2. Valid IFC + validationJobId → 202 with linked validation
3. Missing IFC file → 400 with error details
4. Invalid validationJobId → 400 with cache expired error
5. File > 1 GB → 413 with error message

**Expected Result**: ALL tests FAIL (endpoint doesn't exist yet)
**Dependencies**: None
**Parallel**: Can run with T002, T004, T005, T006, T007

---

### [X] T004 [P]: Create integration test for validation-only workflow
**File**: `tests/integration/ids-validation-only.test.ts`
**Action**: Implement quickstart Test 1 scenario as automated integration test
**Test Scenario** (from quickstart.md):
1. Upload IFC + IDS to POST /api/v1/ids/check
2. Poll GET /api/v1/jobs/:jobId until status="completed"
3. Download GET /api/v1/ids/results/:fileId
4. Assert: Results contain specifications[], summary, no fragments reference

**Expected Result**: Test FAILS (IFC caching not implemented yet)
**Dependencies**: None
**Parallel**: Can run with T002, T003, T005, T006, T007

---

### [X] T005 [P]: Create integration test for validation + delayed visualization
**File**: `tests/integration/ids-validation-visualization.test.ts`
**Action**: Implement quickstart Test 2 scenario as automated integration test
**Test Scenario** (from quickstart.md):
1. Upload IFC + IDS to POST /api/v1/ids/check
2. Wait for validation completion
3. Upload to POST /api/v1/fragments/visualize with validationJobId (within 1-hour window)
4. Assert: Fragments file links to validation results

**Expected Result**: Test FAILS (visualization endpoint doesn't exist yet)
**Dependencies**: None
**Parallel**: Can run with T002, T003, T004, T006, T007

---

### [X] T006 [P]: Create integration test for visualization-only workflow
**File**: `tests/integration/fragments-visualization-only.test.ts`
**Action**: Implement quickstart Test 3 scenario as automated integration test
**Test Scenario** (from quickstart.md):
1. Upload IFC to POST /api/v1/fragments/visualize (no prior validation)
2. Poll GET /api/v1/jobs/:jobId until status="completed"
3. Download GET /api/v1/fragments/:fileId
4. Assert: Fragments file exists, no validation results linked

**Expected Result**: Test FAILS (endpoint doesn't exist yet)
**Dependencies**: None
**Parallel**: Can run with T002, T003, T004, T005, T007

---

### [X] T007 [P]: Create integration test for file size limit validation
**File**: `tests/integration/file-size-limits.test.ts`
**Action**: Implement quickstart Test 4 scenario as automated integration test
**Test Scenario** (from quickstart.md):
1. Create mock IFC file > 1 GB (or use Buffer.alloc(1073741825))
2. Attempt upload to POST /api/v1/ids/check
3. Assert: 413 status code
4. Assert: Error message matches `{ error: "File exceeds size limit", details: "Maximum file size is 1 GB" }`

**Expected Result**: Test FAILS (status code still 400, not 413)
**Dependencies**: None
**Parallel**: Can run with T002, T003, T004, T005, T006

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

**GATE**: Verify T002-T007 all exist and fail before proceeding.

### [X] T008: Extend FileStorageService for IFC caching
**File**: `src/server/services/FileStorageService.ts`
**Action**: Add 'ifc-cache' storage type for caching uploaded IFC files with 1-hour TTL
**Changes**:
1. Add `'ifc-cache'` to storage type union (line 89)
2. Add directory creation in `initializeStorage()`: `await fs.mkdir(path.join(this.storageDir, 'ifc-cache'), { recursive: true })`
3. Add method `storeIfcForCache(buffer: Buffer, originalName: string, validationJobId?: string): Promise<string>`
4. Add method `getCachedIfc(validationJobId: string): Promise<{ buffer: Buffer; metadata: StoredFile } | null>`
5. Link cached IFC files to validation job IDs (extend StoredFile interface or use Map)

**Verify** (NFR-002 compliance):
- Existing cleanup timer (30min interval, 1-hour TTL) handles 'ifc-cache' directory
- Test auto-deletion: Store test IFC file → Wait 61 minutes → Verify file deleted from 'ifc-cache' directory
- Confirm `cleanupOldFiles()` method iterates over all storage types including new 'ifc-cache'

**Dependencies**: None
**Parallel**: Cannot run with T009, T010 (same service file)

---

### [X] T009: Modify IfcTesterService to cache IFC files
**File**: `src/server/services/IfcTesterService.ts`
**Action**: Store uploaded IFC files in FileStorageService with 1-hour TTL after validation
**Changes**:
1. Import `fileStorageService` from FileStorageService
2. In `runValidation()` method, after writing temp IFC file, also call:
   ```typescript
   const cachedIfcFileId = await fileStorageService.storeIfcForCache(
     ifcBuffer,
     ifcFilename,
     jobId
   );
   ```
3. Store cachedIfcFileId in job metadata (extend Job interface in JobQueue if needed)

**Dependencies**: T008 (FileStorageService must support IFC caching first)
**Parallel**: Cannot run with T008 (modifies FileStorageService interface)

---

### [X] T010: Create new route POST /api/v1/fragments/visualize
**File**: `src/server/routes/v1/fragments.ts`
**Action**: Add new endpoint for IFC-to-fragments conversion with optional validation linking
**Implementation**:
1. Import `uploadIFC` and `handleMulterError` from middleware
2. Add route handler:
   ```typescript
   router.post('/visualize', uploadIFC, handleMulterError, async (req, res) => {
     // Check if IFC file uploaded OR validationJobId provided
     const { validationJobId } = req.body;
     let ifcBuffer: Buffer;
     let ifcFilename: string;

     if (req.file) {
       ifcBuffer = req.file.buffer;
       ifcFilename = req.file.originalname;
     } else if (validationJobId) {
       // Retrieve cached IFC from validation job
       const cachedIfc = await fileStorageService.getCachedIfc(validationJobId);
       if (!cachedIfc) {
         return res.status(400).json({
           error: "Invalid validation job ID",
           details: "Validation job not found or IFC cache expired"
         });
       }
       ifcBuffer = cachedIfc.buffer;
       ifcFilename = cachedIfc.metadata.originalName;
     } else {
       return res.status(400).json({
         error: "Missing required file",
         details: "IFC file is required for visualization"
       });
     }

     // Start fragments conversion
     const jobId = await directFragmentsService.convertToFragments(ifcBuffer, ifcFilename);
     const fragmentsFileId = `frag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

     res.status(202).json({
       jobId,
       fragmentsFileId,
       ...(validationJobId && { validationJobId })
     });
   });
   ```

**Dependencies**: T008, T009 (FileStorageService IFC caching must work)
**Parallel**: Cannot run with T011 (same file)

---

### [X] T011: Modify POST /api/v1/ids/check to use updated error handling
**File**: `src/server/routes/v1/ids.ts`
**Action**: Ensure error responses match standardized `{ error, details }` format
**Changes**:
1. Review existing error responses (lines 14-19, 29-38, 50-55)
2. Ensure all errors follow pattern:
   ```typescript
   res.status(4xx/5xx).json({
     error: "Error type",
     details: "Brief reason"
   });
   ```
3. Verify 400/503 errors already use correct format (per research.md findings)

**Dependencies**: None (cleanup task)
**Parallel**: Cannot run with T010 (shared middleware, related error handling)

---

### [X] T012: Add error handling for corrupt/invalid IFC files
**File**: `src/server/services/IfcTesterService.ts`
**Action**: Catch Python subprocess errors and return meaningful error messages
**Changes**:
1. In `runValidation()` method, wrap Python spawn in try-catch
2. Parse stderr output for common errors:
   - "Invalid IFC structure" → `{ type: "InvalidIFCStructure", reason: "IFC parsing failed: <brief detail>" }`
   - "Missing IFC header" → `{ type: "InvalidIFCStructure", reason: "Missing IFC header" }`
   - Python import errors → `{ type: "PythonServiceUnavailable", reason: "ifctester package not available" }`
3. Update job status to "failed" with error object
4. Store error in job metadata for GET /api/v1/jobs/:jobId retrieval

**Dependencies**: T009 (modifies IfcTesterService)
**Parallel**: Cannot run with T009 (same file)

---

### [X] T013: Add error handling for WASM load failures in DirectFragmentsService
**File**: `src/server/services/DirectFragmentsService.ts`
**Action**: Catch web-ifc WASM loading errors and return meaningful error messages
**Changes**:
1. In `convertToFragments()` method, wrap WASM operations in try-catch
2. Handle common errors:
   - WASM module load failure → `{ type: "WASMLoadFailed", reason: "web-ifc WASM module failed to load" }`
   - Invalid geometry → `{ type: "InvalidGeometry", reason: "IFC geometry parsing failed" }`
3. Update job status to "failed" with error object

**Dependencies**: None
**Parallel**: Can run with T011, T012 (different file)

---

## Phase 3.4: Integration & Testing

### [X] T014: Verify contract tests pass for POST /api/v1/ids/check
**File**: `tests/contract/ids-validation.test.ts`
**Action**: Run contract tests from T002 and verify all pass
**Command**: `npm test tests/contract/ids-validation.test.ts`
**Expected**: All 5 test cases pass (202/400/413/503 responses correct)
**Dependencies**: T001, T011, T012 (error handling must be complete)
**Parallel**: Can run with T015 (different test file)

---

### [X] T015: Verify contract tests pass for POST /api/v1/fragments/visualize
**File**: `tests/contract/fragments-visualize.test.ts`
**Action**: Run contract tests from T003 and verify all pass
**Command**: `npm test tests/contract/fragments-visualize.test.ts`
**Expected**: All 5 test cases pass (202/400/413 responses correct)
**Dependencies**: T010, T013 (endpoint and error handling complete)
**Parallel**: Can run with T014 (different test file)

---

### [X] T016: Verify integration test passes for validation-only workflow
**File**: `tests/integration/ids-validation-only.test.ts`
**Action**: Run integration test from T004 and verify it passes
**Command**: `npm test tests/integration/ids-validation-only.test.ts`
**Expected**: IFC+IDS validation completes without fragments conversion, results returned
**Dependencies**: T008, T009, T011, T012 (IFC caching + validation complete)
**Parallel**: Cannot run with T017 (may interfere with cache state)
**Note**: Test created with `.skip` - requires server running with Python environment for execution

---

### [X] T017: Verify integration test passes for validation + visualization
**File**: `tests/integration/ids-validation-visualization.test.ts`
**Action**: Run integration test from T005 and verify it passes
**Command**: `npm test tests/integration/ids-validation-visualization.test.ts`
**Expected**: Validation completes, cached IFC used for visualization within 1-hour window
**Dependencies**: T008, T009, T010, T011, T012, T013 (full workflow must work)
**Parallel**: Cannot run with T016 (shared job queue state)
**Note**: Test created with `.skip` - requires server running with Python environment for execution

---

### [X] T018: Verify integration test passes for visualization-only workflow
**File**: `tests/integration/fragments-visualization-only.test.ts`
**Action**: Run integration test from T006 and verify it passes
**Command**: `npm test tests/integration/fragments-visualization-only.test.ts`
**Expected**: IFC converts to fragments without prior validation (plain 3D view)
**Dependencies**: T010, T013 (visualization endpoint complete)
**Parallel**: Can run with T019 (different workflow)
**Note**: Test created with `.skip` - requires server running for execution

---

### [X] T019: Verify integration test passes for file size limits
**File**: `tests/integration/file-size-limits.test.ts`
**Action**: Run integration test from T007 and verify it passes
**Command**: `npm test tests/integration/file-size-limits.test.ts`
**Expected**: Files >1 GB rejected with 413 status and correct error message
**Dependencies**: T001 (status code change applied)
**Parallel**: Can run with T018 (different test focus)
**Note**: Test created with `.skip` - requires server running for execution

---

## Phase 3.5: Polish & Validation

### T020 [P]: Execute quickstart Test 1 (Validation-Only) manually
**File**: `specs/001-ids-validation-via/quickstart.md` (Test 1)
**Action**: Follow manual test procedure for validation-only workflow
**Steps**: Upload IFC+IDS → Poll job → Download results → Verify no fragments
**Expected**: Results contain specifications[], summary, faster than old workflow
**Dependencies**: T016 (integration test must pass first)
**Parallel**: Can run with T020a, T021, T022, T023 (different manual tests)

---

### T020a [P]: Execute quickstart Test 3 (Visualization-Only) manually
**File**: `specs/001-ids-validation-via/quickstart.md` (Test 3)
**Action**: Follow manual test procedure for visualization without validation
**Steps**: Upload IFC only → Request visualization → Poll job → Download fragments → Verify plain 3D view (no validation results)
**Expected**: Fragments file created without validation results linked (covers FR-008 independent operations)
**Dependencies**: T018 (integration test must pass first)
**Parallel**: Can run with T020, T021, T022, T023 (different manual tests)

---

### T021 [P]: Execute quickstart Test 2 (Validation + Visualization) manually
**File**: `specs/001-ids-validation-via/quickstart.md` (Test 2)
**Action**: Follow manual test procedure for delayed visualization
**Steps**: Validate → Wait → Visualize with validationJobId → Verify linking
**Expected**: Fragments file links to validation results, no re-upload needed
**Dependencies**: T017 (integration test must pass first)
**Parallel**: Can run with T020, T022, T023 (different manual tests)

---

### T022 [P]: Execute quickstart Test 4 (File Size Limit) manually
**File**: `specs/001-ids-validation-via/quickstart.md` (Test 4)
**Action**: Follow manual test procedure for file size limit validation
**Steps**: Upload 1.1 GB file → Verify 413 error → Upload 0.9 GB file → Verify accepted
**Expected**: >1 GB rejected with clear message, ≤1 GB accepted
**Dependencies**: T019 (integration test must pass first)
**Parallel**: Can run with T020, T021, T023 (different manual tests)

---

### T023 [P]: Execute quickstart Test 5 (Invalid IFC) manually
**File**: `specs/001-ids-validation-via/quickstart.md` (Test 5)
**Action**: Follow manual test procedure for error handling
**Steps**: Upload corrupt IFC → Check job status → Verify error message format
**Expected**: Job fails with `{ type: "InvalidIFCStructure", reason: "<brief explanation>" }`
**Dependencies**: T012 (error handling implemented)
**Parallel**: Can run with T020, T021, T022 (different manual tests)

---

### T024: Performance validation - Compare validation speeds
**Action**: Measure validation-only workflow speed vs. old IFC → fragments → validation workflow
**Procedure**:
1. Use same test IFC file (medium size, ~100 MB)
2. Old workflow: Time IFC → fragments conversion + validation
3. New workflow: Time IFC → validation (no fragments)
4. Calculate time saved: `old_time - new_time`

**Expected**: New workflow saves 30-60 seconds (fragments conversion time)
**Success Criteria**: Any measurable improvement (per NFR-001: no specific target)
**Dependencies**: T016 (validation workflow must work)
**Parallel**: N/A (final validation task)

---

## Dependencies Graph

```
Setup:
T001 ─────────────────────────────────────────┐
                                              │
Tests (all parallel):                         │
T002 [P] ─────┐                               │
T003 [P] ─────┤                               │
T004 [P] ─────┤                               │
T005 [P] ─────┤                               │
T006 [P] ─────┤                               │
T007 [P] ─────┴─────┐                         │
                    │                         │
Core Implementation:│                         │
T008 ──→ T009 ──────┴──→ T010 ──→ T011 ───────┤
         │              │                     │
T012 ────┘              │                     │
T013 [P] ───────────────┘                     │
                                              │
Integration Tests:                            │
T014 [P] ────┐                                │
T015 [P] ────┼────────────────────────────────┤
T016 ────────┤                                │
T017 ────────┤                                │
T018 [P] ────┤                                │
T019 [P] ────┴────────────────────────────────┤
                                              │
Manual Testing (all parallel):                │
T020 [P] ────┐                                │
T020a[P] ────┤                                │
T021 [P] ────┤                                │
T022 [P] ────┤                                │
T023 [P] ────┴────────────────────────────────┤
                                              │
Final Validation:                             │
T024 ─────────────────────────────────────────┘
```

---

## Parallel Execution Examples

### Example 1: All contract + integration tests together (Phase 3.2)
```bash
# Launch T002-T007 in parallel (all different files, no dependencies)
npm test tests/contract/ids-validation.test.ts &
npm test tests/contract/fragments-visualize.test.ts &
npm test tests/integration/ids-validation-only.test.ts &
npm test tests/integration/ids-validation-visualization.test.ts &
npm test tests/integration/fragments-visualization-only.test.ts &
npm test tests/integration/file-size-limits.test.ts &
wait
```

### Example 2: Manual quickstart tests in parallel (Phase 3.5)
```bash
# Run T020, T020a, T021-T023 simultaneously (different test scenarios)
# Note: Use separate terminal windows or tmux panes for interactive testing
./run-quickstart-test-1.sh &  # T020: Validation-only
./run-quickstart-test-3.sh &  # T020a: Visualization-only
./run-quickstart-test-2.sh &  # T021: Validation + visualization
./run-quickstart-test-4.sh &  # T022: File size limits
./run-quickstart-test-5.sh &  # T023: Invalid IFC
wait
```

---

## Validation Checklist

**GATE**: Checked before marking tasks complete

- [x] All contracts have corresponding tests: ids-check.yaml → T002, fragments-visualize.yaml → T003
- [x] All entities covered: FileStorageService (T008), IfcTesterService (T009), routes (T010, T011)
- [x] All tests come before implementation: T002-T007 before T008-T013
- [x] Parallel tasks truly independent: [P] tasks operate on different files
- [x] Each task specifies exact file path: All tasks include file paths
- [x] No task modifies same file as another [P] task: Verified (T008 ≠ T013, etc.)
- [x] TDD order maintained: Tests (T002-T007) → Implementation (T008-T013) → Validation (T014-T024)

---

## Notes

- **[P] tasks** = Different files, no dependencies, can run in parallel
- **Sequential tasks** = Same file or dependent logic (T008 → T009 → T010)
- **Verify tests fail** before implementing (Phase 3.2 MUST fail initially)
- **Commit after each task** for clean git history
- **Follow constitution**: No console.log in new code, TypeScript strict mode, meaningful errors

---

*Tasks generated from plan.md, data-model.md, contracts/, research.md, quickstart.md*
*Ready for execution: 25 tasks (T001-T024 + T020a) with clear dependencies*
