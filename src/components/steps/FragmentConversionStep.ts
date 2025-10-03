import * as BUI from "@thatopen/ui";
import { conversionStateManager, ConversionState } from "../../services/ConversionStateManager";

export interface FragmentConversionStepState {
  state: ConversionState;
  showLogs: boolean;
}

export const fragmentConversionStepTemplate: BUI.StatefullComponent<FragmentConversionStepState> = (
  state,
  update
) => {
  const { state: conversionState, showLogs } = state;

  const isConverting = conversionState.status === 'converting';
  const isComplete = conversionState.currentStep > 2 ||
    (conversionState.currentStep === 2 && conversionState.fragmentFileId);
  const hasError = conversionState.status === 'error' && conversionState.currentStep === 2;
  const isActive = conversionState.currentStep >= 2;

  const handleViewModel = () => {
    if (conversionState.fragmentFileId) {
      window.location.hash = `/viewer?model=${conversionState.fragmentFileId}`;
    }
  };

  const handleDownloadFragment = async () => {
    try {
      await conversionStateManager.downloadFragment();
    } catch (error) {
      console.error('Failed to download fragment:', error);
    }
  };

  const toggleLogs = () => {
    update({ showLogs: !showLogs });
  };

  const getStepStatus = () => {
    if (!isActive) return 'waiting';
    if (isConverting) return 'in-progress';
    if (isComplete) return 'completed';
    if (hasError) return 'error';
    return 'waiting';
  };

  const stepStatus = getStepStatus();

  return BUI.html`
    <div class="step-container ${!isActive ? 'disabled' : ''}">
      <div class="step-header">
        <div class="step-number ${stepStatus}">
          ${isComplete ? BUI.html`<span class="checkmark">✓</span>` :
            isConverting ? BUI.html`<div class="step-spinner"></div>` : '2'}
        </div>
        <div class="step-info">
          <h3 class="step-title">Convert to Fragments</h3>
          <p class="step-description">
            ${isConverting ? 'Converting IFC to optimized fragments...' :
              isComplete ? 'Conversion complete' :
              hasError ? 'Conversion failed' :
              'Automatic conversion will start after upload'}
          </p>
        </div>
      </div>

      ${isActive ? BUI.html`
        <div class="step-content">
          ${isConverting ? BUI.html`
            <div class="conversion-progress">
              <div class="progress-spinner">
                <div class="spinner large"></div>
              </div>
              <p class="progress-text">Converting your IFC file...</p>
              <p class="progress-subtext">This may take a few moments depending on file size</p>
            </div>
          ` : ''}

          ${isComplete ? BUI.html`
            <div class="conversion-complete">
              <div class="success-icon">✅</div>
              <p class="success-text">Conversion successful!</p>
              <div class="action-buttons">
                <bim-button
                  label="View Model"
                  icon="mdi:eye"
                  @click=${handleViewModel}
                ></bim-button>
                <bim-button
                  label="Download Fragment"
                  icon="mdi:download"
                  variant="outlined"
                  @click=${handleDownloadFragment}
                ></bim-button>
              </div>
            </div>
          ` : ''}

          ${hasError ? BUI.html`
            <div class="error-message">
              <span class="error-icon">❌</span>
              <span>${conversionState.error}</span>
            </div>
          ` : ''}

          ${conversionState.logs.length > 0 ? BUI.html`
            <div class="logs-section">
              <button class="logs-toggle" @click=${toggleLogs}>
                <span class="toggle-icon">${showLogs ? '▼' : '▶'}</span>
                View Logs (${conversionState.logs.length} entries)
              </button>
              ${showLogs ? BUI.html`
                <div class="logs-container">
                  ${conversionState.logs.map(log => BUI.html`
                    <div class="log-entry">${log}</div>
                  `)}
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `;
};