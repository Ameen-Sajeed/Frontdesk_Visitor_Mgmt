export const VISIT_PRIORITIES = {
  NORMAL: 0,
  MEDIUM: 1,
  HIGH: 2,
} as const;

export type VisitPriority = (typeof VISIT_PRIORITIES)[keyof typeof VISIT_PRIORITIES];

export const priorityOptions = [
  { value: VISIT_PRIORITIES.NORMAL, label: "Normal" },
  { value: VISIT_PRIORITIES.MEDIUM, label: "Medium" },
  { value: VISIT_PRIORITIES.HIGH, label: "High" },
] as const;

export function isVisitPriority(value: unknown): value is VisitPriority {
  return typeof value === "number" && priorityOptions.some((priority) => priority.value === value);
}

export function priorityLabel(priority: number) {
  return priorityOptions.find((option) => option.value === priority)?.label ?? "Normal";
}
