import * as reviewLogRepo from "../repositories/reviewLogRepository.js";
import * as userSetProgressRepo from "../repositories/userSetProgressRepository.js";
import * as scheduledTaskRepo from "../repositories/scheduledTaskRepository.js";
import * as vocabularyRepo from "../repositories/vocabularyRepository.js";
import * as userVocabularyRepo from "../repositories/userVocabularyRepository.js";
import * as srsService from "./srsService.js";

const STATUS_LEVELS = ["new", "vague", "recognized", "applicable", "fluent", "stabilized", "mastered"];
const userObjectId = (id) => new mongoose.Types.ObjectId(id);

export const getDashboardStatsData = async (userId) => {
  const statusAggregation = await userSetProgressRepo.aggregateStatusStats(userId);

  const statusCounts = STATUS_LEVELS.reduce((acc, status) => {
    const found = statusAggregation.find((s) => s._id === status);
    acc[status] = found ? found.totalWords : 0;
    return acc;
  }, {});

  const totalVocab = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const correctAnswers = await reviewLogRepo.countAnswersByResult(userId, ["good", "easy"]);
  const incorrectAnswers = await reviewLogRepo.countAnswersByResult(userId, ["again", "hard"]);
  const totalReviews = await reviewLogRepo.countTotalReviews(userId);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const dueSetsAggregation = await userSetProgressRepo.aggregateDueWordsCount(userId, endOfToday);
  const dueWordsCount = dueSetsAggregation.length > 0 ? dueSetsAggregation[0].dueWordsCount : 0;

  return { totalVocab, statusCounts, accuracyStats: { correctAnswers, incorrectAnswers, totalReviews }, dueWordsCount };
};

export const getDueTasksData = async (userId) => {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const dueProgresses = await userSetProgressRepo.findDueProgresses(userId, endOfToday);

  if (!dueProgresses.length) return [];

  const dueSetIds = dueProgresses.map(p => p.setId._id);
  const tasks = await scheduledTaskRepo.findTasksWithSpecificSets(userId, dueSetIds);

  return dueProgresses.map(progress => {
    const set = progress.setId;
    const parentTask = tasks.find(t => t.setIds.map(id => id.toString()).includes(set._id.toString()));

    return {
      _id: set._id,
      name: set.name,
      itemCount: set.itemCount,
      image: set.image,
      coverImage: set.coverImage,
      status: progress.status,
      reviewCount: progress.reviewCount,
      taskInfo: parentTask ? { taskId: parentTask._id, time: parentTask.time, name: parentTask.name } : null
    };
  });
};

export const getReviewHistoryData = async (userId) => {
  const history = await reviewLogRepo.getHistoryAggregation(userId);

  return history.map(session => {
    const { logs } = session;
    const methodsMap = {};
    const incorrectVocabIds = new Set();

    logs.forEach(log => {
      if (!methodsMap[log.actionType]) methodsMap[log.actionType] = { correct: 0, incorrect: 0 };
      if (log.result === 'good' || log.result === 'easy') {
        methodsMap[log.actionType].correct += 1;
      } else {
        methodsMap[log.actionType].incorrect += 1;
        incorrectVocabIds.add(log.vocabId.toString());
      }
    });

    const methods = Object.keys(methodsMap).map(type => {
      let label = 'Unknown';
      if (type === 'flashcard') label = 'Flashcard';
      else if (type === 'quiz') label = 'Trắc nghiệm';
      else if (type === 'typing') label = 'Gõ từ';
      else if (type === 'writing') label = 'Viết câu';
      return { type, label, correct: methodsMap[type].correct, incorrect: methodsMap[type].incorrect };
    });

    return {
      sessionId: session._id,
      sessionType: session.sessionType,
      setName: session.setDetails.name,
      reviewedAt: session.reviewedAt,
      methods,
      incorrectCount: incorrectVocabIds.size,
      incorrectVocabIds: Array.from(incorrectVocabIds)
    };
  });
};

export const getReviewSetWordsData = async (setId, userId) => {
  const words = await vocabularyRepo.findWordsBySet(setId);
  const userVocabs = await userVocabularyRepo.findUserVocabs(userId, words.map((w) => w._id));

  return words.map((word) => {
    const userRecord = userVocabs.find((uv) => uv.vocabId.toString() === word._id.toString());
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

export const completeSetReviewData = async (userId, setId, sessionType, sessionId, logs) => {
  if (logs && logs.length > 0) {
    const reviewLogs = logs.map((log) => ({
      userId,
      vocabId: log.vocabId,
      setId,
      sessionId,
      sessionType,
      result: log.result,
      actionType: log.actionType,
      responseTime: log.responseTime || 0,
      reviewedAt: new Date(),
    }));
    await reviewLogRepo.insertLogs(reviewLogs);
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
