# Quickstart: IDS Validation Workflow Test

**Feature**: 001-ids-validation-via
**Purpose**: Manual test procedure for direct IFC to IDS validation workflow
**Date**: 2025-10-03

---

## Prerequisites

### Backend Services
- ✅ Backend server running: `npm run server` (Express on port 3001)
- ✅ Python virtual environment activated: `.venv/bin/activate` (Linux/Mac) or `.venv\Scripts\activate` (Windows)
- ✅ Python packages installed: `pip install -r requirements.txt` (ifctester==0.8.3, ifcopenshell==0.8.3.post2)
- ✅ Node.js running with sufficient memory: `node --max-old-space-size=2048` (for 1 GB file support)

### Test Files
- Sample IFC file (any size up to 1 GB): `test-model.ifc`
- Sample IDS specification: `test-spec.ids` or `test-spec.xml`
- Large IFC file for size limit testing (>1 GB): `large-model.ifc` (optional)

### Tools
- `curl` or API testing tool (Postman, Insomnia, HTTPie)
- `jq` for JSON parsing (optional but recommended)

---

## Test 1: Validation-Only Workflow

**Objective**: Verify IFC files can be validated directly without fragments conversion.

### Step 1.1: Upload IFC and IDS for validation

```bash
curl -X POST http://localhost:3001/api/v1/ids/check \
  -F "ifcFile=@test-model.ifc" \
  -F "idsFile=@test-spec.ids" \
  | jq .
```

**Expected Response** (202 Accepted):
```json
{
  "jobId": "a1b2c3d4-e5f6-4789-a0b1-c2d3e4f56789"
}
```

**Save jobId for next steps**: `export JOB_ID="a1b2c3d4-e5f6-4789-a0b1-c2d3e4f56789"`

### Step 1.2: Poll job status until completion

```bash
curl http://localhost:3001/api/v1/jobs/$JOB_ID | jq .
```

**Expected Response** (while processing):
```json
{
  "jobId": "a1b2c3d4-e5f6-4789-a0b1-c2d3e4f56789",
  "status": "processing",
  "createdAt": "2025-10-03T14:00:00Z"
}
```

**Expected Response** (when completed):
```json
{
  "jobId": "a1b2c3d4-e5f6-4789-a0b1-c2d3e4f56789",
  "status": "completed",
  "createdAt": "2025-10-03T14:00:00Z",
  "completedAt": "2025-10-03T14:02:30Z",
  "result": {
    "fileId": "results-1234567890-abc123"
  }
}
```

**Save resultsFileId**: `export RESULTS_FILE_ID="results-1234567890-abc123"`

### Step 1.3: Download validation results

```bash
curl http://localhost:3001/api/v1/ids/results/$RESULTS_FILE_ID | jq .
```

**Expected Response** (validation results JSON):
```json
{
  "specifications": [
    {
      "name": "Test Specification",
      "applicability": "All entities",
      "requirements": [
        {
          "description": "All walls must have fire rating",
          "passed": 45,
          "failed": 3,
          "failed_entities": ["#123", "#456", "#789"]
        }
      ]
    }
  ],
  "summary": {
    "total_specifications": 1,
    "total_requirements": 1,
    "passed": 45,
    "failed": 3
  }
}
```

### Step 1.4: Verify no fragments file was created

**Verification**: Check that validation completed without creating fragments file. The results should contain validation data only, not fragments file reference.

✅ **Pass Criteria**:
- Job completes with status "completed"
- Results file contains `specifications[]` and `summary`
- No fragments file was created or referenced
- Response time faster than old workflow (baseline: compare with fragments conversion time)

---

## Test 2: Validation + Delayed Visualization

**Objective**: Verify IFC files are cached after validation for later visualization (within 1-hour window).

### Step 2.1: Upload IFC and IDS for validation

```bash
curl -X POST http://localhost:3001/api/v1/ids/check \
  -F "ifcFile=@test-model.ifc" \
  -F "idsFile=@test-spec.ids" \
  | jq .
```

**Save jobId**: `export VALIDATION_JOB_ID="b2c3d4e5-f6a7-4890-b1c2-d3e4f5a67890"`

### Step 2.2: Wait for validation to complete

```bash
# Poll until status is "completed"
curl http://localhost:3001/api/v1/jobs/$VALIDATION_JOB_ID | jq .status
```

### Step 2.3: Request visualization using cached IFC file

**Note**: This step must occur within 1 hour of validation completion (IFC cache expiry).

```bash
curl -X POST http://localhost:3001/api/v1/fragments/visualize \
  -F "validationJobId=$VALIDATION_JOB_ID" \
  | jq .
```

