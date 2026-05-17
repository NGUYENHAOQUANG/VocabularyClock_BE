import mongoose from "mongoose";
import * as reviewLogRepo from "../repositories/reviewLogRepository.js";
import * as userSetProgressRepo from "../repositories/userSetProgressRepository.js";
import * as scheduledTaskRepo from "../repositories/scheduledTaskRepository.js";
import * as vocabularyRepo from "../repositories/vocabularyRepository.js";
import * as userVocabularyRepo from "../repositories/userVocabularyRepository.js";
import * as srsService from "./srsService.js";

const STATUS_LEVELS = [
  "new",
  "vague",
  "recognized",
  "applicable",
  "fluent",
  "stabilized",
  "mastered",
];
const userObjectId = (id) => new mongoose.Types.ObjectId(id);

export const getDashboardStatsData = async (userId) => {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [statsAggr, wrongWordsList] = await Promise.all([
    userVocabularyRepo.aggregateTabStats(userId, endOfToday),
    userVocabularyRepo.getWrongWordsByTab(userId),
  ]);

  const TAB_TYPES = ["vocabulary", "collocation", "idiom", "phrasal_verb"];
  const STATUS_LEVELS = [
    "new",
    "vague",
    "recognized",
    "applicable",
    "fluent",
    "stabilized",
    "mastered",
  ];

  // Khởi tạo map cho các tab
  const tabsMap = {};

  ["all", ...TAB_TYPES].forEach((tabId) => {
    tabsMap[tabId] = {
      tabId,
      tabLabel:
        tabId === "all"
          ? "All"
          : tabId === "phrasal_verb"
          ? "Phrasal Verb"
          : tabId.charAt(0).toUpperCase() + tabId.slice(1),
      new: 0,
      vague: 0,
      recognized: 0,
      applicable: 0,
      fluent: 0,
      stabilized: 0,
      mastered: 0,
      dueLearnCount: 0,
      dueReviewCount: 0,
      wrongWordCount: 0,
      wrongWords: [],
      againCount: 0,
      totalReviews: 0,
    };
  });

  // Phân bổ dữ liệu statsAggr
  statsAggr.forEach((item) => {
    const vType = item._id.vocabType || "vocabulary";
    const status = item._id.status || "new";

    if (tabsMap[vType]) {
      tabsMap[vType][status] += item.count;
      tabsMap[vType].totalReviews += item.totalAttempts;
      tabsMap[vType].againCount += item.incorrectCount;
      tabsMap[vType].dueLearnCount += item.dueLearn;
      tabsMap[vType].dueReviewCount += item.dueReview;
    }

    tabsMap.all[status] += item.count;
    tabsMap.all.totalReviews += item.totalAttempts;
    tabsMap.all.againCount += item.incorrectCount;
    tabsMap.all.dueLearnCount += item.dueLearn;
    tabsMap.all.dueReviewCount += item.dueReview;
  });

  // Phân bổ wrongWordsList
  wrongWordsList.forEach((word) => {
    const vType = word.type || "vocabulary";
    if (tabsMap[vType]) {
      tabsMap[vType].wrongWords.push(word);
      tabsMap[vType].wrongWordCount = tabsMap[vType].wrongWords.length;
    }
    tabsMap.all.wrongWords.push(word);
    tabsMap.all.wrongWordCount = tabsMap.all.wrongWords.length;
  });

  return [
    tabsMap.all,
    tabsMap.vocabulary,
    tabsMap.collocation,
    tabsMap.idiom,
    tabsMap.phrasal_verb,
  ];
};

export const getDueTasksData = async (userId) => {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const dueProgresses = await userSetProgressRepo.findDueProgresses(
    userId,
    endOfToday,
  );

  if (!dueProgresses.length) return [];

  const dueSetIds = dueProgresses.map((p) => p.setId._id);
  const tasks = await scheduledTaskRepo.findTasksWithSpecificSets(
    userId,
    dueSetIds,
  );

  return dueProgresses.map((progress) => {
    const set = progress.setId;
    const parentTask = tasks.find((t) =>
      t.setIds.map((id) => id.toString()).includes(set._id.toString()),
    );

    return {
      _id: set._id,
      name: set.name,
      itemCount: set.itemCount,
      image: set.image,
      coverImage: set.coverImage,
      status: progress.status,
      reviewCount: progress.reviewCount,
      taskInfo: parentTask
        ? {
            taskId: parentTask._id,
            time: parentTask.time,
            name: parentTask.name,
          }
        : null,
    };
  });
};

