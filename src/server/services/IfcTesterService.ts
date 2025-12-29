import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { jobQueue } from './JobQueue';
import { fileStorageService } from './FileStorageService';

export interface IfcTesterValidationResult {
  specifications?: Array<{
    name: string;
    applicability: string;
    requirements: Array<{
      description: string;
      passed: number;
      failed: number;
      failed_entities?: string[];
    }>;
  }>;
  summary?: {
    total_specifications: number;
    total_requirements: number;
    passed: number;
    failed: number;
  };
  error?: string;
  message?: string;
}

/**
 * Service for IDS validation using IfcOpenShell's IfcTester.
 * This approach uses Python for validation, avoiding WebGL/browser dependencies.
 */
export class IfcTesterService {
  private static instance: IfcTesterService;
  private pythonPath: string;
  private scriptPath: string;
  private tempDir: string;
  private isAvailable: boolean = false;

  private constructor() {
    // Setup paths
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    this.scriptPath = path.join(__dirname, '../python/ids_validator.py');
    this.tempDir = path.join(__dirname, '../../../temp/validation');
    // Use platform-specific Python path
    const defaultPythonPath = process.platform === 'win32'
      ? '.venv/Scripts/python'
      : '.venv/bin/python';
    this.pythonPath = process.env.PYTHON_PATH || defaultPythonPath;
  }

  public static getInstance(): IfcTesterService {
    if (!IfcTesterService.instance) {
      IfcTesterService.instance = new IfcTesterService();
    }
    return IfcTesterService.instance;
  }

  /**
   * Initialize the service and check if Python and IfcTester are available
   */
  public async initialize(): Promise<void> {
    try {
      // Ensure temp directory exists
      await fs.mkdir(this.tempDir, { recursive: true });

      // Check if Python is available
      await this.checkPythonAvailability();

      this.isAvailable = true;
      console.log('IfcTesterService initialized successfully');
    } catch (error) {
      console.error('IfcTesterService initialization failed:', error);
      this.isAvailable = false;
      throw error;
    }
  }

  /**
   * Check if Python and required packages are available
   */
  private async checkPythonAvailability(): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkProcess = spawn(this.pythonPath, ['-c', 'import ifctester, ifcopenshell; print("OK")']);

      let output = '';
      let errorOutput = '';

      checkProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      checkProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      checkProcess.on('close', (code) => {
        if (code === 0 && output.includes('OK')) {
          console.log('Python with IfcTester is available');
          resolve();
        } else {
          const error = new Error(
            `Python or required packages not available. Error: ${errorOutput}\n` +
            `Please ensure Python is installed and run: pip install ifctester ifcopenshell`
          );
          reject(error);
        }
      });

