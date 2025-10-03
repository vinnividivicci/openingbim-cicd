import * as BUI from "@thatopen/ui";

export type ConversionStep = 1 | 2 | 3 | 4;
export type ConversionStatus =
  | 'idle'
  | 'uploading'
  | 'converting'
  | 'validating'
  | 'complete'
  | 'error';

export interface ConversionState {
  currentStep: ConversionStep;
  ifcFile?: File;
  ifcFileBuffer?: ArrayBuffer;
  fragmentFileId?: string;
  idsFile?: File;
  validationResultsId?: string;
  conversionJobId?: string;
  validationJobId?: string;
  status: ConversionStatus;
  error?: string;
  logs: string[];
}

export interface ConversionHistoryItem {
  id: string;
  timestamp: number;
  ifcFileName: string;
  fragmentFileId?: string;
  idsFileName?: string;
  validationResultsId?: string;
  status: ConversionStatus;
}

class ConversionStateManager {
  private static instance: ConversionStateManager;
  private state: ConversionState;
  private history: ConversionHistoryItem[] = [];
  private listeners: Set<(state: ConversionState) => void> = new Set();
  private apiBaseUrl: string;

  private constructor() {
    this.state = {
      currentStep: 1,
      status: 'idle',
      logs: []
    };

    // Use relative URL for API to work in both dev and Docker environments
    // In development, Vite will proxy to localhost:3001
    // In Docker, nginx will proxy to backend:3001
    this.apiBaseUrl = '/api/v1';
  }

  static getInstance(): ConversionStateManager {
    if (!ConversionStateManager.instance) {
      ConversionStateManager.instance = new ConversionStateManager();
    }
    return ConversionStateManager.instance;
  }

  // State management
  getState(): ConversionState {
    return { ...this.state };
  }

