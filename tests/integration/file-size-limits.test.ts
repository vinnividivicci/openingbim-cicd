import { describe, it, expect, beforeAll } from 'vitest'

/**
 * Integration Test: File Size Limit Validation (Quickstart Test 4)
 *
 * Scenario:
 * 1. Create mock IFC file > 1 GB (or use Buffer.alloc(1073741825))
 * 2. Attempt upload to POST /api/v1/ids/check
 * 3. Assert: 413 status code
 * 4. Assert: Error message matches `{ error: "File exceeds size limit", details: "Maximum file size is 1 GB" }`
 *
 * This test MUST FAIL initially because the status code is still 400, not 413 (T001 not yet complete when test is written).
 */

describe('Integration Test: File Size Limits', () => {
  let serverUrl: string

  beforeAll(() => {
    serverUrl = process.env.TEST_SERVER_URL || 'http://localhost:3001'
  })

  it('should reject files larger than 1 GB with 413 status', async () => {
    // Create a buffer > 1 GB (1073741825 bytes = 1 GB + 1 byte)
    const largeBuffer = Buffer.alloc(1073741825)

    const formData = new FormData()
    formData.append('ifcFile', new Blob([largeBuffer]), 'large-model.ifc')
    formData.append('idsFile', new Blob(['IDS content']), 'test.ids')

    const response = await fetch(`${serverUrl}/api/v1/ids/check`, {
      method: 'POST',
      body: formData
    })

    expect(response.status).toBe(413)

    const responseData = await response.json()
    expect(responseData).toHaveProperty('error')
    expect(responseData).toHaveProperty('details')
    expect(responseData.error).toBe('File exceeds size limit')
    expect(responseData.details).toBe('Maximum file size is 1 GB')
  }, 30000) // 30 second timeout (large buffer allocation)

  it('should accept files at or below 1 GB', async () => {
    // Create a buffer exactly 1 GB (1073741824 bytes)
    const maxSizeBuffer = Buffer.alloc(1073741824)

    const formData = new FormData()
    formData.append('ifcFile', new Blob([maxSizeBuffer]), 'max-size-model.ifc')
    formData.append('idsFile', new Blob(['IDS content']), 'test.ids')

    const response = await fetch(`${serverUrl}/api/v1/ids/check`, {
      method: 'POST',
      body: formData
    })

    expect(response.status).toBe(202)
    const responseData = await response.json()
    expect(responseData).toHaveProperty('jobId')
  }, 30000) // 30 second timeout

  it('should reject large files on visualization endpoint with 413 status', async () => {
    const largeBuffer = Buffer.alloc(1073741825)

    const formData = new FormData()
    formData.append('ifcFile', new Blob([largeBuffer]), 'large-model.ifc')

    const response = await fetch(`${serverUrl}/api/v1/fragments/visualize`, {
      method: 'POST',
      body: formData
    })

    expect(response.status).toBe(413)

    const responseData = await response.json()
    expect(responseData.error).toBe('File exceeds size limit')
    expect(responseData.details).toBe('Maximum file size is 1 GB')
  }, 30000) // 30 second timeout
})
