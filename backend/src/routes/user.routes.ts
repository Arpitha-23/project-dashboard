import { Router } from "express";
import { Role } from "@prisma/client";
import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware";
import { getDevelopers } from "../controllers/user.controller";

const router = Router();

router.use(authenticate);

router.get(
  "/developers",
  authorizeRoles(Role.ADMIN, Role.PROJECT_MANAGER),
  getDevelopers
);

export default router;