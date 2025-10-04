import { describe, it, expect, beforeAll } from 'vitest'

/**
 * Integration Test: Basic Workflow Validation
 *
 * These tests verify the basic API endpoints work with small test files
 * File size limit testing is done in contract tests to avoid memory issues
 */

describe('Integration Test: Basic API Workflow', () => {
  let serverUrl: string

  beforeAll(() => {
    serverUrl = process.env.TEST_SERVER_URL || 'http://localhost:3001'
  })

  it('should return 400 when IFC file is missing', async () => {
    const formData = new FormData()
    formData.append('idsFile', new Blob(['IDS content']), 'test.ids')

    const response = await fetch(`${serverUrl}/api/v1/ids/check`, {
      method: 'POST',
      body: formData
    })

    expect(response.status).toBe(400)
    const responseData = await response.json()
    expect(responseData).toHaveProperty('error')
    expect(responseData).toHaveProperty('details')
  })

  it('should return 400 when IDS file is missing', async () => {
    const formData = new FormData()
    formData.append('ifcFile', new Blob(['IFC content']), 'test.ifc')

    const response = await fetch(`${serverUrl}/api/v1/ids/check`, {
      method: 'POST',
      body: formData
    })

    expect(response.status).toBe(400)
    const responseData = await response.json()
    expect(responseData).toHaveProperty('error')
    expect(responseData).toHaveProperty('details')
  })

  it('should return 400 when no file provided to visualize endpoint', async () => {
    const formData = new FormData()

    const response = await fetch(`${serverUrl}/api/v1/fragments/visualize`, {
      method: 'POST',
      body: formData
    })

    expect(response.status).toBe(400)
    const responseData = await response.json()
    expect(responseData.error).toBe('Missing required file')
  })

  it('should return 400 when invalid validationJobId provided', async () => {
    const formData = new FormData()
    formData.append('validationJobId', 'invalid-job-id-12345')

    const response = await fetch(`${serverUrl}/api/v1/fragments/visualize`, {
      method: 'POST',
      body: formData
    })

    expect(response.status).toBe(400)
    const responseData = await response.json()
    expect(responseData.error).toBe('Invalid validation job ID')
    expect(responseData.details).toContain('not found or IFC cache expired')
  })

  it('should accept valid request to ids/check endpoint', async () => {
    const formData = new FormData()
    // Small test files that won't trigger actual validation (will fail in Python)
    formData.append('ifcFile', new Blob(['ISO-10303-21;HEADER;ENDSEC;DATA;ENDSEC;END-ISO-10303-21;']), 'test.ifc')
    formData.append('idsFile', new Blob(['<?xml version="1.0"?><ids></ids>']), 'test.ids')

    const response = await fetch(`${serverUrl}/api/v1/ids/check`, {
      method: 'POST',
      body: formData
    })

    // Should accept the request (202) even if validation will fail later
    expect(response.status).toBe(202)
    const responseData = await response.json()
    expect(responseData).toHaveProperty('jobId')
    expect(typeof responseData.jobId).toBe('string')
  })

  it('should accept valid request to fragments/visualize endpoint', async () => {
    const formData = new FormData()
    // Small test file
    formData.append('ifcFile', new Blob(['ISO-10303-21;HEADER;ENDSEC;DATA;ENDSEC;END-ISO-10303-21;']), 'test.ifc')

    const response = await fetch(`${serverUrl}/api/v1/fragments/visualize`, {
      method: 'POST',
      body: formData
    })

    // Should accept the request (202) even if conversion will fail later
    expect(response.status).toBe(202)
    const responseData = await response.json()
    expect(responseData).toHaveProperty('jobId')
    expect(responseData).toHaveProperty('fragmentsFileId')
  })
})
