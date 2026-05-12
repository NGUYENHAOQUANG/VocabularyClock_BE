import { Topic } from "../models/index.js";

export const findMyTopics = (userId) => {
  return Topic.find({ ownerId: userId, isSystemTopic: false })
    .select("-__v -createdAt -updatedAt")
    .lean();
};

export const findSystemTopics = () => {
  return Topic.find({ isSystemTopic: true })
    .select("name description color imageUrl typeId totalSets totalItems")
    .lean();
};

export const checkSystemTopicExists = (topicId) => {
  return Topic.exists({ _id: topicId, isSystemTopic: true });
};

export const createTopic = (data) => {
  return Topic.create(data);
};

export const checkTopicExists = (topicId, userId) => {
  return Topic.exists({ _id: topicId, ownerId: userId });
};

export const incrementSetCount = (topicId, amount) => {
  return Topic.findByIdAndUpdate(topicId, { $inc: { totalSets: amount } });
};

export const incrementItemCount = (topicId, amount) => {
  return Topic.findByIdAndUpdate(topicId, { $inc: { totalItems: amount } });
};

export const updateTopicStats = (topicId, setInc, itemInc) => {
  return Topic.findByIdAndUpdate(topicId, { $inc: { totalSets: setInc, totalItems: itemInc } });
};

export const updateTopic = (topicId, userId, updateData) => {
  return Topic.findOneAndUpdate(
    { _id: topicId, ownerId: userId },
    updateData,
    { new: true, runValidators: true }
  );
};

export const deleteTopic = (topicId, userId) => {
  return Topic.findOneAndDelete({ _id: topicId, ownerId: userId });
};
