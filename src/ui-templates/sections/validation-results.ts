import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import { appIcons, globalIDSIntegration } from "../../globals";
import { ValidationDisplayResult, RequirementDisplayResult, IDSUIStateManager } from "../../bim-components";

// Create global UI state manager instance
let globalUIStateManager: IDSUIStateManager | undefined;

export function getGlobalUIStateManager(): IDSUIStateManager {
  if (!globalUIStateManager) {
    globalUIStateManager = new IDSUIStateManager();
  }
  return globalUIStateManager;
}

export interface ValidationResultsPanelState {
  stateManager: IDSUIStateManager;
  lastUpdateTime: number;
}

export const validationResultsPanelTemplate: BUI.StatefullComponent<ValidationResultsPanelState> = (
  state,
  update,
) => {
  // Initialize state manager if needed
  if (!state.stateManager) {
    state.stateManager = getGlobalUIStateManager();
    state.lastUpdateTime = Date.now();
  }

  // Subscribe to state manager updates
  const stateManager = state.stateManager;

  // Set up reactive updates from state manager
  const setupReactiveUpdates = () => {
    // Subscribe to state changes and trigger UI updates
    const unsubscribe = stateManager.subscribe((_newState) => {
      // Update component state to trigger re-render
      update({
        stateManager: stateManager,
        lastUpdateTime: Date.now()
      });
    });

    // Store unsubscribe function for cleanup (if needed)
    (state as any)._unsubscribe = unsubscribe;
  };

  // Set up reactive updates if not already done
  if (!(state as any)._unsubscribe) {
    setupReactiveUpdates();
  }

  // Sync with global IDS integration results
  const syncWithGlobalIntegration = () => {
    if (globalIDSIntegration) {
      const currentResults = globalIDSIntegration.getValidationResults();
      stateManager.updateResults(currentResults);
    }
  };

  // Sync results on render
  syncWithGlobalIntegration();

  // Get current state from state manager
  const currentState = stateManager.state;

  const onToggleSpecification = (specId: string) => {
    stateManager.toggleSpecificationExpansion(specId);
  };

  const onToggleRequirement = (specId: string, reqId: string) => {
    stateManager.toggleRequirementExpansion(specId, reqId);
  };

  const onElementClick = async (elementId: string, specId: string, reqId: string) => {
    try {
      // Update selection state through state manager
      stateManager.selectRequirement(specId, reqId);

      console.log(`Element clicked: ${elementId} in spec ${specId}, requirement ${reqId}`);

      // Show loading feedback
      const clickedElement = document.querySelector(`[data-element-id="${elementId}"]`) as HTMLElement;
      if (clickedElement) {
        clickedElement.style.opacity = '0.6';
        clickedElement.style.pointerEvents = 'none';
      }

      // Highlight specific requirement failures in 3D viewer
      if (globalIDSIntegration) {
        try {
          await globalIDSIntegration.highlightFailures(specId, reqId);
        } catch (error) {
          console.warn("Failed to highlight element:", error);
        }
      }

      // Focus on the clicked element using existing camera controls
      await focusOnElement(elementId);

      // Restore element state
      if (clickedElement) {
        clickedElement.style.opacity = '1';
        clickedElement.style.pointerEvents = 'auto';
      }

    } catch (error) {
      console.error("Failed to handle element click:", error);

      // Show error notification
      const notification = BUI.Component.create(() => {
        return BUI.html`
          <bim-notification type="error" title="Focus Failed">
            Could not focus on the selected element.
          </bim-notification>
        `;
      });
      document.body.appendChild(notification);
      setTimeout(() => document.body.removeChild(notification), 3000);
    }
  };

  /**
   * Focus the 3D camera on a specific element and integrate with existing selection system
   * @param elementId - The ID of the element to focus on
   */
  const focusOnElement = async (elementId: string) => {
    try {
      if (!globalIDSIntegration) {
        console.warn("IDS integration not available for element focusing");
        return;
      }

      // Get the world and camera from globals
      const components = globalIDSIntegration.components;
      const worlds = components.get(OBC.Worlds);
      const world = worlds.list.get("Main");

      if (!world || !(world.camera instanceof OBC.SimpleCamera)) {
        console.warn("Camera not available for element focusing");
        return;
      }

      // Convert single element ID to ModelIdMap format for focusing
      const modelIdMap = await globalIDSIntegration.convertElementIdToModelIdMap(elementId);

      if (OBC.ModelIdMapUtils.isEmpty(modelIdMap)) {
        console.warn(`Element ${elementId} not found for focusing`);
        return;
      }

      // Integrate with existing selection system - select the element first
      try {
        const highlighter = components.get(OBF.Highlighter);

        // Clear existing selection and select the clicked element
        await highlighter.clear("select");
        await highlighter.highlightByID("select", modelIdMap, false, false);

        console.log(`Selected element: ${elementId}`);
      } catch (selectionError) {
        console.warn("Failed to select element:", selectionError);
        // Continue with focusing even if selection fails
      }

      // Use the existing camera fitToItems method to focus on the element
      await world.camera.fitToItems(modelIdMap);

      console.log(`Focused camera on element: ${elementId}`);

    } catch (error) {
      console.error("Failed to focus on element:", error);
    }
  };

  const onExportResults = async () => {
    const summary = stateManager.getValidationSummary();

    if (!globalIDSIntegration || !summary.hasResults) {
      const notification = BUI.Component.create(() => {
        return BUI.html`
          <bim-notification type="warning" title="No Results">
            No validation results available for export.
          </bim-notification>
        `;
      });
      document.body.appendChild(notification);
      setTimeout(() => document.body.removeChild(notification), 3000);
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
    const isExpanded = stateManager.isRequirementExpanded(specId, requirement.id);
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
          @click=${() => onToggleRequirement(specId, requirement.id)}
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
                  data-element-id="${element.elementId}"
                  style="
                    padding: 0.5rem;
                    margin: 0.25rem 0;
                    background: var(--bim-ui_bg-contrast-20);
                    border-radius: 0.25rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: 1px solid transparent;
                  "
                  title="Click to focus on this element in the 3D viewer"
                  @click=${() => onElementClick(element.elementId, specId, requirement.id)}
                  @mouseenter=${(e: Event) => {
          const target = e.target as HTMLElement;
          target.style.backgroundColor = 'var(--bim-ui_bg-contrast-40)';
          target.style.borderColor = 'var(--bim-ui_bg-contrast-60)';
          target.style.transform = 'translateX(2px)';
        }}
                  @mouseleave=${(e: Event) => {
          const target = e.target as HTMLElement;
          target.style.backgroundColor = 'var(--bim-ui_bg-contrast-20)';
          target.style.borderColor = 'transparent';
          target.style.transform = 'translateX(0px)';
        }}
                >
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="font-size: 0.75rem; font-weight: 500; color: var(--bim-ui_bg-contrast-100);">
                      ${element.elementType}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--bim-ui_bg-contrast-60);" title="Click to focus">
                      🎯
                    </div>
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
    const isExpanded = stateManager.isSpecificationExpanded(result.specificationId);
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

  // Get validation summary from state manager
  const summary = stateManager.getValidationSummary();
  const results = currentState.currentResults;

  return BUI.html`
    <bim-panel-section fixed icon=${appIcons.TASK} label="Validation Results">
      ${summary.hasResults ? BUI.html`
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
          <div style="font-size: 0.875rem; color: var(--bim-ui_bg-contrast-80);">
            ${summary.totalSpecs} specification(s) • ${summary.totalRequirements} requirements
            ${summary.totalFailed > 0 ? ` • ${summary.totalFailed} failed` : ' • All passed'}
            ${summary.lastValidationTime ? ` • ${summary.lastValidationTime.toLocaleTimeString()}` : ''}
          </div>
          <bim-button 
            size="xs" 
            label="Export" 
            icon=${appIcons.EXPORT}
            @click=${onExportResults}
            ?disabled=${summary.isValidating}
          ></bim-button>
        </div>
        
        ${summary.isValidating ? BUI.html`
          <div style="
            padding: 1rem;
            text-align: center;
            color: var(--bim-ui_bg-contrast-80);
            background: var(--bim-ui_bg-contrast-10);
            border-radius: 0.5rem;
            margin-bottom: 1rem;
          ">
            <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
              <div style="
                width: 16px; 
                height: 16px; 
                border: 2px solid var(--bim-ui_bg-contrast-80); 
                border-top: 2px solid transparent; 
                border-radius: 50%; 
                animation: spin 1s linear infinite;
              "></div>
              Validation in progress...
            </div>
          </div>
          <style>
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        ` : BUI.html``}
        
        ${summary.validationError ? BUI.html`
          <div style="
            padding: 1rem;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            color: #ef4444;
          ">
            <div style="font-weight: 500; margin-bottom: 0.25rem;">Validation Error</div>
            <div style="font-size: 0.875rem;">${summary.validationError}</div>
          </div>
        ` : BUI.html``}
        
        <div style="max-height: 600px; overflow-y: auto;">
          ${results.map(result => createSpecificationSection(result))}
        </div>
      ` : createPlaceholderContent()}
    </bim-panel-section>
  `;
};