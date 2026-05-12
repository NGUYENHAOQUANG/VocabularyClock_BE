import { Router } from "express";
import {
  getTasks,
  createTask,
  getTaskDetails,
  updateTask,
  deleteTask,
  addSetsToTask,
  removeSetFromTask,
  getAvailableSets
} from "../controllers/scheduleController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validateMiddleware.js";
import { 
  createScheduledTaskSchema, 
  updateScheduledTaskSchema, 
  addSetsToTaskSchema, 
  removeSetFromTaskSchema 
} from "../validations/scheduleValidation.js";

const router = Router();

router.use(protect);

// API Hỗ trợ cho Modal Thêm bộ từ
router.get("/available-sets", getAvailableSets);

// CRUD cho Lịch trình (ScheduledTask)
router.get("/tasks", getTasks);
router.post("/tasks", validate(createScheduledTaskSchema), createTask);
router.get("/tasks/:id", getTaskDetails);
router.put("/tasks/:id", validate(updateScheduledTaskSchema), updateTask);
router.delete("/tasks/:id", deleteTask);

// Gắn / Gỡ bộ từ khỏi Lịch trình
router.post("/tasks/:id/add-sets", validate(addSetsToTaskSchema), addSetsToTask);
router.post("/tasks/:id/remove-set", validate(removeSetFromTaskSchema), removeSetFromTask);

export default router;
