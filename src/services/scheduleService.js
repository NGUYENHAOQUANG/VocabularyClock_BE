import * as scheduledTaskRepo from "../repositories/scheduledTaskRepository.js";
import * as vocabSetRepo from "../repositories/vocabSetRepository.js";
import * as userSetProgressRepo from "../repositories/userSetProgressRepository.js";

export const getAvailableSetsData = async (userId) => {
  const tasks = await scheduledTaskRepo.findTasksByUserId(userId, 'setIds');
  const scheduledSetIds = tasks.flatMap(task => task.setIds);

  return vocabSetRepo.findAvailableSets(userId, scheduledSetIds);
};

export const getTasksData = async (userId) => {
  const tasks = await scheduledTaskRepo.findTasksWithSets(userId);

  const formattedTasks = tasks.map(task => {
    const setsCount = task.setIds.length;
    const totalWords = task.setIds.reduce((sum, set) => sum + (set.itemCount || 0), 0);
    return {
      _id: task._id,
      name: task.name,
      time: task.time,
      status: task.status,
      setsCount,
      totalWords
    };
  });

  const completedTasks = formattedTasks.filter(t => t.status === 'done').length;

  return {
    progress: `${completedTasks}/${formattedTasks.length} Task`,
    tasks: formattedTasks
  };
};

export const getTaskDetailsData = async (id, userId) => {
  const task = await scheduledTaskRepo.findTaskDetails(id, userId);
  if (!task) return null;

  const setIds = task.setIds.map(s => s._id);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const dueProgresses = await userSetProgressRepo.findDueProgresses(userId, endOfToday);

  const dueSetIds = dueProgresses.map(p => p.setId.toString());

  let dueWordsTotal = 0;
  const mappedSets = task.setIds.map(set => {
    const isDue = dueSetIds.includes(set._id.toString());
    if (isDue) {
      dueWordsTotal += (set.itemCount || 0);
    }
    
    const progress = dueProgresses.find(p => p.setId.toString() === set._id.toString());

    return {
      _id: set._id,
      name: set.name,
      itemCount: set.itemCount,
      image: set.image,
      coverImage: set.coverImage,
      isDue,
      status: progress ? progress.status : 'new'
    };
  });

  return {
    _id: task._id,
    name: task.name,
    time: task.time,
    methods: task.methods,
    reminderEnabled: task.reminderEnabled,
    setsCount: task.setIds.length,
    dueWordsTotal,
    sets: mappedSets
  };
};

export const assignSetsToTaskData = async (id, setIds, userId) => {
  await scheduledTaskRepo.removeSetsFromAllTasks(userId, setIds);
  return scheduledTaskRepo.assignSetsToTask(id, setIds, userId);
};

export const createTaskData = (userId, taskData) => {
  return scheduledTaskRepo.createTask({
    userId,
    name: taskData.name,
    time: taskData.time,
    methods: taskData.methods || ['flashcard'],
    reminderEnabled: taskData.reminderEnabled !== undefined ? taskData.reminderEnabled : true,
    source: 'user',
    setIds: []
  });
};

export const updateTaskData = (taskId, userId, updateData) => {
  return scheduledTaskRepo.updateTask(taskId, userId, updateData);
};

export const deleteTaskData = (taskId, userId) => {
  return scheduledTaskRepo.deleteTask(taskId, userId);
};

export const removeSetFromTaskData = (taskId, setId, userId) => {
  return scheduledTaskRepo.removeSetFromTask(taskId, setId, userId);
};
