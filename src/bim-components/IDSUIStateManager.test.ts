// Unit tests for IDSUIStateManager
// Note: This is a test specification. To run these tests, you'll need to:
// 1. Install vitest: npm install -D vitest @vitest/ui jsdom
// 2. Add test script to package.json: "test": "vitest"
// 3. Run tests: npm test

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IDSUIStateManager } from './IDSUIStateManager'
import type { ValidationDisplayResult } from './IDSIntegration'

describe('IDSUIStateManager', () => {
  let stateManager: IDSUIStateManager
  let mockIDSIntegration: any
  let mockHighlighter: any
  let mockCameraControls: any

  const mockValidationResults: ValidationDisplayResult[] = [
    {
      specificationId: 'spec1',
      specificationName: 'Test Specification 1',
      modelName: 'Model1.ifc',
      modelId: 'model1',
      validationDate: new Date(),
      summary: {
        totalRequirements: 2,
        passedRequirements: 1,
        failedRequirements: 1,
      },
      requirements: [
        {
          id: 'req1',
          name: 'Requirement 1',
          description: 'Test requirement 1',
          status: 'passed',
          passedCount: 5,
          failedCount: 0,
          failedElements: [],
        },
        {
          id: 'req2',
          name: 'Requirement 2',
          description: 'Test requirement 2',
          status: 'failed',
          passedCount: 2,
          failedCount: 3,
          failedElements: [
            {
              elementId: 'elem1',
              elementType: 'Wall',
              elementName: 'Wall 1',
              reason: 'Missing property',
            },
            {
              elementId: 'elem2',
              elementType: 'Door',
              elementName: 'Door 1',
              reason: 'Invalid value',
            },
          ],
        },
      ],
    },
    {
      specificationId: 'spec2',
      specificationName: 'Test Specification 2',
      modelName: 'Model2.ifc',
      modelId: 'model2',
      validationDate: new Date(),
      summary: {
        totalRequirements: 1,
        passedRequirements: 1,
        failedRequirements: 0,
      },
      requirements: [
        {
          id: 'req3',
          name: 'Requirement 3',
          status: 'passed',
          passedCount: 10,
          failedCount: 0,
          failedElements: [],
        },
      ],
    },
  ]

  beforeEach(() => {
    mockIDSIntegration = {
      highlightFailures: vi.fn(),
      clearHighlights: vi.fn(),
    }

    mockHighlighter = {
      highlightByID: vi.fn(),
      clear: vi.fn(),
    }

    mockCameraControls = {
      fitToSphere: vi.fn(),
    }

    stateManager = new IDSUIStateManager()
  })

  describe('constructor', () => {
    it('should initialize with empty state', () => {
      const state = stateManager.state
      expect(state.currentResults).toEqual([])
      expect(state.selectedSpecification).toBeUndefined()
      expect(state.selectedRequirement).toBeUndefined()
      expect(state.isValidating).toBe(false)
      expect(state.expandedSpecs).toEqual(new Set())
    })
  })

  describe('updateResults', () => {
    it('should update currentResults', () => {
      stateManager.updateResults(mockValidationResults)
      expect(stateManager.state.currentResults).toEqual(mockValidationResults)
    })

    it('should trigger update event', () => {
      const updateHandler = vi.fn()
      const unsubscribe = stateManager.subscribe(updateHandler)

      stateManager.updateResults(mockValidationResults)
      expect(updateHandler).toHaveBeenCalled()
      
      unsubscribe()
    })

    it('should clear selection when results change', () => {
      // First set up some results and make a selection
      stateManager.updateResults(mockValidationResults)
      stateManager.selectSpecification('spec1', 'req1')
      
      // Then update with new results
      stateManager.updateResults([])

      const state = stateManager.state
      expect(state.selectedSpecification).toBeUndefined()
      expect(state.selectedRequirement).toBeUndefined()
    })

    it('should handle empty results array', () => {
      stateManager.updateResults([])
      expect(stateManager.state.currentResults).toEqual([])
    })

    it('should maintain state consistency', () => {
      stateManager.updateResults(mockValidationResults)
      const state = stateManager.state
      expect(state.expandedSpecs).toBeDefined()
      expect(state.expandedRequirements).toBeDefined()
    })
  })

  describe('selectSpecification', () => {
    beforeEach(() => {
      stateManager.updateResults(mockValidationResults)
    })

    it('should set selectedSpecification', () => {
      stateManager.selectSpecification('spec1')
      expect(stateManager.state.selectedSpecification).toBe('spec1')
    })

    it('should accept optional requirement parameter', () => {
      stateManager.selectSpecification('spec1', 'req2')
      expect(stateManager.state.selectedSpecification).toBe('spec1')
      expect(stateManager.state.selectedRequirement).toBe('req2')
    })

    it('should trigger update event', () => {
      const updateHandler = vi.fn()
      const unsubscribe = stateManager.subscribe(updateHandler)

      stateManager.selectSpecification('spec1')
      expect(updateHandler).toHaveBeenCalled()
      
      unsubscribe()
    })

    it('should handle invalid specification IDs', () => {
      // Should log warning but not throw
      stateManager.selectSpecification('invalid-spec')
      expect(stateManager.state.selectedSpecification).toBeUndefined()
    })
  })

  describe('selectRequirement', () => {
    beforeEach(() => {
      stateManager.updateResults(mockValidationResults)
    })

    it('should set selectedRequirement', () => {
      stateManager.selectRequirement('spec1', 'req2')
      expect(stateManager.state.selectedRequirement).toBe('req2')
    })

    it('should also set selectedSpecification', () => {
      stateManager.selectRequirement('spec1', 'req2')
      expect(stateManager.state.selectedSpecification).toBe('spec1')
    })

    it('should trigger update event', () => {
      const updateHandler = vi.fn()
      const unsubscribe = stateManager.subscribe(updateHandler)

      stateManager.selectRequirement('spec1', 'req2')
      expect(updateHandler).toHaveBeenCalled()
      
      unsubscribe()
    })
  })

  describe('clearSelection', () => {
    beforeEach(() => {
      stateManager.updateResults(mockValidationResults)
      stateManager.selectSpecification('spec1', 'req1')
    })

    it('should clear both selections', () => {
      stateManager.clearSelection()
      const state = stateManager.state
      expect(state.selectedSpecification).toBeUndefined()
      expect(state.selectedRequirement).toBeUndefined()
    })

    it('should trigger update event', () => {
      const updateHandler = vi.fn()
      const unsubscribe = stateManager.subscribe(updateHandler)

      stateManager.clearSelection()
      expect(updateHandler).toHaveBeenCalled()
      
      unsubscribe()
    })
  })

  describe('setValidationState', () => {
    it('should update isValidating', () => {
      stateManager.setValidationState(true)
      expect(stateManager.state.isValidating).toBe(true)

      stateManager.setValidationState(false)
      expect(stateManager.state.isValidating).toBe(false)
    })

    it('should trigger update event', () => {
      const updateHandler = vi.fn()
      const unsubscribe = stateManager.subscribe(updateHandler)

      stateManager.setValidationState(true)
      expect(updateHandler).toHaveBeenCalled()
      
      unsubscribe()
    })
  })

  describe('toggleSpecificationExpansion', () => {
    it('should toggle specification expansion state', () => {
      expect(stateManager.isSpecificationExpanded('spec1')).toBe(false)

      stateManager.toggleSpecificationExpansion('spec1')
      expect(stateManager.isSpecificationExpanded('spec1')).toBe(true)

      stateManager.toggleSpecificationExpansion('spec1')
      expect(stateManager.isSpecificationExpanded('spec1')).toBe(false)
    })

    it('should trigger update event', () => {
      const updateHandler = vi.fn()
      const unsubscribe = stateManager.subscribe(updateHandler)

      stateManager.toggleSpecificationExpansion('spec1')
      expect(updateHandler).toHaveBeenCalled()
      
      unsubscribe()
    })
  })

  describe('getValidationSummary', () => {
    it('should calculate correct totals across all specifications', () => {
      stateManager.updateResults(mockValidationResults)
      const summary = stateManager.getValidationSummary()

      expect(summary.totalSpecs).toBe(2)
      expect(summary.totalRequirements).toBe(3) // spec1 has 2, spec2 has 1 = 3 total
      expect(summary.totalPassed).toBe(2) // req1 and req3 passed
      expect(summary.totalFailed).toBe(1) // req2 failed
      expect(summary.hasResults).toBe(true)
      expect(summary.hasFailures).toBe(true)
    })

    it('should return zeros when no results', () => {
      const summary = stateManager.getValidationSummary()

      expect(summary.totalSpecs).toBe(0)
      expect(summary.totalRequirements).toBe(0)
      expect(summary.totalPassed).toBe(0)
      expect(summary.totalFailed).toBe(0)
      expect(summary.hasResults).toBe(false)
    })

    it('should update reactively when results change', () => {
      stateManager.updateResults(mockValidationResults)
      const summary1 = stateManager.getValidationSummary()

      stateManager.updateResults([mockValidationResults[0]])
      const summary2 = stateManager.getValidationSummary()

      expect(summary1.totalSpecs).toBe(2)
      expect(summary2.totalSpecs).toBe(1)
    })
  })

  describe('getSelectedSpecification', () => {
    beforeEach(() => {
      stateManager.updateResults(mockValidationResults)
    })

    it('should return selected specification', () => {
      stateManager.selectSpecification('spec1')
      const spec = stateManager.getSelectedSpecification()
      expect(spec).toBe(mockValidationResults[0])
    })

    it('should return undefined when nothing selected', () => {
      const spec = stateManager.getSelectedSpecification()
      expect(spec).toBeUndefined()
    })
  })

  describe('getSelectedRequirement', () => {
    beforeEach(() => {
      stateManager.updateResults(mockValidationResults)
    })

    it('should return selected requirement', () => {
      stateManager.selectSpecification('spec1', 'req2')
      const req = stateManager.getSelectedRequirement()
      expect(req).toBe(mockValidationResults[0].requirements[1])
    })

    it('should return undefined when no requirement selected', () => {
      stateManager.selectSpecification('spec1')
      const req = stateManager.getSelectedRequirement()
      expect(req).toBeUndefined()
    })
  })
})