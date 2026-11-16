"use client";

import { useState, useRef } from "react";
import { Button } from "./button";
import { Card } from "./card";
import { Progress } from "./progress";
import { Alert, AlertDescription } from "./alert";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { uploadToCloudinary, validateFile } from "../../lib/cloudinary";
import { ImageWithFallback } from "../figma/ImageWithFallback";

export interface ImageUploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
}

interface ImageUploaderProps {
  value?: string; // Current image URL
  onChange: (result: ImageUploadResult | null) => void;
  folder?: string;
  maxSize?: number; // in MB
  aspectRatio?: number; // width / height
  previewHeight?: number;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function ImageUploader({
  value,
  onChange,
  folder = "college-connect/images",
  maxSize = 5,
  aspectRatio,
  previewHeight = 200,
  label = "Upload Image",
  description = "Click to upload or drag and drop",
  disabled = false,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setError(null);
    setProgress(0);

    // Validate file
    const validation = validateFile(file, {
      maxSize,
      acceptedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    });

    if (!validation.isValid) {
      setError(validation.error || "Invalid file");
      return;
    }

    // Validate aspect ratio if specified
    if (aspectRatio) {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = async () => {
        URL.revokeObjectURL(objectUrl);
        const fileAspectRatio = img.width / img.height;
        const tolerance = 0.1; // Allow 10% variance
        
        if (Math.abs(fileAspectRatio - aspectRatio) > tolerance) {
          setError(
            `Image aspect ratio should be approximately ${aspectRatio.toFixed(2)} (width/height)`
          );
          return;
        }

        await performUpload(file);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        setError("Failed to load image");
      };

      img.src = objectUrl;
    } else {
      await performUpload(file);
    }
  };

  const performUpload = async (file: File) => {
    setUploading(true);

    try {
      const result = await uploadToCloudinary(file, {
        folder,
        resourceType: "image",
        onProgress: (prog) => setProgress(prog),
      });

      onChange({
        url: result.secureUrl,
        publicId: result.publicId,
        width: result.width,
        height: result.height,
      });

      setProgress(100);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
      onChange(null);
    } finally {
      setUploading(false);
    }
  };

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !uploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled || uploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelect(file);
    } else {
      setError("Please drop an image file");
    }
  };

  const handleRemove = () => {
    onChange(null);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      {value ? (
        <Card className="relative overflow-hidden">
          <div
            style={{ height: previewHeight }}
            className="relative bg-muted flex items-center justify-center"
          >
            <ImageWithFallback
              src={value}
              alt="Uploaded image"
              className="w-full h-full object-cover"
            />
            {!disabled && !uploading && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card
          className={`
            border-2 border-dashed cursor-pointer transition-colors
            ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
            ${disabled || uploading ? "opacity-50 cursor-not-allowed" : "hover:border-primary"}
          `}
          style={{ height: previewHeight }}
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            {uploading ? (
              <>
                <Loader2 className="h-12 w-12 mb-4 text-primary animate-spin" />
                <p className="mb-2">Uploading...</p>
                <Progress value={progress} className="w-full max-w-xs" />
                <p className="text-sm text-muted-foreground mt-2">{progress}%</p>
              </>
            ) : (
              <>
                <div className="rounded-full bg-muted p-3 mb-4">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="mb-1">{label}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  JPG, PNG, WEBP, GIF • Max {maxSize}MB
                  {aspectRatio && ` • Aspect ratio: ${aspectRatio.toFixed(2)}`}
                </p>
              </>
            )}
          </div>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
