import { useState, useCallback } from 'react';
import {
  uploadToCloudinary,
  validateFile,
  CloudinaryUploadOptions,
  CloudinaryUploadResult,
} from './cloudinary';

export interface UploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
  result: CloudinaryUploadResult | null;
}

export interface UseCloudinaryUploadOptions {
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  folder?: string;
  tags?: string[];
  onSuccess?: (result: CloudinaryUploadResult) => void;
  onError?: (error: Error) => void;
}

/**
 * Custom hook for uploading files to Cloudinary
 * Provides upload state management and error handling
 */
export function useCloudinaryUpload(options: UseCloudinaryUploadOptions = {}) {
  const [state, setState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
    result: null,
  });

  const {
    maxSize = 10,
    acceptedTypes = [],
    folder,
    tags = [],
    onSuccess,
    onError,
  } = options;

  const upload = useCallback(
    async (file: File, customOptions?: CloudinaryUploadOptions) => {
      // Reset state
      setState({
        uploading: true,
        progress: 0,
        error: null,
        result: null,
      });

      // Validate file
      const validation = validateFile(file, { maxSize, acceptedTypes });
      if (!validation.isValid) {
        const error = new Error(validation.error || 'File validation failed');
        setState({
          uploading: false,
          progress: 0,
          error: error.message,
          result: null,
        });
        onError?.(error);
        return null;
      }

      try {
        // Upload to Cloudinary
        const result = await uploadToCloudinary(file, {
          folder,
          tags,
          ...customOptions,
          onProgress: (progress) => {
            setState((prev) => ({ ...prev, progress }));
          },
        });

        // Update state with success
        setState({
          uploading: false,
          progress: 100,
          error: null,
          result,
        });

        onSuccess?.(result);
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Upload failed');
        setState({
          uploading: false,
          progress: 0,
          error: err.message,
          result: null,
        });
        onError?.(err);
        return null;
      }
    },
    [maxSize, acceptedTypes, folder, tags, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setState({
      uploading: false,
      progress: 0,
      error: null,
      result: null,
    });
  }, []);

  return {
    upload,
    reset,
    ...state,
  };
}

/**
 * Hook for uploading multiple files
 */
export function useCloudinaryMultiUpload(options: UseCloudinaryUploadOptions = {}) {
  const [uploadStates, setUploadStates] = useState<Map<string, UploadState>>(new Map());
  const [isUploading, setIsUploading] = useState(false);

  const {
    maxSize = 10,
    acceptedTypes = [],
    folder,
    tags = [],
    onSuccess,
    onError,
  } = options;

  const uploadMultiple = useCallback(
    async (files: File[]) => {
      setIsUploading(true);
      const results: (CloudinaryUploadResult | null)[] = [];
      
      // Initialize states for all files
      const initialStates = new Map<string, UploadState>();
      files.forEach((file) => {
        const fileId = `${file.name}_${Date.now()}`;
        initialStates.set(fileId, {
          uploading: true,
          progress: 0,
          error: null,
          result: null,
        });
      });
      setUploadStates(initialStates);

      // Upload files sequentially (can be modified to upload in parallel)
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileId = `${file.name}_${Date.now()}`;

        // Validate file
        const validation = validateFile(file, { maxSize, acceptedTypes });
        if (!validation.isValid) {
          const error = new Error(validation.error || 'File validation failed');
          setUploadStates((prev) => {
            const next = new Map(prev);
            next.set(fileId, {
              uploading: false,
              progress: 0,
              error: error.message,
              result: null,
            });
            return next;
          });
          onError?.(error);
          results.push(null);
          continue;
        }

        try {
          // Upload to Cloudinary
          const result = await uploadToCloudinary(file, {
            folder,
            tags,
            onProgress: (progress) => {
              setUploadStates((prev) => {
                const next = new Map(prev);
                const current = next.get(fileId);
                if (current) {
                  next.set(fileId, { ...current, progress });
                }
                return next;
              });
            },
          });

          // Update state with success
          setUploadStates((prev) => {
            const next = new Map(prev);
            next.set(fileId, {
              uploading: false,
              progress: 100,
              error: null,
              result,
            });
            return next;
          });

          onSuccess?.(result);
          results.push(result);
        } catch (error) {
          const err = error instanceof Error ? error : new Error('Upload failed');
          setUploadStates((prev) => {
            const next = new Map(prev);
            next.set(fileId, {
              uploading: false,
              progress: 0,
              error: err.message,
              result: null,
            });
            return next;
          });
          onError?.(err);
          results.push(null);
        }
      }

      setIsUploading(false);
      return results;
    },
    [maxSize, acceptedTypes, folder, tags, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setUploadStates(new Map());
    setIsUploading(false);
  }, []);

  return {
    uploadMultiple,
    reset,
    uploadStates,
    isUploading,
  };
}
