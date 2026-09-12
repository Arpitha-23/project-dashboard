import { Router } from "express";
import { Role } from "@prisma/client";
import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware";
import { getProtectedTest } from "../controllers/test.controller";

const router = Router();

router.get(
  "/protected",
  authenticate,
  getProtectedTest
);

router.get(
  "/admin-only",
  authenticate,
  authorizeRoles(Role.ADMIN),
  getProtectedTest
);

router.get(
  "/pm-only",
  authenticate,
  authorizeRoles(Role.PROJECT_MANAGER),
  getProtectedTest
);

router.get(
  "/developer-only",
  authenticate,
  authorizeRoles(Role.DEVELOPER),
  getProtectedTest
);

export default router;