import { Router } from "express";
import { getPracticeSets, getPracticeWords } from "../controllers/practiceController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = Router();

// Tất cả các route practice đều yêu cầu đăng nhập
router.use(protect);

// ── GET bộ từ dùng để luyện tập ────────────────────────────────
// Trả về { systemSets: [...], mySets: [...] }
router.get("/sets", getPracticeSets);

// ── GET từ vựng trong 1 bộ từ để chơi game ─────────────────────
// Query: ?isMyWord=true|false
router.get("/sets/:setId/words", getPracticeWords);

export default router;
