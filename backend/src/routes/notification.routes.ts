import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";

import {
  list,
  unreadCount,
  markRead,
  markAllRead,
} from "../controllers/notification.controller";

const router = Router();

router.use(authenticate);

router.get("/", list);
router.get("/unread-count", unreadCount);
router.patch("/:id/read", markRead);
router.patch("/read-all", markAllRead);

export default router;