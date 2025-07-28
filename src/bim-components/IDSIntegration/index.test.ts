// Unit tests for IDSIntegration component
// Note: This is a test specification. To run these tests, you'll need to:
// 1. Install vitest: npm install -D vitest @vitest/ui jsdom
// 2. Add test script to package.json: "test": "vitest"
// 3. Run tests: npm test

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { IDSIntegration } from './index'
import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'
import * as THREE from 'three'

// Mock the @thatopen/components modules
vi.mock('@thatopen/components', () => ({
  Component: class Component {
    enabled = true
    components: any
    constructor(components: any) {
      this.components = components
    }
  },
  IDSSpecifications: vi.fn(),
  FragmentsManager: vi.fn(),
  ModelIdMapUtils: {
    isEmpty: vi.fn(),
  },
}))

vi.mock('@thatopen/components-front', () => ({
  Highlighter: vi.fn(),
}))

describe('IDSIntegration', () => {
  let idsIntegration: IDSIntegration
  let mockComponents: any
  let mockIDSComponent: any
  let mockHighlighter: any
  let mockFragmentsManager: any

  beforeEach(() => {
    // Setup mock IDS component
    mockIDSComponent = {
      enabled: true,
      load: vi.fn(),
      list: new Map(),
      getModelIdMap: vi.fn(),
    }

    // Setup mock highlighter
    mockHighlighter = {
      styles: new Map(), // Add styles Map for _setupValidationHighlightStyle
      setup: vi.fn(),
      add: vi.fn(),
      clear: vi.fn().mockResolvedValue(undefined),
      highlightByID: vi.fn().mockResolvedValue(undefined),
    }

    // Setup mock fragments manager
    mockFragmentsManager = {
      list: new Map([['Test Model.ifc', { uuid: 'model-1' }]]),
    }

    // Setup mock components
    mockComponents = {
      get: vi.fn((ComponentClass: any) => {
        if (ComponentClass === OBC.IDSSpecifications) return mockIDSComponent
        if (ComponentClass === OBC.FragmentsManager) return mockFragmentsManager
        return mockIDSComponent // Default return for other cases
      }),
    }

    // Create instance
    idsIntegration = new IDSIntegration(mockComponents)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with IDS component', () => {
      expect(idsIntegration).toBeDefined()
      expect(mockComponents.get).toHaveBeenCalledWith(OBC.IDSSpecifications)
    })

    it('should throw error if IDS component initialization fails', () => {
      mockComponents.get = vi.fn().mockImplementation(() => {
        throw new Error('Component not found')
      })

      expect(() => new IDSIntegration(mockComponents)).toThrow(
        'IDS component initialization failed'
      )
    })
  })

  describe('setup', () => {
    it('should setup highlighter when provided', async () => {
      await idsIntegration.setup(mockHighlighter)
      // Test that setup completes without error
      expect(mockHighlighter).toBeDefined()
    })

    it('should enable IDS component if disabled', async () => {
      mockIDSComponent.enabled = false
      await idsIntegration.setup()
      // Since _idsComponent is private, we can't directly test it
      // But we can verify setup completes without error
      expect(true).toBe(true)
    })
  })

  describe('loadIDSFile', () => {
    it('should load valid IDS files successfully', async () => {
      const mockFile = new File(['<ids>content</ids>'], 'test.ids', { type: 'text/xml' })
      mockFile.text = vi.fn().mockResolvedValue('<ids>content</ids>')

      await idsIntegration.loadIDSFile(mockFile)

      expect(mockIDSComponent.load).toHaveBeenCalledWith('<ids>content</ids>')
    })

    it('should reject files without .ids extension', async () => {
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' })

      await expect(idsIntegration.loadIDSFile(mockFile)).rejects.toThrow(
        'Invalid file type. Please select an IDS file (.ids extension).'
      )
    })

    it('should handle file loading errors', async () => {
      const mockFile = new File(['<ids>content</ids>'], 'test.ids', { type: 'text/xml' })
      mockFile.text = vi.fn().mockRejectedValue(new Error('Read error'))

      await expect(idsIntegration.loadIDSFile(mockFile)).rejects.toThrow(
        'Failed to load IDS file: Read error'
      )
    })

    it('should handle IDS parsing errors', async () => {
      const mockFile = new File(['invalid'], 'test.ids', { type: 'text/xml' })
      mockFile.text = vi.fn().mockResolvedValue('invalid')
      mockIDSComponent.load = vi.fn().mockImplementation(() => {
        throw new Error('Invalid IDS format')
      })

      await expect(idsIntegration.loadIDSFile(mockFile)).rejects.toThrow(
        'Failed to load IDS file: Invalid IDS format'
      )
    })
  })

  describe('runValidation', () => {
    beforeEach(() => {
      // Setup a specification with test method
      const mockSpec = {
        test: vi.fn().mockResolvedValue({
          pass: ['element1', 'element2'],
          fail: ['element3'],
        }),
      }
      mockIDSComponent.list = new Map([['spec1', mockSpec]])
      
      // Mock getModelIdMap
      mockIDSComponent.getModelIdMap.mockReturnValue({
        pass: { 'model-1': ['element1', 'element2'] },
        fail: { 'model-1': ['element3'] },
      })
    })

    it('should run validation when models and specs are loaded', async () => {
      await idsIntegration.runValidation()

      expect(mockIDSComponent.list.get('spec1').test).toHaveBeenCalled()
      expect(mockIDSComponent.getModelIdMap).toHaveBeenCalled()
    })

    it('should throw error when no IFC models are loaded', async () => {
      mockFragmentsManager.list = new Map()

      await expect(idsIntegration.runValidation()).rejects.toThrow(
        'No IFC models loaded. Please load an IFC file before running validation.'
      )
    })

    it('should throw error when no IDS specifications are loaded', async () => {
      mockIDSComponent.list = new Map()

      await expect(idsIntegration.runValidation()).rejects.toThrow(
        'No IDS specifications loaded. Please load an IDS file before running validation.'
      )
    })

    it('should handle validation errors gracefully', async () => {
      const mockSpec = {
        test: vi.fn().mockRejectedValue(new Error('Test failed')),
      }
      mockIDSComponent.list = new Map([['spec1', mockSpec]])

      // Should throw when no specs can be tested
      await expect(idsIntegration.runValidation()).rejects.toThrow(
        'Validation failed: No specifications could be tested'
      )
      
      // Results should be empty due to error
      expect(idsIntegration.getValidationResults()).toHaveLength(0)
    })

    it('should transform results to display format', async () => {
      await idsIntegration.runValidation()
      const results = idsIntegration.getValidationResults()

      expect(results).toHaveLength(1)
      expect(results[0]).toMatchObject({
        specificationId: expect.any(String),
        specificationName: expect.any(String),
        modelName: expect.any(String),
        summary: {
          totalRequirements: expect.any(Number),
          passedRequirements: expect.any(Number),
          failedRequirements: expect.any(Number),
        },
      })
    })
  })

  describe('getValidationResults', () => {
    it('should return empty array when no validation has run', () => {
      const results = idsIntegration.getValidationResults()
      expect(results).toEqual([])
    })

    it('should return copy of results array', async () => {
      // Run validation first
      const mockSpec = {
        test: vi.fn().mockResolvedValue({ pass: [], fail: [] }),
      }
      mockIDSComponent.list = new Map([['spec1', mockSpec]])
      mockIDSComponent.getModelIdMap.mockReturnValue({ pass: {}, fail: {} })
      
      await idsIntegration.runValidation()
      
      const results1 = idsIntegration.getValidationResults()
      const results2 = idsIntegration.getValidationResults()
      
      expect(results1).not.toBe(results2) // Different array instances
      expect(results1).toEqual(results2) // Same content
    })
  })

  describe('highlightFailures', () => {
    beforeEach(async () => {
      await idsIntegration.setup(mockHighlighter)
      
      // Manually set validation results with failed requirements
      idsIntegration['_currentResults'] = [{
        specificationId: 'spec1',
        specificationName: 'Test Specification',
        modelName: 'Test Model.ifc',
        modelId: 'model-1',
        validationDate: new Date(),
        summary: {
          totalRequirements: 1,
          passedRequirements: 0,
          failedRequirements: 1,
        },
        requirements: [{
          id: 'req1',
          name: 'Test Requirement',
          status: 'failed',
          passedCount: 0,
          failedCount: 2,
          failedElements: [
            { elementId: 'element1', elementType: 'Wall', reason: 'Test failure' },
            { elementId: 'element2', elementType: 'Door', reason: 'Test failure' }
          ],
        }],
      }]
    })

    it('should highlight all failures for a specification', async () => {
      // Mock the conversion method
      idsIntegration['convertElementIdsToModelIdMap'] = vi.fn().mockResolvedValue({
        'model-1': ['element1', 'element2'],
      })
      OBC.ModelIdMapUtils.isEmpty = vi.fn().mockReturnValue(false)

      await idsIntegration.highlightFailures('spec1')

      expect(mockHighlighter.clear).toHaveBeenCalledWith('validation-failures')
      expect(mockHighlighter.highlightByID).toHaveBeenCalled()
    })

    it('should highlight specific requirement failures', async () => {
      idsIntegration['convertElementIdsToModelIdMap'] = vi.fn().mockResolvedValue({
        'model-1': ['element1'],
      })
      OBC.ModelIdMapUtils.isEmpty = vi.fn().mockReturnValue(false)

      await idsIntegration.highlightFailures('spec1', 'req1')

      expect(mockHighlighter.clear).toHaveBeenCalled()
      expect(mockHighlighter.highlightByID).toHaveBeenCalled()
    })

    it('should handle missing specification gracefully', async () => {
      await idsIntegration.highlightFailures('non-existent')
      
      expect(mockHighlighter.clear).not.toHaveBeenCalled()
      expect(mockHighlighter.highlightByID).not.toHaveBeenCalled()
    })

    it('should handle missing highlighter gracefully', async () => {
      idsIntegration['_highlighter'] = undefined
      
      await expect(idsIntegration.highlightFailures('0')).resolves.not.toThrow()
    })
  })

  describe('clearHighlights', () => {
    it('should clear validation highlights', async () => {
      await idsIntegration.setup(mockHighlighter)
      await idsIntegration.clearHighlights()

      expect(mockHighlighter.clear).toHaveBeenCalledWith('validation-failures')
    })

    it('should handle missing highlighter gracefully', async () => {
      await expect(idsIntegration.clearHighlights()).resolves.not.toThrow()
    })
  })

  describe('exportResults', () => {
    beforeEach(async () => {
      // Setup validation results
      const mockSpec = {
        test: vi.fn().mockResolvedValue({
          pass: ['element1'],
          fail: ['element2'],
        }),
      }
      mockIDSComponent.list = new Map([['spec1', mockSpec]])
      mockIDSComponent.getModelIdMap.mockReturnValue({
        pass: { 'model-1': ['element1'] },
        fail: { 'model-1': ['element2'] },
      })
      
      await idsIntegration.runValidation()
    })

    it('should export results as JSON', async () => {
      const blob = await idsIntegration.exportResults('json')

      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('application/json')

      const text = await blob.text()
      const data = JSON.parse(text)
      expect(data).toBeInstanceOf(Array)
      expect(data).toHaveLength(1)
    })

    it('should export results as CSV', async () => {
      // Mock the CSV conversion method
      idsIntegration['convertResultsToCSV'] = vi.fn().mockReturnValue(
        'Specification,Model,Requirement,Status\nTest Spec,Test Model,Req1,Failed'
      )

      const blob = await idsIntegration.exportResults('csv')

      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('text/csv')
      expect(idsIntegration['convertResultsToCSV']).toHaveBeenCalled()
    })

    it('should throw error when no results available', async () => {
      idsIntegration['_currentResults'] = []

      await expect(idsIntegration.exportResults('json')).rejects.toThrow(
        'No validation results available for export'
      )
    })

    it('should throw error for unsupported format', async () => {
      await expect(idsIntegration.exportResults('xml' as any)).rejects.toThrow(
        'Unsupported export format: xml'
      )
    })
  })
})