**Expected Response** (202 Accepted):
```json
{
  "jobId": "c3d4e5f6-a7b8-4901-c2d3-e4f5a6b78901",
  "fragmentsFileId": "frag-1234567890-def456",
  "validationJobId": "b2c3d4e5-f6a7-4890-b1c2-d3e4f5a67890"
}
```

**Save fragmentsJobId**: `export FRAGMENTS_JOB_ID="c3d4e5f6-a7b8-4901-c2d3-e4f5a6b78901"`
**Save fragmentsFileId**: `export FRAGMENTS_FILE_ID="frag-1234567890-def456"`

### Step 2.4: Poll fragments job until completion

```bash
curl http://localhost:3001/api/v1/jobs/$FRAGMENTS_JOB_ID | jq .
```

**Expected Response** (when completed):
```json
{
  "jobId": "c3d4e5f6-a7b8-4901-c2d3-e4f5a6b78901",
  "status": "completed",
  "createdAt": "2025-10-03T14:05:00Z",
  "completedAt": "2025-10-03T14:05:45Z",
  "result": {
    "fileId": "frag-1234567890-def456",
    "validationJobId": "b2c3d4e5-f6a7-4890-b1c2-d3e4f5a67890"
  }
}
```

### Step 2.5: Download fragments file

```bash
curl http://localhost:3001/api/v1/fragments/$FRAGMENTS_FILE_ID \
  --output test-model.frag
```

**Verify**: File downloads successfully and has .frag extension.

✅ **Pass Criteria**:
- Validation completes first
- Visualization request succeeds using validationJobId (no file re-upload required)
- Fragments file is linked to validation results
- Total time (validation + visualization) is faster than old workflow

---

## Test 3: Visualization-Only Workflow (No Prior Validation)

**Objective**: Verify IFC files can be visualized without prior validation (plain 3D view).

### Step 3.1: Upload IFC for visualization only

```bash
curl -X POST http://localhost:3001/api/v1/fragments/visualize \
  -F "ifcFile=@test-model.ifc" \
  | jq .
```

**Expected Response** (202 Accepted):
```json
{
  "jobId": "d4e5f6a7-b8c9-4012-d3e4-f5a6b7c89012",
  "fragmentsFileId": "frag-1234567890-ghi789"
}
```

**Note**: No `validationJobId` in response (validation was not performed).

### Step 3.2: Poll and download fragments

```bash
# Wait for completion
export FRAGMENTS_JOB_ID="d4e5f6a7-b8c9-4012-d3e4-f5a6b7c89012"
curl http://localhost:3001/api/v1/jobs/$FRAGMENTS_JOB_ID | jq .

# Download when complete
export FRAGMENTS_FILE_ID="frag-1234567890-ghi789"
curl http://localhost:3001/api/v1/fragments/$FRAGMENTS_FILE_ID \
  --output test-model-plain.frag
```

✅ **Pass Criteria**:
- Fragments conversion succeeds without validation
- No validation results are linked to fragments file
- Frontend can display plain 3D view without validation highlighting

---

## Test 4: File Size Limit Validation

**Objective**: Verify 1 GB file size limit is enforced with proper error message.

### Step 4.1: Attempt to upload oversized IFC file

```bash
# Create or use IFC file > 1 GB
curl -X POST http://localhost:3001/api/v1/ids/check \
  -F "ifcFile=@large-model-1.1GB.ifc" \
  -F "idsFile=@test-spec.ids" \
  | jq .
```

**Expected Response** (413 Payload Too Large):
```json
{
  "error": "File exceeds size limit",
  "details": "Maximum file size is 1 GB"
}
```

### Step 4.2: Verify 1 GB file is accepted

```bash
# Upload IFC file exactly 1 GB or slightly under
curl -X POST http://localhost:3001/api/v1/ids/check \
  -F "ifcFile=@large-model-0.9GB.ifc" \
  -F "idsFile=@test-spec.ids" \
  | jq .
```

**Expected Response** (202 Accepted):
```json
{
  "jobId": "e5f6a7b8-c9d0-4123-e4f5-a6b7c8d90123"
}
```

✅ **Pass Criteria**:
- Files > 1 GB are rejected with HTTP 413 status
- Error message includes error type ("File exceeds size limit") and details ("Maximum file size is 1 GB")
- Files ≤ 1 GB are accepted and processed normally

---

## Test 5: Error Handling - Invalid IFC File

**Objective**: Verify meaningful error messages for corrupt/invalid IFC files.

### Step 5.1: Upload invalid IFC file

