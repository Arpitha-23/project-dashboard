import { Router } from "express";
import { Role } from "@prisma/client";
import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware";
import {
  create,
  list,
  getById,
} from "../controllers/project.controller";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  authorizeRoles(Role.ADMIN, Role.PROJECT_MANAGER),
  list
);

router.get(
  "/:id",
  authorizeRoles(Role.ADMIN, Role.PROJECT_MANAGER),
  getById
);

router.post(
  "/",
  authorizeRoles(Role.ADMIN, Role.PROJECT_MANAGER),
  create
);

export default router;