// Cloudinary Configuration and Helper Functions
// This file contains all Cloudinary-related functionality for the CollegeConnect platform

// Helper function to safely get environment variables
function getEnvVar(key: string, fallback: string = ''): string {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] || fallback;
  }
  return fallback;
}

// Cloudinary Configuration
export const cloudinaryConfig = {
  cloudName: getEnvVar('VITE_CLOUDINARY_CLOUD_NAME'),
  uploadPreset: getEnvVar('VITE_CLOUDINARY_UPLOAD_PRESET'),
};

// Validate Cloudinary configuration
export function validateCloudinaryConfig(): { isValid: boolean; message?: string } {
  if (!cloudinaryConfig.cloudName) {
    return { 
      isValid: false, 
      message: 'Cloudinary Cloud Name is missing. Please add VITE_CLOUDINARY_CLOUD_NAME to your .env file.' 
    };
  }
  if (!cloudinaryConfig.uploadPreset) {
    return { 
      isValid: false, 
      message: 'Cloudinary Upload Preset is missing. Please add VITE_CLOUDINARY_UPLOAD_PRESET to your .env file.' 
    };
  }
  return { isValid: true };
}

// Upload options interface
export interface CloudinaryUploadOptions {
  folder?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  tags?: string[];
  context?: Record<string, string>;
  transformation?: any[];
  onProgress?: (progress: number) => void;
}

// Upload result interface
export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  resourceType: string;
  bytes: number;
  width?: number;
  height?: number;
  createdAt: string;
  version: number;
  signature: string;
}

/**
 * Upload a file to Cloudinary
 * @param file - The file to upload
 * @param options - Upload options
 * @returns Promise with upload result
 */
export async function uploadToCloudinary(
  file: File,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  // Validate configuration
  const validation = validateCloudinaryConfig();
  if (!validation.isValid) {
    throw new Error(validation.message);
  }

  const {
    folder = 'college-connect',
    resourceType = 'auto',
    tags = [],
    context = {},
    transformation = [],
    onProgress,
  } = options;

  // Create form data
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', cloudinaryConfig.uploadPreset);
  formData.append('cloud_name', cloudinaryConfig.cloudName);
  
  if (folder) {
    formData.append('folder', folder);
  }
  
  if (tags.length > 0) {
    formData.append('tags', tags.join(','));
  }

  if (Object.keys(context).length > 0) {
    formData.append('context', JSON.stringify(context));
  }

  if (transformation.length > 0) {
    formData.append('transformation', JSON.stringify(transformation));
  }

  // Create upload URL
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/${resourceType}/upload`;

  // Create XMLHttpRequest for progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = Math.round((e.loaded / e.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({
            url: response.url,
            secureUrl: response.secure_url,
            publicId: response.public_id,
            format: response.format,
            resourceType: response.resource_type,
            bytes: response.bytes,
            width: response.width,
            height: response.height,
            createdAt: response.created_at,
            version: response.version,
            signature: response.signature,
          });
        } catch (error) {
          reject(new Error('Failed to parse Cloudinary response'));
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    xhr.open('POST', uploadUrl);
    xhr.send(formData);
  });
}

/**
 * Delete a file from Cloudinary by public ID
 * Note: This requires backend implementation with Cloudinary Admin API
 * For now, this is a placeholder that should be implemented server-side
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  console.warn('Delete operation requires backend implementation with Cloudinary Admin API');
  console.log('Public ID to delete:', publicId);
  // TODO: Implement backend endpoint for deletion
  throw new Error('Delete operation not implemented. This requires backend functionality.');
}

/**
 * Generate a Cloudinary URL with transformations
 * @param publicId - The public ID of the resource
 * @param options - Transformation options
 * @returns Transformed URL
 */
export function generateCloudinaryUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: 'scale' | 'fit' | 'fill' | 'limit' | 'pad' | 'crop' | 'thumb';
    quality?: number | 'auto';
    format?: string;
    gravity?: string;
    effect?: string;
  } = {}
): string {
  if (!cloudinaryConfig.cloudName) {
    console.error('Cloudinary Cloud Name is not configured');
    return '';
  }

  const baseUrl = `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload`;
  const transformations: string[] = [];

  if (options.width) transformations.push(`w_${options.width}`);
  if (options.height) transformations.push(`h_${options.height}`);
  if (options.crop) transformations.push(`c_${options.crop}`);
  if (options.quality) transformations.push(`q_${options.quality}`);
  if (options.format) transformations.push(`f_${options.format}`);
  if (options.gravity) transformations.push(`g_${options.gravity}`);
  if (options.effect) transformations.push(`e_${options.effect}`);

  const transformationString = transformations.join(',');
  
  if (transformationString) {
    return `${baseUrl}/${transformationString}/${publicId}`;
  }
  
  return `${baseUrl}/${publicId}`;
}

/**
 * Get optimized thumbnail URL
 */
export function getThumbnailUrl(publicId: string, size: number = 150): string {
  return generateCloudinaryUrl(publicId, {
    width: size,
    height: size,
    crop: 'fill',
    quality: 'auto',
    gravity: 'auto',
  });
}

/**
 * Get responsive image URL
 */
export function getResponsiveUrl(publicId: string, width: number): string {
  return generateCloudinaryUrl(publicId, {
    width,
    crop: 'scale',
    quality: 'auto',
    format: 'auto',
  });
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  options: {
    maxSize?: number; // in MB
    acceptedTypes?: string[];
  } = {}
): { isValid: boolean; error?: string } {
  const { maxSize = 10, acceptedTypes = [] } = options;

  // Check file size
  const fileSizeInMB = file.size / (1024 * 1024);
  if (fileSizeInMB > maxSize) {
    return {
      isValid: false,
      error: `File size exceeds ${maxSize}MB limit`,
    };
  }

  // Check file type if acceptedTypes is specified
  if (acceptedTypes.length > 0 && !acceptedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type not accepted. Allowed types: ${acceptedTypes.join(', ')}`,
    };
  }

  return { isValid: true };
}

/**
 * Helper to organize files by type for the platform
 */
export const uploadFolders = {
  enrollmentDocuments: 'college-connect/enrollments',
  announcements: 'college-connect/announcements',
  userProfiles: 'college-connect/profiles',
  gradeSheets: 'college-connect/grades',
  receipts: 'college-connect/receipts',
  courseMaterials: 'college-connect/materials',
  studentDocuments: 'college-connect/student-docs',
} as const;

/**
 * Helper to get appropriate tags based on upload type
 */
export function getUploadTags(
  type: keyof typeof uploadFolders,
  additionalTags: string[] = []
): string[] {
  const baseTags = ['college-connect', type];
  return [...baseTags, ...additionalTags];
}
