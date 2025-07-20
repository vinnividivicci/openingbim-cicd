import { ValidationDisplayResult, RequirementDisplayResult } from "./IDSIntegration";

export interface IDSUIState {
  currentResults: ValidationDisplayResult[];
  selectedSpecification?: string;
  selectedRequirement?: string;
  expandedSpecs: Set<string>;
  expandedRequirements: Set<string>;
  isValidating: boolean;
  lastValidationTime?: Date;
  validationError?: string;
}

export type StateUpdateCallback = (state: IDSUIState) => void;

/**
 * UI State Manager for IDS validation results
 * Manages UI state and coordinates between built-in IDS components and interface
 */
export class IDSUIStateManager {
  private _state: IDSUIState;
  private _updateCallbacks: Set<StateUpdateCallback> = new Set();

  constructor() {
    this._state = {
      currentResults: [],
      expandedSpecs: new Set(),
      expandedRequirements: new Set(),
      isValidating: false,
    };
  }

  /**
   * Get current state (read-only)
   */
  get state(): Readonly<IDSUIState> {
    return { ...this._state };
  }

  /**
   * Subscribe to state updates
   */
  subscribe(callback: StateUpdateCallback): () => void {
    this._updateCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this._updateCallbacks.delete(callback);
    };
  }

  /**
   * Update validation results and trigger UI updates
   */
  updateResults(results: ValidationDisplayResult[]): void {
    const hasChanged = JSON.stringify(results) !== JSON.stringify(this._state.currentResults);

    if (hasChanged) {
      this._state.currentResults = [...results];
      this._state.lastValidationTime = new Date();
      this._state.validationError = undefined;

      // Clear selection if the selected spec/requirement no longer exists
      if (this._state.selectedSpecification) {
        const specExists = results.some(r => r.specificationId === this._state.selectedSpecification);
        if (!specExists) {
          this._state.selectedSpecification = undefined;
          this._state.selectedRequirement = undefined;
        }
      }

      if (this._state.selectedRequirement && this._state.selectedSpecification) {
        const spec = results.find(r => r.specificationId === this._state.selectedSpecification);
        const reqExists = spec?.requirements.some(r => r.id === this._state.selectedRequirement);
        if (!reqExists) {
          this._state.selectedRequirement = undefined;
        }
      }

      this._notifySubscribers();
    }
  }

  /**
   * Select a specification and optionally a requirement
   */
  selectSpecification(specId: string, requirementId?: string): void {
    const spec = this._state.currentResults.find(r => r.specificationId === specId);
    if (!spec) {
      console.warn(`Specification ${specId} not found in current results`);
      return;
    }

    let requirementChanged = false;
    if (requirementId) {
      const requirement = spec.requirements.find(r => r.id === requirementId);
      if (requirement) {
        this._state.selectedRequirement = requirementId;
        requirementChanged = true;
      } else {
        console.warn(`Requirement ${requirementId} not found in specification ${specId}`);
      }
    }

    const specChanged = this._state.selectedSpecification !== specId;
    this._state.selectedSpecification = specId;

    if (specChanged || requirementChanged) {
      this._notifySubscribers();
    }
  }

  /**
   * Select a specific requirement
   */
  selectRequirement(specId: string, requirementId: string): void {
    this.selectSpecification(specId, requirementId);
  }

  /**
   * Clear current selection
   */
  clearSelection(): void {
    const hadSelection = this._state.selectedSpecification || this._state.selectedRequirement;

    this._state.selectedSpecification = undefined;
    this._state.selectedRequirement = undefined;

    if (hadSelection) {
      this._notifySubscribers();
    }
  }

  /**
   * Set validation state (loading/complete)
   */
  setValidationState(isValidating: boolean, error?: string): void {
    const stateChanged = this._state.isValidating !== isValidating ||
      this._state.validationError !== error;

    this._state.isValidating = isValidating;
    this._state.validationError = error;

    if (stateChanged) {
      this._notifySubscribers();
    }
  }

  /**
   * Toggle specification expansion state
   */
  toggleSpecificationExpansion(specId: string): void {
    if (this._state.expandedSpecs.has(specId)) {
      this._state.expandedSpecs.delete(specId);
    } else {
      this._state.expandedSpecs.add(specId);
    }
    this._notifySubscribers();
  }

  /**
   * Toggle requirement expansion state
   */
  toggleRequirementExpansion(specId: string, requirementId: string): void {
    const key = `${specId}-${requirementId}`;

    if (this._state.expandedRequirements.has(key)) {
      this._state.expandedRequirements.delete(key);
    } else {
      this._state.expandedRequirements.add(key);
    }
    this._notifySubscribers();
  }

  /**
   * Check if a specification is expanded
   */
  isSpecificationExpanded(specId: string): boolean {
    return this._state.expandedSpecs.has(specId);
  }

  /**
   * Check if a requirement is expanded
   */
  isRequirementExpanded(specId: string, requirementId: string): boolean {
    const key = `${specId}-${requirementId}`;
    return this._state.expandedRequirements.has(key);
  }

  /**
   * Get selected specification data
   */
  getSelectedSpecification(): ValidationDisplayResult | undefined {
    if (!this._state.selectedSpecification) return undefined;
    return this._state.currentResults.find(r => r.specificationId === this._state.selectedSpecification);
  }

  /**
   * Get selected requirement data
   */
  getSelectedRequirement(): RequirementDisplayResult | undefined {
    const spec = this.getSelectedSpecification();
    if (!spec || !this._state.selectedRequirement) return undefined;
    return spec.requirements.find(r => r.id === this._state.selectedRequirement);
  }

  /**
   * Get validation summary statistics
   */
  getValidationSummary() {
    const totalSpecs = this._state.currentResults.length;
    const totalRequirements = this._state.currentResults.reduce(
      (sum, spec) => sum + spec.summary.totalRequirements, 0
    );
    const totalPassed = this._state.currentResults.reduce(
      (sum, spec) => sum + spec.summary.passedRequirements, 0
    );
    const totalFailed = this._state.currentResults.reduce(
      (sum, spec) => sum + spec.summary.failedRequirements, 0
    );

    return {
      totalSpecs,
      totalRequirements,
      totalPassed,
      totalFailed,
      hasResults: totalSpecs > 0,
      hasFailures: totalFailed > 0,
      lastValidationTime: this._state.lastValidationTime,
      isValidating: this._state.isValidating,
      validationError: this._state.validationError,
    };
  }

  /**
   * Reset all state to initial values
   */
  reset(): void {
    this._state = {
      currentResults: [],
      expandedSpecs: new Set(),
      expandedRequirements: new Set(),
      isValidating: false,
    };
    this._notifySubscribers();
  }

  /**
   * Notify all subscribers of state changes
   */
  private _notifySubscribers(): void {
    const currentState = this.state;
    this._updateCallbacks.forEach(callback => {
      try {
        callback(currentState);
      } catch (error) {
        console.error("Error in state update callback:", error);
      }
    });
  }
}