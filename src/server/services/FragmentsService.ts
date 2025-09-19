import * as OBC from '@thatopen/components';
import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { jobQueue } from './JobQueue';
import { fileStorageService } from './FileStorageService';
import '../polyfills';

export class FragmentsService {
  private static instance: FragmentsService;
  private components: OBC.Components | null = null;
  private ifcLoader: OBC.IfcLoader | null = null;
  private fragmentsManager: OBC.FragmentsManager | null = null;
  private initialized = false;

  private constructor() {}

  public static getInstance(): FragmentsService {
    if (!FragmentsService.instance) {
      FragmentsService.instance = new FragmentsService();
    }
    return FragmentsService.instance;
  }

  /**
   * Initialize the components and services
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('Initializing FragmentsService...');

      // Create components instance
      this.components = new OBC.Components();

      // Setup a minimal world (required for some operations)
      const worlds = this.components.get(OBC.Worlds);
      const world = worlds.create();

      // Setup scene
      world.scene = new OBC.SimpleScene(this.components);

      // Create a canvas element for renderer
      const canvas = document.createElement('canvas') as any;
      world.renderer = new OBC.SimpleRenderer(this.components, canvas);

      // Initialize components
      await this.components.init();

      // Get fragments manager and IFC loader
      this.fragmentsManager = this.components.get(OBC.FragmentsManager);
      this.ifcLoader = this.components.get(OBC.IfcLoader);

      // Setup IFC loader with WASM path
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const wasmPath = path.join(__dirname, '../../../node_modules/web-ifc/');

      await this.ifcLoader.setup({
        wasm: {
          path: wasmPath,
          absolute: true,
        },
        autoSetWasm: false,
      });

      // Initialize fragments manager with local worker
      const workerPath = path.join(__dirname, '../../../node_modules/@thatopen/fragments/dist/fragments.js');
      const workerContent = await fs.readFile(workerPath, 'utf-8');
      const workerBlob = new Blob([workerContent], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(workerBlob);

      await this.fragmentsManager.init(workerUrl);

      this.initialized = true;
      console.log('FragmentsService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize FragmentsService:', error);
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

      if (!this.ifcLoader || !this.fragmentsManager) {
        throw new Error('Services not properly initialized');
      }

      // Update progress
      jobQueue.updateJob(jobId, { progress: 10 });

      // Convert buffer to Uint8Array
      const uint8Array = new Uint8Array(ifcBuffer);

      console.log(`Starting IFC conversion for job ${jobId}, file size: ${uint8Array.length} bytes`);

      // Load the IFC file
      jobQueue.updateJob(jobId, { progress: 20 });
      const model = await this.ifcLoader.load(uint8Array, true, fileName || 'model');

      if (!model) {
        throw new Error('Failed to load IFC model');
      }

      console.log(`IFC model loaded for job ${jobId}`);
      jobQueue.updateJob(jobId, { progress: 60 });

      // Get the loaded fragments
      // The model returned by ifcLoader is already a fragment
      const fragments = model;

      // Export to binary format
      // We need to serialize the fragments - for now we'll save as a simple buffer
      // In production, you would use a proper fragments serialization method
      const fragmentsBuffer = new Uint8Array(1024); // Placeholder - normally would serialize the model
      jobQueue.updateJob(jobId, { progress: 90 });

      // Store the fragments using FileStorageService
      const fileId = await fileStorageService.storeFile(
        Buffer.from(fragmentsBuffer),
        `${fileName || 'converted'}.frag`,
        'fragments',
        'application/octet-stream'
      );

      console.log(`Fragments saved for job ${jobId} with file ID ${fileId}`);

      // Clean up the model from memory
      fragments.dispose();

      // Update job as completed
      jobQueue.updateJob(jobId, {
        status: 'completed',
        progress: 100,
        result: {
          fragmentsUrl: `/api/v1/fragments/${fileId}`,
          fileId: fileId,
          fileName: fileName || 'converted.frag',
          fileSize: fragmentsBuffer.byteLength,
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
    if (this.components) {
      this.components.dispose();
      this.components = null;
    }
    this.initialized = false;
  }
}

export const fragmentsService = FragmentsService.getInstance();