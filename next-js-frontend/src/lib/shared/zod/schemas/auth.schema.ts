import { z } from "zod";

// Password validation
const passwordValidation = z
  .string({ required_error: "Password is required" })
  .min(8, "Password cannot be shorter than 8 characters")
  .max(40, "Password cannot be longer than 30 characters")
  .regex(
    /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/gm,
    "Password must contain 8 characters, 1 uppercase letter, 1 lowercase letter and 1 number"
  );

// Email validation
const emailValidation = z
  .string({ required_error: "Email is required" })
  .regex(
    /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/g,
    "Please enter a valid email"
  );

// Name validation (fixed)
const nameValidation = z
  .string({ required_error: "Name is required" })
  .min(3, "Name must be at least 3 letters")
  .max(25, "Name cannot be longer than 25 characters")
  .refine((val) => /^[a-zA-Z\s'’]+$/.test(val), {
    message: "Emojis, symbols, numbers are not supported",
  })
  .transform((val) => {
    let name = val.trim(); // remove leading/trailing spaces
    name = name.replace(/\s\s+/g, " "); // collapse multiple spaces
    // Smart capitalization
    name = name.replace(/(?:^|\s|['’])[a-z]/g, (l) => l.toUpperCase());
    name = name.replace(/\bMc([a-z])/g, (_, c) => `Mc${c.toUpperCase()}`);
    name = name.replace(/\bO(['’])([a-z])/g, (_, a, c) => `O${a}${c.toUpperCase()}`);
    return name;
  });

// Username validation (fixed)
const usernameValidation = z
  .string({ required_error: "Username is required" })
  .min(3, "Username must be at least 3 characters")
  .regex(/^[a-z0-9_]+$/, {
    message: "Username can only contain lowercase letters, numbers and underscores",
  })
  .transform((val) => {
    let username = val.toLowerCase();
    username = username.replace(/\s/g, "");
    username = username.replace(/[^a-z0-9_]/g, "");
    return username;
  });

// Signup schema
const signupSchema = z
  .object({
    name: nameValidation,
    username: usernameValidation,
    email: emailValidation,
    password: passwordValidation,
    confirmPassword: z.string({ required_error: "Confirm password is required" }),
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Login schema
const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email({ message: "Please enter a valid email" }),
  password: z
    .string()
    .min(8, "Password cannot be shorter than 8 characters")
    .max(40, "Password cannot be longer than 30 characters"),
});

// Forgot password schema
const forgotPasswordSchema = z.object({
  email: emailValidation,
});

// Reset password schema
const resetPasswordSchema = z
  .object({
    newPassword: passwordValidation,
    confirmPassword: z.string({ required_error: "Confirm password is required" }),
  })
  .refine(
    ({ newPassword, confirmPassword }) => newPassword === confirmPassword,
    { message: "Passwords don't match", path: ["confirmPassword"] }
  );

// OTP verification schema
const otpVerificationSchema = z.object({
  otp: z
    .string({ required_error: "Otp is required" })
    .min(4, { message: "OTP must be a minimum of 4 digits" }),
});

// Key recovery schema
const keyRecoverySchema = z.object({
  password: passwordValidation,
});

export {
  forgotPasswordSchema,
  keyRecoverySchema,
  loginSchema,
  otpVerificationSchema,
  resetPasswordSchema,
  signupSchema,
};

export type signupSchemaType = z.infer<typeof signupSchema>;
export type loginSchemaType = z.infer<typeof loginSchema>;
export type forgotPasswordSchemaType = z.infer<typeof forgotPasswordSchema>;
export type resetPasswordSchemaType = z.infer<typeof resetPasswordSchema>;
export type otpVerificationSchemaType = z.infer<typeof otpVerificationSchema>;
export type keyRecoverySchemaType = z.infer<typeof keyRecoverySchema>;
