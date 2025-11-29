import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, pgEnum, jsonb, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["owner", "branch_staff", "accountant"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "unidentified", "partial", "expired"]);
export const paymentMethodEnum = pgEnum("payment_method", ["upi", "cash", "bank_transfer", "other"]);

// Shops table
export const shops = pgTable("shops", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  legalName: text("legal_name"),
  gstin: varchar("gstin", { length: 15 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const shopsRelations = relations(shops, ({ many }) => ({
  branches: many(branches),
  paymentRequests: many(paymentRequests),
}));

// Branches table
export const branches = pgTable("branches", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  shopId: varchar("shop_id", { length: 36 }).notNull().references(() => shops.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 10 }).notNull(),
  name: text("name").notNull(),
  upiVpaEncrypted: text("upi_vpa_encrypted"),
  upiHint: text("upi_hint"),
  bankAccountRef: text("bank_account_ref"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique().on(table.shopId, table.code),
]);

export const branchesRelations = relations(branches, ({ one, many }) => ({
  shop: one(shops, { fields: [branches.shopId], references: [shops.id] }),
  users: many(users),
  paymentRequests: many(paymentRequests),
}));

// Users table
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").default("branch_staff").notNull(),
  branchId: varchar("branch_id", { length: 36 }).references(() => branches.id, { onDelete: "set null" }),
  shopId: varchar("shop_id", { length: 36 }).references(() => shops.id, { onDelete: "cascade" }),
  totpSecret: text("totp_secret"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  branch: one(branches, { fields: [users.branchId], references: [branches.id] }),
  shop: one(shops, { fields: [users.shopId], references: [shops.id] }),
  devices: many(devices),
  auditLogs: many(auditLogs),
}));

// Devices table (for SMS forwarder)
export const devices = pgTable("devices", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  deviceUuid: varchar("device_uuid", { length: 64 }).notNull().unique(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  deviceName: text("device_name"),
  webhookTokenHash: text("webhook_token_hash").notNull(),
  lastSeenAt: timestamp("last_seen_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const devicesRelations = relations(devices, ({ one, many }) => ({
  user: one(users, { fields: [devices.userId], references: [users.id] }),
  smsInbox: many(smsInbox),
}));

// Customers table
export const customers = pgTable("customers", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  shopId: varchar("shop_id", { length: 36 }).notNull().references(() => shops.id, { onDelete: "cascade" }),
  name: text("name"),
  mobile: varchar("mobile", { length: 15 }).notNull(),
  email: text("email"),
  whatsappOptIn: boolean("whatsapp_opt_in").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique().on(table.shopId, table.mobile),
  index("customers_mobile_idx").on(table.mobile),
]);

export const customersRelations = relations(customers, ({ one, many }) => ({
  shop: one(shops, { fields: [customers.shopId], references: [shops.id] }),
  paymentRequests: many(paymentRequests),
}));

