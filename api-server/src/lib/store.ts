/**
 * Persistence is SQLite (via sql.js) in `database.ts`.
 */
export {
  initDatabase,
  getAllSlots,
  getSlotById,
  setSlotAvailable,
  getAllSessions,
  findSessionById,
  insertSession,
  updateSessionFull,
  resolveDbPath,
} from "./database";

import { initDatabase } from "./database";

export async function initializeStore(): Promise<void> {
  await initDatabase();
}
