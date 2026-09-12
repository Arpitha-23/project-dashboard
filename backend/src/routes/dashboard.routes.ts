import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { summary } from "../controllers/dashboard.controller";

const router = Router();

router.use(authenticate);

router.get("/summary", summary);

export default router;
