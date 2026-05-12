import { z } from "zod";

export const markRememberedSchema = z.object({
  isRemembered: z.boolean({
    required_error: "isRemembered is required",
    invalid_type_error: "isRemembered must be a boolean",
  }),
});

export const completeSetSchema = z.object({
  // No body needed strictly, but if we need to pass time spent or something later we can add here
});
