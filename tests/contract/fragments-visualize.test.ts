import { describe, it, expect } from 'vitest'
import request from 'supertest'
import express from 'express'
import { uploadIFC, handleMulterError } from '../../src/server/middleware/upload'

// Mock test server setup
const app = express()
app.use(express.json())

// Mock validation job cache
const validationCache = new Map<string, { ifcBuffer: Buffer; filename: string }>()

// Mock POST /api/v1/fragments/visualize endpoint
app.post('/api/v1/fragments/visualize', uploadIFC, handleMulterError, async (req, res) => {
  const { validationJobId } = req.body
  let ifcBuffer: Buffer
  let ifcFilename: string

  if (req.file) {
    ifcBuffer = req.file.buffer
    ifcFilename = req.file.originalname
  } else if (validationJobId) {
    // Retrieve cached IFC from validation job
    const cachedIfc = validationCache.get(validationJobId)
    if (!cachedIfc) {
      return res.status(400).json({
        error: 'Invalid validation job ID',
        details: 'Validation job not found or IFC cache expired'
      })
    }
    ifcBuffer = cachedIfc.ifcBuffer
    ifcFilename = cachedIfc.filename
  } else {
    return res.status(400).json({
      error: 'Missing required file',
      details: 'IFC file is required for visualization'
    })
  }

  // Simulate successful job creation
  const jobId = 'f1e2d3c4-b5a6-4987-c0d1-e2f3a4b56789'
  const fragmentsFileId = `frag-${Date.now()}-abc123`

  const response: any = {
    jobId,
    fragmentsFileId
  }

  if (validationJobId) {
    response.validationJobId = validationJobId
  }

  return res.status(202).json(response)
})

describe('Contract Test: POST /api/v1/fragments/visualize', () => {
  it('should return 202 with jobId and fragmentsFileId when valid IFC is uploaded', async () => {
    const response = await request(app)
      .post('/api/v1/fragments/visualize')
      .attach('ifcFile', Buffer.from('IFC content'), 'test.ifc')

    expect(response.status).toBe(202)
    expect(response.body).toHaveProperty('jobId')
    expect(response.body).toHaveProperty('fragmentsFileId')
    expect(typeof response.body.jobId).toBe('string')
    expect(typeof response.body.fragmentsFileId).toBe('string')
    expect(response.body.fragmentsFileId).toMatch(/^frag-/)
  })

  it('should return 202 with validationJobId when valid IFC and validationJobId are provided', async () => {
    const validationJobId = 'test-validation-job-123'
    validationCache.set(validationJobId, {
      ifcBuffer: Buffer.from('Cached IFC content'),
      filename: 'cached.ifc'
    })

    const response = await request(app)
      .post('/api/v1/fragments/visualize')
      .field('validationJobId', validationJobId)
      .attach('ifcFile', Buffer.from('IFC content'), 'test.ifc')

    expect(response.status).toBe(202)
    expect(response.body).toHaveProperty('jobId')
    expect(response.body).toHaveProperty('fragmentsFileId')
    expect(response.body).toHaveProperty('validationJobId')
    expect(response.body.validationJobId).toBe(validationJobId)

    validationCache.delete(validationJobId)
  })

  it('should return 400 when IFC file is missing and no validationJobId provided', async () => {
    const response = await request(app)
      .post('/api/v1/fragments/visualize')

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('error')
    expect(response.body).toHaveProperty('details')
    expect(response.body.error).toBe('Missing required file')
    expect(response.body.details).toBe('IFC file is required for visualization')
  })

  it('should return 400 when validationJobId is invalid (cache expired)', async () => {
    const response = await request(app)
      .post('/api/v1/fragments/visualize')
      .field('validationJobId', 'invalid-job-id-999')

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('error')
    expect(response.body).toHaveProperty('details')
    expect(response.body.error).toBe('Invalid validation job ID')
    expect(response.body.details).toBe('Validation job not found or IFC cache expired')
  })

  it('should return 413 when file exceeds 1 GB', async () => {
    // Create a buffer > 1 GB (simulate)
    const largeBuffer = Buffer.alloc(1073741825) // 1 GB + 1 byte

    const response = await request(app)
      .post('/api/v1/fragments/visualize')
      .attach('ifcFile', largeBuffer, 'large.ifc')

    expect(response.status).toBe(413)
    expect(response.body).toHaveProperty('error')
    expect(response.body).toHaveProperty('details')
    expect(response.body.error).toBe('File exceeds size limit')
    expect(response.body.details).toBe('Maximum file size is 1 GB')
  })
})
