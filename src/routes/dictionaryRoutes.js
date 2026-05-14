import { Router } from "express";
import {
  getSystemTopics,
  getSystemSetsByTopic,
  getSystemVocabsBySet,
} from "../controllers/dictionaryController.js";

const router = Router();

// ── Public routes – Không cần đăng nhập ──────────────────────────────────────
// Dictionary là nội dung công khai (từ điển chung), bất kỳ ai cũng có thể xem.
// Chỉ các tính năng cá nhân hóa (My Words, Review, Progress) mới cần protect.

// Lấy danh sách toàn bộ Topic hệ thống
router.get("/topics", getSystemTopics);

// Lấy danh sách các VocabSet thuộc 1 Topic
router.get("/topics/:id/sets", getSystemSetsByTopic);

// Lấy danh sách các Vocabulary thuộc 1 VocabSet
router.get("/sets/:id/vocabularies", getSystemVocabsBySet);

export default router;
