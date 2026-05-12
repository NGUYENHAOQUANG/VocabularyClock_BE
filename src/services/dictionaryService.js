import * as topicRepo from "../repositories/topicRepository.js";
import * as vocabSetRepo from "../repositories/vocabSetRepository.js";
import * as vocabularyRepo from "../repositories/vocabularyRepository.js";

export const getSystemTopicsData = async () => {
  return topicRepo.findSystemTopics();
};

export const getSystemSetsByTopicData = async (topicId) => {
  const topicExists = await topicRepo.checkSystemTopicExists(topicId);
  if (!topicExists) return null;

  return vocabSetRepo.findSystemSets(topicId);
};

export const getSystemVocabsBySetData = async (setId) => {
  const setExists = await vocabSetRepo.checkSystemSetExists(setId);
  if (!setExists) return null;

  return vocabularyRepo.findSystemVocabs(setId);
};
