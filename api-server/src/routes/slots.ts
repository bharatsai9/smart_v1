import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, parkingSlotsTable } from "@workspace/db";
import { GetSlotsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/slots", async (req, res): Promise<void> => {
  const query = GetSlotsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let slots = await db.select().from(parkingSlotsTable);

  if (query.data.level) {
    slots = slots.filter((s) => s.level === query.data.level);
  }
  if (query.data.slotType) {
    slots = slots.filter((s) => s.slotType === query.data.slotType);
  }

  res.json(slots);
});

export default router;
