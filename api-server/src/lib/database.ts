import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import type { ParkingSession, ParkingSlot } from "./types";
import type { Role } from "./jwt";
import { buildSeedSlots } from "./seed";
import { hashPassword } from "./password";

let db: SqlJsDatabase | null = null;

const require = createRequire(import.meta.url);

function resolveSqlWasmDir(): string {
  try {
    const pkg = path.dirname(require.resolve("sql.js/package.json"));
    return path.join(pkg, "dist");
  } catch {
    return path.join(process.cwd(), "node_modules", "sql.js", "dist");
  }
}

/** File path or `:memory:` for tests. Default: `./data/parking.db` under cwd. */
export function resolveDbPath(): string {
  const raw = process.env.DATABASE_PATH?.trim();
  if (raw) return raw;
  return path.join(process.cwd(), "data", "parking.db");
}

function persistDb(): void {
  if (!db) return;
  const p = resolveDbPath();
  if (p === ":memory:") return;
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const data = db.export();
  fs.writeFileSync(p, Buffer.from(data));
}

export function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() from bootstrap.");
  }
  return db;
}

function rowToSlot(row: Record<string, unknown>): ParkingSlot {
  return {
    slotId: String(row.slot_id),
    level: String(row.level),
    slotType: row.slot_type as ParkingSlot["slotType"],
    available: Boolean(row.available),
    isPaid: Boolean(row.is_paid),
    pricePerHour: Number(row.price_per_hour),
    nearLift: Boolean(row.near_lift),
  };
}

function rowToSession(row: Record<string, unknown>): ParkingSession {
  return {
    sessionId: Number(row.session_id),
    userId: String(row.user_id),
    carNumber: String(row.car_number),
    slotId: String(row.slot_id),
    bookingTime: String(row.booking_time),
    parkingStartTime: row.parking_start_time != null ? String(row.parking_start_time) : null,
    exitTime: row.exit_time != null ? String(row.exit_time) : null,
    estimatedFee: row.estimated_fee != null ? Number(row.estimated_fee) : null,
    paymentStatus: row.payment_status as ParkingSession["paymentStatus"],
    routeSteps: row.route_steps != null ? String(row.route_steps) : null,
    qrData: row.qr_data != null ? String(row.qr_data) : null,
  };
}

function runMigrations(d: SqlJsDatabase): void {
  d.run(`
    CREATE TABLE IF NOT EXISTS parking_slots (
      slot_id TEXT PRIMARY KEY,
      level TEXT NOT NULL,
      slot_type TEXT NOT NULL,
      available INTEGER NOT NULL DEFAULT 1,
      is_paid INTEGER NOT NULL DEFAULT 0,
      price_per_hour INTEGER NOT NULL DEFAULT 0,
      near_lift INTEGER NOT NULL DEFAULT 0
    );
  `);
  d.run(`
    CREATE TABLE IF NOT EXISTS parking_sessions (
      session_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      car_number TEXT NOT NULL,
      slot_id TEXT NOT NULL,
      booking_time TEXT NOT NULL,
      parking_start_time TEXT,
      exit_time TEXT,
      estimated_fee INTEGER,
      payment_status TEXT NOT NULL,
      route_steps TEXT,
      qr_data TEXT
    );
  `);
  d.run(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'user'))
    );
  `);
}

/**
 * Inserts every slot from `buildSeedSlots()` with INSERT OR IGNORE.
 * - Empty DB: all rows are inserted.
 * - Existing DB (e.g. older 24 slots/level): **missing** slot_ids (25–34 per level) are added without deleting bookings.
 */
function syncParkingSlotsFromSeed(d: SqlJsDatabase): void {
  const rows = buildSeedSlots();
  const ins = d.prepare(`
    INSERT OR IGNORE INTO parking_slots (slot_id, level, slot_type, available, is_paid, price_per_hour, near_lift)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const s of rows) {
    ins.run([
      s.slotId,
      s.level,
      s.slotType,
      s.available ? 1 : 0,
      s.isPaid ? 1 : 0,
      s.pricePerHour,
      s.nearLift ? 1 : 0,
    ]);
  }
  ins.free();
}

function seedUsersIfEmpty(d: SqlJsDatabase): void {
  const stmt = d.prepare("SELECT COUNT(*) AS c FROM users");
  stmt.step();
  const row = stmt.getAsObject() as { c: number };
  stmt.free();
  if (row.c > 0) return;

  const ins = d.prepare(`INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`);
  ins.run(["admin", hashPassword("Admin#123"), "admin"]);
  ins.run(["driver", hashPassword("Driver#123"), "user"]);
  ins.free();
}

/**
 * Ensures demo driver `sp` exists (password `Sp#123`).
 * Uses INSERT OR IGNORE so existing DBs pick up the row even if an older SELECT-based seed missed it.
 */
