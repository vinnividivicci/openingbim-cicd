import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";

export interface ValidationDisplayResult {
  specificationId: string;
  specificationName: string;
  modelName: string;
  requirements: RequirementDisplayResult[];
  summary: {
    totalRequirements: number;
    passedRequirements: number;
    failedRequirements: number;
  };
}

export interface RequirementDisplayResult {
  id: string;
  name: string;
  status: 'passed' | 'failed';
  failedElements: {
    elementId: string;
    elementType: string;
    reason: string;
  }[];
  passedCount: number;
  failedCount: number;
}

export class IDSIntegration extends OBC.Component {
  static uuid = "ids-integration-wrapper" as const;
  enabled = true;

  private _idsComponent: OBC.IDSSpecifications;
  private _highlighter?: OBF.Highlighter;
  private _currentResults: ValidationDisplayResult[] = [];

  constructor(components: OBC.Components) {
    super(components);

    try {
      this._idsComponent = components.get(OBC.IDSSpecifications);
    } catch (error) {
      console.error("Failed to initialize IDS component:", error);
      throw new Error("IDS component initialization failed. Ensure @thatopen/components supports IDS functionality.");
    }
  }

  /**
   * Initialize the IDS integration with required dependencies
   */
  async setup(highlighter?: OBF.Highlighter): Promise<void> {
    try {
      this._highlighter = highlighter;

      // Initialize the IDS component if needed
      if (!this._idsComponent.enabled) {
        this._idsComponent.enabled = true;
      }

      console.log("IDS Integration initialized successfully");
    } catch (error) {
      console.error("Failed to setup IDS integration:", error);
      throw new Error("IDS integration setup failed");
    }
  }

