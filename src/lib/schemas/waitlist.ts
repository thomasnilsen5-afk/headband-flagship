import { z } from 'zod'

/** Shared by the form (client hints) and the server action (the actual boundary). */
export const waitlistSchema = z
  .object({
    kind: z.enum(['drop', 'back_in_stock']),
    dropId: z.uuid().optional(),
    variantId: z.uuid().optional(),
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    locale: z.enum(['nb', 'en']),
    consent: z.literal('on', { message: 'consent_required' }),
    // Honeypot: real people never fill this in.
    company: z.string().max(0).optional().or(z.literal('')),
  })
  .refine((v) => (v.kind === 'drop' ? !!v.dropId && !v.variantId : !!v.variantId && !v.dropId), {
    message: 'invalid_target',
  })

export type WaitlistInput = z.input<typeof waitlistSchema>
