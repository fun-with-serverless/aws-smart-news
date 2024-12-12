import { z } from 'zod';

const emailRegistrationSchema = z.object({
  email: z.string().email().describe('Email address'),
  query: z.string().max(200),
});

type EmailRegistration = z.infer<typeof emailRegistrationSchema>;

export { emailRegistrationSchema, type EmailRegistration };
