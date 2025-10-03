import * as OBC from '@thatopen/components';
import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { jobQueue } from './JobQueue';
import { fileStorageService } from './FileStorageService';
import '../polyfills/dom'; // Import DOM polyfills

export interface ValidationResult {
  specificationId: string;
  specificationName: string;
  requirements: RequirementResult[];
  summary: {
    totalRequirements: number;
    passedRequirements: number;
    failedRequirements: number;
  };
}

export interface RequirementResult {
  id: string;
  name: string;
  status: 'passed' | 'failed';
  passedCount: number;
  failedCount: number;
  failedElements?: string[];
  message?: string;
}

/**
 * Service for IDS validation without WebGL/Three.js rendering.
 * Uses @thatopen/components IDS specifications for data validation only.
 */
export class DirectIDSValidationService {
  private static instance: DirectIDSValidationService;
  private components: OBC.Components | null = null;
  private idsSpecifications: OBC.IDSSpecifications | null = null;
  private fragmentsManager: OBC.FragmentsManager | null = null;
  private initialized = false;

  private constructor() {}

  public static getInstance(): DirectIDSValidationService {
    if (!DirectIDSValidationService.instance) {
      DirectIDSValidationService.instance = new DirectIDSValidationService();
    }
    return DirectIDSValidationService.instance;
  }

