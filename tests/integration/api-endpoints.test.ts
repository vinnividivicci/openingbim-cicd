import { describe, it, expect } from 'vitest'
import request from 'supertest'

/**
 * Integration Test: API Endpoints with Running Server
 *
 * These tests verify the API endpoints work correctly with the running server
 */

const serverUrl = 'http://localhost:3001'

describe('Integration Test: IDS Validation Endpoint', () => {
  it('should return 400 when IFC file is missing', async () => {
    const response = await request(serverUrl)
      .post('/api/v1/ids/check')
      .attach('idsFile', Buffer.from('IDS content'), 'test.ids')

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('error')
    expect(response.body).toHaveProperty('details')
    expect(response.body.error).toBe('Missing required file')
  })

  it('should return 400 when IDS file is missing', async () => {
    const response = await request(serverUrl)
      .post('/api/v1/ids/check')
      .attach('ifcFile', Buffer.from('IFC content'), 'test.ifc')

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('error')
    expect(response.body).toHaveProperty('details')
    expect(response.body.error).toBe('Missing required file')
  })

  it('should accept valid files and return 202 with jobId', async () => {
    const response = await request(serverUrl)
      .post('/api/v1/ids/check')
      .attach('ifcFile', Buffer.from('ISO-10303-21;HEADER;ENDSEC;DATA;ENDSEC;END-ISO-10303-21;'), 'test.ifc')
      .attach('idsFile', Buffer.from('<?xml version="1.0"?><ids></ids>'), 'test.ids')

    expect(response.status).toBe(202)
    expect(response.body).toHaveProperty('jobId')
    expect(typeof response.body.jobId).toBe('string')
  })
})

describe('Integration Test: Fragments Visualization Endpoint', () => {
  it('should return 400 when no file or validationJobId provided', async () => {
    const response = await request(serverUrl)
      .post('/api/v1/fragments/visualize')

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('Missing required file')
  })

  it('should return 400 when invalid validationJobId provided', async () => {
    const response = await request(serverUrl)
      .post('/api/v1/fragments/visualize')
      .field('validationJobId', 'invalid-job-id-12345')

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('Invalid validation job ID')
    expect(response.body.details).toContain('not found or IFC cache expired')
  })

  it('should accept valid IFC file and return 202 with jobId and fragmentsFileId', async () => {
    const response = await request(serverUrl)
      .post('/api/v1/fragments/visualize')
      .attach('ifcFile', Buffer.from('ISO-10303-21;HEADER;ENDSEC;DATA;ENDSEC;END-ISO-10303-21;'), 'test.ifc')

    expect(response.status).toBe(202)
    expect(response.body).toHaveProperty('jobId')
    expect(response.body).toHaveProperty('fragmentsFileId')
    expect(typeof response.body.jobId).toBe('string')
    expect(typeof response.body.fragmentsFileId).toBe('string')
  })
})

describe('Integration Test: Error Handling', () => {
  it('should return standardized error format for missing files', async () => {
    const response = await request(serverUrl)
      .post('/api/v1/ids/check')

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('error')
    expect(response.body).toHaveProperty('details')
    expect(typeof response.body.error).toBe('string')
    expect(typeof response.body.details).toBe('string')
  })
})
