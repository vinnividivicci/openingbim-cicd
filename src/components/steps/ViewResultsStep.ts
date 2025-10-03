import * as BUI from "@thatopen/ui";
import { conversionStateManager, ConversionState } from "../../services/ConversionStateManager";

export interface ViewResultsStepState {
  state: ConversionState;
}

export const viewResultsStepTemplate: BUI.StatefullComponent<ViewResultsStepState> = (
  state
) => {
  const { state: conversionState } = state;

  const isActive = conversionState.currentStep >= 4;
  const hasResults = !!conversionState.validationResultsId;
  const hasModel = !!conversionState.fragmentFileId;

  const handleViewResults = () => {
    const url = conversionStateManager.getViewerUrl();
    window.location.hash = url.substring(1); // Remove the # prefix
  };

  const handleDownloadResults = async () => {
    try {
      await conversionStateManager.downloadResults();
    } catch (error) {
      console.error('Failed to download results:', error);
    }
  };

  const handleViewModelOnly = () => {
    if (conversionState.fragmentFileId) {
      window.location.hash = `/viewer?model=${conversionState.fragmentFileId}`;
    }
  };

  const getStepStatus = () => {
    if (!isActive) return 'waiting';
    if (hasResults) return 'completed';
    return 'waiting';
  };

  const stepStatus = getStepStatus();

  return BUI.html`
    <div class="step-container ${!isActive ? 'disabled' : ''}">
      <div class="step-header">
        <div class="step-number ${stepStatus}">
          ${hasResults ? BUI.html`<span class="checkmark">✓</span>` : '4'}
        </div>
        <div class="step-info">
          <h3 class="step-title">View Results</h3>
          <p class="step-description">
            ${hasResults ? 'Validation results are ready' :
              hasModel ? 'Model ready for viewing' :
              'Complete previous steps to view results'}
          </p>
        </div>
      </div>

      ${isActive || hasModel ? BUI.html`
        <div class="step-content">
          ${hasResults ? BUI.html`
            <div class="results-container">
              <div class="results-summary">
                <div class="summary-icon">📊</div>
                <div class="summary-content">
                  <h4>Validation Complete</h4>
                  <p>Your model has been validated against the IDS specification</p>
                </div>
              </div>

              <div class="results-actions">
                <bim-button
                  label="Show Results in Viewer"
                  icon="mdi:eye-check"
                  @click=${handleViewResults}
                ></bim-button>
                <bim-button
                  label="Download Results"
                  icon="mdi:download"
                  variant="outlined"
                  @click=${handleDownloadResults}
                ></bim-button>
              </div>

              <div class="results-info">
                <div class="info-item">
                  <span class="info-label">Model:</span>
                  <span class="info-value">${conversionState.ifcFile?.name}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">IDS Specification:</span>
                  <span class="info-value">${conversionState.idsFile?.name}</span>
                </div>
              </div>
            </div>
          ` : hasModel ? BUI.html`
            <div class="model-ready-container">
              <div class="model-ready-icon">🏗️</div>
              <h4>Model Ready</h4>
              <p>Your model has been converted and is ready for viewing</p>
              <div class="model-actions">
                <bim-button
                  label="View Model"
                  icon="mdi:eye"
                  @click=${handleViewModelOnly}
                ></bim-button>
              </div>
              <p class="skip-info">
                You skipped IDS validation. The model will be displayed without validation results.
              </p>
            </div>
          ` : BUI.html`
            <div class="waiting-container">
              <div class="waiting-icon">⏳</div>
              <p>Waiting for conversion and validation to complete...</p>
            </div>
          `}

          ${conversionStateManager.getHistory().length > 0 ? BUI.html`
            <div class="history-section">
              <h4 class="history-title">Recent Conversions</h4>
              <div class="history-list">
                ${conversionStateManager.getHistory().slice(0, 3).map(item => BUI.html`
                  <div class="history-item">
                    <span class="history-file">${item.ifcFileName}</span>
                    <span class="history-time">${new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                `)}
              </div>
            </div>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `;
};