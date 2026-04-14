import { sql } from "drizzle-orm";
import { db, parkingSlotsTable } from "@workspace/db";

const seedSlots = ["B1", "B2", "GF", "L1", "L2"].flatMap((level) =>
  Array.from({ length: 12 }, (_, i) => {
    const num = String(i + 1).padStart(2, "0");
    const slotType = i < 2 ? "ev" : i === 2 ? "accessible" : i >= 10 ? "premium" : "standard";
    const isPaid = slotType === "premium";
    return {
      slotId: `${level}-${num}`,
      level,
      slotType,
      available: true,
      isPaid,
      pricePerHour: slotType === "premium" ? 120 : slotType === "ev" ? 80 : 0,
      nearLift: i < 4,
    };
  }),
);

export async function bootstrapDatabase(): Promise<void> {
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS parking_slots (
      slot_id TEXT PRIMARY KEY,
      level TEXT NOT NULL,
      slot_type TEXT NOT NULL,
      available INTEGER NOT NULL DEFAULT 1,
      is_paid INTEGER NOT NULL DEFAULT 0,
      price_per_hour REAL NOT NULL DEFAULT 0,
      near_lift INTEGER NOT NULL DEFAULT 0
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS parking_sessions (
      session_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      car_number TEXT NOT NULL,
      slot_id TEXT NOT NULL,
      booking_time INTEGER NOT NULL,
      parking_start_time INTEGER,
      exit_time INTEGER,
      estimated_fee REAL,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      route_steps TEXT,
      qr_data TEXT
    )
  `);

  const slots = await db.select().from(parkingSlotsTable);
  if (slots.length === 0) {
    await db.insert(parkingSlotsTable).values(seedSlots);
  }
}
