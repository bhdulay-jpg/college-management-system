import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Stepper } from "./stepper";
import { StepOne } from "./step-one";
import { StepTwo } from "./step-two";
import { StepThree } from "./step-three";
import { StepFour } from "./step-four";
import { StepFive } from "./step-five";
import { SuccessPage } from "./success-page";
import { UploadedFile } from "./cloudinary-uploader";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight, Save, Send } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { useRouter } from "../router";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { STORAGE_KEYS, getStorageItem, setStorageItem, clearEnrollmentDraft } from "../../lib/storage-utils";

const steps = [
  { title: "Personal Details", description: "Basic information" },
  { title: "Program Selection", description: "Choose your program" },
  { title: "Upload Documents", description: "Required files" },
  { title: "Review Application", description: "Confirm details" },
  { title: "Payment", description: "Application fee" },
];

export function EnrollmentForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState("");

  // Step 1 data
  const [stepOneData, setStepOneData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: undefined as Date | undefined,
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    guardianName: "",
    guardianRelationship: "",
    guardianPhone: "",
    guardianEmail: "",
    gender: "",
    civilStatus: "",
    nationality: "",
    religion: "",
    province: "",
  });

  // Step 2 data
  const [stepTwoData, setStepTwoData] = useState({
    school: "",
    program: "",
    yearLevel: "",
    schedule: "",
    semester: "",
    studentType: "",
    lastSchoolAttended: "",
    lastSchoolAddress: "",
    lastSchoolYear: "",
  });

  // Step 3 data
  const [stepThreeData, setStepThreeData] = useState({
    files: [] as UploadedFile[],
  });

  // Step 4 data
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Step 5 data
  const [stepFiveData, setStepFiveData] = useState({
    paymentType: "",
    paymentMethod: "",
    amount: "",
    referenceNumber: "",
    receiptFiles: [] as UploadedFile[],
  });

  // Tuition fee calculation based on program (example rates)
  const getTuitionFee = () => {
    const programFees: Record<string, number> = {
      bscs: 45000,
      bsit: 45000,
      bsba: 42000,
      bsn: 50000,
      bsed: 40000,
      bsa: 48000,
    };
    return programFees[stepTwoData.program] || 45000;
  };

  // Enrollment application fee (not the full tuition, as tuition depends on units)
  const getEnrollmentFee = () => {
    // Fixed enrollment application fee
    return 5000; 
  };

  const [errors, setErrors] = useState<any>({});

  const validateStep = (step: number) => {
    const newErrors: any = {};

    if (step === 0) {
      if (!stepOneData.firstName) newErrors.firstName = "First name is required";
      if (!stepOneData.lastName) newErrors.lastName = "Last name is required";
      if (!stepOneData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
      if (!stepOneData.email) newErrors.email = "Email is required";
      if (!stepOneData.phone) newErrors.phone = "Phone number is required";
      if (!stepOneData.address) newErrors.address = "Address is required";
      if (!stepOneData.city) newErrors.city = "City is required";
      if (!stepOneData.state) newErrors.state = "Province/Region is required";
      if (!stepOneData.zipCode) newErrors.zipCode = "ZIP code is required";
      if (!stepOneData.gender) newErrors.gender = "Gender is required";
      if (!stepOneData.civilStatus) newErrors.civilStatus = "Civil status is required";
      if (!stepOneData.nationality) newErrors.nationality = "Nationality is required";
      if (!stepOneData.religion) newErrors.religion = "Religion is required";
      if (!stepOneData.province) newErrors.province = "Province is required";
      if (!stepOneData.guardianName) newErrors.guardianName = "Guardian name is required";
      if (!stepOneData.guardianRelationship) newErrors.guardianRelationship = "Guardian relationship is required";
      if (!stepOneData.guardianPhone) newErrors.guardianPhone = "Guardian phone is required";
      if (!stepOneData.guardianEmail) newErrors.guardianEmail = "Guardian email is required";
    }

    if (step === 1) {
      if (!stepTwoData.school) newErrors.school = "School selection is required";
      if (!stepTwoData.program) newErrors.program = "Program selection is required";
      if (!stepTwoData.yearLevel) newErrors.yearLevel = "Year level is required";
      if (!stepTwoData.schedule) newErrors.schedule = "Schedule preference is required";
      if (!stepTwoData.semester) newErrors.semester = "Academic term is required";
      if (!stepTwoData.studentType) newErrors.studentType = "Student type is required";
      if (!stepTwoData.lastSchoolAttended) newErrors.lastSchoolAttended = "Last school attended is required";
      if (!stepTwoData.lastSchoolAddress) newErrors.lastSchoolAddress = "Last school address is required";
      if (!stepTwoData.lastSchoolYear) newErrors.lastSchoolYear = "Year graduated/last attended is required";
    }

    if (step === 2) {
      const successfulUploads = Array.isArray(stepThreeData.files) 
        ? stepThreeData.files.filter((f) => f.status === "success")
        : [];
      if (successfulUploads.length === 0) {
        newErrors.files = "Please upload at least one document";
      }
    }

    if (step === 4) {
      if (!stepFiveData.paymentType) newErrors.paymentType = "Payment type is required";
      if (!stepFiveData.paymentMethod) newErrors.paymentMethod = "Payment method is required";
      if (!stepFiveData.amount) newErrors.amount = "Amount is required";
      if (!stepFiveData.referenceNumber) newErrors.referenceNumber = "Reference number is required";
      const successfulReceiptUploads = Array.isArray(stepFiveData.receiptFiles)
        ? stepFiveData.receiptFiles.filter((f) => f.status === "success")
        : [];
      if (successfulReceiptUploads.length === 0) {
        newErrors.receiptFiles = "Please upload a receipt";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast.error("Please fill in all required fields");
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveDraft = () => {
    // Save to localStorage using storage utils
    const draft = {
      stepOneData,
      stepTwoData,
      stepThreeData,
      currentStep,
      savedAt: new Date().toISOString(),
    };
    setStorageItem(STORAGE_KEYS.ENROLLMENT_DRAFT, draft);
    toast.success("Draft saved successfully");
  };

  const handleSubmit = async () => {
    if (!agreedToTerms) {
      toast.error("Please agree to the terms and conditions");
      return;
    }

    if (!validateStep(currentStep)) {
      toast.error("Please complete all required fields");
      return;
    }

    // Check if Firebase is initialized
    if (!db) {
      toast.error("Database connection not available. Please refresh the page and try again.");
      console.error("Firebase Firestore (db) is not initialized");
      return;
    }

    toast.loading("Submitting application...");

    try {
      // Generate application ID
      const appId = `APP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      // Prepare enrollment data
      const enrollmentData = {
        applicationId: appId,
        ...(auth.currentUser?.uid ? { userId: auth.currentUser.uid } : {}),
        // Personal Info
        firstName: stepOneData.firstName,
        middleName: stepOneData.middleName || "",
        lastName: stepOneData.lastName,
        email: stepOneData.email,
        phone: stepOneData.phone,
        dateOfBirth: stepOneData.dateOfBirth?.toISOString() || "",
        gender: stepOneData.gender,
        civilStatus: stepOneData.civilStatus,
        nationality: stepOneData.nationality,
        religion: stepOneData.religion,
        address: stepOneData.address,
        city: stepOneData.city,
        province: stepOneData.province,
        zipCode: stepOneData.zipCode,
        // Guardian Info
        guardianName: stepOneData.guardianName,
        guardianRelationship: stepOneData.guardianRelationship,
        guardianPhone: stepOneData.guardianPhone,
        guardianEmail: stepOneData.guardianEmail,
        // Academic Info
        studentType: stepTwoData.studentType,
        program: stepTwoData.program,
        yearLevel: stepTwoData.yearLevel,
        schedule: stepTwoData.schedule,
        semester: stepTwoData.semester,
        lastSchoolAttended: stepTwoData.lastSchoolAttended,
        lastSchoolAddress: stepTwoData.lastSchoolAddress,
        lastSchoolYear: stepTwoData.lastSchoolYear,
        // Documents
        documents: stepThreeData.files || [],
        // Payment Info
        paymentType: stepFiveData.paymentType,
        paymentMethod: stepFiveData.paymentMethod,
        amount: parseFloat(stepFiveData.amount),
        referenceNumber: stepFiveData.referenceNumber,
        receiptFiles: stepFiveData.receiptFiles || [],
        tuitionFee: getTuitionFee(),
        enrollmentFee: getEnrollmentFee(),
        // Status
        status: "pending",
        paymentStatus: "pending",
        // Metadata
        submittedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      };

      // Save to Firestore enrollments collection
      await addDoc(collection(db, "enrollments"), enrollmentData);

      setApplicationId(appId);
      
      // Clear draft
      clearEnrollmentDraft();

      toast.dismiss();
      toast.success("Application submitted successfully!");
      setSubmitted(true);
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast.dismiss();
      
      // Provide more specific error messages
      let errorMessage = "Failed to submit application";
      if (error?.code === "permission-denied") {
        errorMessage = "Permission denied. Please contact support.";
      } else if (error?.code === "unavailable") {
        errorMessage = "Service temporarily unavailable. Please try again later.";
      } else if (error?.message) {
        errorMessage = `Failed to submit: ${error.message}`;
      }
      
      toast.error(errorMessage);
    }
  };

  if (submitted) {
    return <SuccessPage applicationId={applicationId} email={stepOneData.email} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl mb-2">Student Enrollment Application</h1>
          <p className="text-muted-foreground">
            Complete all steps to submit your enrollment application
          </p>
        </div>

        <div className="mb-8">
          <Stepper steps={steps} currentStep={currentStep} />
        </div>

        <Card className="border-2 shadow-lg">
          <CardHeader className="space-y-2 border-b-2 border-primary/10 bg-primary/5">
            <CardTitle className="text-2xl text-primary">{steps[currentStep].title}</CardTitle>
            <CardDescription className="text-base">{steps[currentStep].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-8">
            {currentStep === 0 && (
              <StepOne
                data={stepOneData}
                onChange={(data) => setStepOneData({ ...stepOneData, ...data })}
                errors={errors}
              />
            )}

            {currentStep === 1 && (
              <StepTwo
                data={stepTwoData}
                onChange={(data) => setStepTwoData({ ...stepTwoData, ...data })}
                errors={errors}
              />
            )}

            {currentStep === 2 && (
              <StepThree
                data={stepThreeData}
                onChange={(data) => setStepThreeData({ ...stepThreeData, ...data })}
                errors={errors}
              />
            )}

            {currentStep === 3 && (
              <StepFour
                data={{ ...stepOneData, ...stepTwoData, ...stepThreeData }}
                agreedToTerms={agreedToTerms}
                onAgreeToTerms={setAgreedToTerms}
                onEdit={(step) => setCurrentStep(step)}
              />
            )}

            {currentStep === 4 && (
              <StepFive
                data={stepFiveData}
                onChange={(data) => setStepFiveData({ ...stepFiveData, ...data })}
                errors={errors}
                tuitionFee={getTuitionFee()}
              />
            )}

            {/* Navigation buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                className="order-3 sm:order-1 sm:mr-auto"
              >
                <Save className="mr-2 h-4 w-4" />
                Save as Draft
              </Button>

              {currentStep > 0 && (
                <Button variant="outline" onClick={handleBack} className="order-1 sm:order-2">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}

              {currentStep < steps.length - 1 ? (
                <Button onClick={handleNext} className="order-2 sm:order-3">
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={!agreedToTerms} className="order-2 sm:order-3">
                  <Send className="mr-2 h-4 w-4" />
                  Submit Application
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Need help? Contact us at{" "}
          <a href="mailto:admissions@schoolconnect.edu" className="text-primary hover:underline">
            admissions@schoolconnect.edu
          </a>
        </p>
      </div>
    </div>
  );
}