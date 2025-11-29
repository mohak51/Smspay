import {
  type User,
  type InsertUser,
  type Shop,
  type InsertShop,
  type Branch,
  type InsertBranch,
  type Device,
  type InsertDevice,
  type Customer,
  type InsertCustomer,
  type PaymentRequest,
  type InsertPaymentRequest,
  type SmsInbox,
  type InsertSmsInbox,
  type Payment,
  type InsertPayment,
  type MatchHistory,
  type InsertMatchHistory,
  type AuditLog,
  type InsertAuditLog,
  type RefreshToken,
  type InsertRefreshToken,
  users,
  shops,
  branches,
  devices,
  customers,
  paymentRequests,
  smsInbox,
  payments,
  matchHistory,
  auditLogs,
  refreshTokens,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, or, sql, isNull, gte, lte, ilike } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  getAllUsers(shopId?: string): Promise<User[]>;

  // Shops
  getShop(id: string): Promise<Shop | undefined>;
  createShop(shop: InsertShop): Promise<Shop>;
  updateShop(id: string, updates: Partial<Shop>): Promise<Shop | undefined>;

  // Branches
  getBranch(id: string): Promise<Branch | undefined>;
  getBranchesByShop(shopId: string): Promise<Branch[]>;
  createBranch(branch: InsertBranch): Promise<Branch>;
  updateBranch(id: string, updates: Partial<Branch>): Promise<Branch | undefined>;
  deleteBranch(id: string): Promise<void>;

  // Devices
  getDevice(id: string): Promise<Device | undefined>;
  getDeviceByUuid(deviceUuid: string): Promise<Device | undefined>;
  getDevicesByUser(userId: string): Promise<Device[]>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: string, updates: Partial<Device>): Promise<Device | undefined>;
  getAllDevices(shopId?: string): Promise<Device[]>;

  // Customers
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByMobile(shopId: string, mobile: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;

  // Payment Requests
  getPaymentRequest(id: string): Promise<PaymentRequest | undefined>;
  getPaymentRequestByToken(shortToken: string): Promise<PaymentRequest | undefined>;
  getPaymentRequests(filters?: {
    shopId?: string;
    branchId?: string;
    status?: string;
    limit?: number;
  }): Promise<PaymentRequest[]>;
  createPaymentRequest(request: InsertPaymentRequest & { shortToken: string; shortTokenExpiresAt: Date }): Promise<PaymentRequest>;
  updatePaymentRequest(id: string, updates: Partial<PaymentRequest>): Promise<PaymentRequest | undefined>;

  // SMS Inbox
  getSmsInbox(id: string): Promise<SmsInbox | undefined>;
  getUnidentifiedSms(shopId?: string): Promise<SmsInbox[]>;
  createSmsInbox(sms: InsertSmsInbox): Promise<SmsInbox>;
  updateSmsInbox(id: string, updates: Partial<SmsInbox>): Promise<SmsInbox | undefined>;

  // Payments
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentByTransactionId(transactionId: string): Promise<Payment | undefined>;
  getPaymentsByRequest(paymentRequestId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;

  // Match History
  createMatchHistory(history: InsertMatchHistory): Promise<MatchHistory>;
  getMatchHistoryByRequest(paymentRequestId: string): Promise<MatchHistory[]>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: { entityType?: string; limit?: number }): Promise<AuditLog[]>;

  // Refresh Tokens
  createRefreshToken(token: InsertRefreshToken): Promise<RefreshToken>;
  getRefreshTokenByHash(tokenHash: string): Promise<RefreshToken | undefined>;
  revokeRefreshToken(id: string): Promise<void>;
  revokeAllUserTokens(userId: string): Promise<void>;

  // Stats
  getDashboardStats(shopId: string): Promise<{
    totalRequests: number;
    pendingCount: number;
    paidCount: number;
    unidentifiedCount: number;
    totalAmountCents: number;
    paidAmountCents: number;
    autoMatchRate: number;
    avgTimeToMatch: number;
  }>;
  getUnidentifiedCount(shopId?: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllUsers(shopId?: string): Promise<User[]> {
    if (shopId) {
      return db.select().from(users).where(eq(users.shopId, shopId));
    }
    return db.select().from(users);
  }

  // Shops
  async getShop(id: string): Promise<Shop | undefined> {
    const [shop] = await db.select().from(shops).where(eq(shops.id, id));
    return shop || undefined;
  }

  async createShop(insertShop: InsertShop): Promise<Shop> {
    const [shop] = await db.insert(shops).values(insertShop).returning();
    return shop;
  }

  async updateShop(id: string, updates: Partial<Shop>): Promise<Shop | undefined> {
    const [shop] = await db.update(shops).set(updates).where(eq(shops.id, id)).returning();
    return shop || undefined;
  }

  // Branches
  async getBranch(id: string): Promise<Branch | undefined> {
    const [branch] = await db.select().from(branches).where(eq(branches.id, id));
    return branch || undefined;
  }

  async getBranchesByShop(shopId: string): Promise<Branch[]> {
    return db.select().from(branches).where(eq(branches.shopId, shopId));
  }

  async createBranch(insertBranch: InsertBranch): Promise<Branch> {
    const [branch] = await db.insert(branches).values(insertBranch).returning();
    return branch;
  }

  async updateBranch(id: string, updates: Partial<Branch>): Promise<Branch | undefined> {
    const [branch] = await db.update(branches).set(updates).where(eq(branches.id, id)).returning();
    return branch || undefined;
  }

  async deleteBranch(id: string): Promise<void> {
    await db.delete(branches).where(eq(branches.id, id));
  }

  // Devices
  async getDevice(id: string): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.id, id));
    return device || undefined;
  }

  async getDeviceByUuid(deviceUuid: string): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.deviceUuid, deviceUuid));
    return device || undefined;
  }

  async getDevicesByUser(userId: string): Promise<Device[]> {
    return db.select().from(devices).where(eq(devices.userId, userId));
  }

  async createDevice(insertDevice: InsertDevice): Promise<Device> {
    const [device] = await db.insert(devices).values(insertDevice).returning();
    return device;
  }

  async updateDevice(id: string, updates: Partial<Device>): Promise<Device | undefined> {
    const [device] = await db.update(devices).set(updates).where(eq(devices.id, id)).returning();
    return device || undefined;
  }

  async getAllDevices(shopId?: string): Promise<Device[]> {
    return db.select().from(devices).orderBy(desc(devices.createdAt));
  }

  // Customers
  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async getCustomerByMobile(shopId: string, mobile: string): Promise<Customer | undefined> {
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.shopId, shopId), eq(customers.mobile, mobile)));
    return customer || undefined;
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(insertCustomer).returning();
    return customer;
  }

  // Payment Requests
  async getPaymentRequest(id: string): Promise<PaymentRequest | undefined> {
    const [request] = await db.select().from(paymentRequests).where(eq(paymentRequests.id, id));
    return request || undefined;
  }

  async getPaymentRequestByToken(shortToken: string): Promise<PaymentRequest | undefined> {
    const [request] = await db
      .select()
      .from(paymentRequests)
      .where(eq(paymentRequests.shortToken, shortToken));
    return request || undefined;
  }

  async getPaymentRequests(filters?: {
    shopId?: string;
    branchId?: string;
    status?: string;
    limit?: number;
  }): Promise<PaymentRequest[]> {
    let query = db.select().from(paymentRequests);
    
    const conditions = [];
    if (filters?.shopId) {
      conditions.push(eq(paymentRequests.shopId, filters.shopId));
    }
    if (filters?.branchId) {
      conditions.push(eq(paymentRequests.branchId, filters.branchId));
    }
    if (filters?.status && filters.status !== "all") {
      conditions.push(eq(paymentRequests.status, filters.status as any));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(paymentRequests.createdAt)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    return query;
  }

  async createPaymentRequest(
    request: InsertPaymentRequest & { shortToken: string; shortTokenExpiresAt: Date }
  ): Promise<PaymentRequest> {
    const [created] = await db.insert(paymentRequests).values(request).returning();
    return created;
  }

  async updatePaymentRequest(id: string, updates: Partial<PaymentRequest>): Promise<PaymentRequest | undefined> {
    const [request] = await db
      .update(paymentRequests)
      .set(updates)
      .where(eq(paymentRequests.id, id))
      .returning();
    return request || undefined;
  }

  // SMS Inbox
  async getSmsInbox(id: string): Promise<SmsInbox | undefined> {
    const [sms] = await db.select().from(smsInbox).where(eq(smsInbox.id, id));
    return sms || undefined;
  }

  async getUnidentifiedSms(shopId?: string): Promise<SmsInbox[]> {
    return db
      .select()
      .from(smsInbox)
      .where(isNull(smsInbox.matchedRequestId))
      .orderBy(desc(smsInbox.receivedAt));
  }

  async createSmsInbox(insertSms: InsertSmsInbox): Promise<SmsInbox> {
    const [sms] = await db.insert(smsInbox).values(insertSms).returning();
    return sms;
  }

  async updateSmsInbox(id: string, updates: Partial<SmsInbox>): Promise<SmsInbox | undefined> {
    const [sms] = await db.update(smsInbox).set(updates).where(eq(smsInbox.id, id)).returning();
    return sms || undefined;
  }

  // Payments
  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async getPaymentByTransactionId(transactionId: string): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.transactionId, transactionId));
    return payment || undefined;
  }

  async getPaymentsByRequest(paymentRequestId: string): Promise<Payment[]> {
    return db
      .select()
      .from(payments)
      .where(eq(payments.paymentRequestId, paymentRequestId))
      .orderBy(desc(payments.createdAt));
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(insertPayment).returning();
    return payment;
  }

  // Match History
  async createMatchHistory(insertHistory: InsertMatchHistory): Promise<MatchHistory> {
    const [history] = await db.insert(matchHistory).values(insertHistory).returning();
    return history;
  }

  async getMatchHistoryByRequest(paymentRequestId: string): Promise<MatchHistory[]> {
    return db
      .select()
      .from(matchHistory)
      .where(eq(matchHistory.paymentRequestId, paymentRequestId))
      .orderBy(desc(matchHistory.matchedAt));
  }

  // Audit Logs
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(insertLog).returning();
    return log;
  }

  async getAuditLogs(filters?: { entityType?: string; limit?: number }): Promise<AuditLog[]> {
    let query = db.select().from(auditLogs);

    if (filters?.entityType && filters.entityType !== "all") {
      query = query.where(eq(auditLogs.entityType, filters.entityType)) as any;
    }

    query = query.orderBy(desc(auditLogs.createdAt)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    } else {
      query = query.limit(100) as any;
    }

    return query;
  }

  // Refresh Tokens
  async createRefreshToken(insertToken: InsertRefreshToken): Promise<RefreshToken> {
    const [token] = await db.insert(refreshTokens).values(insertToken).returning();
    return token;
  }

  async getRefreshTokenByHash(tokenHash: string): Promise<RefreshToken | undefined> {
    const [token] = await db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)));
    return token || undefined;
  }

  async revokeRefreshToken(id: string): Promise<void> {
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, id));
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.userId, userId));
  }

  // Stats
  async getDashboardStats(shopId: string): Promise<{
    totalRequests: number;
    pendingCount: number;
    paidCount: number;
    unidentifiedCount: number;
    totalAmountCents: number;
    paidAmountCents: number;
    autoMatchRate: number;
    avgTimeToMatch: number;
  }> {
    const allRequests = await db
      .select()
      .from(paymentRequests)
      .where(eq(paymentRequests.shopId, shopId));

    const totalRequests = allRequests.length;
    const pendingCount = allRequests.filter((r) => r.status === "pending").length;
    const paidCount = allRequests.filter((r) => r.status === "paid").length;
    const unidentifiedCount = allRequests.filter((r) => r.status === "unidentified").length;

    const totalAmountCents = allRequests
      .filter((r) => r.status === "pending")
      .reduce((sum, r) => sum + r.amountCents, 0);

    const paidAmountCents = allRequests
      .filter((r) => r.status === "paid")
      .reduce((sum, r) => sum + r.amountCents, 0);

    const autoMatchRate = paidCount > 0 ? (paidCount / totalRequests) * 100 : 0;

    return {
      totalRequests,
      pendingCount,
      paidCount,
      unidentifiedCount,
      totalAmountCents,
      paidAmountCents,
      autoMatchRate,
      avgTimeToMatch: 0,
    };
  }

  async getUnidentifiedCount(shopId?: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(smsInbox)
      .where(isNull(smsInbox.matchedRequestId));
    return Number(result[0]?.count) || 0;
  }
}

export const storage = new DatabaseStorage();
