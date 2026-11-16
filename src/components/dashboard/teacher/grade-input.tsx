"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "../../ui/input";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "../../ui/utils";

interface GradeInputProps {
  value: number | null;
  studentId: string;
  gradeType: "Midterm" | "Final";
  onSave: (studentId: string, gradeType: "Midterm" | "Final", value: string) => Promise<void>;
  disabled?: boolean;
}

export function GradeInput({ value, studentId, gradeType, onSave, disabled }: GradeInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value?.toString() || "");
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentValue(value?.toString() || "");
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      await onSave(studentId, gradeType, currentValue);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (error) {
      console.error("Error saving grade:", error);
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    if (currentValue !== (value?.toString() || "")) {
      handleSave();
    } else {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setCurrentValue(value?.toString() || "");
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="relative w-24 mx-auto">
        <Input
          ref={inputRef}
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={isSaving || disabled}
          className={cn(
            "w-full text-center transition-all",
            "focus:ring-2 focus:ring-primary focus:border-primary",
            isSaving && "opacity-50"
          )}
          placeholder="0-100"
        />
        {isSaving && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => !disabled && setIsEditing(true)}
      disabled={disabled}
      className={cn(
        "relative w-24 mx-auto px-3 py-2 rounded-md transition-all",
        "hover:bg-muted/50 hover:ring-2 hover:ring-primary/20",
        "focus:outline-none focus:ring-2 focus:ring-primary",
        "group cursor-pointer",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <div className="flex items-center justify-center gap-2">
        {value !== null ? (
          <>
            <span className={cn(
              "font-medium transition-colors",
              value >= 90 && "text-green-600",
              value >= 80 && value < 90 && "text-blue-600",
              value >= 75 && value < 80 && "text-orange-600",
              value < 75 && "text-red-600"
            )}>
              {value.toFixed(1)}
            </span>
            {justSaved && (
              <CheckCircle2 className="h-3 w-3 text-green-600 animate-in fade-in zoom-in" />
            )}
          </>
        ) : (
          <span className="text-muted-foreground group-hover:text-foreground transition-colors">
            —
          </span>
        )}
      </div>
      {!disabled && (
        <div className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="absolute inset-0 bg-primary/5 rounded-md" />
        </div>
      )}
    </button>
  );
}