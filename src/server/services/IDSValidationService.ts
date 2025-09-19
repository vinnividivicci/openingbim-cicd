import * as OBC from '@thatopen/components';
import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { jobQueue } from './JobQueue';
import '../polyfills';

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
}

export class IDSValidationService {
  private static instance: IDSValidationService;
  private components: OBC.Components | null = null;
  private idsSpecifications: OBC.IDSSpecifications | null = null;
  private fragmentsManager: OBC.FragmentsManager | null = null;
  private initialized = false;

  private constructor() {}

  public static getInstance(): IDSValidationService {
    if (!IDSValidationService.instance) {
      IDSValidationService.instance = new IDSValidationService();
    }
    return IDSValidationService.instance;
  }

  /**
   * Initialize the components and services
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('Initializing IDSValidationService...');

      // Create components instance
      this.components = new OBC.Components();

      // Setup a minimal world
      const worlds = this.components.get(OBC.Worlds);
      const world = worlds.create();

      // Setup scene
      world.scene = new OBC.SimpleScene(this.components);

      // Create a canvas element for renderer
      const canvas = document.createElement('canvas') as any;
      world.renderer = new OBC.SimpleRenderer(this.components, canvas);

      // Initialize components
      await this.components.init();

      // Get IDS specifications and fragments manager
      this.idsSpecifications = this.components.get(OBC.IDSSpecifications);
      this.fragmentsManager = this.components.get(OBC.FragmentsManager);

      // Initialize fragments manager with local worker
      const workerPath = path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../../node_modules/@thatopen/fragments/dist/fragments.js'
      );
      const workerContent = await fs.readFile(workerPath, 'utf-8');
      const workerBlob = new Blob([workerContent], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(workerBlob);

      await this.fragmentsManager.init(workerUrl);

      // Enable IDS specifications
      this.idsSpecifications.enabled = true;

      this.initialized = true;
      console.log('IDSValidationService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize IDSValidationService:', error);
      throw new Error(`Failed to initialize IDS validation service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Run IDS validation
   * @param fragmentsBuffer The fragments file buffer
   * @param idsBuffer The IDS file buffer
   * @returns Job ID for tracking the validation
   */
  public async runValidation(fragmentsBuffer: Buffer, idsBuffer: Buffer): Promise<string> {
    // Create a new job
    const jobId = jobQueue.createJob();

    // Process asynchronously
    this.processValidation(jobId, fragmentsBuffer, idsBuffer).catch(error => {
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
  private async processValidation(jobId: string, fragmentsBuffer: Buffer, idsBuffer: Buffer): Promise<void> {
    try {
      // Initialize if needed
      await this.initialize();

      if (!this.idsSpecifications || !this.fragmentsManager) {
        throw new Error('Services not properly initialized');
      }

      // Update progress
      jobQueue.updateJob(jobId, { progress: 10 });

      // Load the IDS specification
      const idsContent = idsBuffer.toString('utf-8');
      this.idsSpecifications.load(idsContent);

      console.log(`IDS specification loaded for job ${jobId}`);
      jobQueue.updateJob(jobId, { progress: 30 });

      // Load the fragments
      const uint8Array = new Uint8Array(fragmentsBuffer);
      const model = await this.fragmentsManager.core.load(uint8Array, {
        modelId: `model-${jobId}`
      });

      if (!model) {
        throw new Error('Failed to load fragments model');
      }

      console.log(`Fragments model loaded for job ${jobId}`);
      jobQueue.updateJob(jobId, { progress: 50 });

      // Run validation
      const validationResults: ValidationResult[] = [];

      // Get model ID for testing
      const modelId = `model-${jobId}`;
      const modelRegex = new RegExp(modelId, 'i');

      // Iterate through specifications and run tests
      for (const [specId, specification] of this.idsSpecifications.list) {
        console.log(`Running validation for specification ${specId}`);
        jobQueue.updateJob(jobId, { progress: 70 });

        try {
          // Run the test
          const testResult = await (specification as any).test([modelRegex]);

          // Process results
          const requirements: RequirementResult[] = [];
          let totalPassed = 0;
          let totalFailed = 0;

          if (testResult && testResult.requirements) {
            for (const [reqId, requirement] of Object.entries(testResult.requirements) as any) {
              const passed = requirement.pass?.size || 0;
              const failed = requirement.fail?.size || 0;

              if (passed > 0) totalPassed++;
              if (failed > 0) totalFailed++;

              requirements.push({
                id: reqId,
                name: requirement.name || reqId,
                status: failed > 0 ? 'failed' : 'passed',
                passedCount: passed,
                failedCount: failed,
                failedElements: failed > 0 ? Array.from(requirement.fail || []) : undefined,
              });
            }
          }

          validationResults.push({
            specificationId: specId,
            specificationName: (specification as any).name || specId,
            requirements,
            summary: {
              totalRequirements: requirements.length,
              passedRequirements: totalPassed,
              failedRequirements: totalFailed,
            },
          });
        } catch (error) {
          console.error(`Error validating specification ${specId}:`, error);
        }
      }

      jobQueue.updateJob(jobId, { progress: 90 });

      // Clean up the model from memory
      model.dispose();

      // Update job as completed
      jobQueue.updateJob(jobId, {
        status: 'completed',
        progress: 100,
        result: {
          validationResults,
          summary: {
            totalSpecifications: validationResults.length,
            totalRequirements: validationResults.reduce((sum, spec) => sum + spec.summary.totalRequirements, 0),
            totalPassed: validationResults.reduce((sum, spec) => sum + spec.summary.passedRequirements, 0),
            totalFailed: validationResults.reduce((sum, spec) => sum + spec.summary.failedRequirements, 0),
          },
        },
      });

      console.log(`Validation completed for job ${jobId}`);
    } catch (error) {
      console.error(`Error in validation for job ${jobId}:`, error);
      throw error;
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
    this.initialized = false;
  }
}

export const idsValidationService = IDSValidationService.getInstance();