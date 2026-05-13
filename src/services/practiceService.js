import * as vocabularyRepo from "../repositories/vocabularyRepository.js";
import * as vocabSetRepo from "../repositories/vocabSetRepository.js";
import * as userVocabularyRepo from "../repositories/userVocabularyRepository.js";
import * as userSetProgressRepo from "../repositories/userSetProgressRepository.js";

/**
 * Lấy danh sách bộ từ có thể luyện tập
 * - Bộ từ hệ thống: tất cả VocabSet isSystemSet=true
 * - Bộ từ cá nhân: các bộ từ thuộc ownerId = userId
 */
export const getPracticeSetsData = async (userId) => {
  const [systemSets, mySets] = await Promise.all([
    vocabSetRepo.findSystemSets(),
    vocabSetRepo.findMySetsAll(userId),
  ]);

  return {
    systemSets: systemSets.map((s) => ({
      _id: s._id,
      name: s.name,
      itemCount: s.itemCount,
      image: s.image,
      coverImage: s.coverImage,
      isSystemSet: true,
    })),
    mySets: mySets.map((s) => ({
      _id: s._id,
      name: s.name,
      itemCount: s.itemCount,
      topicId: s.topicId,
      image: s.image,
      coverImage: s.coverImage,
      isSystemSet: false,
    })),
  };
};

/**
 * Lấy danh sách từ vựng trong 1 bộ từ để chơi game
 * Bao gồm cả progress của user để có thể tùy chỉnh game level
 */
export const getPracticeWordsData = async (userId, setId, isMyWord) => {
  let vocabularies;

  if (isMyWord) {
    // Bộ từ cá nhân: lấy từ kho cá nhân
    vocabularies = await vocabularyRepo.findVocabsBySet(setId);
  } else {
    // Bộ từ hệ thống: lấy từ kho hệ thống
    vocabularies = await vocabularyRepo.findSystemVocabsBySet(setId);
  }

  if (!vocabularies || vocabularies.length === 0) {
    return [];
  }

  // Lấy trạng thái học từng từ của user (nếu cần)
  const userVocabMap = {};
  if (userId) {
    const userVocabs = await userVocabularyRepo.findUserVocabsBySet(userId, setId);
    userVocabs.forEach((uv) => {
      userVocabMap[uv.vocabId?.toString()] = uv;
    });
  }

  return vocabularies.map((v) => {
    const userVocab = userVocabMap[v._id?.toString()];
    return {
      _id: v._id,
      content: v.content,
      phonetic: v.phonetic,
      type: v.type,
      meaning: v.meaning,
      example: v.example,
      imageUrl: v.imageUrl,
      audioUrl: v.audioUrl,
      // Trạng thái học của user cho từ này
      masteryStatus: userVocab?.status || "new",
      isRemembered: userVocab?.isRemembered || false,
    };
  });
};
