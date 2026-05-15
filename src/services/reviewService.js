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
  const statusAggregation =
    await userSetProgressRepo.aggregateStatusStats(userId);

  const statusCounts = STATUS_LEVELS.reduce((acc, status) => {
    const found = statusAggregation.find((s) => s._id === status);
    acc[status] = found ? found.totalWords : 0;
    return acc;
  }, {});

  const totalVocab = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const correctAnswers = await reviewLogRepo.countAnswersByResult(userId, [
    "good",
    "easy",
  ]);
  const incorrectAnswers = await reviewLogRepo.countAnswersByResult(userId, [
    "again",
    "hard",
  ]);
  const totalReviews = await reviewLogRepo.countTotalReviews(userId);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const dueSetsAggregation = await userSetProgressRepo.aggregateDueWordsCount(
    userId,
    endOfToday,
  );
  const dueWordsCount =
    dueSetsAggregation.length > 0 ? dueSetsAggregation[0].dueWordsCount : 0;

  return {
    totalVocab,
    statusCounts,
    accuracyStats: { correctAnswers, incorrectAnswers, totalReviews },
    dueWordsCount,
  };
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
    flashcard: 'Flashcard',
    quiz: 'Trắc nghiệm',
    typing: 'Gõ từ',
    writing: 'Viết câu',
    picture: 'Nối hình',
  };

  return history.map((session) => {
    const methodsMap = {};
    const incorrectVocabIds = new Set();
    const logs = session.logs || [];

    logs.forEach((log) => {
      if (!log.actionType) return;
      if (!methodsMap[log.actionType])
        methodsMap[log.actionType] = { correct: 0, incorrect: 0 };
      if (log.result === 'good' || log.result === 'easy') {
        methodsMap[log.actionType].correct += 1;
      } else {
        methodsMap[log.actionType].incorrect += 1;
        if (log.vocabId) incorrectVocabIds.add(log.vocabId.toString());
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
      setName: session.setName || session.setDetails?.name || 'Bộ từ không xác định',
      reviewedAt: session.reviewedAt,
      methods,
      incorrectCount: incorrectVocabIds.size,
      incorrectVocabIds: Array.from(incorrectVocabIds),
    };
  });
};

/**
 * GET /review/session/:sessionId/words
 * Trả về danh sách từ vựng thực tế trong 1 phiên học cùng trạng thái đúng/sai
 */
export const getSessionWordsData = async (sessionId, userId) => {
  const log = await reviewLogRepo.findBySessionId(sessionId, userId);
  if (!log || !log.logs || log.logs.length === 0) return [];

  // Gom vocabIds và xác định đúng/sai
  const vocabResultMap = {};   // vocabId -> { isCorrect, wrongCount }
  log.logs.forEach((entry) => {
    const id = entry.vocabId.toString();
    const isCorrect = entry.result === 'good' || entry.result === 'easy';
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
      phonetic: w.phonetic ?? '',
      meaning: w.meaning ?? '',
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
  setName
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
      setName
    );

    // 2. Cập nhật thống kê chuyên sâu (Analytics) cho từng từ
    await userVocabularyRepo.bulkUpdateStats(userId, logs);
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
export const getUserSetsData = async (userId) => {
  const progresses = await userSetProgressRepo.findAllProgressByUser(userId);
  return progresses.map((p) => ({
    _id: p.setId?._id,
    topicId: p.setId?.topicId,
    name: p.setId?.name,
    itemCount: p.setId?.itemCount,
    image: p.setId?.image,
    coverImage: p.setId?.coverImage,
    status: p.status,
    reviewCount: p.reviewCount,
    nextReviewDate: p.nextReviewDate,
  }));
};