  subscribe(listener: (state: ConversionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  private updateState(updates: Partial<ConversionState>) {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  addLog(message: string) {
    this.state.logs.push(`[${new Date().toLocaleTimeString()}] ${message}`);
    this.notifyListeners();
  }

  clearLogs() {
    this.state.logs = [];
    this.notifyListeners();
  }

  // IFC Upload (Step 1)
  async uploadIFC(file: File): Promise<void> {
    this.updateState({
      ifcFile: file,
      currentStep: 1,
      status: 'uploading',
      error: undefined,
      logs: []
    });

    this.addLog(`Uploading IFC file: ${file.name}`);

    try {
      // Store file buffer for later use in validation
      const buffer = await file.arrayBuffer();
      this.state.ifcFileBuffer = buffer;

      // Immediately trigger conversion
      await this.convertToFragment();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to upload IFC file';
      this.updateState({ status: 'error', error: errorMsg });
      this.addLog(`Error: ${errorMsg}`);
      throw error;
    }
  }

  // Fragment Conversion (Step 2)
  private async convertToFragment(): Promise<void> {
    if (!this.state.ifcFile || !this.state.ifcFileBuffer) {
      throw new Error('No IFC file available for conversion');
    }

    this.updateState({
      currentStep: 2,
      status: 'converting',
      error: undefined
    });

    this.addLog('Starting IFC to fragment conversion...');

    try {
      // Create FormData with IFC file
      const formData = new FormData();
      const blob = new Blob([this.state.ifcFileBuffer], { type: 'application/octet-stream' });
      formData.append('ifcFile', blob, this.state.ifcFile.name);

      // Start conversion
      const response = await fetch(`${this.apiBaseUrl}/fragments`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Conversion failed');
      }

      const { jobId } = await response.json();
      this.state.conversionJobId = jobId;
      this.addLog(`Conversion job started: ${jobId}`);

      // Poll for completion
      await this.pollJobStatus(jobId, 'conversion');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Conversion failed';
      this.updateState({ status: 'error', error: errorMsg });
      this.addLog(`Error: ${errorMsg}`);
      throw error;
    }
  }

  // IDS Upload (Step 3)
  async uploadIDS(file: File): Promise<void> {
    if (!this.state.fragmentFileId) {
      throw new Error('Fragment conversion must complete before IDS upload');
    }

    this.updateState({
      idsFile: file,
      currentStep: 3,
      status: 'validating',
      error: undefined
    });

    this.addLog(`Uploading IDS file: ${file.name}`);

    try {
      // Create FormData with both IFC and IDS files
      const formData = new FormData();

      // Use the original IFC file buffer for validation (API expects IFC, not fragment)
      if (!this.state.ifcFileBuffer || !this.state.ifcFile) {
        throw new Error('Original IFC file not available for validation');
      }

      const ifcBlob = new Blob([this.state.ifcFileBuffer], { type: 'application/octet-stream' });
      formData.append('ifcFile', ifcBlob, this.state.ifcFile.name);
      formData.append('idsFile', file, file.name);

      // Start validation
      const response = await fetch(`${this.apiBaseUrl}/ids/check`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Validation failed');
      }

      const { jobId } = await response.json();
      this.state.validationJobId = jobId;
      this.addLog(`Validation job started: ${jobId}`);

      // Poll for completion
      await this.pollJobStatus(jobId, 'validation');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Validation failed';
      this.updateState({ status: 'error', error: errorMsg });
      this.addLog(`Error: ${errorMsg}`);
      throw error;
    }
  }

  // Job polling
  private async pollJobStatus(jobId: string, jobType: 'conversion' | 'validation'): Promise<void> {
    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`${this.apiBaseUrl}/jobs/${jobId}`);

          if (!response.ok) {
            throw new Error('Failed to get job status');
          }

          const job = await response.json();
          this.addLog(`Job ${jobId} status: ${job.status}`);

          if (job.status === 'completed') {
            clearInterval(pollInterval);

            if (jobType === 'conversion' && job.result?.fileId) {
              this.updateState({
                fragmentFileId: job.result.fileId,
                currentStep: 3,
                status: 'idle'
              });
              this.addLog(`Conversion complete. Fragment ID: ${job.result.fileId}`);

              // Add to history
              this.addToHistory();
            } else if (jobType === 'validation' && job.result?.fileId) {
              this.updateState({
                validationResultsId: job.result.fileId,
                currentStep: 4,
                status: 'complete'
              });
              this.addLog(`Validation complete. Results ID: ${job.result.fileId}`);

              // Update history
              this.updateHistory();
            }

            resolve();
          } else if (job.status === 'failed') {
            clearInterval(pollInterval);
            const errorMsg = job.error || `${jobType} failed`;
            this.updateState({ status: 'error', error: errorMsg });
            this.addLog(`Error: ${errorMsg}`);
            reject(new Error(errorMsg));
          }
        } catch (error) {
          clearInterval(pollInterval);
          const errorMsg = error instanceof Error ? error.message : 'Failed to poll job status';
          this.updateState({ status: 'error', error: errorMsg });
          this.addLog(`Error: ${errorMsg}`);
          reject(error);
        }
      }, 2000); // Poll every 2 seconds

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        const errorMsg = `${jobType} timed out after 5 minutes`;
        this.updateState({ status: 'error', error: errorMsg });
        this.addLog(`Error: ${errorMsg}`);
        reject(new Error(errorMsg));
      }, 300000);
    });
  }

  // Download methods
  async downloadFragment(): Promise<void> {
    if (!this.state.fragmentFileId) {
      throw new Error('No fragment file available');
    }

    this.addLog('Downloading fragment file...');

    try {
      const response = await fetch(`${this.apiBaseUrl}/fragments/${this.state.fragmentFileId}`);

      if (!response.ok) {
        throw new Error('Failed to download fragment file');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.state.ifcFile?.name.replace('.ifc', '')}.frag`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.addLog('Fragment file downloaded');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to download fragment';
      this.addLog(`Error: ${errorMsg}`);
      throw error;
    }
  }

  async downloadResults(): Promise<void> {
    if (!this.state.validationResultsId) {
      throw new Error('No validation results available');
    }

    this.addLog('Downloading validation results...');

    try {
      const response = await fetch(`${this.apiBaseUrl}/ids/results/${this.state.validationResultsId}`);

      if (!response.ok) {
        throw new Error('Failed to download results');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `validation-results-${this.state.validationResultsId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.addLog('Validation results downloaded');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to download results';
      this.addLog(`Error: ${errorMsg}`);
      throw error;
    }
  }

  // History management
  private addToHistory() {
    if (!this.state.ifcFile) return;

    const item: ConversionHistoryItem = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ifcFileName: this.state.ifcFile.name,
      fragmentFileId: this.state.fragmentFileId,
      status: this.state.status
    };

    this.history.unshift(item);

    // Keep only last 10 items
    if (this.history.length > 10) {
      this.history = this.history.slice(0, 10);
    }
  }

  private updateHistory() {
    if (this.history.length > 0 && this.state.idsFile) {
      const latest = this.history[0];
      latest.idsFileName = this.state.idsFile.name;
      latest.validationResultsId = this.state.validationResultsId;
      latest.status = this.state.status;
    }
  }

  getHistory(): ConversionHistoryItem[] {
    return [...this.history];
  }

  // Reset state
  reset() {
    this.state = {
      currentStep: 1,
      status: 'idle',
      logs: []
    };
    this.notifyListeners();
  }

  // Navigation helpers
  canViewModel(): boolean {
    return !!this.state.fragmentFileId;
  }

  canViewResults(): boolean {
    return !!this.state.fragmentFileId && !!this.state.validationResultsId;
  }

  getViewerUrl(): string {
    let url = '#/viewer';
    if (this.state.fragmentFileId) {
      url += `?model=${this.state.fragmentFileId}`;
      if (this.state.validationResultsId) {
        url += `&results=${this.state.validationResultsId}`;
      }
    }
    return url;
  }

  // Show notification helper
  showNotification(type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) {
    const notification = BUI.Component.create(() => {
      return BUI.html`
        <bim-notification type=${type} title=${title}>
          ${message || ''}
        </bim-notification>
      `;
    });
    document.body.appendChild(notification);
    setTimeout(() => document.body.removeChild(notification), type === 'error' ? 5000 : 3000);
  }
}

export const conversionStateManager = ConversionStateManager.getInstance();