```bash
# Create corrupt IFC file (e.g., text file with .ifc extension)
echo "This is not a valid IFC file" > corrupt.ifc

curl -X POST http://localhost:3001/api/v1/ids/check \
  -F "ifcFile=@corrupt.ifc" \
  -F "idsFile=@test-spec.ids" \
  | jq .
```

**Expected Response** (Job accepted, but fails during processing):
```json
{
  "jobId": "f6a7b8c9-d0e1-4234-f5a6-b7c8d9e01234"
}
```

### Step 5.2: Check job status for error

```bash
export JOB_ID="f6a7b8c9-d0e1-4234-f5a6-b7c8d9e01234"
curl http://localhost:3001/api/v1/jobs/$JOB_ID | jq .
```

**Expected Response** (status: failed with error details):
```json
{
  "jobId": "f6a7b8c9-d0e1-4234-f5a6-b7c8d9e01234",
  "status": "failed",
  "createdAt": "2025-10-03T14:20:00Z",
  "completedAt": "2025-10-03T14:20:05Z",
  "error": {
    "type": "InvalidIFCStructure",
    "reason": "IFC parsing failed: missing IFC header",
    "timestamp": "2025-10-03T14:20:05Z"
  }
}
```

✅ **Pass Criteria**:
- Job status is "failed"
- Error object contains `type` (error category) and `reason` (brief explanation)
- Error message is helpful for debugging (not generic "error occurred")

---

## Test 6: Cache Expiry Test

**Objective**: Verify IFC files are auto-deleted after 1 hour.

### Step 6.1: Upload IFC for validation

```bash
curl -X POST http://localhost:3001/api/v1/ids/check \
  -F "ifcFile=@test-model.ifc" \
  -F "idsFile=@test-spec.ids" \
  | jq .
```

**Save jobId and timestamp**:
```bash
export VALIDATION_JOB_ID="a7b8c9d0-e1f2-4345-a6b7-c8d9e0f12345"
export VALIDATION_TIME=$(date +%s)
```

### Step 6.2: Wait for validation to complete

```bash
curl http://localhost:3001/api/v1/jobs/$VALIDATION_JOB_ID | jq .status
```

### Step 6.3: Wait >1 hour and attempt visualization

```bash
# Wait 61 minutes (cache expiry is 1 hour)
sleep 3660

# Attempt to use cached IFC for visualization
curl -X POST http://localhost:3001/api/v1/fragments/visualize \
  -F "validationJobId=$VALIDATION_JOB_ID" \
  | jq .
```

**Expected Response** (400 Bad Request - cache expired):
```json
{
  "error": "Invalid validation job ID",
  "details": "Validation job not found or IFC cache expired"
}
```

✅ **Pass Criteria**:
- Cached IFC files are accessible within 1-hour window
- Cached IFC files are auto-deleted after 1 hour
- Attempting to use expired cache returns clear error message

---

## Success Criteria Summary

| Test | Pass Criteria | Status |
|------|---------------|--------|
| **Test 1** | Validation completes without fragments, faster than old workflow | ☐ |
| **Test 2** | Cached IFC reused for visualization within 1-hour window | ☐ |
| **Test 3** | Visualization works without prior validation (plain 3D view) | ☐ |
| **Test 4** | File size limit (1 GB) enforced with HTTP 413 error | ☐ |
| **Test 5** | Invalid IFC files produce meaningful error messages | ☐ |
| **Test 6** | IFC cache expires after 1 hour | ☐ |

---

## Troubleshooting

### Backend not starting
- Check Python virtual environment is activated: `.venv/bin/python --version`
- Verify ifctester installed: `.venv/bin/python -c "import ifctester"`
- Check Node.js memory: Start server with `node --max-old-space-size=2048 dist/server/server.js`

### Validation fails with "Python service unavailable"
- Ensure Python path is correct: `export PYTHON_PATH=.venv/bin/python` (Linux/Mac)
- Install missing packages: `.venv/bin/pip install -r requirements.txt`
- Check Python version: Must be 3.9-3.13

### File upload returns 413 error for files <1 GB
- Check Multer configuration in `src/server/middleware/upload.ts`
- Verify file size calculation: `ls -lh test-model.ifc` (should be ≤ 1024^3 bytes)

### Fragments conversion fails
- Check web-ifc WASM path in `DirectFragmentsService.ts`
- Verify Node.js can access `node_modules/web-ifc/*.wasm` files
- Check IFC file is valid: Open in BIM viewer (e.g., IfcOpenShell viewer)

---

*Quickstart guide for manual testing of 001-ids-validation-via feature*
*Last updated: 2025-10-03*