export const getReviewHistoryData = async (userId) => {
  const history = await reviewLogRepo.getHistoryAggregation(userId);

  const ACTION_LABELS = {
    flashcard: "Flashcards",
    quiz: "Nhớ nghĩa",
    typing: "Viết chính xác từ",
    writing: "Viết lại câu",
    picture: "Nhìn hình ảnh",
  };

  return history.map((session) => {
    const methodsMap = {};
    const incorrectVocabIds = new Set();
    const logs = session.logs || [];

    logs.forEach((log) => {
      if (!log.actionType) return;
      if (!methodsMap[log.actionType])
        methodsMap[log.actionType] = { correct: 0, incorrect: 0 };
      if (log.result === "good" || log.result === "easy") {
        methodsMap[log.actionType].correct += 1;
      } else {
        methodsMap[log.actionType].incorrect += 1;
        // Chỉ đếm là "từ sai cần ôn lại" nếu chưa được fix
        if (log.vocabId && !log.isFixed)
          incorrectVocabIds.add(log.vocabId.toString());
      }
    });

    const methods = Object.keys(methodsMap).map((type) => ({
      type,
      label: ACTION_LABELS[type] || type,
      correct: methodsMap[type].correct,
      incorrect: methodsMap[type].incorrect,
    }));

    return {
      sessionId: session.sessionId,
      sessionType: session.sessionType,
      setName:
        session.setName || session.setDetails?.name || "Bộ từ không xác định",
      reviewedAt: session.reviewedAt,
      methods,
      // Số từ sai chưa được fix (để quyết định hiện/ẩn nút Ôn lại)
      incorrectCount: incorrectVocabIds.size,
    };
  });
};

/**
 * GET /review/session/:sessionId/wrong-words
 * Lấy từ sai chưa fix của session, group theo actionType,
 * kèm thông tin chi tiết của từng từ vựng.
 */
export const getSessionWrongWordsData = async (sessionId, userId) => {
  // grouped: { flashcard: ['id1', 'id2'], quiz: ['id3'] }
  const grouped = await reviewLogRepo.getSessionWrongWordIds(sessionId, userId);
  if (Object.keys(grouped).length === 0) return {};

  // Lấy tất cả vocabId unique
  const allIds = [...new Set(Object.values(grouped).flat())];
  const words = await vocabularyRepo.findByIds(allIds);

  // Map id -> word object
  const wordMap = {};
  words.forEach((w) => {
    wordMap[w._id.toString()] = w;
  });

  // Build result: { actionType: [ { _id, content, phonetic, meaning } ] }
  const result = {};
  for (const [actionType, ids] of Object.entries(grouped)) {
    result[actionType] = ids
      .map((id) => wordMap[id])
      .filter(Boolean)
      .map((w) => ({
        _id: w._id,
        content: w.content,
        phonetic: w.phonetic ?? "",
        meaning: w.meaning ?? "",
      }));
  }
  return result;
};

/**
 * POST /review/session/:originalSessionId/fix-words
 * Đánh dấu isFixed=true cho các từ trả lời đúng trong lượt ôn lại.
 * Đồng thời cập nhật UserVocabulary stats cho các từ vừa chơi.
 * KHÔNG tạo ReviewLog mới (tránh làm rác lịch sử).
 */
export const fixWrongWordsData = async (
  userId,
  originalSessionId,
  fixedByType,
  logs,
) => {
  if (fixedByType && Object.keys(fixedByType).length > 0) {
    await reviewLogRepo.markLogsAsFixed(userId, originalSessionId, fixedByType);
  }
  if (logs && logs.length > 0) {
    // fixWrongWords: không biết setId, bỏ qua setOnInsert.setId cho trường hợp này
    await userVocabularyRepo.bulkUpdateStats(userId, logs);
  }
};

/**
 * GET /review/session/:sessionId/words
 * Trả về danh sách từ vựng thực tế trong 1 phiên học cùng trạng thái đúng/sai
 */
export const getSessionWordsData = async (sessionId, userId) => {
  const log = await reviewLogRepo.findBySessionId(sessionId, userId);
  if (!log || !log.logs || log.logs.length === 0) return [];

  // Gom vocabIds và xác định đúng/sai
  const vocabResultMap = {}; // vocabId -> { isCorrect, wrongCount }
  log.logs.forEach((entry) => {
    const id = entry.vocabId.toString();
    const isCorrect = entry.result === "good" || entry.result === "easy";
    if (!vocabResultMap[id]) {
      vocabResultMap[id] = { isCorrect, wrongCount: 0 };
    }
    if (!isCorrect) {
      vocabResultMap[id].isCorrect = false;
      vocabResultMap[id].wrongCount += 1;
    }
  });

  const vocabIds = Object.keys(vocabResultMap);
  const words = await vocabularyRepo.findByIds(vocabIds);

  return words.map((w) => {
    const id = w._id.toString();
    const result = vocabResultMap[id] ?? { isCorrect: true, wrongCount: 0 };
    return {
      _id: w._id,
      content: w.content,
      phonetic: w.phonetic ?? "",
      meaning: w.meaning ?? "",
      isCorrect: result.isCorrect,
      wrongCount: result.wrongCount,
    };
  });
};