      checkProcess.on('error', (err) => {
        reject(new Error(`Failed to start Python: ${err.message}`));
      });
    });
  }

  /**
   * Run IDS validation on IFC data
   * @param ifcBuffer The IFC file buffer
   * @param idsBuffer The IDS XML file buffer
   * @param fileName Optional file name for context
   * @returns Job ID for tracking the validation
   */
  public async runValidation(ifcBuffer: Buffer, idsBuffer: Buffer, fileName?: string): Promise<string> {
    if (!this.isAvailable) {
      throw new Error('IfcTesterService is not available. Python or required packages may not be installed.');
    }

    // Create a new job
    const jobId = jobQueue.createJob();

    // Process asynchronously
    this.processValidation(jobId, ifcBuffer, idsBuffer, fileName).catch(error => {
      console.error(`Validation failed for job ${jobId}:`, error);
      jobQueue.updateJob(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    });

    return jobId;
  }

  /**
   * Process the actual validation
   */
  private async processValidation(jobId: string, ifcBuffer: Buffer, idsBuffer: Buffer, fileName?: string): Promise<void> {
    let tempIfcPath: string | undefined;
    let tempIdsPath: string | undefined;

    try {
      // Update progress
      jobQueue.updateJob(jobId, { progress: 10 });

      // Create temporary files
      const tempId = uuidv4();
      tempIfcPath = path.join(this.tempDir, `${tempId}.ifc`);
      tempIdsPath = path.join(this.tempDir, `${tempId}.ids`);

      console.log(`Saving temporary files for job ${jobId}`);
      await fs.writeFile(tempIfcPath, ifcBuffer);
      await fs.writeFile(tempIdsPath, idsBuffer);

      jobQueue.updateJob(jobId, { progress: 20 });

      // Run Python validation script
      console.log(`Running IfcTester validation for job ${jobId}`);
      const result = await this.executePythonValidation(tempIfcPath, tempIdsPath, jobId);

      jobQueue.updateJob(jobId, { progress: 80 });

      // Process and store results
      const validationResults = this.processValidationResults(result);

      // Store validation results as JSON file
      const resultsJson = JSON.stringify({
        validationResults,
        metadata: {
          fileName: fileName || 'unknown',
          timestamp: new Date().toISOString(),
          jobId,
          validator: 'IfcTester',
        },
      }, null, 2);

      const resultsFileId = await fileStorageService.storeFile(
        Buffer.from(resultsJson),
        `validation-${jobId}.json`,
        'validation-results',
        'application/json'
      );

      // Update job as completed
      jobQueue.updateJob(jobId, {
        status: 'completed',
        progress: 100,
        result: {
          fileId: resultsFileId,
          validationResults,
          resultsFileUrl: `/api/v1/ids/results/${resultsFileId}`,
        },
      });

      console.log(`IfcTester validation completed for job ${jobId}`);
    } catch (error) {
      console.error(`Error in validation for job ${jobId}:`, error);
      throw error;
    } finally {
      // Clean up temporary files
      if (tempIfcPath) {
        try {
          await fs.unlink(tempIfcPath);
        } catch (err) {
          console.warn(`Failed to delete temp IFC file: ${err}`);
        }
      }
      if (tempIdsPath) {
        try {
          await fs.unlink(tempIdsPath);
        } catch (err) {
          console.warn(`Failed to delete temp IDS file: ${err}`);
        }
      }
    }
  }

  /**
   * Execute Python validation script
   */
  private async executePythonValidation(ifcPath: string, idsPath: string, jobId: string): Promise<IfcTesterValidationResult> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(this.pythonPath, [
        '-u',  // Unbuffered output to prevent buffering issues in Docker
        this.scriptPath,
        ifcPath,
        idsPath,
        'json'
      ]);

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        console.log(`[Python stdout jobId=${jobId}]:`, chunk);
      });

      pythonProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        console.error(`[Python stderr jobId=${jobId}]:`, chunk);
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(result);
          } catch (parseError) {
            reject(new Error(`Failed to parse validation output: ${output}`));
          }
        } else {
          // Try to parse error from stderr first
          try {
            const errorResult = JSON.parse(errorOutput);
            reject(new Error(errorResult.message || 'Validation failed'));
          } catch {
            reject(new Error(
              `Validation failed with code ${code}:\n` +
              `stderr="${errorOutput.substring(0, 500)}"\n` +
              `stdout="${output.substring(0, 500)}"`
            ));
          }
        }
      });

      pythonProcess.on('error', (err) => {
        reject(new Error(`Failed to start Python process: ${err.message}`));
      });

      // Update progress periodically
      const progressInterval = setInterval(() => {
        const currentJob = jobQueue.getJob(jobId);
        if (currentJob && currentJob.progress < 70) {
          jobQueue.updateJob(jobId, { progress: currentJob.progress + 5 });
        }
      }, 2000);

      pythonProcess.on('exit', () => {
        clearInterval(progressInterval);
      });
    });
  }

  /**
   * Process validation results from IfcTester
   */
  private processValidationResults(result: IfcTesterValidationResult): any {
    // If there's an error in the result, handle it
    if (result.error) {
      return {
        error: result.error,
        message: result.message,
        specifications: [],
        summary: {
          total_specifications: 0,
          total_requirements: 0,
          passed: 0,
          failed: 0,
        },
      };
    }

    // Transform IfcTester results to our format if needed
    // IfcTester's JSON reporter should already provide a good format
    return {
      specifications: result.specifications || [],
      summary: result.summary || {
        total_specifications: 0,
        total_requirements: 0,
        passed: 0,
        failed: 0,
      },
    };
  }

  /**
   * Get validation results file by ID
   */
  public async getValidationResults(fileId: string): Promise<Buffer | null> {
    try {
      const fileData = await fileStorageService.getFile(fileId);
      return fileData ? fileData.buffer : null;
    } catch (error) {
      console.error(`Error getting validation results ${fileId}:`, error);
      return null;
    }
  }

  /**
   * Check if the service is available
   */
  public isServiceAvailable(): boolean {
    return this.isAvailable;
  }
}

export const ifcTesterService = IfcTesterService.getInstance();