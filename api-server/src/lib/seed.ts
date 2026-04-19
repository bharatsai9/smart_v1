import type { ParkingSlot } from "./types";

const levels = ["B1", "B2", "GF", "L1", "L2"];

/**
 * 34 slots per level — expanded coverage for filters:
 * - EV: free + paid (needsEv + free / paid / best)
 * - Accessible: free + paid (needsAccessible + free / paid; paid accessible = reserved bays with fee)
 * - Standard free, premium paid
 * - nearLift spread (entries near lift vs not)
 *
 * Note: one slot has a single `slotType`; EV+accessible in the UI means two separate filters — we provide many of each type per level.
 */
export const SLOTS_PER_LEVEL = 34;

type SlotDef = Pick<ParkingSlot, "slotType" | "isPaid" | "pricePerHour" | "nearLift">;

/** Fixed pattern repeated on every level (indices 0..33). */
const SLOT_PATTERN: SlotDef[] = [
  // EV — 8 slots: 5 free, 3 paid (indices 0–7)
  { slotType: "ev", isPaid: false, pricePerHour: 80, nearLift: true },
  { slotType: "ev", isPaid: false, pricePerHour: 80, nearLift: true },
  { slotType: "ev", isPaid: true, pricePerHour: 100, nearLift: true },
  { slotType: "ev", isPaid: false, pricePerHour: 80, nearLift: false },
  { slotType: "ev", isPaid: true, pricePerHour: 110, nearLift: false },
  { slotType: "ev", isPaid: false, pricePerHour: 80, nearLift: true },
  { slotType: "ev", isPaid: true, pricePerHour: 105, nearLift: false },
  { slotType: "ev", isPaid: false, pricePerHour: 80, nearLift: false },
  // Accessible — 7 slots: 4 free, 3 paid (8–14)
  { slotType: "accessible", isPaid: false, pricePerHour: 0, nearLift: true },
  { slotType: "accessible", isPaid: false, pricePerHour: 0, nearLift: true },
  { slotType: "accessible", isPaid: true, pricePerHour: 55, nearLift: true },
  { slotType: "accessible", isPaid: false, pricePerHour: 0, nearLift: false },
  { slotType: "accessible", isPaid: true, pricePerHour: 65, nearLift: false },
  { slotType: "accessible", isPaid: false, pricePerHour: 0, nearLift: false },
  { slotType: "accessible", isPaid: true, pricePerHour: 60, nearLift: false },
  // Standard — 11 unpaid (15–25)
  ...Array.from({ length: 11 }, (_, j) => ({
    slotType: "standard" as const,
    isPaid: false,
    pricePerHour: 0,
    nearLift: j < 4,
  })),
  // Premium — 8 paid (26–33)
  ...Array.from({ length: 8 }, (_, j) => ({
    slotType: "premium" as const,
    isPaid: true,
    pricePerHour: 120 + (j % 3) * 10,
    nearLift: j < 2,
  })),
];

if (SLOT_PATTERN.length !== SLOTS_PER_LEVEL) {
  throw new Error(`SLOT_PATTERN length ${SLOT_PATTERN.length} must equal SLOTS_PER_LEVEL ${SLOTS_PER_LEVEL}`);
}

/** Used for SQLite seed and tests (no DB required). */
export function buildSeedSlots(): ParkingSlot[] {
  return levels.flatMap((level) =>
    SLOT_PATTERN.map((def, i) => {
      const num = String(i + 1).padStart(2, "0");
      return {
        slotId: `${level}-${num}`,
        level,
        slotType: def.slotType,
        available: true,
        isPaid: def.isPaid,
        pricePerHour: def.pricePerHour,
        nearLift: def.nearLift,
      };
    }),
  );
}
