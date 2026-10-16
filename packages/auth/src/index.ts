export { createAuth, type Auth, type CreateAuthOptions } from "./auth.js";
export { hashPassword, verifyPassword } from "./password.js";
export {
  provisionSignup,
  workspaceSlugFromEmail,
  BUILTIN_ROLES,
  type SignupProvisionInput,
  type SignupProvisionResult,
} from "./provisioning.js";
export {
  appendAuditEvent,
  canonicalJson,
  computeAuditHash,
  type ActorType,
  type AuditEventInput,
  type AuditHashInput,
} from "./audit.js";
export {
  createMockEmailProvider,
  verificationEmail,
  type EmailMessage,
  type EmailProvider,
  type MockEmailProvider,
  type SendResult,
} from "./email.js";
export {
  EMAIL_VERIFICATION_TTL_SECONDS,
  VERIFICATION_MAIL_PER_EMAIL,
  VERIFICATION_RESEND_RULE,
} from "./auth.js";
export { createThrottle, type Throttle } from "./throttle.js";
