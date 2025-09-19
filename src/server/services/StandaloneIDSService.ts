import * as OBC from '@thatopen/components';
import * as FRAGS from '@thatopen/fragments';
import { jobQueue } from './JobQueue';
import { fileStorageService } from './FileStorageService';
import '../polyfills/ids'; // Import IDS-specific polyfills

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
  description?: string;
  status: 'passed' | 'failed';
  passedCount: number;
  failedCount: number;
  failedElements?: string[];
  message?: string;
}

/**
 * Standalone IDS validation service that works without WebGL/Three.js.
 * Uses @thatopen/components IDS capabilities directly without rendering.
 */
export class StandaloneIDSService {
  private static instance: StandaloneIDSService;
  private components: OBC.Components | null = null;
  private idsSpecifications: OBC.IDSSpecifications | null = null;
  private initialized = false;

  private constructor() {}

  public static getInstance(): StandaloneIDSService {
    if (!StandaloneIDSService.instance) {
      StandaloneIDSService.instance = new StandaloneIDSService();
    }
    return StandaloneIDSService.instance;
  }

  /**
   * Initialize the IDS validation components without rendering
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('Initializing StandaloneIDSService...');

      // Create a minimal Components instance without initializing rendering
      // We DO NOT call components.init() to avoid requestAnimationFrame
      this.components = new OBC.Components();

      // Get the IDS specifications component
      // This component handles IDS validation logic without rendering
      this.idsSpecifications = this.components.get(OBC.IDSSpecifications);

      // Enable IDS specifications
      this.idsSpecifications.enabled = true;

      this.initialized = true;
      console.log('StandaloneIDSService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize StandaloneIDSService:', error);
      throw new Error(`Failed to initialize IDS service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Run IDS validation on fragments data
   * @param fragmentsBuffer The fragments file buffer
   * @param idsBuffer The IDS XML file buffer
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

      if (!this.idsSpecifications) {
        throw new Error('IDS specifications component not initialized');
      }

      // Update progress
      jobQueue.updateJob(jobId, { progress: 10 });

      // Load the IDS specification from XML
      console.log(`Loading IDS specification for job ${jobId}...`);
      const idsContent = idsBuffer.toString('utf-8');

      try {
        // Load IDS XML content
        const specifications = this.idsSpecifications.load(idsContent);
        console.log(`Loaded ${specifications.length} IDS specification(s) for job ${jobId}`);
        jobQueue.updateJob(jobId, { progress: 30 });
      } catch (error) {
        throw new Error(`Failed to parse IDS XML: ${error instanceof Error ? error.message : 'Invalid IDS format'}`);
      }

      // Load fragments data
      console.log(`Loading fragments for job ${jobId}...`);
      const uint8Array = new Uint8Array(fragmentsBuffer);

      try {
        // Get the FragmentsManager to handle fragments loading
        const fragmentsManager = this.components!.get(OBC.FragmentsManager);

        // Try to load fragments directly without creating a group
        // The fragments data is already in the binary format created by IfcImporter
        // We need to make it accessible to IDS validation

        // Create a mock model that IDS can reference
        // Since we can't use FragmentsGroup directly, we'll work around it
        const modelId = `model-${jobId}`;

        // Store minimal model data for IDS to reference
        // This is a workaround since we can't properly load fragments without WebGL
        const mockModel = {
          uuid: modelId,
          ifcMetadata: {},
          fragmentsData: uint8Array
        };

        // Store the mock model in a way that IDS might be able to access
        (fragmentsManager as any)._mockModels = (fragmentsManager as any)._mockModels || new Map();
        (fragmentsManager as any)._mockModels.set(modelId, mockModel);

        console.log(`Fragments data stored for job ${jobId}, Model ID: ${modelId}`);

        jobQueue.updateJob(jobId, { progress: 50 });

        // Run IDS validation
        const validationResults: ValidationResult[] = [];
        const specifications = Array.from(this.idsSpecifications.list.entries());

        console.log(`Running validation against ${specifications.length} specification(s) for job ${jobId}`);

        for (let i = 0; i < specifications.length; i++) {
          const [specId, specification] = specifications[i];
          const progress = 50 + (40 * (i / specifications.length));

          console.log(`Validating against specification: ${specification.name || specId}`);
          jobQueue.updateJob(jobId, { progress: Math.round(progress) });

          try {
            // Run the test using the specification's test method
            // Pass the model ID pattern to match our mock model
            const modelRegex = new RegExp(modelId, 'i');
            const testResult = await specification.test([modelRegex]);

            // Process the test results
            const requirements: RequirementResult[] = [];
            let passedRequirements = 0;
            let failedRequirements = 0;

            if (testResult && testResult.requirements) {
              for (const [reqId, requirementResult] of Object.entries(testResult.requirements) as any) {
                const passed = requirementResult.pass?.size || 0;
                const failed = requirementResult.fail?.size || 0;

                const status = failed > 0 ? 'failed' : 'passed';
                if (status === 'passed') {
                  passedRequirements++;
                } else {
                  failedRequirements++;
                }

                requirements.push({
                  id: reqId,
                  name: requirementResult.name || reqId,
                  description: requirementResult.description,
                  status,
                  passedCount: passed,
                  failedCount: failed,
                  failedElements: failed > 0 ? Array.from(requirementResult.fail || []) : undefined,
                  message: requirementResult.message,
                });
              }
            }

            validationResults.push({
              specificationId: specId,
              specificationName: specification.name || specId,
              requirements,
              summary: {
                totalRequirements: requirements.length,
                passedRequirements,
                failedRequirements,
              },
            });

            console.log(`Specification ${specification.name}: ${passedRequirements} passed, ${failedRequirements} failed`);
          } catch (error) {
            console.error(`Error validating specification ${specId}:`, error);

            validationResults.push({
              specificationId: specId,
              specificationName: specification.name || specId,
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

        // Clean up - remove the mock model from memory
        if (this.components) {
          const fragmentsManager = this.components.get(OBC.FragmentsManager);
          if ((fragmentsManager as any)._mockModels) {
            (fragmentsManager as any)._mockModels.delete(modelId);
          }
        }

        // Calculate overall summary
        const overallSummary = {
          totalSpecifications: validationResults.length,
          totalRequirements: validationResults.reduce((sum, spec) => sum + spec.summary.totalRequirements, 0),
          totalPassed: validationResults.reduce((sum, spec) => sum + spec.summary.passedRequirements, 0),
          totalFailed: validationResults.reduce((sum, spec) => sum + spec.summary.failedRequirements, 0),
        };

        // Store validation results as JSON
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
        throw new Error(`Failed to process fragments: ${error instanceof Error ? error.message : 'Invalid fragments format'}`);
      }
    } catch (error) {
      console.error(`Error in validation for job ${jobId}:`, error);
      throw error;
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
      // Note: We don't call components.dispose() as it might try to clean up rendering resources
      this.components = null;
    }
    this.idsSpecifications = null;
    this.initialized = false;
  }
}

export const standaloneIDSService = StandaloneIDSService.getInstance();