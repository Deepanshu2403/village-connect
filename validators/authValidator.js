const { z } = require("zod");

const signupSchema = z.object({
  name: z.string().min(3),
  phone: z.string().min(10).max(10),
  password: z.string().min(6),
  role: z.enum(["driver", "passenger"])
});

const loginSchema = z.object({
  phone: z.string().min(10),
  password: z.string().min(6)
});

module.exports = { signupSchema, loginSchema };