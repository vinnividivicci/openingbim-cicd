import { describe, it, expect, beforeAll, afterAll } from 'vitest'

/**
 * Integration Test: Validation-Only Workflow (Quickstart Test 1)
 *
 * Scenario:
 * 1. Upload IFC + IDS to POST /api/v1/ids/check
 * 2. Poll GET /api/v1/jobs/:jobId until status="completed"
 * 3. Download GET /api/v1/ids/results/:fileId
 * 4. Assert: Results contain specifications[], summary, no fragments reference
 *
 * This test MUST FAIL initially because IFC caching is not yet implemented (T008, T009).
 */

describe.skip('Integration Test: Validation-Only Workflow', () => {
  let serverUrl: string

  beforeAll(() => {
    serverUrl = process.env.TEST_SERVER_URL || 'http://localhost:3001'
  })

  it('should validate IFC file without creating fragments', async () => {
    // Step 1: Upload IFC + IDS for validation
    const formData = new FormData()
    formData.append('ifcFile', new Blob(['IFC test content']), 'test.ifc')
    formData.append('idsFile', new Blob(['IDS test content']), 'test.ids')

    const uploadResponse = await fetch(`${serverUrl}/api/v1/ids/check`, {
      method: 'POST',
      body: formData
    })

    expect(uploadResponse.status).toBe(202)
    const uploadData = await uploadResponse.json()
    expect(uploadData).toHaveProperty('jobId')

    const jobId = uploadData.jobId

    // Step 2: Poll job status until completed
    let jobCompleted = false
    let attempts = 0
    const maxAttempts = 30

    while (!jobCompleted && attempts < maxAttempts) {
      const jobResponse = await fetch(`${serverUrl}/api/v1/jobs/${jobId}`)
      const jobData = await jobResponse.json()

      if (jobData.status === 'completed') {
        jobCompleted = true
        expect(jobData).toHaveProperty('result')
        expect(jobData.result).toHaveProperty('fileId')

        // Step 3: Download validation results
        const resultsFileId = jobData.result.fileId
        const resultsResponse = await fetch(`${serverUrl}/api/v1/ids/results/${resultsFileId}`)
        const resultsData = await resultsResponse.json()

        // Step 4: Verify results structure
        expect(resultsData).toHaveProperty('specifications')
        expect(resultsData).toHaveProperty('summary')
        expect(Array.isArray(resultsData.specifications)).toBe(true)
        expect(resultsData.summary).toHaveProperty('total_specifications')
        expect(resultsData.summary).toHaveProperty('total_requirements')
        expect(resultsData.summary).toHaveProperty('passed')
        expect(resultsData.summary).toHaveProperty('failed')

        // Verify no fragments reference
        expect(jobData.result).not.toHaveProperty('fragmentsFileId')
      } else if (jobData.status === 'failed') {
        throw new Error(`Job failed: ${JSON.stringify(jobData.error)}`)
      } else {
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 1000))
        attempts++
      }
    }

    expect(jobCompleted).toBe(true)
  }, 60000) // 60 second timeout for async operation
})
