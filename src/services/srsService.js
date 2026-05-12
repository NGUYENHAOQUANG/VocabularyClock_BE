const STATUS_LEVELS = ["new", "vague", "recognized", "applicable", "fluent", "stabilized", "mastered"];
const LEVEL_INTERVALS = [0, 1, 2, 4, 7, 15, 30];

/**
 * Tính toán cấp độ tiếp theo và khoảng thời gian ôn tập (Spaced Repetition System)
 * @param {string} currentStatus Trạng thái hiện tại ('new', 'vague',...)
 * @returns {Object} { newStatus, newInterval, nextReviewDate }
 */
export const calculateNextReview = (currentStatus) => {
  let currentLevel = STATUS_LEVELS.indexOf(currentStatus);
  if (currentLevel === -1) currentLevel = 0;
  
  const newLevel = Math.min(STATUS_LEVELS.length - 1, currentLevel + 1);
  const newInterval = LEVEL_INTERVALS[newLevel];

  let nextDate = new Date();
  nextDate.setHours(0, 0, 0, 0);
  if (newInterval > 0) {
    nextDate.setDate(nextDate.getDate() + newInterval);
  }

  return {
    newStatus: STATUS_LEVELS[newLevel],
    newInterval,
    nextReviewDate: nextDate
  };
};