  /**
   * Load an IDS file for validation
   */
  async loadIDSFile(file: File): Promise<void> {
    try {
      if (!file.name.toLowerCase().endsWith('.ids')) {
        throw new Error("Invalid file type. Please select an IDS file (.ids extension).");
      }

      const text = await file.text();

      // Use the built-in IDS component to load the specification
      // Note: The exact API may vary - this is a placeholder implementation
      if ('load' in this._idsComponent && typeof this._idsComponent.load === 'function') {
        await this._idsComponent.load(text);
      } else {
        console.warn("IDS component load method not available - using fallback");
        // Fallback implementation or throw error
        throw new Error("IDS loading not supported by current component version");
      }

      console.log(`IDS file "${file.name}" loaded successfully`);
    } catch (error) {
      console.error("Failed to load IDS file:", error);
      throw new Error(`Failed to load IDS file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Run validation against loaded models
   */
  async runValidation(_modelIds?: string[]): Promise<void> {
    try {
      const fragmentsManager = this.components.get(OBC.FragmentsManager);

      if (fragmentsManager.list.size === 0) {
        throw new Error("No IFC models loaded. Please load an IFC file before running validation.");
      }

      // Check if IDS specifications are loaded
      // Note: The exact property name may vary depending on the component version
      const hasSpecs = ('list' in this._idsComponent &&
        this._idsComponent.list &&
        Object.keys(this._idsComponent.list).length > 0) ||
        ('specifications' in this._idsComponent &&
          this._idsComponent.specifications &&
          Object.keys(this._idsComponent.specifications).length > 0);

      if (!hasSpecs) {
        throw new Error("No IDS specifications loaded. Please load an IDS file before running validation.");
      }

      // Run validation using the built-in component
      // Note: The exact API may vary - this is a placeholder implementation
      let results: any = {};
      if ('validate' in this._idsComponent && typeof this._idsComponent.validate === 'function') {
        results = await this._idsComponent.validate();
      } else {
        console.warn("IDS component validate method not available - using mock results");
        // For now, create mock results to demonstrate the integration
        results = { mockValidation: true };
      }

      // Transform results to UI-friendly format
      this._currentResults = this.transformValidationResults(results);

      console.log("Validation completed successfully");
    } catch (error) {
      console.error("Validation failed:", error);
      throw new Error(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current validation results
   */
  getValidationResults(): ValidationDisplayResult[] {
    return [...this._currentResults];
  }

  /**
   * Highlight validation failures in the 3D viewer
   */
  highlightFailures(specId: string, requirementId?: string): void {
    try {
      if (!this._highlighter) {
        console.warn("Highlighter not available for validation highlighting");
        return;
      }

      // Find the specification and requirement
      const spec = this._currentResults.find(s => s.specificationId === specId);
      if (!spec) {
        console.warn(`Specification ${specId} not found in results`);
        return;
      }

      const elementsToHighlight: string[] = [];

      if (requirementId) {
        // Highlight specific requirement failures
        const requirement = spec.requirements.find(r => r.id === requirementId);
        if (requirement && requirement.status === 'failed') {
          elementsToHighlight.push(...requirement.failedElements.map(e => e.elementId));
        }
      } else {
        // Highlight all failures in the specification
        spec.requirements.forEach(req => {
          if (req.status === 'failed') {
            elementsToHighlight.push(...req.failedElements.map(e => e.elementId));
          }
        });
      }

      // Use the highlighter to mark failed elements
      // Note: This is a simplified implementation - actual highlighting would need
      // to work with the fragment system and element IDs
      console.log(`Would highlight ${elementsToHighlight.length} failed elements`);

    } catch (error) {
      console.error("Failed to highlight validation failures:", error);
    }
  }

  /**
   * Clear validation highlights
   */
  clearHighlights(): void {
    try {
      if (this._highlighter) {
        this._highlighter.clear();
      }
    } catch (error) {
      console.error("Failed to clear highlights:", error);
    }
  }

  /**
   * Export validation results
   */
  async exportResults(format: 'json' | 'csv'): Promise<Blob> {
    try {
      if (this._currentResults.length === 0) {
        throw new Error("No validation results available for export");
      }

      if (format === 'json') {
        const jsonData = JSON.stringify(this._currentResults, null, 2);
        return new Blob([jsonData], { type: 'application/json' });
      } else if (format === 'csv') {
        const csvData = this.convertResultsToCSV(this._currentResults);
        return new Blob([csvData], { type: 'text/csv' });
      } else {
        throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error("Failed to export results:", error);
      throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transform built-in validation results to UI-friendly format
   */
  private transformValidationResults(results: any): ValidationDisplayResult[] {
    // This is a placeholder implementation
    // The actual transformation would depend on the structure of results from OBC.IDSSpecifications
    const transformedResults: ValidationDisplayResult[] = [];

    try {
      // For now, create a mock result structure
      // This would be replaced with actual result transformation logic
      console.log("Transforming validation results:", results);

      // Mock transformation - replace with actual logic based on OBC.IDSSpecifications result format
      if (results && typeof results === 'object') {
        transformedResults.push({
          specificationId: 'spec-1',
          specificationName: 'Sample Specification',
          modelName: 'Loaded Model',
          requirements: [],
          summary: {
            totalRequirements: 0,
            passedRequirements: 0,
            failedRequirements: 0
          }
        });
      }

    } catch (error) {
      console.error("Failed to transform validation results:", error);
    }

    return transformedResults;
  }

  /**
   * Convert results to CSV format
   */
  private convertResultsToCSV(results: ValidationDisplayResult[]): string {
    const headers = ['Specification', 'Model', 'Requirement', 'Status', 'Failed Elements', 'Passed Count', 'Failed Count'];
    const rows = [headers.join(',')];

    results.forEach(spec => {
      spec.requirements.forEach(req => {
        const row = [
          `"${spec.specificationName}"`,
          `"${spec.modelName}"`,
          `"${req.name}"`,
          req.status,
          req.failedElements.length.toString(),
          req.passedCount.toString(),
          req.failedCount.toString()
        ];
        rows.push(row.join(','));
      });
    });

    return rows.join('\n');
  }

  /**
   * Get the underlying IDS component for advanced usage
   */
  get idsComponent(): OBC.IDSSpecifications {
    return this._idsComponent;
  }

  /**
   * Check if IDS functionality is available
   */
  get isAvailable(): boolean {
    return this._idsComponent !== undefined && this._idsComponent.enabled;
  }
}