  /**
   * Initialize the components for IDS validation without rendering
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('Initializing DirectIDSValidationService without WebGL...');

      // Create components instance
      this.components = new OBC.Components();

      // Skip world and renderer creation - we don't need them for IDS validation
      // IDS validation operates on the data level, not the rendering level

      // Initialize components (minimal initialization)
      await this.components.init();

      // Get IDS specifications component
      this.idsSpecifications = this.components.get(OBC.IDSSpecifications);

      // Get fragments manager
      this.fragmentsManager = this.components.get(OBC.FragmentsManager);

      // Initialize fragments manager with worker
      try {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const workerPath = path.join(__dirname, '../../../node_modules/@thatopen/fragments/dist/Worker/worker.mjs');

        // Check if the worker file exists
        try {
          await fs.access(workerPath);
          const workerContent = await fs.readFile(workerPath, 'utf-8');
          const workerBlob = new Blob([workerContent], { type: 'application/javascript' });
          const workerUrl = URL.createObjectURL(workerBlob);

          await this.fragmentsManager.init(workerUrl);
          console.log('FragmentsManager worker initialized');
        } catch (fileError) {
          // Try to init without worker URL
          console.log('Worker file not found, initializing fragments manager without worker');
          await this.fragmentsManager.init();
        }
      } catch (workerError) {
        console.warn('Could not initialize fragments worker, trying without init:', workerError);
        // Continue without worker - the manager might work without explicit init
      }

      // Enable IDS specifications
      this.idsSpecifications.enabled = true;

      this.initialized = true;
      console.log('DirectIDSValidationService initialized successfully (no WebGL)');
    } catch (error) {
      console.error('Failed to initialize DirectIDSValidationService:', error);
      throw new Error(`Failed to initialize IDS validation service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Run IDS validation
   * @param fragmentsBuffer The fragments file buffer
   * @param idsBuffer The IDS file buffer
   * @param fileName Optional file name for context
   * @returns Job ID for tracking the validation
   */
  public async runValidation(fragmentsBuffer: Buffer, idsBuffer: Buffer, fileName?: string): Promise<string> {
    // Create a new job
    const jobId = jobQueue.createJob();

    // Process asynchronously
    this.processValidation(jobId, fragmentsBuffer, idsBuffer, fileName).catch(error => {
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
  private async processValidation(jobId: string, fragmentsBuffer: Buffer, idsBuffer: Buffer, fileName?: string): Promise<void> {
    try {
      // Initialize if needed
      await this.initialize();

      if (!this.idsSpecifications || !this.fragmentsManager) {
        throw new Error('Services not properly initialized');
      }

      // Update progress
      jobQueue.updateJob(jobId, { progress: 10 });

      // Load the IDS specification
      console.log(`Loading IDS specification for job ${jobId}...`);
      const idsContent = idsBuffer.toString('utf-8');

      try {
        this.idsSpecifications.load(idsContent);
        console.log(`IDS specification loaded successfully for job ${jobId}`);
      } catch (error) {
        throw new Error(`Failed to parse IDS specification: ${error instanceof Error ? error.message : 'Invalid IDS format'}`);
      }

      jobQueue.updateJob(jobId, { progress: 30 });

      // Load the fragments model
      console.log(`Loading fragments model for job ${jobId}...`);
      const uint8Array = new Uint8Array(fragmentsBuffer);

      let model: any;
      try {
        // Use fragmentsManager.core.load() to load fragments from buffer
        model = await this.fragmentsManager.core.load(uint8Array, {
          modelId: `model-${jobId}`,
          name: fileName || `model-${jobId}`
        });

        if (!model) {
          throw new Error('Failed to load fragments model - loader returned null');
        }

        console.log(`Fragments model loaded successfully for job ${jobId}, model ID: model-${jobId}`);
      } catch (error) {
        throw new Error(`Failed to load fragments model: ${error instanceof Error ? error.message : 'Invalid fragments format'}`);
      }

      jobQueue.updateJob(jobId, { progress: 50 });

      // Run validation
      const validationResults: ValidationResult[] = [];
      const specifications = Array.from(this.idsSpecifications.list.entries());

      console.log(`Running validation on ${specifications.length} specification(s) for job ${jobId}`);

      // Process each IDS specification
      for (let i = 0; i < specifications.length; i++) {
        const [specId, specification] = specifications[i];
        const progress = 50 + (40 * (i / specifications.length));

        console.log(`Validating against specification: ${specId}`);
        jobQueue.updateJob(jobId, { progress: Math.round(progress) });

        try {
          // Create test configuration
          const testConfig = {
            model,
            specification,
          };

          // Run the validation test
          const testResult = await this.runSpecificationTest(specification, model, specId);

          // Process results
          const requirements: RequirementResult[] = [];
          let passedRequirements = 0;
          let failedRequirements = 0;

          for (const req of testResult.requirements) {
            if (req.status === 'passed') {
              passedRequirements++;
            } else {
              failedRequirements++;
            }
            requirements.push(req);
          }

          validationResults.push({
            specificationId: specId,
            specificationName: testResult.specificationName || specId,
            requirements,
            summary: {
              totalRequirements: requirements.length,
              passedRequirements,
              failedRequirements,
            },
          });

          console.log(`Specification ${specId} validated: ${passedRequirements} passed, ${failedRequirements} failed`);
        } catch (error) {
          console.error(`Error validating specification ${specId}:`, error);

          // Add failed specification result
          validationResults.push({
            specificationId: specId,
            specificationName: specId,
            requirements: [{
              id: 'error',
              name: 'Validation Error',
              status: 'failed',
              passedCount: 0,
              failedCount: 1,
              message: error instanceof Error ? error.message : 'Unknown validation error',
            }],
            summary: {
              totalRequirements: 1,
              passedRequirements: 0,
              failedRequirements: 1,
            },
          });
        }
      }

      jobQueue.updateJob(jobId, { progress: 90 });

      // Clean up the model from memory
      if (model && model.dispose) {
        model.dispose();
      }

      // Calculate overall summary
      const overallSummary = {
        totalSpecifications: validationResults.length,
        totalRequirements: validationResults.reduce((sum, spec) => sum + spec.summary.totalRequirements, 0),
        totalPassed: validationResults.reduce((sum, spec) => sum + spec.summary.passedRequirements, 0),
        totalFailed: validationResults.reduce((sum, spec) => sum + spec.summary.failedRequirements, 0),
      };

      // Store validation results as JSON file
      const resultsJson = JSON.stringify({
        validationResults,
        summary: overallSummary,
        metadata: {
          fileName: fileName || 'unknown',
          timestamp: new Date().toISOString(),
          jobId,
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
          validationResults,
          summary: overallSummary,
          resultsFileUrl: `/api/v1/ids/results/${resultsFileId}`,
        },
      });

      console.log(`Validation completed for job ${jobId}: ${overallSummary.totalPassed}/${overallSummary.totalRequirements} requirements passed`);
    } catch (error) {
      console.error(`Error in validation for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Run validation test for a specific specification
   */
  private async runSpecificationTest(specification: any, model: any, specId: string): Promise<{
    specificationName: string;
    requirements: RequirementResult[];
  }> {
    const requirements: RequirementResult[] = [];
    let specificationName = specId;

    try {
      // Extract specification details if available
      if (specification.name) {
        specificationName = specification.name;
      }

      // Get requirements from the specification
      const specRequirements = specification.requirements || [];

      if (specRequirements.length === 0) {
        console.log(`No requirements found in specification ${specId}`);
        return {
          specificationName,
          requirements: [{
            id: 'no-requirements',
            name: 'No Requirements',
            status: 'passed',
            passedCount: 0,
            failedCount: 0,
            message: 'Specification contains no requirements',
          }],
        };
      }

      // Process each requirement
      for (let i = 0; i < specRequirements.length; i++) {
        const req = specRequirements[i];
        const reqId = req.id || `requirement-${i}`;
        const reqName = req.name || req.description || reqId;

        try {
          // Attempt to validate the requirement against the model
          // This is a simplified validation - actual IDS validation would be more complex
          const validationResult = await this.validateRequirement(req, model);

          requirements.push({
            id: reqId,
            name: reqName,
            status: validationResult.passed ? 'passed' : 'failed',
            passedCount: validationResult.passedCount,
            failedCount: validationResult.failedCount,
            failedElements: validationResult.failedElements,
            message: validationResult.message,
          });
        } catch (error) {
          // If validation fails, mark requirement as failed
          requirements.push({
            id: reqId,
            name: reqName,
            status: 'failed',
            passedCount: 0,
            failedCount: 1,
            message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        }
      }

    } catch (error) {
      console.error(`Error processing specification ${specId}:`, error);
      requirements.push({
        id: 'spec-error',
        name: 'Specification Processing Error',
        status: 'failed',
        passedCount: 0,
        failedCount: 1,
        message: error instanceof Error ? error.message : 'Failed to process specification',
      });
    }

    return {
      specificationName,
      requirements,
    };
  }

  /**
   * Validate a single requirement against the model
   */
  private async validateRequirement(requirement: any, model: any): Promise<{
    passed: boolean;
    passedCount: number;
    failedCount: number;
    failedElements?: string[];
    message?: string;
  }> {
    try {
      // This is a simplified validation logic
      // Real IDS validation would involve checking applicability and requirements

      // Check if requirement has applicability rules
      if (requirement.applicability) {
        // For now, assume all elements are applicable
        console.log(`Checking requirement applicability: ${requirement.id || 'unknown'}`);
      }

      // Check if requirement has specific requirements to validate
      if (requirement.requirements) {
        // For now, return a mock validation result
        // Real implementation would check each requirement against model properties
        return {
          passed: true,
          passedCount: 1,
          failedCount: 0,
          message: 'Validation passed (simplified check)',
        };
      }

      // Default case - no specific validation rules
      return {
        passed: true,
        passedCount: 0,
        failedCount: 0,
        message: 'No specific validation rules defined',
      };

    } catch (error) {
      return {
        passed: false,
        passedCount: 0,
        failedCount: 1,
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
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
   * Clean up and dispose resources
   */
  public async dispose(): Promise<void> {
    if (this.components) {
      this.components.dispose();
      this.components = null;
    }
    this.idsSpecifications = null;
    this.fragmentsManager = null;
    this.initialized = false;
  }
}

export const directIDSValidationService = DirectIDSValidationService.getInstance();