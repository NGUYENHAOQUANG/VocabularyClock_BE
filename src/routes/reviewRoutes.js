import { Router } from "express";
import {
  getDashboardStats,
  getLearnedWords,
  getDueTasks,
  getReviewSetWords,
  getReviewHistory,
  markWordRemembered,
  completeSetReview
} from "../controllers/reviewController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validateMiddleware.js";
import { markRememberedSchema, completeSetSchema } from "../validations/reviewValidation.js";

const router = Router();

// Toàn bộ module Review yêu cầu người dùng phải đăng nhập
router.use(protect);

// ── GET ────────────────────────────────────────────────────────
router.get("/dashboard", getDashboardStats);
router.get("/history", getReviewHistory);
router.get("/learned-words", getLearnedWords);
router.get("/due-tasks", getDueTasks);
router.get("/sets/:setId/words", getReviewSetWords);

// ── POST ───────────────────────────────────────────────────────
router.post("/words/:id/mark-remembered", validate(markRememberedSchema), markWordRemembered);
router.post("/sets/:setId/complete", validate(completeSetSchema), completeSetReview);

export default router;
