import { IfcImporter } from '@thatopen/fragments';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { jobQueue } from './JobQueue';
import { fileStorageService } from './FileStorageService';
import '../polyfills';

/**
 * Service for converting IFC files to Fragments format using @thatopen/fragments IfcImporter.
 * This approach doesn't require Three.js or WebGL, making it suitable for Node.js environments.
 */
export class DirectFragmentsService {
  private static instance: DirectFragmentsService;
  private ifcImporter: IfcImporter | null = null;
  private initialized = false;

  private constructor() {}

  public static getInstance(): DirectFragmentsService {
    if (!DirectFragmentsService.instance) {
      DirectFragmentsService.instance = new DirectFragmentsService();
    }
    return DirectFragmentsService.instance;
  }

  /**
   * Initialize the IFC Importer
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('Initializing DirectFragmentsService...');

      // Create IFC Importer instance
      this.ifcImporter = new IfcImporter();

      // Set WASM path for web-ifc
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const wasmPath = path.join(__dirname, '../../../node_modules/web-ifc/');

      this.ifcImporter.wasm = {
        path: wasmPath,
        absolute: true,
      };

      this.initialized = true;
      console.log('DirectFragmentsService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize DirectFragmentsService:', error);
      throw new Error(`Failed to initialize fragments service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert IFC file to fragments format
   * @param ifcBuffer The IFC file buffer
   * @param fileName Optional file name
   * @returns Job ID for tracking the conversion
   */
  public async convertToFragments(ifcBuffer: Buffer, fileName?: string): Promise<string> {
    // Create a new job
    const jobId = jobQueue.createJob();

    // Process asynchronously
    this.processConversion(jobId, ifcBuffer, fileName).catch(error => {
      console.error(`Conversion failed for job ${jobId}:`, error);
      jobQueue.updateJob(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    });

    return jobId;
  }

  /**
   * Process the actual conversion
   */
  private async processConversion(jobId: string, ifcBuffer: Buffer, fileName?: string): Promise<void> {
    try {
      // Initialize if needed
      await this.initialize();

      if (!this.ifcImporter) {
        throw new Error('IFC Importer not properly initialized');
      }

      // Update progress
      jobQueue.updateJob(jobId, { progress: 10 });

      // Convert buffer to Uint8Array
      const uint8Array = new Uint8Array(ifcBuffer);

      console.log(`Starting IFC conversion for job ${jobId}, file size: ${uint8Array.length} bytes`);

      // Process the IFC file using IfcImporter
      jobQueue.updateJob(jobId, { progress: 20 });

      const fragmentBytes = await this.ifcImporter.process({
        bytes: uint8Array,
        raw: false, // Compress the output for smaller file size
        progressCallback: (progress, data) => {
          // Update job progress (scale from 20-90%)
          const scaledProgress = 20 + (progress * 0.7);
          jobQueue.updateJob(jobId, { progress: Math.round(scaledProgress) });

          if (data) {
            console.log(`Conversion progress for job ${jobId}: ${progress}% - ${data}`);
          }
        },
      });

      console.log(`IFC converted to fragments for job ${jobId}, output size: ${fragmentBytes.length} bytes`);
      jobQueue.updateJob(jobId, { progress: 90 });

      // Store the fragments using FileStorageService
      const fileId = await fileStorageService.storeFile(
        Buffer.from(fragmentBytes),
        `${fileName || 'converted'}.frag`,
        'fragments',
        'application/octet-stream'
      );

      console.log(`Fragments saved for job ${jobId} with file ID ${fileId}`);

      // Update job as completed
      jobQueue.updateJob(jobId, {
        status: 'completed',
        progress: 100,
        result: {
          fragmentsUrl: `/api/v1/fragments/${fileId}`,
          fileId: fileId,
          fileName: fileName || 'converted.frag',
          fileSize: fragmentBytes.byteLength,
        },
      });

      console.log(`Conversion completed for job ${jobId}`);
    } catch (error) {
      console.error(`Error in conversion for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get fragments file by ID
   */
  public async getFragmentsFile(fileId: string): Promise<Buffer | null> {
    try {
      const fileData = await fileStorageService.getFile(fileId);
      return fileData ? fileData.buffer : null;
    } catch (error) {
      console.error(`Error getting fragments file ${fileId}:`, error);
      return null;
    }
  }

  /**
   * Clean up and dispose resources
   */
  public async dispose(): Promise<void> {
    this.ifcImporter = null;
    this.initialized = false;
  }
}

export const directFragmentsService = DirectFragmentsService.getInstance();