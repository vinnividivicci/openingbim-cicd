import * as BUI from "@thatopen/ui";
import { conversionStateManager, ConversionState } from "../../services/ConversionStateManager";

export interface IDSUploadStepState {
  state: ConversionState;
  isDragging: boolean;
}

export const idsUploadStepTemplate: BUI.StatefullComponent<IDSUploadStepState> = (
  state,
  update
) => {
  const { state: conversionState, isDragging } = state;

  const isActive = conversionState.currentStep >= 3;
  const isValidating = conversionState.status === 'validating';
  const isComplete = conversionState.currentStep > 3 ||
    (conversionState.currentStep === 3 && conversionState.validationResultsId);
  const hasError = conversionState.status === 'error' && conversionState.currentStep === 3;
  const hasIDS = !!conversionState.idsFile;
  const canUpload = isActive && !isValidating && conversionState.fragmentFileId;

  const handleFileSelect = async (file: File) => {
    // Validate file extension
    if (!file.name.toLowerCase().endsWith('.ids') && !file.name.toLowerCase().endsWith('.xml')) {
      conversionStateManager.showNotification(
        'error',
        'Invalid File',
        'Please select a valid .ids or .xml file'
      );
      return;
    }

    try {
      await conversionStateManager.uploadIDS(file);
    } catch (error) {
      console.error('Failed to upload IDS:', error);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging && canUpload) {
      update({ isDragging: true });
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;
    if (target === currentTarget) {
      update({ isDragging: false });
    }
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    update({ isDragging: false });

    if (!canUpload) return;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      await handleFileSelect(files[0]);
    }
  };

  const handleBrowseClick = () => {
    if (!canUpload) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ids,.xml';
    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        await handleFileSelect(target.files[0]);
      }
    };
    input.click();
  };

  const handleSkip = () => {
    // Navigate to viewer without validation
    if (conversionState.fragmentFileId) {
      window.location.hash = `/viewer?model=${conversionState.fragmentFileId}`;
    }
  };

  const getStepStatus = () => {
    if (!isActive) return 'waiting';
    if (isValidating) return 'in-progress';
    if (isComplete) return 'completed';
    if (hasError) return 'error';
    return 'active';
  };

  const stepStatus = getStepStatus();

  return BUI.html`
    <div class="step-container ${!isActive ? 'disabled' : ''}">
      <div class="step-header">
        <div class="step-number ${stepStatus}">
          ${isComplete ? BUI.html`<span class="checkmark">✓</span>` :
            isValidating ? BUI.html`<div class="step-spinner"></div>` : '3'}
        </div>
        <div class="step-info">
          <h3 class="step-title">Upload IDS Specification (Optional)</h3>
          <p class="step-description">
            ${isValidating ? 'Validating model against IDS specification...' :
              isComplete ? 'Validation complete' :
              hasError ? 'Validation failed' :
              'Add IDS file to validate your model or skip this step'}
          </p>
        </div>
      </div>

      ${isActive ? BUI.html`
        <div class="step-content">
          ${!hasIDS && !isValidating && !isComplete ? BUI.html`
            <div
              class="drop-zone ${isDragging ? 'dragging' : ''} ${!canUpload ? 'disabled' : ''}"
              @dragover=${handleDragOver}
              @dragleave=${handleDragLeave}
              @drop=${handleDrop}
            >
              <div class="drop-zone-content">
                <svg class="upload-icon" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <p class="drop-zone-text">
                  ${isDragging ? 'Drop your IDS file here' : 'Drag & drop your IDS specification here'}
                </p>
                <p class="drop-zone-subtext">or</p>
                <div class="button-group">
                  <bim-button
                    label="Browse Files"
                    @click=${handleBrowseClick}
                    ?disabled=${!canUpload}
                  ></bim-button>
                  <bim-button
                    label="Skip Validation"
                    variant="outlined"
                    @click=${handleSkip}
                    ?disabled=${!canUpload}
                  ></bim-button>
                </div>
              </div>
            </div>
          ` : ''}

          ${isValidating ? BUI.html`
            <div class="validation-progress">
              <div class="progress-spinner">
                <div class="spinner large"></div>
              </div>
              <p class="progress-text">Validating model against IDS specification...</p>
              <p class="progress-subtext">Checking ${conversionState.idsFile?.name}</p>
            </div>
          ` : ''}

          ${hasIDS && !isValidating ? BUI.html`
            <div class="file-info">
              <div class="file-icon">📋</div>
              <div class="file-details">
                <p class="file-name">${conversionState.idsFile?.name}</p>
                <p class="file-size">IDS Specification</p>
              </div>
            </div>
          ` : ''}

          ${isComplete ? BUI.html`
            <div class="validation-complete">
              <div class="success-icon">✅</div>
              <p class="success-text">Validation completed successfully!</p>
              <p class="success-subtext">Results are ready for viewing</p>
            </div>
          ` : ''}

          ${hasError ? BUI.html`
            <div class="error-message">
              <span class="error-icon">❌</span>
              <span>${conversionState.error}</span>
            </div>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `;
};