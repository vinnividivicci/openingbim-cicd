// Unit tests for Validation Results UI Component
// Note: This is a test specification. To run these tests, you'll need to:
// 1. Install vitest and testing-library: npm install -D vitest @vitest/ui jsdom @testing-library/dom
// 2. Add test script to package.json: "test": "vitest"
// 3. Run tests: npm test

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/dom'
import * as BUI from '@thatopen/ui'
import { validationResultsPanelTemplate, getGlobalUIStateManager } from './validation-results'
import type { IDSUIStateManager } from '../../bim-components/IDSUIStateManager'
import type { IDSIntegration } from '../../bim-components/IDSIntegration'

// Mock BUI.html template function
vi.mock('@thatopen/ui', () => ({
  html: vi.fn((strings: TemplateStringsArray, ...values: any[]) => {
    // Simple template literal processor for testing
    let result = strings[0]
    for (let i = 0; i < values.length; i++) {
      result += String(values[i]) + strings[i + 1]
    }
    return result
  }),
}))

describe('ValidationResultsPanel', () => {
  let mockStateManager: any
  let mockState: any
  let mockUpdate: any

  const mockValidationResults = [
    {
      specificationId: 'spec1',
      specificationName: 'Test Specification 1',
      modelName: 'Model1.ifc',
      summary: {
        totalRequirements: 2,
        passedRequirements: 1,
        failedRequirements: 1,
      },
      requirements: [
        {
          id: 'req1',
          name: 'Requirement 1',
          status: 'passed',
          passedCount: 5,
          failedCount: 0,
          failedElements: [],
        },
        {
          id: 'req2',
          name: 'Requirement 2',
          status: 'failed',
          passedCount: 2,
          failedCount: 3,
          failedElements: [
            {
              elementId: 'elem1',
              elementType: 'Wall',
              reason: 'Missing property',
            },
          ],
        },
      ],
    },
  ]

  beforeEach(() => {
    // Mock state manager
    mockStateManager = {
      state: {
        currentResults: [],
        isValidating: false,
        expandedSpecs: new Set(),
        expandedRequirements: new Set(),
      },
      subscribe: vi.fn((callback) => {
        // Store callback for manual triggering in tests
        mockStateManager._testCallback = callback
        return () => {}
      }),
      getValidationSummary: vi.fn().mockReturnValue({
        totalSpecs: 0,
        totalRequirements: 0,
        totalPassed: 0,
        totalFailed: 0,
        hasResults: false,
        hasFailures: false,
      }),
      isSpecificationExpanded: vi.fn().mockReturnValue(false),
      isRequirementExpanded: vi.fn().mockReturnValue(false),
      toggleSpecificationExpansion: vi.fn(),
      toggleRequirementExpansion: vi.fn(),
      selectSpecification: vi.fn(),
      selectRequirement: vi.fn(),
    }

    // Mock state and update function
    mockState = {
      stateManager: mockStateManager,
      lastUpdateTime: Date.now(),
    }
    
    mockUpdate = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Template Rendering', () => {
    it('should initialize state manager if not provided', () => {
      const state = {}
      const result = validationResultsPanelTemplate(state as any, mockUpdate)
      
      expect(state).toHaveProperty('stateManager')
      expect(state).toHaveProperty('lastUpdateTime')
    })

    it('should render empty state when no results', () => {
      const result = validationResultsPanelTemplate(mockState, mockUpdate)
      const htmlString = result.toString()
      
      expect(htmlString).toContain('No Validation Results')
    })

    it('should subscribe to state manager updates', () => {
      validationResultsPanelTemplate(mockState, mockUpdate)
      
      expect(mockStateManager.subscribe).toHaveBeenCalled()
    })

    it('should render validation results when available', () => {
      mockStateManager.state.currentResults = mockValidationResults
      mockStateManager.getValidationSummary.mockReturnValue({
        totalSpecs: 1,
        totalRequirements: 2,
        totalPassed: 1,
        totalFailed: 1,
        hasResults: true,
        hasFailures: true,
      })
      
      const result = validationResultsPanelTemplate(mockState, mockUpdate)
      const htmlString = result.toString()
      
      expect(htmlString).toContain('Test Specification 1')
    })
  })

  describe('State Manager Integration', () => {
    it('should get global UI state manager', () => {
      const manager = getGlobalUIStateManager()
      expect(manager).toBeDefined()
      expect(manager).toBeInstanceOf(Object)
    })

    it('should return same instance on multiple calls', () => {
      const manager1 = getGlobalUIStateManager()
      const manager2 = getGlobalUIStateManager()
      expect(manager1).toBe(manager2)
    })
  })
})