export const getReviewSetWordsData = async (setId, userId) => {
  const words = await vocabularyRepo.findWordsBySet(setId);
  const userVocabs = await userVocabularyRepo.findUserVocabs(
    userId,
    words.map((w) => w._id),
  );

  return words.map((word) => {
    const userRecord = userVocabs.find(
      (uv) => uv.vocabId.toString() === word._id.toString(),
    );
    return {
      _id: word._id,
      content: word.content,
      phonetic: word.phonetic,
      type: word.type,
      meaning: word.meaning,
      examples: word.examples,
      isMarkedRemembered: userRecord ? userRecord.isMarkedRemembered : false,
    };
  });
};

export const getLearnedWordsData = async (userId, day, status) => {
  return userVocabularyRepo.aggregateLearnedWords(userId, day, status);
};

export const markWordRememberedData = async (userId, vocabId, isRemembered) => {
  return userVocabularyRepo.updateRememberedFlag(userId, vocabId, isRemembered);
};

export const completeSetReviewData = async (
  userId,
  setId,
  sessionType,
  sessionId,
  logs,
  setName,
  originalSessionId,
) => {
  if (logs && logs.length > 0) {
    const reviewLogs = logs.map((log) => ({
      vocabId: log.vocabId,
      result: log.result,
      actionType: log.actionType,
      responseTime: log.responseTime || 0,
    }));
    // 1. Lưu log bằng kỹ thuật Gộp mảng (Array Embedding)
    await reviewLogRepo.upsertSessionLogs(
      userId,
      setId,
      sessionType,
      sessionId,
      reviewLogs,
      setName,
    );

    // 2. Cập nhật thống kê chuyên sâu (Analytics) cho từng từ
    await userVocabularyRepo.bulkUpdateStats(userId, logs, setId);

    // 3. Patch learnedDayOfWeek cho các MyWord records đã tồn tại từ trước
    //    ($setOnInsert trong bulkUpdateStats chỉ chạy khi INSERT mới)
    const vocabIds = logs.map((l) => l.vocabId).filter(Boolean);
    if (vocabIds.length > 0) {
      await userVocabularyRepo.setLearnedDayIfMissing(userId, vocabIds, setId);
    }

    // 3. Nếu là lượt ôn lại từ sai, đánh dấu isFixed cho những từ được trả lời đúng
    if (originalSessionId) {
      // Group các từ trả lời đúng theo actionType
      const fixedByType = {};
      logs.forEach((log) => {
        if (log.result === "good" || log.result === "easy") {
          if (!fixedByType[log.actionType]) fixedByType[log.actionType] = [];
          fixedByType[log.actionType].push(log.vocabId);
        }
      });
      if (Object.keys(fixedByType).length > 0) {
        await reviewLogRepo.markLogsAsFixed(
          userId,
          originalSessionId,
          fixedByType,
        );
      }
    }
  }

  // Nếu chỉ là luyện tập (practice) thì không cập nhật tiến độ SRS
  if (sessionType === "practice") {
    return { status: "practice", nextReviewDate: null };
  }

  let progress = await userSetProgressRepo.findProgress(userId, setId);

  if (!progress) {
    progress = await userSetProgressRepo.createProgress({
      userId,
      setId,
      status: "new",
      interval: 0,
      nextReviewDate: new Date(),
    });
  }

  const srsResult = srsService.calculateNextReview(progress.status);

  progress.status = srsResult.newStatus;
  progress.interval = srsResult.newInterval;
  progress.nextReviewDate = srsResult.nextReviewDate;
  progress.reviewCount += 1;
  progress.lastReviewedAt = new Date();

  await userSetProgressRepo.saveProgress(progress);
  await userVocabularyRepo.resetRememberedFlags(userId, setId);

  return progress;
};

/**
 * Lấy danh sách các bộ từ user đang học (UserSetProgress) — phục vụ LearnedWordsListScreen (Theo bộ từ)
 */
export const getUserSetsData = async (userId, isSystem) => {
  const progresses = await userSetProgressRepo.findAllProgressByUser(userId);
  return progresses
    .filter((p) => {
      if (!p.setId) return false; // Bỏ qua các progress "mồ côi" (setId đã bị xóa)
      if (isSystem === undefined) return true;
      return (p.setId?.isSystemSet ?? true) === isSystem;
    })
    .map((p) => ({
      _id: p.setId._id.toString(),
      topicId: p.setId?.topicId,
      name: p.setId?.name,
      itemCount: p.setId?.itemCount,
      image: p.setId?.image,
      coverImage: p.setId?.coverImage,
      isSystemSet: p.setId?.isSystemSet ?? true,
      status: p.status,
      reviewCount: p.reviewCount,
      nextReviewDate: p.nextReviewDate,
    }));
};
