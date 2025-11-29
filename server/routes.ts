import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import QRCode from "qrcode";
import {
  loginSchema,
  registerSchema,
  createPaymentRequestSchema,
  verifyPaymentSchema,
  registerDeviceSchema,
  smsWebhookSchema,
} from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";

const JWT_SECRET = process.env.SESSION_SECRET || "payflow-secret-key";
const JWT_EXPIRES_IN = "1d";
const TOKEN_EXPIRY_DAYS = 7;

interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    shopId?: string | null;
    branchId?: string | null;
  };
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function generateShortToken(): Promise<string> {
  return nanoid(12);
}

async function generateQRCode(upiUri: string): Promise<string> {
  return QRCode.toDataURL(upiUri, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 256,
  });
}

function generateUpiUri(
  vpa: string,
  amount: number,
  payeeName: string,
  transactionNote: string
): string {
  const amountStr = (amount / 100).toFixed(2);
  const params = new URLSearchParams({
    pa: vpa,
    pn: payeeName,
    am: amountStr,
    cu: "INR",
    tn: transactionNote,
  });
  return `upi://pay?${params.toString()}`;
}

function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      username: string;
      role: string;
      shopId?: string | null;
      branchId?: string | null;
    };
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: "Invalid or expired token" });
  }
}

async function logAudit(
  userId: string | undefined,
  action: string,
  entityType: string,
  entityId: string | undefined,
  req: Request,
  meta?: Record<string, any>
): Promise<void> {
  try {
    await storage.createAuditLog({
      userId: userId || null,
      action,
      entityType,
      entityId: entityId || null,
      meta: meta || null,
      ipAddress: req.ip || req.socket.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ==================== AUTH ROUTES ====================

  // Register
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }

      const hashedPassword = await bcrypt.hash(data.password, 12);

      // Create shop for owner or use existing
      let shopId: string | undefined;
      if (data.role === "owner" || !data.role) {
        const shop = await storage.createShop({ name: `${data.username}'s Business` });
        shopId = shop.id;
      }

      const user = await storage.createUser({
        username: data.username,
        email: data.email || null,
        password: hashedPassword,
        role: data.role || "owner",
        shopId: shopId || null,
        branchId: null,
        totpSecret: null,
        isActive: true,
      });

      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
          shopId: user.shopId,
          branchId: user.branchId,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      await logAudit(user.id, "register", "user", user.id, req);

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          shopId: user.shopId,
        },
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Register error:", error);
      res.status(500).json({ error: "Failed to register" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(data.username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: "Account is deactivated" });
      }

      const isValidPassword = await bcrypt.compare(data.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      await storage.updateUser(user.id, { lastLoginAt: new Date() });

      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
          shopId: user.shopId,
          branchId: user.branchId,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      await logAudit(user.id, "login", "user", user.id, req);

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          shopId: user.shopId,
        },
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  // Get current user
  app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        shopId: user.shopId,
        branchId: user.branchId,
      });
    } catch (error) {
      console.error("Get me error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Change password
  app.post("/api/auth/change-password", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await storage.updateUser(user.id, { password: hashedPassword });

      await logAudit(user.id, "password_change", "user", user.id, req);

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  // Update profile
  app.patch("/api/auth/profile", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { email } = req.body;
      await storage.updateUser(req.user!.id, { email: email || null });
      res.json({ message: "Profile updated" });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // ==================== BRANCHES ROUTES ====================

  app.get("/api/branches", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user!.shopId) {
        return res.json([]);
      }
      const branches = await storage.getBranchesByShop(req.user!.shopId);
      res.json(branches);
    } catch (error) {
      console.error("Get branches error:", error);
      res.status(500).json({ error: "Failed to get branches" });
    }
  });

  app.post("/api/branches", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user!.shopId) {
        return res.status(400).json({ error: "No shop associated with user" });
      }

      const { code, name, upiVpa, upiHint, bankAccountRef, isActive } = req.body;

      const branch = await storage.createBranch({
        shopId: req.user!.shopId,
        code,
        name,
        upiVpaEncrypted: upiVpa || null,
        upiHint: upiHint || null,
        bankAccountRef: bankAccountRef || null,
        isActive: isActive !== false,
      });

      await logAudit(req.user!.id, "create", "branch", branch.id, req, { code, name });

      res.json(branch);
    } catch (error) {
      console.error("Create branch error:", error);
      res.status(500).json({ error: "Failed to create branch" });
    }
  });

  app.patch("/api/branches/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { code, name, upiVpa, upiHint, bankAccountRef, isActive } = req.body;

      const branch = await storage.updateBranch(id, {
        code,
        name,
        upiVpaEncrypted: upiVpa,
        upiHint,
        bankAccountRef,
        isActive,
      });

      if (!branch) {
        return res.status(404).json({ error: "Branch not found" });
      }

      await logAudit(req.user!.id, "update", "branch", id, req);

      res.json(branch);
    } catch (error) {
      console.error("Update branch error:", error);
      res.status(500).json({ error: "Failed to update branch" });
    }
  });

  app.delete("/api/branches/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      await storage.deleteBranch(id);
      await logAudit(req.user!.id, "delete", "branch", id, req);
      res.json({ message: "Branch deleted" });
    } catch (error) {
      console.error("Delete branch error:", error);
      res.status(500).json({ error: "Failed to delete branch" });
    }
  });

  // ==================== PAYMENT REQUESTS ROUTES ====================

  app.get("/api/payment-requests", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { status, branch, limit } = req.query;
      const requests = await storage.getPaymentRequests({
        shopId: req.user!.shopId || undefined,
        branchId: branch as string | undefined,
        status: status as string | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      // Enrich with branch names
      const branches = req.user!.shopId
        ? await storage.getBranchesByShop(req.user!.shopId)
        : [];
      const branchMap = new Map(branches.map((b) => [b.id, b]));

      const enriched = requests.map((r) => ({
        ...r,
        branchName: branchMap.get(r.branchId)?.name,
        branchCode: branchMap.get(r.branchId)?.code,
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Get payment requests error:", error);
      res.status(500).json({ error: "Failed to get payment requests" });
    }
  });

  app.get("/api/payment-requests/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const request = await storage.getPaymentRequest(id);
      
      if (!request) {
        return res.status(404).json({ error: "Payment request not found" });
      }

      const branch = await storage.getBranch(request.branchId);
      const payments = await storage.getPaymentsByRequest(id);
      const matchHistoryData = await storage.getMatchHistoryByRequest(id);

      res.json({
        ...request,
        branchName: branch?.name,
        branchCode: branch?.code,
        payments,
        matchHistory: matchHistoryData,
        shortLink: `${req.protocol}://${req.get("host")}/s/${request.shortToken}`,
      });
    } catch (error) {
      console.error("Get payment request error:", error);
      res.status(500).json({ error: "Failed to get payment request" });
    }
  });

  app.post("/api/payment-requests", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const data = createPaymentRequestSchema.parse(req.body);

      if (!req.user!.shopId) {
        return res.status(400).json({ error: "No shop associated with user" });
      }

      const branch = await storage.getBranch(data.branchId);
      if (!branch) {
        return res.status(400).json({ error: "Invalid branch" });
      }

      const shortToken = await generateShortToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS);

      // Generate UPI URI and QR code
      const upiVpa = branch.upiVpaEncrypted || "merchant@upi";
      const upiUri = generateUpiUri(
        upiVpa,
        data.amountCents,
        branch.name,
        `INV: ${data.invoiceNo}`
      );
      const qrDataUri = await generateQRCode(upiUri);

      const request = await storage.createPaymentRequest({
        shopId: req.user!.shopId,
        branchId: data.branchId,
        invoiceNo: data.invoiceNo,
        amountCents: data.amountCents,
        custMobile: data.custMobile || null,
        custName: data.custName || null,
        description: data.description || null,
        status: "pending",
        shortToken,
        shortTokenExpiresAt: expiresAt,
        upiUri,
        qrDataUri,
        postedToAccounting: false,
        createdBy: req.user!.id,
        customerId: null,
        sentAt: null,
        sentChannel: null,
        paidAt: null,
      });

      await logAudit(req.user!.id, "create", "payment_request", request.id, req, {
        invoiceNo: data.invoiceNo,
        amountCents: data.amountCents,
      });

      res.json({
        ...request,
        shortLink: `${req.protocol}://${req.get("host")}/s/${shortToken}`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Create payment request error:", error);
      res.status(500).json({ error: "Failed to create payment request" });
    }
  });

  // ==================== PAYMENTS ROUTES ====================

  app.post("/api/payments/verify", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const data = verifyPaymentSchema.parse(req.body);

      const request = await storage.getPaymentRequest(data.paymentRequestId);
      if (!request) {
        return res.status(404).json({ error: "Payment request not found" });
      }

      // Check for duplicate transaction
      const existingPayment = await storage.getPaymentByTransactionId(data.transactionId);
      if (existingPayment) {
        return res.status(400).json({ error: "Transaction ID already used" });
      }

      const payment = await storage.createPayment({
        paymentRequestId: data.paymentRequestId,
        transactionId: data.transactionId,
        amountCents: data.amountCents,
        paymentMethod: "upi",
        verifiedBy: req.user!.id,
        verifiedAt: new Date(),
        notes: data.notes || null,
      });

      // Update payment request status
      await storage.updatePaymentRequest(data.paymentRequestId, {
        status: "paid",
        paidAt: new Date(),
      });

      // Create match history
      await storage.createMatchHistory({
        paymentRequestId: data.paymentRequestId,
        smsInboxId: null,
        matchScore: 100,
        matchType: "manual",
        matchedBy: req.user!.id,
        note: data.notes || null,
      });

      await logAudit(req.user!.id, "verify", "payment", payment.id, req, {
        paymentRequestId: data.paymentRequestId,
        transactionId: data.transactionId,
      });

      res.json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Verify payment error:", error);
      res.status(500).json({ error: "Failed to verify payment" });
    }
  });

  // ==================== PUBLIC PAYMENT ROUTES ====================

  app.get("/api/pay/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const request = await storage.getPaymentRequestByToken(token);

      if (!request) {
        return res.status(404).json({ error: "Payment link not found" });
      }

      const branch = await storage.getBranch(request.branchId);
      const shop = request.shopId ? await storage.getShop(request.shopId) : null;

      res.json({
        ...request,
        branchName: branch?.name,
        shopName: shop?.name,
      });
    } catch (error) {
      console.error("Get public payment error:", error);
      res.status(500).json({ error: "Failed to get payment details" });
    }
  });

  // ==================== DEVICES ROUTES ====================

  app.get("/api/devices", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const devices = await storage.getDevicesByUser(req.user!.id);
      res.json(devices);
    } catch (error) {
      console.error("Get devices error:", error);
      res.status(500).json({ error: "Failed to get devices" });
    }
  });

  app.post("/api/devices/register", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const data = registerDeviceSchema.parse(req.body);

      const deviceUuid = nanoid(32);
      const webhookToken = nanoid(48);
      const webhookTokenHash = hashToken(webhookToken);

      const device = await storage.createDevice({
        deviceUuid,
        userId: req.user!.id,
        deviceName: data.deviceName,
        webhookTokenHash,
      });

      await logAudit(req.user!.id, "register", "device", device.id, req, {
        deviceName: data.deviceName,
      });

      res.json({
        device,
        webhookToken,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Register device error:", error);
      res.status(500).json({ error: "Failed to register device" });
    }
  });

  app.post("/api/devices/:id/revoke", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      await storage.updateDevice(id, { revokedAt: new Date() });
      await logAudit(req.user!.id, "revoke", "device", id, req);
      res.json({ message: "Device revoked" });
    } catch (error) {
      console.error("Revoke device error:", error);
      res.status(500).json({ error: "Failed to revoke device" });
    }
  });

  // ==================== SMS WEBHOOK ROUTES ====================

  app.post("/api/sms/webhook", async (req, res) => {
    try {
      const authHeader = req.headers["x-webhook-token"] || req.headers["authorization"];
      if (!authHeader) {
        return res.status(401).json({ error: "Webhook token required" });
      }

      const token = typeof authHeader === "string" 
        ? authHeader.replace("Bearer ", "") 
        : authHeader;
      const tokenHash = hashToken(token);

      // Find device by token hash (simplified - in production check device table)
      const data = smsWebhookSchema.parse(req.body);

      const device = await storage.getDeviceByUuid(data.deviceId);
      if (!device || device.webhookTokenHash !== tokenHash || device.revokedAt) {
        return res.status(403).json({ error: "Invalid or revoked device" });
      }

      // Update device last seen
      await storage.updateDevice(device.id, { lastSeenAt: new Date() });

      // Parse SMS for amount and UTR
      const amountMatch = data.text.match(/Rs\.?\s*([\d,]+(?:\.\d{2})?)/i);
      const utrMatch = data.text.match(/(?:UTR|UPI|Ref|TxnId)[:\s]*([A-Z0-9]+)/i);
      const vpaMatch = data.text.match(/([a-zA-Z0-9._-]+@[a-zA-Z]+)/);

      const parsedAmount = amountMatch 
        ? Math.round(parseFloat(amountMatch[1].replace(/,/g, "")) * 100)
        : null;

      const sms = await storage.createSmsInbox({
        deviceId: device.id,
        rawText: data.text,
        sender: data.from,
        receivedAt: new Date(data.receivedAt),
        parsedAmountCents: parsedAmount,
        parsedVpa: vpaMatch?.[1] || null,
        parsedUtr: utrMatch?.[1] || null,
        parsedSenderMobile: null,
        parseConfidence: parsedAmount ? 80 : 50,
        rawJson: data.rawMeta || null,
        matchedRequestId: null,
      });

      // TODO: Auto-matching logic would go here

      res.json({ id: sms.id, status: "received" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("SMS webhook error:", error);
      res.status(500).json({ error: "Failed to process SMS" });
    }
  });

  // ==================== UNIDENTIFIED SMS ROUTES ====================

  app.get("/api/sms/unidentified", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const unidentified = await storage.getUnidentifiedSms(req.user!.shopId || undefined);
      res.json(unidentified);
    } catch (error) {
      console.error("Get unidentified SMS error:", error);
      res.status(500).json({ error: "Failed to get unidentified SMS" });
    }
  });

  app.get("/api/sms/:id/candidates", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const sms = await storage.getSmsInbox(id);
      
      if (!sms) {
        return res.status(404).json({ error: "SMS not found" });
      }

      // Get pending payment requests that might match
      const requests = await storage.getPaymentRequests({
        shopId: req.user!.shopId || undefined,
        status: "pending",
      });

      // Score candidates based on amount match
      const candidates = requests
        .map((r) => {
          let score = 0;
          if (sms.parsedAmountCents && r.amountCents === sms.parsedAmountCents) {
            score = 100;
          } else if (
            sms.parsedAmountCents &&
            Math.abs(r.amountCents - sms.parsedAmountCents) < 100
          ) {
            score = 80;
          }
          return { ...r, matchScore: score };
        })
        .filter((r) => r.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore);

      res.json(candidates);
    } catch (error) {
      console.error("Get candidates error:", error);
      res.status(500).json({ error: "Failed to get candidates" });
    }
  });

  app.post("/api/sms/:id/manual-match", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { paymentRequestId, note } = req.body;

      const sms = await storage.getSmsInbox(id);
      if (!sms) {
        return res.status(404).json({ error: "SMS not found" });
      }

      const request = await storage.getPaymentRequest(paymentRequestId);
      if (!request) {
        return res.status(404).json({ error: "Payment request not found" });
      }

      // Update SMS
      await storage.updateSmsInbox(id, {
        matchedRequestId: paymentRequestId,
        processedAt: new Date(),
      });

      // Create payment
      const transactionId = sms.parsedUtr || `MANUAL-${nanoid(8)}`;
      await storage.createPayment({
        paymentRequestId,
        transactionId,
        amountCents: sms.parsedAmountCents || request.amountCents,
        paymentMethod: "upi",
        verifiedBy: req.user!.id,
        verifiedAt: new Date(),
        notes: note || null,
      });

      // Update payment request
      await storage.updatePaymentRequest(paymentRequestId, {
        status: "paid",
        paidAt: new Date(),
      });

      // Create match history
      await storage.createMatchHistory({
        paymentRequestId,
        smsInboxId: id,
        matchScore: 100,
        matchType: "manual",
        matchedBy: req.user!.id,
        note: note || null,
      });

      await logAudit(req.user!.id, "manual_match", "payment", paymentRequestId, req, {
        smsId: id,
      });

      res.json({ message: "Match successful" });
    } catch (error) {
      console.error("Manual match error:", error);
      res.status(500).json({ error: "Failed to match SMS" });
    }
  });

  app.post("/api/sms/:id/dismiss", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      await storage.updateSmsInbox(id, { processedAt: new Date() });
      await logAudit(req.user!.id, "dismiss", "sms", id, req);
      res.json({ message: "SMS dismissed" });
    } catch (error) {
      console.error("Dismiss SMS error:", error);
      res.status(500).json({ error: "Failed to dismiss SMS" });
    }
  });

  // ==================== USERS ROUTES ====================

  app.get("/api/users", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const users = await storage.getAllUsers(req.user!.shopId || undefined);
      
      // Don't return passwords
      const safeUsers = users.map((u) => ({
        ...u,
        password: undefined,
      }));

      res.json(safeUsers);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Failed to get users" });
    }
  });

  app.patch("/api/users/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { role, branchId, isActive } = req.body;

      const user = await storage.updateUser(id, {
        role,
        branchId: branchId || null,
        isActive,
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await logAudit(req.user!.id, "update", "user", id, req, { role, branchId });

      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      
      if (id === req.user!.id) {
        return res.status(400).json({ error: "Cannot delete yourself" });
      }

      await storage.deleteUser(id);
      await logAudit(req.user!.id, "delete", "user", id, req);
      res.json({ message: "User deleted" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // ==================== AUDIT LOGS ROUTES ====================

  app.get("/api/audit-logs", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { entity } = req.query;
      const logs = await storage.getAuditLogs({
        entityType: entity as string | undefined,
      });

      // Enrich with user names
      const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))];
      const users = await Promise.all(
        userIds.map((id) => storage.getUser(id!))
      );
      const userMap = new Map(
        users.filter(Boolean).map((u) => [u!.id, u!.username])
      );

      const enriched = logs.map((l) => ({
        ...l,
        userName: l.userId ? userMap.get(l.userId) : undefined,
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ error: "Failed to get audit logs" });
    }
  });

  // ==================== STATS ROUTES ====================

  app.get("/api/stats/dashboard", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user!.shopId) {
        return res.json({
          totalRequests: 0,
          pendingCount: 0,
          paidCount: 0,
          unidentifiedCount: 0,
          totalAmountCents: 0,
          paidAmountCents: 0,
          autoMatchRate: 0,
          avgTimeToMatch: 0,
        });
      }

      const stats = await storage.getDashboardStats(req.user!.shopId);
      res.json(stats);
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  return httpServer;
}
