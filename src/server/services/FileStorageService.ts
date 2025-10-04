import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

interface StoredFile {
  id: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  createdAt: Date;
  validationJobId?: string;
}

export class FileStorageService {
  private static instance: FileStorageService;
  private storageDir: string;
  private fileRegistry: Map<string, StoredFile> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Set storage directory
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    this.storageDir = path.join(__dirname, '../../../temp/storage');

    // Initialize storage
    this.initializeStorage();

    // Start cleanup timer (clean files older than 1 hour)
    this.startCleanupTimer();
  }

  public static getInstance(): FileStorageService {
    if (!FileStorageService.instance) {
      FileStorageService.instance = new FileStorageService();
    }
    return FileStorageService.instance;
  }

  /**
   * Initialize storage directory
   */
  private async initializeStorage(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      await fs.mkdir(path.join(this.storageDir, 'fragments'), { recursive: true });
      await fs.mkdir(path.join(this.storageDir, 'uploads'), { recursive: true });
      await fs.mkdir(path.join(this.storageDir, 'validation-results'), { recursive: true });
      await fs.mkdir(path.join(this.storageDir, 'ifc-cache'), { recursive: true });
      console.log('File storage initialized at:', this.storageDir);
    } catch (error) {
      console.error('Failed to initialize storage:', error);
    }
  }

  /**
   * Start cleanup timer to remove old files
   */
  private startCleanupTimer(): void {
    // Run cleanup every 30 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldFiles();
    }, 30 * 60 * 1000);
  }

  /**
   * Clean up files older than specified age
   */
  private async cleanupOldFiles(maxAgeHours: number = 1): Promise<void> {
    try {
      const now = new Date();
      const maxAge = maxAgeHours * 60 * 60 * 1000;

      for (const [id, file] of this.fileRegistry) {
        const age = now.getTime() - file.createdAt.getTime();
        if (age > maxAge) {
          await this.deleteFile(id);
        }
      }
    } catch (error) {
      console.error('Error during file cleanup:', error);
    }
  }

  /**
   * Store a file
   */
  public async storeFile(
    buffer: Buffer,
    originalName: string,
    type: 'fragments' | 'uploads' | 'validation-results' | 'ifc-cache',
    mimeType: string = 'application/octet-stream'
  ): Promise<string> {
    try {
      // Generate unique file ID
      const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const ext = path.extname(originalName);
      const fileName = `${fileId}${ext}`;
      const filePath = path.join(this.storageDir, type, fileName);

      // Write file
      await fs.writeFile(filePath, buffer);

      // Register file
      const storedFile: StoredFile = {
        id: fileId,
        originalName,
        path: filePath,
        size: buffer.length,
        mimeType,
        createdAt: new Date(),
      };

      this.fileRegistry.set(fileId, storedFile);

      console.log(`File stored: ${fileId} (${originalName})`);
      return fileId;
    } catch (error) {
      console.error('Error storing file:', error);
      throw new Error('Failed to store file');
    }
  }

  /**
   * Retrieve a file
   */
  public async getFile(fileId: string): Promise<{ buffer: Buffer; metadata: StoredFile } | null> {
    try {
      const file = this.fileRegistry.get(fileId);
      if (!file) {
        return null;
      }

      // Check if file still exists
      try {
        await fs.access(file.path);
      } catch {
        // File doesn't exist, remove from registry
        this.fileRegistry.delete(fileId);
        return null;
      }

      // Read file
      const buffer = await fs.readFile(file.path);
      return { buffer, metadata: file };
    } catch (error) {
      console.error(`Error retrieving file ${fileId}:`, error);
      return null;
    }
  }

  /**
   * Delete a file
   */
  public async deleteFile(fileId: string): Promise<boolean> {
    try {
      const file = this.fileRegistry.get(fileId);
      if (!file) {
        return false;
      }

      // Delete physical file
      try {
        await fs.unlink(file.path);
      } catch (error) {
        console.warn(`Failed to delete physical file ${fileId}:`, error);
      }

      // Remove from registry
      this.fileRegistry.delete(fileId);

      console.log(`File deleted: ${fileId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting file ${fileId}:`, error);
      return false;
    }
  }

  /**
   * Get file metadata
   */
  public getFileMetadata(fileId: string): StoredFile | null {
    return this.fileRegistry.get(fileId) || null;
  }

  /**
   * Store IFC file for caching (linked to validation job)
   */
  public async storeIfcForCache(
    buffer: Buffer,
    originalName: string,
    validationJobId?: string
  ): Promise<string> {
    try {
      const fileId = await this.storeFile(buffer, originalName, 'ifc-cache', 'application/x-step')

      // Link to validation job if provided
      if (validationJobId) {
        const storedFile = this.fileRegistry.get(fileId)
        if (storedFile) {
          storedFile.validationJobId = validationJobId
        }
      }

      return fileId
    } catch (error) {
      console.error('Error storing IFC for cache:', error)
      throw new Error('Failed to cache IFC file')
    }
  }

  /**
   * Get cached IFC file by validation job ID
   */
  public async getCachedIfc(validationJobId: string): Promise<{ buffer: Buffer; metadata: StoredFile } | null> {
    try {
      // Find cached IFC file with matching validation job ID
      for (const [fileId, file] of this.fileRegistry) {
        if (file.validationJobId === validationJobId && file.path.includes('ifc-cache')) {
          return await this.getFile(fileId)
        }
      }
      return null
    } catch (error) {
      console.error(`Error retrieving cached IFC for validation job ${validationJobId}:`, error)
      return null
    }
  }

  /**
   * Clean up and dispose
   */
  public dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export const fileStorageService = FileStorageService.getInstance();