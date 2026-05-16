import * as topicRepo from "../repositories/topicRepository.js";
import * as vocabSetRepo from "../repositories/vocabSetRepository.js";
import * as vocabularyRepo from "../repositories/vocabularyRepository.js";
import * as userVocabularyRepo from "../repositories/userVocabularyRepository.js";
import * as userSetProgressRepo from "../repositories/userSetProgressRepository.js";

/**
 * GET /api/my-words/progress
 * Trả về tiến độ học của từng Topic trong My Words.
 * Dựa vào UserSetProgress: kiểm tra những set nào của user (isSystemSet=false) đã được học.
 * Kết quả: [{ topicId, learnedSets }]
 */
export const getMyWordsProgressData = async (userId) => {
  // 1. Lấy tất cả set trong My Words của user
  const allSets = await vocabSetRepo.findMySetsAll(userId);
  const setIds = allSets.map((s) => s._id);

  if (setIds.length === 0) return [];

  // 2. Kiểm tra set nào đã có UserSetProgress (tức là đã học qua ít nhất 1 lần)
  const progresses = await userSetProgressRepo.findProgressesBySetIds(
    userId,
    setIds,
  );
  const learnedSetIds = new Set(progresses.map((p) => p.setId.toString()));

  // 3. Group theo topicId: đếm số set đã học và tổng số set của từng topic
  const topicMap = {};
  allSets.forEach((set) => {
    const topicId = set.topicId?.toString();
    if (!topicId) return;
    if (!topicMap[topicId])
      topicMap[topicId] = { total: 0, learned: 0, ids: [] };
    topicMap[topicId].total += 1;
    if (learnedSetIds.has(set._id.toString())) {
      topicMap[topicId].learned += 1;
      topicMap[topicId].ids.push(set._id.toString());
    }
  });

  return Object.entries(topicMap).map(([topicId, counts]) => ({
    topicId,
    learnedSets: counts.learned,
    totalSets: counts.total,
    learnedSetIds: counts.ids,
  }));
};

// --- Topic ---

export const getMyTopicsData = async (userId) => {
  return topicRepo.findMyTopics(userId);
};

export const createMyTopicData = async (userId, data) => {
  return topicRepo.createTopic({
    ...data,
    ownerId: userId,
    isSystemTopic: false,
  });
};

export const updateMyTopicData = async (id, userId, data) => {
  return topicRepo.updateTopic(id, userId, data);
};

export const deleteMyTopicData = async (id, userId) => {
  const topic = await topicRepo.deleteTopic(id, userId);
  if (!topic) return null;

  const sets = await vocabSetRepo.findSetsByTopic(topic._id);
  const setIds = sets.map((s) => s._id);

  await vocabSetRepo.deleteSetsByTopic(topic._id);
  await vocabularyRepo.deleteVocabsBySets(setIds);
  await userVocabularyRepo.deleteUserVocabsBySets(setIds, userId);

  return topic;
};

// --- VocabSet ---

export const getMySetsData = async (topicId, userId) => {
  return vocabSetRepo.findMySets(topicId, userId);
};

export const createMySetData = async (userId, data) => {
  const topicExists = await topicRepo.checkTopicExists(data.topicId, userId);
  if (!topicExists) return null;

  const newSet = await vocabSetRepo.createSet({
    ...data,
    ownerId: userId,
    isSystemSet: false,
  });

  await topicRepo.incrementSetCount(data.topicId, 1);
  return newSet;
};

export const updateMySetData = async (id, userId, data) => {
  return vocabSetRepo.updateSet(id, userId, data);
};

export const deleteMySetData = async (id, userId) => {
  const set = await vocabSetRepo.deleteSet(id, userId);
  if (!set) return null;

  await topicRepo.updateTopicStats(set.topicId, -1, -set.itemCount);
  await vocabularyRepo.deleteVocabsBySets([set._id]);
  await userVocabularyRepo.deleteUserVocabsBySets([set._id], userId);

  return set;
};

// --- Vocabulary ---

export const getMyVocabsData = async (setId, userId) => {
  return vocabularyRepo.findMyVocabs(setId, userId);
};

export const createMyVocabData = async (userId, data) => {
  const vocabSet = await vocabSetRepo.findSet(data.setId, userId);
  if (!vocabSet) return null;

  const newVocab = await vocabularyRepo.createVocab({
    ...data,
    ownerId: userId,
    isSystemVocab: false,
  });

  await vocabSetRepo.updateSet(data.setId, userId, { $inc: { itemCount: 1 } });
  await topicRepo.incrementItemCount(vocabSet.topicId, 1);

  await userVocabularyRepo.createUserVocab({
    userId,
    vocabId: newVocab._id,
    setId: data.setId,
    vocabType: data.type,
    status: "new",
  });

  return newVocab;
};

export const updateMyVocabData = async (id, userId, data) => {
  return vocabularyRepo.updateVocab(id, userId, data);
};

export const deleteMyVocabData = async (id, userId) => {
  const vocab = await vocabularyRepo.deleteVocab(id, userId);
  if (!vocab) return null;

  await userVocabularyRepo.deleteUserVocab(vocab._id, userId);
  const vocabSet = await vocabSetRepo.updateSet(vocab.setId, userId, {
    $inc: { itemCount: -1 },
  });
  if (vocabSet) {
    await topicRepo.incrementItemCount(vocabSet.topicId, -1);
  }

  return vocab;
};

export const getAllMySetsData = async (userId) => {
  return vocabSetRepo.findMySetsAll(userId);
};
