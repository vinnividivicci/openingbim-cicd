import * as BUI from "@thatopen/ui";
import { appIcons, globalIDSIntegration } from "../../globals";

// Define interfaces for validation results display
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

export interface ValidationResultsPanelState {
  results: ValidationDisplayResult[];
  selectedSpecification?: string;
  selectedRequirement?: string;
  expandedSpecs: Set<string>;
  expandedRequirements: Set<string>;
}

export const validationResultsPanelTemplate: BUI.StatefullComponent<ValidationResultsPanelState> = (
  state,
  update,
) => {
  // Initialize state if needed
  if (!state.results) {
    state.results = [];
  }
  if (!state.expandedSpecs) {
    state.expandedSpecs = new Set();
  }
  if (!state.expandedRequirements) {
    state.expandedRequirements = new Set();
  }

  // Get current validation results from global integration
  const refreshResults = () => {
    if (globalIDSIntegration) {
      const currentResults = globalIDSIntegration.getValidationResults();
      if (JSON.stringify(currentResults) !== JSON.stringify(state.results)) {
        state.results = currentResults;
        update({ results: currentResults });
      }
    }
  };

  // Refresh results on render
  refreshResults();

  const onToggleSpecification = (specId: string) => {
    if (state.expandedSpecs.has(specId)) {
      state.expandedSpecs.delete(specId);
    } else {
      state.expandedSpecs.add(specId);
    }
    update({ expandedSpecs: new Set(state.expandedSpecs) });
  };

  const onToggleRequirement = (reqId: string) => {
    if (state.expandedRequirements.has(reqId)) {
      state.expandedRequirements.delete(reqId);
    } else {
      state.expandedRequirements.add(reqId);
    }
    update({ expandedRequirements: new Set(state.expandedRequirements) });
  };

  const onElementClick = (elementId: string, specId: string, reqId: string) => {
    // This will be implemented in later tasks for 3D viewer integration
    console.log(`Element clicked: ${elementId} in spec ${specId}, requirement ${reqId}`);

    // For now, just update selection state
    state.selectedSpecification = specId;
    state.selectedRequirement = reqId;
    update({ selectedSpecification: specId, selectedRequirement: reqId });
  };

  const onExportResults = async () => {
    if (!globalIDSIntegration || state.results.length === 0) {
      return;
    }

    try {
      const blob = await globalIDSIntegration.exportResults('json');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `validation-results-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Show success notification
      const notification = BUI.Component.create(() => {
        return BUI.html`
          <bim-notification type="success" title="Export Complete">
            Validation results exported successfully.
          </bim-notification>
        `;
      });
      document.body.appendChild(notification);
      setTimeout(() => document.body.removeChild(notification), 3000);

    } catch (error) {
      console.error("Export failed:", error);

      const notification = BUI.Component.create(() => {
        return BUI.html`
          <bim-notification type="error" title="Export Failed">
            Failed to export validation results.
          </bim-notification>
        `;
      });
      document.body.appendChild(notification);
      setTimeout(() => document.body.removeChild(notification), 4000);
    }
  };

  // Create status badge component
  const createStatusBadge = (status: 'passed' | 'failed', count?: number) => {
    const isPass = status === 'passed';
    const bgColor = isPass ? '#22c55e' : '#ef4444';
    const textColor = '#ffffff';
    const icon = isPass ? '✓' : '✗';
    const text = isPass ? 'PASSED' : 'FAILED';
    const displayText = count !== undefined ? `${text} (${count})` : text;

    return BUI.html`
      <span style="
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.125rem 0.5rem;
        background: ${bgColor};
        color: ${textColor};
        border-radius: 0.25rem;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
      ">
        ${icon} ${displayText}
      </span>
    `;
  };

  // Create requirement section
  const createRequirementSection = (requirement: RequirementDisplayResult, specId: string) => {
    const reqKey = `${specId}-${requirement.id}`;
    const isExpanded = state.expandedRequirements.has(reqKey);
    const hasFailed = requirement.status === 'failed' && requirement.failedElements.length > 0;

    return BUI.html`
      <div style="
        margin: 0.5rem 0;
        border: 1px solid var(--bim-ui_bg-contrast-40);
        border-radius: 0.25rem;
        background: var(--bim-ui_bg-contrast-10);
      ">
        <div 
          style="
            padding: 0.75rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: ${hasFailed && isExpanded ? '1px solid var(--bim-ui_bg-contrast-40)' : 'none'};
          "
          @click=${() => onToggleRequirement(reqKey)}
        >
          <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1;">
            <span style="
              font-size: 0.75rem;
              color: var(--bim-ui_bg-contrast-60);
              transform: rotate(${isExpanded ? '90deg' : '0deg'});
              transition: transform 0.2s ease;
            ">▶</span>
            <div style="flex: 1;">
              <div style="font-weight: 500; color: var(--bim-ui_bg-contrast-100); margin-bottom: 0.25rem;">
                ${requirement.name}
              </div>
              <div style="font-size: 0.75rem; color: var(--bim-ui_bg-contrast-80);">
                ID: ${requirement.id}
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            ${requirement.status === 'passed'
        ? createStatusBadge('passed', requirement.passedCount)
        : createStatusBadge('failed', requirement.failedCount)
      }
          </div>
        </div>
        
        ${hasFailed && isExpanded ? BUI.html`
          <div style="padding: 0.75rem;">
            <div style="font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; color: var(--bim-ui_bg-contrast-100);">
              Failed Elements (${requirement.failedElements.length})
            </div>
            <div style="max-height: 200px; overflow-y: auto;">
              ${requirement.failedElements.map(element => BUI.html`
                <div 
                  style="
                    padding: 0.5rem;
                    margin: 0.25rem 0;
                    background: var(--bim-ui_bg-contrast-20);
                    border-radius: 0.25rem;
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                  "
                  @click=${() => onElementClick(element.elementId, specId, requirement.id)}
                  @mouseenter=${(e: Event) => {
          const target = e.target as HTMLElement;
          target.style.backgroundColor = 'var(--bim-ui_bg-contrast-40)';
        }}
                  @mouseleave=${(e: Event) => {
          const target = e.target as HTMLElement;
          target.style.backgroundColor = 'var(--bim-ui_bg-contrast-20)';
        }}
                >
                  <div style="font-size: 0.75rem; font-weight: 500; color: var(--bim-ui_bg-contrast-100);">
                    ${element.elementType}
                  </div>
                  <div style="font-size: 0.75rem; color: var(--bim-ui_bg-contrast-80); margin: 0.125rem 0;">
                    ID: ${element.elementId}
                  </div>
                  <div style="font-size: 0.75rem; color: var(--bim-ui_bg-contrast-60);">
                    ${element.reason}
                  </div>
                </div>
              `)}
            </div>
          </div>
        ` : BUI.html``}
      </div>
    `;
  };

  // Create specification section
  const createSpecificationSection = (result: ValidationDisplayResult) => {
    const isExpanded = state.expandedSpecs.has(result.specificationId);
    const hasFailures = result.summary.failedRequirements > 0;

    return BUI.html`
      <details 
        ?open=${isExpanded}
        style="
          margin: 0.75rem 0;
          border: 1px solid var(--bim-ui_bg-contrast-40);
          border-radius: 0.5rem;
          background: var(--bim-ui_bg-contrast-20);
        "
      >
        <summary 
          style="
            padding: 1rem;
            cursor: pointer;
            list-style: none;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-radius: 0.5rem;
          "
          @click=${(e: Event) => {
        e.preventDefault();
        onToggleSpecification(result.specificationId);
      }}
        >
          <div style="flex: 1;">
            <div style="font-weight: 600; color: var(--bim-ui_bg-contrast-100); margin-bottom: 0.25rem;">
              📋 ${result.specificationName}
            </div>
            <div style="font-size: 0.75rem; color: var(--bim-ui_bg-contrast-80);">
              Model: ${result.modelName} • ${result.summary.totalRequirements} requirements
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            ${hasFailures
        ? createStatusBadge('failed', result.summary.failedRequirements)
        : createStatusBadge('passed', result.summary.passedRequirements)
      }
            <span style="
              font-size: 0.75rem;
              color: var(--bim-ui_bg-contrast-60);
              transform: rotate(${isExpanded ? '90deg' : '0deg'});
              transition: transform 0.2s ease;
            ">▶</span>
          </div>
        </summary>
        
        ${isExpanded ? BUI.html`
          <div style="padding: 0 1rem 1rem 1rem;">
            <div style="
              padding: 0.75rem;
              background: var(--bim-ui_bg-contrast-10);
              border-radius: 0.25rem;
              margin-bottom: 0.75rem;
              border: 1px solid var(--bim-ui_bg-contrast-30);
            ">
              <div style="font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; color: var(--bim-ui_bg-contrast-100);">
                Summary
              </div>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; font-size: 0.75rem;">
                <div style="text-align: center;">
                  <div style="color: var(--bim-ui_bg-contrast-80);">Total</div>
                  <div style="font-weight: 600; color: var(--bim-ui_bg-contrast-100);">${result.summary.totalRequirements}</div>
                </div>
                <div style="text-align: center;">
                  <div style="color: #22c55e;">Passed</div>
                  <div style="font-weight: 600; color: #22c55e;">${result.summary.passedRequirements}</div>
                </div>
                <div style="text-align: center;">
                  <div style="color: #ef4444;">Failed</div>
                  <div style="font-weight: 600; color: #ef4444;">${result.summary.failedRequirements}</div>
                </div>
              </div>
            </div>
            
            <div>
              ${result.requirements.map(req => createRequirementSection(req, result.specificationId))}
            </div>
          </div>
        ` : BUI.html``}
      </details>
    `;
  };

  // Create placeholder content when no results are available
  const createPlaceholderContent = () => {
    return BUI.html`
      <div style="
        padding: 2rem;
        text-align: center;
        color: var(--bim-ui_bg-contrast-60);
        background: var(--bim-ui_bg-contrast-10);
        border-radius: 0.5rem;
        border: 2px dashed var(--bim-ui_bg-contrast-40);
        margin: 1rem 0;
      ">
        <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
        <div style="font-size: 1.125rem; font-weight: 500; margin-bottom: 0.5rem; color: var(--bim-ui_bg-contrast-80);">
          No Validation Results
        </div>
        <div style="font-size: 0.875rem; line-height: 1.5;">
          Load IFC models and IDS specifications, then run validation to see results here.
        </div>
      </div>
    `;
  };

  // Create main content
  const hasResults = state.results && state.results.length > 0;
  const totalSpecs = hasResults ? state.results.length : 0;
  const totalRequirements = hasResults ? state.results.reduce((sum, spec) => sum + spec.summary.totalRequirements, 0) : 0;
  const totalFailed = hasResults ? state.results.reduce((sum, spec) => sum + spec.summary.failedRequirements, 0) : 0;

  return BUI.html`
    <bim-panel-section fixed icon=${appIcons.TASK} label="Validation Results">
      ${hasResults ? BUI.html`
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
          <div style="font-size: 0.875rem; color: var(--bim-ui_bg-contrast-80);">
            ${totalSpecs} specification(s) • ${totalRequirements} requirements
            ${totalFailed > 0 ? ` • ${totalFailed} failed` : ' • All passed'}
          </div>
          <bim-button 
            size="xs" 
            label="Export" 
            icon=${appIcons.EXPORT}
            @click=${onExportResults}
          ></bim-button>
        </div>
        
        <div style="max-height: 600px; overflow-y: auto;">
          ${state.results.map(result => createSpecificationSection(result))}
        </div>
      ` : createPlaceholderContent()}
    </bim-panel-section>
  `;
};