// Payment Requests table
export const paymentRequests = pgTable("payment_requests", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  shopId: varchar("shop_id", { length: 36 }).notNull().references(() => shops.id, { onDelete: "cascade" }),
  branchId: varchar("branch_id", { length: 36 }).notNull().references(() => branches.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id", { length: 36 }).references(() => customers.id, { onDelete: "set null" }),
  invoiceNo: varchar("invoice_no", { length: 50 }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  custMobile: varchar("cust_mobile", { length: 15 }),
  custName: text("cust_name"),
  description: text("description"),
  status: paymentStatusEnum("status").default("pending").notNull(),
  shortToken: varchar("short_token", { length: 32 }).notNull().unique(),
  shortTokenExpiresAt: timestamp("short_token_expires_at").notNull(),
  upiUri: text("upi_uri"),
  qrDataUri: text("qr_data_uri"),
  postedToAccounting: boolean("posted_to_accounting").default(false),
  sentAt: timestamp("sent_at"),
  sentChannel: text("sent_channel"),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  paidAt: timestamp("paid_at"),
}, (table) => [
  index("payment_requests_short_token_idx").on(table.shortToken),
  index("payment_requests_status_idx").on(table.status),
  index("payment_requests_branch_idx").on(table.branchId),
  index("payment_requests_invoice_idx").on(table.invoiceNo),
]);

export const paymentRequestsRelations = relations(paymentRequests, ({ one, many }) => ({
  shop: one(shops, { fields: [paymentRequests.shopId], references: [shops.id] }),
  branch: one(branches, { fields: [paymentRequests.branchId], references: [branches.id] }),
  customer: one(customers, { fields: [paymentRequests.customerId], references: [customers.id] }),
  createdByUser: one(users, { fields: [paymentRequests.createdBy], references: [users.id] }),
  payments: many(payments),
  matchHistory: many(matchHistory),
}));

// SMS Inbox table
export const smsInbox = pgTable("sms_inbox", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  deviceId: varchar("device_id", { length: 36 }).references(() => devices.id, { onDelete: "set null" }),
  rawText: text("raw_text").notNull(),
  sender: text("sender"),
  receivedAt: timestamp("received_at").notNull(),
  parsedAmountCents: integer("parsed_amount_cents"),
  parsedVpa: text("parsed_vpa"),
  parsedUtr: varchar("parsed_utr", { length: 50 }),
  parsedSenderMobile: varchar("parsed_sender_mobile", { length: 15 }),
  parseConfidence: integer("parse_confidence"),
  rawJson: jsonb("raw_json"),
  matchedRequestId: varchar("matched_request_id", { length: 36 }).references(() => paymentRequests.id, { onDelete: "set null" }),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("sms_inbox_parsed_utr_idx").on(table.parsedUtr),
  index("sms_inbox_matched_request_idx").on(table.matchedRequestId),
]);

export const smsInboxRelations = relations(smsInbox, ({ one, many }) => ({
  device: one(devices, { fields: [smsInbox.deviceId], references: [devices.id] }),
  matchedRequest: one(paymentRequests, { fields: [smsInbox.matchedRequestId], references: [paymentRequests.id] }),
  matchHistory: many(matchHistory),
}));

// Payments table (verified transactions)
export const payments = pgTable("payments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  paymentRequestId: varchar("payment_request_id", { length: 36 }).notNull().references(() => paymentRequests.id, { onDelete: "cascade" }),
  transactionId: varchar("transaction_id", { length: 50 }).notNull().unique(),
  amountCents: integer("amount_cents").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").default("upi").notNull(),
  verifiedBy: varchar("verified_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  verifiedAt: timestamp("verified_at").defaultNow().notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("payments_transaction_id_idx").on(table.transactionId),
  index("payments_request_idx").on(table.paymentRequestId),
]);

export const paymentsRelations = relations(payments, ({ one }) => ({
  paymentRequest: one(paymentRequests, { fields: [payments.paymentRequestId], references: [paymentRequests.id] }),
  verifiedByUser: one(users, { fields: [payments.verifiedBy], references: [users.id] }),
}));

// Match History table
export const matchHistory = pgTable("match_history", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  paymentRequestId: varchar("payment_request_id", { length: 36 }).notNull().references(() => paymentRequests.id, { onDelete: "cascade" }),
  smsInboxId: varchar("sms_inbox_id", { length: 36 }).references(() => smsInbox.id, { onDelete: "set null" }),
  matchScore: integer("match_score"),
  matchType: text("match_type").notNull(),
  matchedBy: varchar("matched_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  note: text("note"),
  matchedAt: timestamp("matched_at").defaultNow().notNull(),
});

export const matchHistoryRelations = relations(matchHistory, ({ one }) => ({
  paymentRequest: one(paymentRequests, { fields: [matchHistory.paymentRequestId], references: [paymentRequests.id] }),
  sms: one(smsInbox, { fields: [matchHistory.smsInboxId], references: [smsInbox.id] }),
  matchedByUser: one(users, { fields: [matchHistory.matchedBy], references: [users.id] }),
}));

