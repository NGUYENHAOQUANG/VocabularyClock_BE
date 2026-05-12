import { z } from "zod";

export const markRememberedSchema = z.object({
  isRemembered: z.boolean({
    required_error: "isRemembered is required",
    invalid_type_error: "isRemembered must be a boolean",
  }),
});

export const completeSetSchema = z.object({
  sessionType: z.enum(['learning', 'review'], { required_error: "sessionType is required" }),
  sessionId: z.string({ required_error: "sessionId is required" }).min(1),
  logs: z.array(
    z.object({
      vocabId: z.string().length(24, "Invalid vocabId"),
      result: z.enum(['again', 'hard', 'good', 'easy']),
      actionType: z.enum(['flashcard', 'quiz', 'writing', 'typing']),
      responseTime: z.number().optional()
    })
  ).optional() // Không bắt buộc nếu người dùng chưa học gì mà thoát
});
