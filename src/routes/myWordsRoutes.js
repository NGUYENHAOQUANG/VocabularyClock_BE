import { Router } from "express";
import {
  getMyTopics,
  createMyTopic,
  updateMyTopic,
  deleteMyTopic,
  getMySets,
  createMySet,
  updateMySet,
  deleteMySet,
  getMyVocabs,
  createMyVocab,
  updateMyVocab,
  deleteMyVocab,
  getAllMySets,
} from "../controllers/myWordsController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validateMiddleware.js";
import {
  createTopicSchema,
  createSetSchema,
  createVocabSchema,
  updateTopicSchema,
  updateSetSchema,
  updateVocabSchema,
} from "../validations/myWordsValidation.js";

const router = Router();

// Tất cả các route trong module này đều là dữ liệu cá nhân, bắt buộc phải đăng nhập
router.use(protect);

// ── CRUD Topics ─────────────────────────────────────────────────
router
  .route("/topics")
  .get(getMyTopics)
  .post(validate(createTopicSchema), createMyTopic);

router
  .route("/topics/:id")
  .put(validate(updateTopicSchema), updateMyTopic)
  .delete(deleteMyTopic);

router.get("/topics/:id/sets", getMySets);

// ── CRUD Sets ───────────────────────────────────────────────────

router
  .route("/sets")
  .get(getAllMySets)
  .post(validate(createSetSchema), createMySet);

router
  .route("/sets/:id")
  .put(validate(updateSetSchema), updateMySet)
  .delete(deleteMySet);

router.get("/sets/:id/vocabularies", getMyVocabs);

// ── CRUD Vocabularies ───────────────────────────────────────────
router
  .route("/vocabularies")
  .post(validate(createVocabSchema), createMyVocab);

router
  .route("/vocabularies/:id")
  .put(validate(updateVocabSchema), updateMyVocab)
  .delete(deleteMyVocab);

export default router;
