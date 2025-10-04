import { describe, it, expect, beforeAll } from 'vitest'

/**
 * Integration Test: Validation + Delayed Visualization (Quickstart Test 2)
 *
 * Scenario:
 * 1. Upload IFC + IDS to POST /api/v1/ids/check
 * 2. Wait for validation completion
 * 3. Upload to POST /api/v1/fragments/visualize with validationJobId (within 1-hour window)
 * 4. Assert: Fragments file links to validation results
 *
 * This test MUST FAIL initially because the /fragments/visualize endpoint doesn't exist yet (T010).
 */

describe.skip('Integration Test: Validation + Delayed Visualization', () => {
  let serverUrl: string

  beforeAll(() => {
    serverUrl = process.env.TEST_SERVER_URL || 'http://localhost:3001'
  })

  it('should reuse cached IFC from validation for delayed visualization', async () => {
    // Step 1: Upload IFC + IDS for validation
    const formData = new FormData()
    formData.append('ifcFile', new Blob(['IFC test content']), 'test.ifc')
    formData.append('idsFile', new Blob(['IDS test content']), 'test.ids')

    const validationResponse = await fetch(`${serverUrl}/api/v1/ids/check`, {
      method: 'POST',
      body: formData
    })

    expect(validationResponse.status).toBe(202)
    const validationData = await validationResponse.json()
    const validationJobId = validationData.jobId

    // Step 2: Wait for validation to complete
    let validationCompleted = false
    let attempts = 0
    const maxAttempts = 30

    while (!validationCompleted && attempts < maxAttempts) {
      const jobResponse = await fetch(`${serverUrl}/api/v1/jobs/${validationJobId}`)
      const jobData = await jobResponse.json()

      if (jobData.status === 'completed') {
        validationCompleted = true
      } else if (jobData.status === 'failed') {
        throw new Error(`Validation job failed: ${JSON.stringify(jobData.error)}`)
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000))
        attempts++
      }
    }

    expect(validationCompleted).toBe(true)

    // Step 3: Request visualization using cached IFC (no file re-upload)
    const vizFormData = new FormData()
    vizFormData.append('validationJobId', validationJobId)

    const vizResponse = await fetch(`${serverUrl}/api/v1/fragments/visualize`, {
      method: 'POST',
      body: vizFormData
    })

    expect(vizResponse.status).toBe(202)
    const vizData = await vizResponse.json()
    expect(vizData).toHaveProperty('jobId')
    expect(vizData).toHaveProperty('fragmentsFileId')
    expect(vizData).toHaveProperty('validationJobId')
    expect(vizData.validationJobId).toBe(validationJobId)

    // Step 4: Verify fragments job completes with validation link
    const fragmentsJobId = vizData.jobId
    let fragmentsCompleted = false
    attempts = 0

    while (!fragmentsCompleted && attempts < maxAttempts) {
      const jobResponse = await fetch(`${serverUrl}/api/v1/jobs/${fragmentsJobId}`)
      const jobData = await jobResponse.json()

      if (jobData.status === 'completed') {
        fragmentsCompleted = true
        expect(jobData.result).toHaveProperty('fileId')
        expect(jobData.result).toHaveProperty('validationJobId')
        expect(jobData.result.validationJobId).toBe(validationJobId)
      } else if (jobData.status === 'failed') {
        throw new Error(`Fragments job failed: ${JSON.stringify(jobData.error)}`)
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000))
        attempts++
      }
    }

    expect(fragmentsCompleted).toBe(true)
  }, 120000) // 120 second timeout
})
