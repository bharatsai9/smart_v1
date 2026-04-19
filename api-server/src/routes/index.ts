import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import slotsRouter from "./slots";
import recommendationRouter from "./recommendation";
import sessionsRouter from "./sessions";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(slotsRouter);
router.use(recommendationRouter);
router.use(sessionsRouter);
router.use(dashboardRouter);

export default router;
