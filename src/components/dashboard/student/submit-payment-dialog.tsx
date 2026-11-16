"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { Alert, AlertDescription } from "../../ui/alert";
import { Upload, X, FileText, Info, CreditCard, Hash } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import { uploadToCloudinary, uploadFolders } from "../../../lib/cloudinary";
import { toast } from "sonner@2.0.3";

interface SubmitPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  remainingBalance: number;
}

export function SubmitPaymentDialog({ 
  open, 
  onOpenChange, 
  studentId, 
  studentName,
  remainingBalance 
}: SubmitPaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    amount: "",
    paymentMethod: "",
    referenceNumber: "",
    orNumber: "",
    remarks: ""
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB for Cloudinary)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }

      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
      if (!validTypes.includes(file.type)) {
        toast.error("Only JPG, PNG, and PDF files are allowed");
        return;
      }

      setReceiptFile(file);

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setReceiptPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setReceiptPreview(null);
      }
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    setUploadProgress(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!formData.paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    if (!formData.referenceNumber.trim()) {
      toast.error("Please enter a reference number");
      return;
    }

    if (!receiptFile) {
      toast.error("Please upload a payment receipt");
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      console.log("[Submit Payment] Starting submission for studentId:", studentId);
      
      // Upload receipt to Cloudinary with progress tracking
      console.log("[Submit Payment] Uploading to Cloudinary...");
      const uploadResult = await uploadToCloudinary(receiptFile, {
        folder: uploadFolders.receipts,
        resourceType: receiptFile.type === 'application/pdf' ? 'raw' : 'image',
        tags: ['payment-receipt', studentId],
        onProgress: (progress) => {
          setUploadProgress(progress);
          console.log(`[Submit Payment] Upload progress: ${progress}%`);
        }
      });

      console.log("[Submit Payment] File uploaded to Cloudinary successfully");
      console.log("[Submit Payment] Cloudinary URL:", uploadResult.secureUrl);

      // Create payment record in Firestore
      const paymentData = {
        studentId,
        studentName,
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        referenceNumber: formData.referenceNumber.trim(),
        orNumber: formData.orNumber.trim() || "Pending",
        remarks: formData.remarks.trim() || "",
        receiptUrl: uploadResult.secureUrl,
        receiptPublicId: uploadResult.publicId,
        receiptFileName: receiptFile.name,
        receiptFormat: uploadResult.format,
        receiptBytes: uploadResult.bytes,
        status: "pending",
        datePosted: serverTimestamp(),
        submittedAt: serverTimestamp(),
        postedBy: studentName,
        submittedBy: "student"
      };

      console.log("[Submit Payment] Saving payment record to Firestore...");
      
      const docRef = await addDoc(collection(db, "payments"), paymentData);
      
      console.log("[Submit Payment] Payment saved with ID:", docRef.id);

      // Close dialog immediately
      onOpenChange(false);
      
      // Reset form
      setFormData({
        amount: "",
        paymentMethod: "",
        referenceNumber: "",
        orNumber: "",
        remarks: ""
      });
      setReceiptFile(null);
      setReceiptPreview(null);
      setUploadProgress(0);
      setLoading(false);
      
      // Show success message after dialog closes
      setTimeout(() => {
        toast.success("Payment submitted successfully! Awaiting Business Office verification.");
      }, 100);
    } catch (error) {
      console.error("Error submitting payment:", error);
      toast.error("Failed to submit payment. Please try again.");
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Payment</DialogTitle>
          <DialogDescription>
            Upload your payment receipt and details for Business Office verification
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Balance Info Alert */}
          <Alert className="bg-info/10 border-info/20">
            <Info className="h-4 w-4 text-info" />
            <AlertDescription className="text-foreground">
              <div className="flex items-center justify-between">
                <span>Current Remaining Balance:</span>
                <span className="font-bold text-lg">
                  ₱{remainingBalance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </AlertDescription>
          </Alert>

          {/* Payment Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              Payment Amount <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="pl-8"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">
              Payment Method <span className="text-destructive">*</span>
            </Label>
            <Select 
              value={formData.paymentMethod} 
              onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="gcash">GCash</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="online">Online Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="referenceNumber">
              Reference/Transaction Number <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="referenceNumber"
                type="text"
                placeholder="Enter reference or transaction number"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                className="pl-10"
                required
                disabled={loading}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              For GCash/Bank: Transaction reference number. For Cash: Receipt number.
            </p>
          </div>

          {/* OR Number (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="orNumber">
              Official Receipt (OR) Number <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="orNumber"
              type="text"
              placeholder="Enter OR number if available"
              value={formData.orNumber}
              onChange={(e) => setFormData({ ...formData, orNumber: e.target.value })}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank if not yet available. Business Office will provide OR number upon verification.
            </p>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">
              Remarks <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="remarks"
              placeholder="Add any additional notes or comments"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Receipt Upload */}
          <div className="space-y-2">
            <Label htmlFor="receipt">
              Upload Payment Receipt <span className="text-destructive">*</span>
            </Label>
            
            {!receiptFile ? (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  id="receipt"
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={loading}
                />
                <label htmlFor="receipt" className={loading ? "cursor-not-allowed" : "cursor-pointer"}>
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <div className="font-medium text-foreground mb-1">
                    Click to upload receipt
                  </div>
                  <div className="text-sm text-muted-foreground">
                    JPG, PNG, or PDF (Max 10MB)
                  </div>
                </label>
              </div>
            ) : (
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-start gap-4">
                  {receiptPreview ? (
                    <img 
                      src={receiptPreview} 
                      alt="Receipt preview" 
                      className="w-24 h-24 object-cover rounded border"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-muted rounded border flex items-center justify-center">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-foreground">{receiptFile.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {(receiptFile.size / 1024).toFixed(2)} KB
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeReceipt}
                        disabled={loading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Upload Progress Bar */}
                    {loading && uploadProgress > 0 && (
                      <div className="mt-2">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Uploading... {uploadProgress}%
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Important Notes */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="text-sm space-y-1">
                <div className="font-medium">Important Notes:</div>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Your payment will be marked as "Pending" until verified by the Business Office</li>
                  <li>Verification typically takes 1-2 business days</li>
                  <li>You'll receive a notification once your payment is verified</li>
                  <li>Ensure your receipt is clear and shows the complete transaction details</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {uploadProgress > 0 && uploadProgress < 100 ? `Uploading ${uploadProgress}%` : 'Submitting...'}
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Submit Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
