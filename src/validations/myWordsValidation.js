import { z } from "zod";

export const createTopicSchema = z.object({
  name: z.string().min(1, "Tên chủ đề không được để trống").max(100),
  description: z.string().optional(),
  // typeId là optional, mặc định 'vocabulary' nếu không gửi
  typeId: z.enum(["vocabulary", "collocation", "structure", "idiom", "phrasal_verb"])
    .optional()
    .default("vocabulary"),
});


export const createSetSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  topicId: z.string().min(1, "Topic ID is required"),
});

export const createVocabSchema = z.object({
  setId: z.string().min(1, "Set ID is required"),
  content: z.string().min(1, "Nội dung không được để trống"),
  // type là optional, mặc định 'vocabulary'
  type: z.enum(["vocabulary", "collocation", "structure", "idiom", "phrasal_verb"])
    .optional()
    .default("vocabulary"),
  meaning: z.string().min(1, "Nghĩa không được để trống"),
  phonetic: z.string().optional(),
  partOfSpeech: z.string().optional(),

  examples: z
    .array(
      z.object({
        en: z.string(),
        translations: z.record(z.string(), z.string()).optional(),
      })
    )
    .optional(),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2", "None"]).optional(),
  tags: z.array(z.string()).optional(),
  // URL ảnh nếu người dùng upload
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export const updateTopicSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  description: z.string().optional(),
  typeId: z.enum(["vocabulary", "collocation", "structure", "idiom", "phrasal_verb"], {
    errorMap: () => ({ message: "Invalid topic type" }),
  }).optional(),
});

export const updateSetSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  description: z.string().optional(),
});

export const updateVocabSchema = z.object({
  content: z.string().min(1, "Content is required").optional(),
  type: z.enum(["vocabulary", "collocation", "structure", "idiom", "phrasal_verb"], {
    errorMap: () => ({ message: "Invalid vocab type" }),
  }).optional(),
  meaning: z.string().min(1, "Meaning is required").optional(),
  phonetic: z.string().optional(),
  partOfSpeech: z.string().optional(),
  examples: z
    .array(
      z.object({
        en: z.string(),
        translations: z.record(z.string(), z.string()).optional(),
      })
    )
    .optional(),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2", "None"]).optional(),
  tags: z.array(z.string()).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
});
