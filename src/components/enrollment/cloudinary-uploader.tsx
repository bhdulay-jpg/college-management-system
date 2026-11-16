"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Progress } from "../ui/progress";
import { Alert, AlertDescription } from "../ui/alert";
import { Upload, File, X, CheckCircle2, AlertCircle, FileText, Image as ImageIcon } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { uploadToCloudinary, validateFile, uploadFolders, getUploadTags } from "../../lib/cloudinary";

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  cloudinaryId: string;
  uploadProgress: number;
  status: "uploading" | "success" | "error";
  error?: string;
}

interface CloudinaryUploaderProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
}

export function CloudinaryUploader({
  files,
  onFilesChange,
  maxFiles = 10,
  maxSize = 10,
  acceptedTypes = ["application/pdf", "image/jpeg", "image/png"],
}: CloudinaryUploaderProps) {
  const [uploading, setUploading] = useState(false);

  // Ensure files is always an array
  const safeFiles = Array.isArray(files) ? files : [];

  // Use ref to track current files for async updates
  const filesRef = useRef<UploadedFile[]>(safeFiles);

  // Keep ref in sync with files prop
  useEffect(() => {
    filesRef.current = safeFiles;
  }, [safeFiles]);

  // Real Cloudinary upload function
  const uploadFile = async (file: File): Promise<UploadedFile> => {
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const uploadedFile: UploadedFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      url: "", // Will be set after upload
      cloudinaryId: "",
      uploadProgress: 0,
      status: "uploading",
    };

    // Add file to list immediately
    const newFiles = [...filesRef.current, uploadedFile];
    filesRef.current = newFiles;
    onFilesChange(newFiles);

    try {
      // Validate file first
      const validation = validateFile(file, { maxSize, acceptedTypes });
      if (!validation.isValid) {
        throw new Error(validation.error || "File validation failed");
      }

      // Upload to Cloudinary with progress tracking
      const result = await uploadToCloudinary(file, {
        folder: uploadFolders.enrollmentDocuments,
        tags: getUploadTags("enrollmentDocuments", [file.name]),
        onProgress: (progress) => {
          // Update progress using ref
          const updatedFiles = filesRef.current.map((f) =>
            f.id === fileId ? { ...f, uploadProgress: progress } : f
          );
          filesRef.current = updatedFiles;
          onFilesChange(updatedFiles);
        },
      });

      // Update file with success status
      const successFile: UploadedFile = {
        ...uploadedFile,
        url: result.secureUrl,
        cloudinaryId: result.publicId,
        uploadProgress: 100,
        status: "success",
      };

      // Update with success
      const updatedFiles = filesRef.current.map((f) => (f.id === fileId ? successFile : f));
      filesRef.current = updatedFiles;
      onFilesChange(updatedFiles);

      return successFile;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed";

      // Update file with error status
      const errorFile: UploadedFile = {
        ...uploadedFile,
        uploadProgress: 0,
        status: "error",
        error: errorMessage,
      };

      // Update with error
      const updatedFiles = filesRef.current.map((f) => (f.id === fileId ? errorFile : f));
      filesRef.current = updatedFiles;
      onFilesChange(updatedFiles);

      throw error;
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: any[]) => {
      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const errorFiles: UploadedFile[] = rejectedFiles.map((rejected) => ({
          id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: rejected.file.name,
          size: rejected.file.size,
          type: rejected.file.type,
          url: "",
          cloudinaryId: "",
          uploadProgress: 0,
          status: "error" as const,
          error: rejected.errors[0]?.message || "File rejected",
        }));

        onFilesChange([...safeFiles, ...errorFiles]);
        return;
      }

      // Check if adding files would exceed max
      if (safeFiles.length + acceptedFiles.length > maxFiles) {
        alert(`Maximum ${maxFiles} files allowed`);
        return;
      }

      setUploading(true);

      // Upload each file
      for (const file of acceptedFiles) {
        try {
          await uploadFile(file);
        } catch (error) {
          console.error("Upload failed:", error);
        }
      }

      setUploading(false);
    },
    [safeFiles, maxFiles, onFilesChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: maxSize * 1024 * 1024, // Convert MB to bytes
    disabled: uploading || safeFiles.length >= maxFiles,
  });

  const removeFile = (fileId: string) => {
    onFilesChange(safeFiles.filter((f) => f.id !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return ImageIcon;
    if (type === "application/pdf") return FileText;
    return File;
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
          ${uploading || safeFiles.length >= maxFiles ? "opacity-50 cursor-not-allowed" : "hover:border-primary"}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        {isDragActive ? (
          <p>Drop the files here...</p>
        ) : (
          <div className="space-y-2">
            <p>Drag & drop files here, or click to select</p>
            <p className="text-sm text-muted-foreground">
              Accepted: PDF, JPG, PNG • Max {maxSize}MB per file • Up to {maxFiles} files
            </p>
          </div>
        )}
      </div>

      {/* File list */}
      {safeFiles.length > 0 && (
        <div className="space-y-2">
          {safeFiles.map((file) => {
            const FileIcon = getFileIcon(file.type);

            return (
              <Card key={file.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-muted p-2">
                      <FileIcon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="truncate">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {file.status === "success" && (
                            <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                          )}
                          {file.status === "error" && (
                            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(file.id)}
                            disabled={file.status === "uploading"}
                            className="h-8 w-8"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {file.status === "uploading" && (
                        <div className="mt-2">
                          <Progress value={file.uploadProgress} className="h-1" />
                          <p className="text-xs text-muted-foreground mt-1">
                            Uploading... {file.uploadProgress}%
                          </p>
                        </div>
                      )}

                      {file.status === "error" && file.error && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertDescription className="text-xs">{file.error}</AlertDescription>
                        </Alert>
                      )}

                      {file.status === "success" && (
                        <p className="text-xs text-success mt-1">Upload complete</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {safeFiles.length >= maxFiles && (
        <Alert>
          <AlertDescription>
            Maximum number of files ({maxFiles}) reached. Remove a file to upload more.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}