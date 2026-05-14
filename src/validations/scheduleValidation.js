import { z } from "zod";

export const createScheduledTaskSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(1, "Name cannot be empty"),
  time: z
    .string({ required_error: "Time is required" })
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  methods: z
    .array(
      z.enum(["flashcard", "meaning", "write_full_word", "rewrite", "picture"]),
    )
    .optional(),
  reminderEnabled: z.boolean().optional(),
});

export const updateScheduledTaskSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
  time: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)")
    .optional(),
  methods: z
    .array(
      z.enum(["flashcard", "meaning", "write_full_word", "rewrite", "picture"]),
    )
    .optional(),
  reminderEnabled: z.boolean().optional(),
});

export const addSetsToTaskSchema = z.object({
  setIds: z
    .array(z.string().length(24, "Invalid object ID"))
    .min(1, "At least one set is required"),
});

export const removeSetFromTaskSchema = z.object({
  setId: z.string().length(24, "Invalid object ID"),
});
