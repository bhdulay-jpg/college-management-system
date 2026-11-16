"use client";

import { useRef, useState } from "react";
import { Button } from "./button";
import { Upload, Loader2 } from "lucide-react";
import { uploadToCloudinary, validateFile } from "../../lib/cloudinary";
import { toast } from "sonner@2.0.3";

interface FileUploadButtonProps {
  onUploadComplete: (url: string, publicId: string) => void;
  folder?: string;
  acceptedTypes?: string[];
  maxSize?: number; // in MB
  buttonText?: string;
  buttonVariant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary";
  disabled?: boolean;
  className?: string;
}

/**
 * Simple button component for quick file uploads
 * Shows loading state and handles errors with toast notifications
 */
export function FileUploadButton({
  onUploadComplete,
  folder = "college-connect/uploads",
  acceptedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  maxSize = 10,
  buttonText = "Upload File",
  buttonVariant = "default",
  disabled = false,
  className = "",
}: FileUploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateFile(file, { maxSize, acceptedTypes });
    if (!validation.isValid) {
      toast.error("Upload Failed", {
        description: validation.error,
      });
      return;
    }

    setUploading(true);

    try {
      const result = await uploadToCloudinary(file, {
        folder,
        resourceType: "auto",
      });

      toast.success("Upload Successful", {
        description: `${file.name} has been uploaded.`,
      });

      onUploadComplete(result.secureUrl, result.publicId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      toast.error("Upload Failed", {
        description: errorMessage,
      });
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const getAcceptString = () => {
    return acceptedTypes.join(",");
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptString()}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || uploading}
      />
      <Button
        variant={buttonVariant}
        onClick={handleClick}
        disabled={disabled || uploading}
        className={className}
      >
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            {buttonText}
          </>
        )}
      </Button>
    </>
  );
}
