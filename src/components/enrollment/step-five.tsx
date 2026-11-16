"use client";

import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { CloudinaryUploader, UploadedFile } from "./cloudinary-uploader";
import { Info, Wallet, CreditCard, Building2, Smartphone, Receipt } from "lucide-react";
import { Card, CardContent } from "../ui/card";

interface StepFiveData {
  paymentType: string;
  paymentMethod: string;
  amount: string;
  referenceNumber: string;
  receiptFiles: UploadedFile[];
}

interface StepFiveProps {
  data: StepFiveData;
  onChange: (data: Partial<StepFiveData>) => void;
  errors?: Partial<Record<keyof StepFiveData, string>>;
  tuitionFee: number;
}

const paymentMethods = [
  { value: "gcash", label: "GCash", icon: Smartphone },
  { value: "paymaya", label: "PayMaya", icon: Smartphone },
  { value: "bank_transfer", label: "Bank Transfer", icon: Building2 },
  { value: "over_counter", label: "Over the Counter", icon: Building2 },
  { value: "credit_debit", label: "Credit/Debit Card", icon: CreditCard },
];

export function StepFive({ data, onChange, errors = {}, tuitionFee }: StepFiveProps) {
  // Enrollment Application Fee - Fixed amount to secure enrollment slot
  const enrollmentApplicationFee = 5000; // ₱5,000 fixed enrollment application fee
  const minimumDownPayment = 3000; // ₱3,000 minimum down payment option

  const selectedMethod = paymentMethods.find(m => m.value === data.paymentMethod);
  const IconComponent = selectedMethod?.icon || Wallet;

  return (
    <div className="space-y-8">
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="text-foreground/80">
          Complete your enrollment application fee to secure your slot. Final tuition will be computed based on your enrolled subjects and units.
        </AlertDescription>
      </Alert>

      {/* Payment Information Notice */}
      <Card className="bg-primary/5 border-2 border-primary/20">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium text-blue-900">About Tuition Fees</p>
                <p className="text-sm text-blue-800">
                  Your actual tuition fee will depend on the number of units and subjects you enroll in during the 
                  subject enrollment period. The enrollment application fee below secures your slot and will be deducted 
                  from your total tuition once calculated.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Type Selection */}
      <div className="space-y-5">
        <div className="pb-2 border-b-2 border-primary/10">
          <h3 className="text-lg text-primary">Select Payment Option</h3>
          <p className="text-sm text-muted-foreground mt-1">Choose how much you want to pay now</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card 
            className={`cursor-pointer transition-all duration-200 border-2 hover:border-primary hover:shadow-md ${
              data.paymentType === 'enrollment_fee' ? 'border-primary bg-primary/10 shadow-sm' : 'border-border'
            }`}
            onClick={() => {
              onChange({ 
                paymentType: 'enrollment_fee',
                amount: enrollmentApplicationFee.toString()
              });
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  data.paymentType === 'enrollment_fee' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  <Wallet className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Standard Application Fee</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Secure your enrollment slot with the application fee
                  </p>
                  <p className="text-lg font-semibold">
                    ₱{enrollmentApplicationFee.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Will be deducted from total tuition
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all duration-200 border-2 hover:border-primary hover:shadow-md ${
              data.paymentType === 'minimum_payment' ? 'border-primary bg-primary/10 shadow-sm' : 'border-border'
            }`}
            onClick={() => {
              onChange({ 
                paymentType: 'minimum_payment',
                amount: minimumDownPayment.toString()
              });
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  data.paymentType === 'minimum_payment' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Minimum Down Payment</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Start with a smaller payment amount
                  </p>
                  <p className="text-lg font-semibold">
                    ₱{minimumDownPayment.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Remaining balance due before enrollment
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {errors.paymentType && (
          <p className="text-sm text-destructive">{errors.paymentType}</p>
        )}
      </div>

      {data.paymentType && (
        <>
          {/* Payment Method */}
          <div className="space-y-5">
            <div className="pb-2 border-b-2 border-primary/10">
              <h3 className="text-lg text-primary">Payment Method</h3>
              <p className="text-sm text-muted-foreground mt-1">How would you like to pay?</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Select Payment Method *</Label>
              <Select value={data.paymentMethod} onValueChange={(value) => onChange({ paymentMethod: value })}>
                <SelectTrigger id="paymentMethod" className={errors.paymentMethod ? "border-destructive" : ""}>
                  <SelectValue placeholder="Choose payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <SelectItem key={method.value} value={method.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {method.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.paymentMethod && (
                <p className="text-sm text-destructive">{errors.paymentMethod}</p>
              )}
            </div>

            {/* Payment Details Based on Method */}
            {data.paymentMethod && (
              <Alert className="bg-info/10 border-2 border-info/20">
                <Info className="h-4 w-4 text-info" />
                <AlertTitle className="text-info">Payment Instructions</AlertTitle>
                <AlertDescription className="text-foreground/80 space-y-2">
                  {data.paymentMethod === 'gcash' && (
                    <div>
                      <p className="font-medium">GCash Details:</p>
                      <p>Number: <strong>0917-123-4567</strong></p>
                      <p>Name: <strong>CollegeConnect Philippines</strong></p>
                      <p className="mt-2 text-sm">Send payment and upload the receipt screenshot below.</p>
                    </div>
                  )}
                  {data.paymentMethod === 'paymaya' && (
                    <div>
                      <p className="font-medium">PayMaya Details:</p>
                      <p>Number: <strong>0917-765-4321</strong></p>
                      <p>Name: <strong>CollegeConnect Philippines</strong></p>
                      <p className="mt-2 text-sm">Send payment and upload the receipt screenshot below.</p>
                    </div>
                  )}
                  {data.paymentMethod === 'bank_transfer' && (
                    <div>
                      <p className="font-medium">Bank Transfer Details:</p>
                      <p>Bank: <strong>BDO / BPI / Metrobank</strong></p>
                      <p>Account Number: <strong>1234-5678-9012</strong></p>
                      <p>Account Name: <strong>CollegeConnect Philippines Inc.</strong></p>
                      <p className="mt-2 text-sm">Transfer payment and upload the bank receipt below.</p>
                    </div>
                  )}
                  {data.paymentMethod === 'over_counter' && (
                    <div>
                      <p className="font-medium">Over the Counter Payment:</p>
                      <p>Visit any of our partner payment centers (7-Eleven, Cebuana, M Lhuillier)</p>
                      <p>Reference Code: <strong>CC-{new Date().getFullYear()}-XXXX</strong></p>
                      <p className="mt-2 text-sm">After payment, upload the official receipt below.</p>
                    </div>
                  )}
                  {data.paymentMethod === 'credit_debit' && (
                    <div>
                      <p className="font-medium">Credit/Debit Card Payment:</p>
                      <p>Pay at the Business Office or through our online portal</p>
                      <p className="mt-2 text-sm">Upload the payment confirmation receipt below.</p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
              <Input
                id="amount"
                type="number"
                value={data.amount}
                onChange={(e) => onChange({ amount: e.target.value })}
                placeholder="0.00"
                className={`pl-8 ${errors.amount ? "border-destructive" : ""}`}
                aria-invalid={!!errors.amount}
                min={data.paymentType === 'minimum_payment' ? minimumDownPayment : enrollmentApplicationFee}
              />
            </div>
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {data.paymentType === 'enrollment_fee' 
                ? 'This amount will be deducted from your total tuition after subject enrollment'
                : 'You can pay more than the minimum if you prefer'
              }
            </p>
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="referenceNumber">Transaction/Reference Number *</Label>
            <Input
              id="referenceNumber"
              value={data.referenceNumber}
              onChange={(e) => onChange({ referenceNumber: e.target.value })}
              placeholder="e.g., GC123456789 or Bank Ref #"
              className={errors.referenceNumber ? "border-destructive" : ""}
              aria-invalid={!!errors.referenceNumber}
            />
            {errors.referenceNumber && (
              <p className="text-sm text-destructive">{errors.referenceNumber}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Enter the reference number from your payment confirmation
            </p>
          </div>

          {/* Receipt Upload */}
          <div className="space-y-2">
            <Label>Upload Payment Receipt *</Label>
            <CloudinaryUploader
              files={data.receiptFiles}
              onFilesChange={(files) => onChange({ receiptFiles: files })}
              maxFiles={3}
              acceptedTypes={['image/jpeg', 'image/png', 'application/pdf']}
            />
            {errors.receiptFiles && (
              <p className="text-sm text-destructive">{errors.receiptFiles}</p>
            )}
            <Alert>
              <Receipt className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Upload clear photos or scans of your payment receipt. Accepted formats: PNG, JPG, PDF (max 10MB per file)
              </AlertDescription>
            </Alert>
          </div>

          {/* Verification Notice */}
          <Alert className="bg-warning/10 border-warning">
            <Info className="h-4 w-4 text-warning" />
            <AlertTitle>Payment Verification Process</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>After submitting your application:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm ml-2">
                <li>The Business Office will verify your payment (usually within 24-48 hours)</li>
                <li>Once verified, the Registrar will create your school ID and email accounts</li>
                <li>You and your parent/guardian will receive your credentials via email</li>
                <li>You can then access your student dashboard</li>
              </ol>
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}