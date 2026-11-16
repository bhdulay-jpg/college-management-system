import { CheckCircle2, Circle, CircleDot } from "lucide-react";

interface Step {
  title: string;
  description: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
}

export function Stepper({ steps, currentStep }: StepperProps) {
  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="w-full">
      {/* Mobile: Enhanced compact view */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm text-muted-foreground">
            {Math.round(progressPercentage)}% Complete
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="bg-muted/50 p-3 rounded-lg">
          <div className="font-medium">{steps[currentStep].title}</div>
          <div className="text-sm text-muted-foreground mt-1">{steps[currentStep].description}</div>
        </div>
      </div>

      {/* Desktop: Enhanced full stepper */}
      <div className="hidden md:block">
        <div className="relative">
          {/* Background progress line */}
          <div className="absolute top-5 left-0 right-0 h-1 bg-muted rounded-full" style={{ marginLeft: '5%', marginRight: '5%' }} />
          
          {/* Active progress line */}
          <div 
            className="absolute top-5 left-0 h-1 bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500 ease-out"
            style={{ 
              marginLeft: '5%',
              width: `${currentStep === 0 ? 0 : (currentStep / (steps.length - 1)) * 90}%` 
            }}
          />

          <div className="relative flex items-start justify-between">
            {steps.map((step, index) => {
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              const isUpcoming = index > currentStep;

              return (
                <div key={index} className="flex flex-col items-center" style={{ flex: 1 }}>
                  {/* Step circle */}
                  <div
                    className={`
                      relative flex items-center justify-center w-11 h-11 rounded-full border-2 transition-all duration-300 shadow-sm
                      ${isCompleted ? "border-primary bg-primary text-primary-foreground scale-100" : ""}
                      ${isCurrent ? "border-primary bg-background text-primary scale-110 shadow-lg ring-4 ring-primary/20" : ""}
                      ${isUpcoming ? "border-muted-foreground/30 bg-background text-muted-foreground scale-95" : ""}
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : isCurrent ? (
                      <CircleDot className="h-6 w-6" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>

                  {/* Step label */}
                  <div className="mt-3 text-center max-w-[120px]">
                    <div
                      className={`text-sm font-medium transition-colors ${
                        isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 hidden lg:block">
                      {step.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}