export interface EnrollmentPeriodWindow {
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
}

export type EnrollmentPeriodStatus = "not-configured" | "upcoming" | "active" | "closed";

export function getEnrollmentPeriodStatus(
  period: EnrollmentPeriodWindow | null | undefined,
  now: Date = new Date()
): EnrollmentPeriodStatus {
  if (!period?.startDate || !period.endDate) {
    return "not-configured";
  }

  const start = new Date(`${period.startDate}T${period.startTime || "00:00"}`);
  const end = new Date(`${period.endDate}T${period.endTime || "23:59:59.999"}`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "closed";
  }

  if (now < start) {
    return "upcoming";
  }

  return now <= end ? "active" : "closed";
}
