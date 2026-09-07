import { z } from "zod";

export const visitorRegistrationSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the visitor's full name"),
  phone: z.string().trim().min(7, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  company: z.string().trim().max(120).optional(),
  designation: z.string().trim().max(120).optional(),
  purpose: z.string().trim().min(2, "Add the purpose of the visit"),
  departmentId: z.string().min(1, "Choose a department"),
  hostId: z.string().min(1, "Choose a host"),
  type: z.enum(["APPOINTMENT", "WALK_IN"]),
});

export type VisitorRegistration = z.infer<typeof visitorRegistrationSchema>;

export const adminUserCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Enter the user's full name"),
    email: z.string().trim().email("Enter a valid work email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(["ADMIN", "RECEPTIONIST", "DEPARTMENT_LEAD"]),
    departmentId: z.string().trim().optional().or(z.literal("")),
    designation: z.string().trim().max(120).optional().or(z.literal("")),
  })
  .superRefine((data, context) => {
    if (data.role === "DEPARTMENT_LEAD" && !data.departmentId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["departmentId"],
        message: "Choose a department for a Department user",
      });
    }
  });

export type AdminUserCreateInput = z.infer<typeof adminUserCreateSchema>;
