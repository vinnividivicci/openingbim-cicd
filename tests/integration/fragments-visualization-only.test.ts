import { describe, it, expect, beforeAll } from 'vitest'

/**
 * Integration Test: Visualization-Only Workflow (Quickstart Test 3)
 *
 * Scenario:
 * 1. Upload IFC to POST /api/v1/fragments/visualize (no prior validation)
 * 2. Poll GET /api/v1/jobs/:jobId until status="completed"
 * 3. Download GET /api/v1/fragments/:fileId
 * 4. Assert: Fragments file exists, no validation results linked
 *
 * This test MUST FAIL initially because the /fragments/visualize endpoint doesn't exist yet (T010).
 */

describe.skip('Integration Test: Visualization-Only Workflow', () => {
  let serverUrl: string

  beforeAll(() => {
    serverUrl = process.env.TEST_SERVER_URL || 'http://localhost:3001'
  })

  it('should convert IFC to fragments without prior validation', async () => {
    // Step 1: Upload IFC for visualization only (no validation)
    const formData = new FormData()
    formData.append('ifcFile', new Blob(['IFC test content']), 'test.ifc')

    const uploadResponse = await fetch(`${serverUrl}/api/v1/fragments/visualize`, {
      method: 'POST',
      body: formData
    })

    expect(uploadResponse.status).toBe(202)
    const uploadData = await uploadResponse.json()
    expect(uploadData).toHaveProperty('jobId')
    expect(uploadData).toHaveProperty('fragmentsFileId')
    expect(uploadData).not.toHaveProperty('validationJobId')

    const jobId = uploadData.jobId
    const fragmentsFileId = uploadData.fragmentsFileId

    // Step 2: Poll job status until completed
    let jobCompleted = false
    let attempts = 0
    const maxAttempts = 30

    while (!jobCompleted && attempts < maxAttempts) {
      const jobResponse = await fetch(`${serverUrl}/api/v1/jobs/${jobId}`)
      const jobData = await jobResponse.json()

      if (jobData.status === 'completed') {
        jobCompleted = true
        expect(jobData.result).toHaveProperty('fileId')
        expect(jobData.result.fileId).toBe(fragmentsFileId)
        // Verify no validation results are linked
        expect(jobData.result).not.toHaveProperty('validationJobId')
      } else if (jobData.status === 'failed') {
        throw new Error(`Job failed: ${JSON.stringify(jobData.error)}`)
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000))
        attempts++
      }
    }

    expect(jobCompleted).toBe(true)

    // Step 3: Download fragments file
    const fragmentsResponse = await fetch(`${serverUrl}/api/v1/fragments/${fragmentsFileId}`)
    expect(fragmentsResponse.status).toBe(200)
    expect(fragmentsResponse.headers.get('content-type')).toContain('application/octet-stream')
  }, 60000) // 60 second timeout
})
