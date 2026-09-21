// SmartCal calculation engine — all client-side, no data leaves the device.

export type Sex = "male" | "female";

export interface ActivityLevel {
  id: string;
  label: string;
  multiplier: number;
  description: string;
}

export const ACTIVITY_LEVELS: ActivityLevel[] = [
  { id: "sedentary", label: "Sedentary", multiplier: 1.2, description: "Mostly sitting; little structured exercise" },
  { id: "light", label: "Lightly active", multiplier: 1.375, description: "Light exercise or regular walking" },
  { id: "moderate", label: "Moderately active", multiplier: 1.55, description: "Moderate exercise several days per week" },
  { id: "active", label: "Active", multiplier: 1.725, description: "Frequent or intense physical activity" },
  { id: "very-active", label: "Very active", multiplier: 1.9, description: "Physical job plus daily training" },
];

// --- Unit conversions ---

export const CM_PER_INCH = 2.54;
export const KG_PER_LB = 0.45359237;

export function feetInchesToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * CM_PER_INCH;
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / CM_PER_INCH;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round((totalInches - feet * 12) * 10) / 10;
  return { feet, inches };
}

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

// --- Validation ranges (metric, internal format) ---

export const RANGES = {
  age: { min: 10, max: 120 },
  heightCm: { min: 100, max: 250 },
  weightKg: { min: 25, max: 400 },
} as const;

// --- Mifflin–St Jeor BMR ---

export function calculateBMR(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function calculateTDEE(bmr: number, multiplier: number): number {
  return bmr * multiplier;
}

export function formatKcal(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}
