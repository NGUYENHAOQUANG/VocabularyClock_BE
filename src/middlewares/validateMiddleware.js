/**
 * validate – Middleware factory that accepts a Zod schema.
 * Validates req.body and returns 400 if data is invalid.
 */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    // Zod v3 dùng result.error.issues (không phải .errors)
    const issues = result.error?.issues ?? [];
    const errors = issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    const firstMessage = errors[0]?.message ?? 'Validation failed';
    return res.status(400).json({ success: false, message: firstMessage, errors });
  }
  req.body = result.data;
  next();
};

