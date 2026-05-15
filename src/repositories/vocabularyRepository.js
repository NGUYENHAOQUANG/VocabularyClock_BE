import { Vocabulary } from "../models/index.js";

export const findWordsBySet = (setId) => {
  return Vocabulary.find({ setId }).lean();
};

export const findByIds = (ids) => {
  return Vocabulary.find({ _id: { $in: ids } })
    .select('content phonetic type meaning examples')
    .lean();
};

export const findMyVocabs = (setId, userId) => {
  return Vocabulary.find({ setId, ownerId: userId, isSystemVocab: false })
    .select("-__v -createdAt -updatedAt")
    .lean();
};

export const findSystemVocabs = (setId) => {
  return Vocabulary.find({ setId, isSystemVocab: true })
    .select("-ownerId -isSystemVocab -createdAt -updatedAt -__v")
    .lean();
};

export const createVocab = (data) => {
  return Vocabulary.create(data);
};

export const updateVocab = (vocabId, userId, updateData) => {
  return Vocabulary.findOneAndUpdate(
    { _id: vocabId, ownerId: userId },
    updateData,
    { new: true, runValidators: true }
  );
};

export const deleteVocab = (vocabId, userId) => {
  return Vocabulary.findOneAndDelete({ _id: vocabId, ownerId: userId });
};

export const deleteVocabsBySets = (setIds) => {
  return Vocabulary.deleteMany({ setId: { $in: setIds } });
};