function ensureDemoUserSp(d: SqlJsDatabase): void {
  const ins = d.prepare(`INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)`);
  ins.run(["sp", hashPassword("Sp#123"), "user"]);
  ins.free();
}

function lastInsertRowid(d: SqlJsDatabase): number {
  const st = d.prepare("SELECT last_insert_rowid() AS id");
  st.step();
  const o = st.getAsObject() as { id: number };
  st.free();
  return Number(o.id);
}

/**
 * Open SQLite (sql.js), create tables, insert seed rows if `parking_slots` is empty.
 * Set `DATABASE_PATH` to a file path or `:memory:`.
 */
export async function initDatabase(): Promise<void> {
  if (db) return;

  const wasmDir = resolveSqlWasmDir();
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(wasmDir, file),
  });

  const dbPath = resolveDbPath();
  if (dbPath !== ":memory:" && fs.existsSync(dbPath)) {
    const filebuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(filebuffer);
  } else {
    db = new SQL.Database();
  }

  runMigrations(db);
  syncParkingSlotsFromSeed(db);
  seedUsersIfEmpty(db);
  ensureDemoUserSp(db);
  persistDb();
}

export function findUserByUsername(username: string):
  | { username: string; passwordHash: string; role: Role }
  | undefined {
  const key = username.trim().toLowerCase();
  const stmt = getDb().prepare("SELECT username, password_hash, role FROM users WHERE username = ?");
  stmt.bind([key]);
  if (!stmt.step()) {
    stmt.free();
    return undefined;
  }
  const row = stmt.getAsObject() as { username: string; password_hash: string; role: string };
  stmt.free();
  const role = row.role;
  if (role !== "admin" && role !== "user") return undefined;
  return { username: row.username, passwordHash: row.password_hash, role };
}

export function getAllSlots(): ParkingSlot[] {
  const d = getDb();
  const stmt = d.prepare("SELECT * FROM parking_slots ORDER BY level, slot_id");
  const out: ParkingSlot[] = [];
  while (stmt.step()) {
    out.push(rowToSlot(stmt.getAsObject() as Record<string, unknown>));
  }
  stmt.free();
  return out;
}

export function getSlotById(slotId: string): ParkingSlot | undefined {
  const stmt = getDb().prepare("SELECT * FROM parking_slots WHERE slot_id = ?");
  stmt.bind([slotId]);
  if (!stmt.step()) {
    stmt.free();
    return undefined;
  }
  const row = stmt.getAsObject() as Record<string, unknown>;
  stmt.free();
  return rowToSlot(row);
}

export function setSlotAvailable(slotId: string, available: boolean): void {
  const d = getDb();
  d.run("UPDATE parking_slots SET available = ? WHERE slot_id = ?", [available ? 1 : 0, slotId]);
  persistDb();
}

export function getAllSessions(): ParkingSession[] {
  const d = getDb();
  const stmt = d.prepare("SELECT * FROM parking_sessions ORDER BY session_id");
  const out: ParkingSession[] = [];
  while (stmt.step()) {
    out.push(rowToSession(stmt.getAsObject() as Record<string, unknown>));
  }
  stmt.free();
  return out;
}

export function findSessionById(sessionId: number): ParkingSession | undefined {
  const stmt = getDb().prepare("SELECT * FROM parking_sessions WHERE session_id = ?");
  stmt.bind([sessionId]);
  if (!stmt.step()) {
    stmt.free();
    return undefined;
  }
  const row = stmt.getAsObject() as Record<string, unknown>;
  stmt.free();
  return rowToSession(row);
}

export function insertSession(data: Omit<ParkingSession, "sessionId">): ParkingSession {
  const d = getDb();
  d.run(
    `INSERT INTO parking_sessions (
      user_id, car_number, slot_id, booking_time, parking_start_time, exit_time, estimated_fee, payment_status, route_steps, qr_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.userId,
      data.carNumber,
      data.slotId,
      data.bookingTime,
      data.parkingStartTime,
      data.exitTime,
      data.estimatedFee,
      data.paymentStatus,
      data.routeSteps,
      data.qrData,
    ],
  );
  const id = lastInsertRowid(d);
  persistDb();
  return findSessionById(id)!;
}

export function updateSessionFull(session: ParkingSession): void {
  const d = getDb();
  d.run(
    `UPDATE parking_sessions SET
      user_id = ?,
      car_number = ?,
      slot_id = ?,
      booking_time = ?,
      parking_start_time = ?,
      exit_time = ?,
      estimated_fee = ?,
      payment_status = ?,
      route_steps = ?,
      qr_data = ?
    WHERE session_id = ?`,
    [
      session.userId,
      session.carNumber,
      session.slotId,
      session.bookingTime,
      session.parkingStartTime,
      session.exitTime,
      session.estimatedFee,
      session.paymentStatus,
      session.routeSteps,
      session.qrData,
      session.sessionId,
    ],
  );
  persistDb();
}