// Audit Logs table
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id", { length: 36 }),
  meta: jsonb("meta"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("audit_logs_user_idx").on(table.userId),
  index("audit_logs_entity_idx").on(table.entityType, table.entityId),
  index("audit_logs_created_idx").on(table.createdAt),
]);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

// Accounting Exports table
export const accountingExports = pgTable("accounting_exports", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  paymentRequestId: varchar("payment_request_id", { length: 36 }).references(() => paymentRequests.id, { onDelete: "set null" }),
  payload: jsonb("payload"),
  exportType: text("export_type").notNull(),
  status: text("status").default("pending").notNull(),
  exportedBy: varchar("exported_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Session/Refresh Tokens table
export const refreshTokens = pgTable("refresh_tokens", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  deviceUuid: varchar("device_uuid", { length: 64 }),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("refresh_tokens_user_idx").on(table.userId),
]);

// Insert schemas
export const insertShopSchema = createInsertSchema(shops).omit({ id: true, createdAt: true });
export const insertBranchSchema = createInsertSchema(branches).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, lastLoginAt: true });
export const insertDeviceSchema = createInsertSchema(devices).omit({ id: true, createdAt: true, lastSeenAt: true, revokedAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertPaymentRequestSchema = createInsertSchema(paymentRequests).omit({ 
  id: true, 
  createdAt: true, 
  shortToken: true,
  shortTokenExpiresAt: true,
  upiUri: true,
  qrDataUri: true,
  sentAt: true,
  paidAt: true,
});
export const insertSmsInboxSchema = createInsertSchema(smsInbox).omit({ id: true, createdAt: true, processedAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export const insertMatchHistorySchema = createInsertSchema(matchHistory).omit({ id: true, matchedAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertAccountingExportSchema = createInsertSchema(accountingExports).omit({ id: true, createdAt: true });
export const insertRefreshTokenSchema = createInsertSchema(refreshTokens).omit({ id: true, createdAt: true });

// Types
export type Shop = typeof shops.$inferSelect;
export type InsertShop = z.infer<typeof insertShopSchema>;

export type Branch = typeof branches.$inferSelect;
export type InsertBranch = z.infer<typeof insertBranchSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type PaymentRequest = typeof paymentRequests.$inferSelect;
export type InsertPaymentRequest = z.infer<typeof insertPaymentRequestSchema>;

export type SmsInbox = typeof smsInbox.$inferSelect;
export type InsertSmsInbox = z.infer<typeof insertSmsInboxSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type MatchHistory = typeof matchHistory.$inferSelect;
export type InsertMatchHistory = z.infer<typeof insertMatchHistorySchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type AccountingExport = typeof accountingExports.$inferSelect;
export type InsertAccountingExport = z.infer<typeof insertAccountingExportSchema>;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;

// API validation schemas
export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  username: z.string().min(3),
  email: z.string().email().optional(),
  password: z.string().min(6),
  role: z.enum(["owner", "branch_staff", "accountant"]).optional(),
});

export const createPaymentRequestSchema = z.object({
  branchId: z.string().uuid(),
  invoiceNo: z.string().min(1).max(50),
  amountCents: z.number().int().positive(),
  custMobile: z.string().regex(/^\+?[0-9]{10,15}$/).optional(),
  custName: z.string().optional(),
  description: z.string().optional(),
});

export const verifyPaymentSchema = z.object({
  paymentRequestId: z.string().uuid(),
  transactionId: z.string().min(1).max(50),
  amountCents: z.number().int().positive(),
  notes: z.string().optional(),
});

export const registerDeviceSchema = z.object({
  deviceName: z.string().min(1),
  phoneNumber: z.string().optional(),
});

export const smsWebhookSchema = z.object({
  deviceId: z.string(),
  from: z.string(),
  text: z.string(),
  receivedAt: z.string().or(z.number()),
  rawMeta: z.any().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreatePaymentRequestInput = z.infer<typeof createPaymentRequestSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
export type SmsWebhookInput = z.infer<typeof smsWebhookSchema>;
