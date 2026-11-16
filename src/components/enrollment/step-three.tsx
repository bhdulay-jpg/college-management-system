"use client";

import { CloudinaryUploader, UploadedFile } from "./cloudinary-uploader";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Info, FileText } from "lucide-react";

interface StepThreeData {
  files: UploadedFile[];
}

interface StepThreeProps {
  data: StepThreeData;
  onChange: (data: Partial<StepThreeData>) => void;
  errors?: { files?: string };
}

export function StepThree({ data, onChange, errors = {} }: StepThreeProps) {
  const requiredDocuments = [
    { name: "Birth Certificate", description: "Original or certified true copy" },
    { name: "High School Diploma", description: "Form 138 or equivalent" },
    { name: "Good Moral Certificate", description: "From previous school" },
    { name: "2x2 ID Photo", description: "Recent photo with white background" },
  ];

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Required Documents</AlertTitle>
        <AlertDescription>
          Please upload clear, legible copies of the following documents. All files must be in PDF, JPG, or PNG format, maximum 10MB each.
        </AlertDescription>
      </Alert>

      {/* Required documents checklist */}
      <div className="space-y-4">
        <h3>Document Checklist</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {requiredDocuments.map((doc, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div>{doc.name}</div>
                <div className="text-sm text-muted-foreground">{doc.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* File uploader */}
      <div className="space-y-4">
        <h3>Upload Documents</h3>
        <CloudinaryUploader
          files={data.files}
          onFilesChange={(files) => onChange({ files })}
          maxFiles={10}
          maxSize={10}
          acceptedTypes={["application/pdf", "image/jpeg", "image/png"]}
        />
        {errors.files && <p className="text-sm text-destructive">{errors.files}</p>}
      </div>

      {/* Upload instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2 text-sm">
            <p>Upload Guidelines:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Ensure all documents are clear and readable</li>
              <li>Files should be named appropriately (e.g., "birth_certificate.pdf")</li>
              <li>Accepted formats: PDF, JPG, PNG</li>
              <li>Maximum file size: 10MB per file</li>
              <li>You can upload up to 10 files total</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      {/* Cloudinary integration note */}
      <div className="bg-muted/50 rounded-lg p-4 text-sm">
        <p className="text-muted-foreground">
          <strong>Secure Storage:</strong> All documents are securely uploaded to Cloudinary and encrypted. 
          Your files are stored with enterprise-grade security and are only accessible by authorized school personnel.
        </p>
      </div>
    </div>
  );
}
