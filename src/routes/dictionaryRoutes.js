import { Router } from "express";
import {
  getSystemTopics,
  getSystemSetsByTopic,
  getSystemVocabsBySet,
} from "../controllers/dictionaryController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = Router();

// Lấy danh sách toàn bộ Topic hệ thống
router.get("/topics", protect, getSystemTopics);

// Lấy danh sách các VocabSet thuộc 1 Topic
router.get("/topics/:id/sets", protect, getSystemSetsByTopic);

// Lấy danh sách các Vocabulary thuộc 1 VocabSet
router.get("/sets/:id/vocabularies", protect, getSystemVocabsBySet);

export default router;
