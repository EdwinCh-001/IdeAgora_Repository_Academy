import { z } from 'zod'

const careerAcronymPattern =
  /(?:^|\s)(?:[A-ZÁÉÍÓÚÜÑ]{2,6}|(?:[Ii]ng|[Ll]ic|[Tt][eé]c|[Aa]dm|[Cc]ont)\.)(?=$|\s|[.,])/u

export const facultySchema = z.object({
  name: z.string().trim().min(2).max(120),
  acronym: z.string().trim().max(20),
  campusId: z.string(),
})

export type FacultyFormValues = z.infer<typeof facultySchema>

export const careerSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .max(30)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/),
  name: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .refine((value) => !careerAcronymPattern.test(value), {
      message: 'Escribe el nombre completo, sin siglas ni abreviaturas.',
    }),
})

export type CareerFormValues = z.infer<typeof careerSchema>
