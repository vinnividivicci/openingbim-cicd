import * as BUI from "@thatopen/ui";
import { conversionStateManager, ConversionState } from "../../services/ConversionStateManager";

export interface IFCUploadStepState {
  state: ConversionState;
  isDragging: boolean;
}

export const ifcUploadStepTemplate: BUI.StatefullComponent<IFCUploadStepState> = (
  state,
  update
) => {
  const { state: conversionState, isDragging } = state;

  const handleFileSelect = async (file: File) => {
    // Validate file extension
    if (!file.name.toLowerCase().endsWith('.ifc')) {
      conversionStateManager.showNotification(
        'error',
        'Invalid File',
        'Please select a valid .ifc file'
      );
      return;
    }

    try {
      await conversionStateManager.uploadIFC(file);
    } catch (error) {
      console.error('Failed to upload IFC:', error);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      update({ isDragging: true });
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only update if we're actually leaving the drop zone
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

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      await handleFileSelect(files[0]);
    }
  };

  const handleBrowseClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ifc';
    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        await handleFileSelect(target.files[0]);
      }
    };
    input.click();
  };

  const isUploading = conversionState.status === 'uploading';
  const hasFile = !!conversionState.ifcFile;
  const canUpload = !isUploading && conversionState.status !== 'converting';

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    else return Math.round(bytes / 1048576) + ' MB';
  };

  return BUI.html`
    <div class="step-container">
      <div class="step-header">
        <div class="step-number ${conversionState.currentStep >= 1 ? 'active' : ''}">
          ${conversionState.currentStep > 1 ? BUI.html`<span class="checkmark">✓</span>` : '1'}
        </div>
        <div class="step-info">
          <h3 class="step-title">Upload IFC File</h3>
          <p class="step-description">Drag and drop or browse to select your IFC file</p>
        </div>
      </div>

      <div class="step-content">
        ${!hasFile || canUpload ? BUI.html`
          <div
            class="drop-zone ${isDragging ? 'dragging' : ''} ${!canUpload ? 'disabled' : ''}"
            @dragover=${handleDragOver}
            @dragleave=${handleDragLeave}
            @drop=${handleDrop}
          >
            <div class="drop-zone-content">
              ${isUploading ? BUI.html`
                <div class="spinner"></div>
                <p>Uploading...</p>
              ` : BUI.html`
                <svg class="upload-icon" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <p class="drop-zone-text">
                  ${isDragging ? 'Drop your IFC file here' : 'Drag & drop your IFC file here'}
                </p>
                <p class="drop-zone-subtext">or</p>
                <bim-button
                  label="Browse Files"
                  @click=${handleBrowseClick}
                  ?disabled=${!canUpload}
                ></bim-button>
              `}
            </div>
          </div>
        ` : BUI.html`
          <div class="file-info">
            <div class="file-icon">📄</div>
            <div class="file-details">
              <p class="file-name">${conversionState.ifcFile?.name}</p>
              <p class="file-size">${conversionState.ifcFile ? formatFileSize(conversionState.ifcFile.size) : ''}</p>
            </div>
            ${canUpload ? BUI.html`
              <bim-button
                label="Change File"
                @click=${handleBrowseClick}
                variant="outlined"
              ></bim-button>
            ` : ''}
          </div>
        `}

        ${conversionState.error && conversionState.currentStep === 1 ? BUI.html`
          <div class="error-message">
            <span class="error-icon">⚠️</span>
            <span>${conversionState.error}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
};