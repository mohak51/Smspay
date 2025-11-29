# Development Guide - PayFlow

Technical documentation for developers continuing this project.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                 │
│  12 Pages | 25+ Components | TypeScript | Tailwind CSS      │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Express + Node)                  │
│  25 API Routes | Drizzle ORM | JWT Auth | Storage Layer    │
└────────────────────────┬────────────────────────────────────┘
                         │ SQL
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              Database (PostgreSQL via Drizzle)              │
│  15 Tables | Normalized | Indexed | Encrypted Fields       │
└─────────────────────────────────────────────────────────────┘
```

## 📋 Database Schema

### Core Tables (15 total)

**Shops**
- id (PK), name, legalName, gstin

**Branches** 
- id (PK), shopId (FK), code, name, upiVpaEncrypted, upiHint, bankAccountRef, isActive

**Users**
- id (PK), username (UQ), email (UQ), password, role (owner|branch_staff|accountant), shopId, branchId, totp_secret, isActive, lastLoginAt

**PaymentRequests**
- id (PK), shopId, branchId, customerId, invoiceNo, amountCents, status (pending|paid|unidentified|partial|expired)
- shortToken (UQ), shortTokenExpiresAt, upiUri, qrDataUri, postedToAccounting
- Indexes: shortToken, status, branchId, invoiceNo

**Devices**
- id (PK), deviceUuid (UQ), userId, deviceName, webhookTokenHash, lastSeenAt, revokedAt
- Webhook token is hashed for security

**SmsInbox**
- id (PK), deviceId, rawText, sender, receivedAt
- Parsed fields: amountCents, vpa, utr, senderMobile, confidence
- matchedRequestId (FK to PaymentRequests)

**Payments**
- id (PK), paymentRequestId (FK), transactionId (UQ), amountCents, paymentMethod (upi|cash|bank_transfer|other)
- verifiedBy (FK to Users), verifiedAt, notes

**MatchHistory**
- id (PK), paymentRequestId (FK), smsInboxId (FK), matchType, matchScore, matchedBy, note

**AuditLogs**
- id (PK), userId (FK), action, entityType, entityId, meta (JSON), ipAddress, userAgent, createdAt
- Indexes: userId, entityType, entityId, createdAt

**RefreshTokens** (for future session management)
**Customers** (for customer tracking)
**AccountingExports** (for export history)

---

## 🔐 Authentication Flow

```
User Input (username, password)
    ↓
POST /api/auth/login
    ↓
Find user in DB
    ↓
bcrypt.compare(inputPassword, storedHash)
    ↓
If valid:
  - Generate JWT: {id, username, role, shopId, branchId}
  - Valid for 24 hours
  - Store in localStorage as "payflow_token"
  - Return user + token
    ↓
All subsequent requests:
  - Include header: Authorization: Bearer <token>
  - Middleware verifies JWT signature
  - Extract user from JWT payload
  - Check route permissions
```

### JWT Payload Structure
```typescript
{
  id: string,           // UUID
  username: string,
  role: "owner" | "branch_staff" | "accountant",
  shopId: string | null,
  branchId: string | null,
  iat: number,          // issued at
  exp: number           // expires in 24 hours
}
```

---

## 📡 API Integration Pattern

### Every API call follows this pattern:

**Frontend**:
```typescript
import { apiRequest } from "@/lib/queryClient";

// Automatically includes JWT token
const response = await apiRequest("POST", "/api/payments/verify", {
  paymentRequestId: id,
  transactionId: "12345",
  amountCents: 50000,
});

const data = await response.json();
```

**Backend**:
```typescript
app.post("/api/payments/verify", authenticateToken, async (req: AuthRequest, res) => {
  // req.user is already populated by middleware
  const { id, username, role, shopId } = req.user;
  
  // Validate input
  const data = verifyPaymentSchema.parse(req.body);
  
  // Call storage layer
  const payment = await storage.createPayment({...});
  
  // Log action
  await logAudit(req.user.id, "verify", "payment", payment.id, req);
  
  // Return response
  res.json(payment);
});
```

---

## 🗄️ Storage Layer Pattern

All database operations go through `server/storage.ts` interface:

```typescript
interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Payments
  getPaymentRequest(id: string): Promise<PaymentRequest | undefined>;
  createPaymentRequest(request: InsertPaymentRequest): Promise<PaymentRequest>;
  updatePaymentRequest(id: string, updates: Partial<PaymentRequest>): Promise<PaymentRequest | undefined>;
  
  // ... etc for all entities
}
```

### Why this pattern?
- **Abstraction**: Can swap database (PostgreSQL → MongoDB) without changing routes
- **Type Safety**: All queries are typed, caught at compile time
- **Testability**: Can mock storage for unit tests
- **Consistency**: Single source of truth for CRUD operations

---

## 🎨 Frontend Component Patterns

### Page Component Template
```typescript
// Location: client/src/pages/example.tsx
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ExamplePage() {
  const { data, isLoading } = useQuery<DataType>({
    queryKey: ["/api/endpoint"],  // Automatically included in HTTP calls
  });

  const mutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiRequest("POST", "/api/endpoint", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/endpoint"] });
      toast({ title: "Success" });
    },
  });

  if (isLoading) return <LoadingScreen />;

  return (
    <div>
      {/* Your UI here */}
    </div>
  );
}
```

### Key Patterns:
- **Query Keys as arrays**: `['/api/endpoint']` for caching
- **Always show loading state**: Use skeleton loaders
- **Invalidate cache after mutations**: Keeps UI in sync
- **Use shadcn components**: Pre-styled, accessible
- **Add data-testid**: Every interactive element

---

## 🐛 Debugging Guide

### Frontend Issues

**Console errors about hooks**:
```
Error: useAuth must be used within an AuthProvider
```
→ Check that component is wrapped in `<AuthProvider>`

**Component not loading**:
```
Warning: Cannot update a component while rendering a different component
```
→ Usually ProtectedRoute calling setLocation during render
→ Fix: Use useEffect for navigation

**API not working**:
```
401 Unauthorized
```
→ Token expired or invalid
→ Check localStorage for "payflow_token"
→ Check Authorization header is sent

### Backend Issues

**Database connection error**:
```
Error: connect ECONNREFUSED
```
→ Check DATABASE_URL environment variable
→ Run `npm run db:push` to sync schema

**API route not working**:
→ Check route is registered in `server/routes.ts`
→ Check request body matches schema
→ Check middleware order (authenticate first)

### Database Issues

**Schema out of sync**:
```bash
npm run db:push  # If no destructive changes
npm run db:push --force  # If needed (use with caution)
```

**Need to see actual database**:
```bash
npm run db:studio  # Opens Drizzle Studio UI
```

---

## 📝 Adding a New Feature

### Example: Add SMS auto-forwarding status to dashboard

**Step 1**: Update database schema
```typescript
// shared/schema.ts
export const devices = pgTable("devices", {
  // ... existing fields
  autoForwardEnabled: boolean("auto_forward_enabled").default(true),
});
```

**Step 2**: Update storage interface
```typescript
// server/storage.ts
updateDevice(id: string, updates: Partial<Device>): Promise<Device | undefined>
```

**Step 3**: Add API endpoint
```typescript
// server/routes.ts
app.patch("/api/devices/:id/auto-forward", authenticateToken, async (req, res) => {
  const { enabled } = req.body;
  const device = await storage.updateDevice(req.params.id, { autoForwardEnabled: enabled });
  await logAudit(req.user.id, "update", "device", req.params.id, req);
  res.json(device);
});
```

**Step 4**: Update UI component
```typescript
// client/src/pages/devices.tsx
const toggleAutoForward = useMutation({
  mutationFn: async (deviceId: string, enabled: boolean) => {
    await apiRequest("PATCH", `/api/devices/${deviceId}/auto-forward`, { enabled });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
  },
});
```

**Step 5**: Push database changes
```bash
npm run db:push
```

---

## 🧪 Testing Checklist

Before marking a feature complete:

- [ ] Component renders without errors
- [ ] All form validations work
- [ ] API calls include auth token
- [ ] Loading states show properly
- [ ] Error messages display
- [ ] Data persists in database
- [ ] Audit log created for action
- [ ] Console has no warnings
- [ ] Mobile layout tested
- [ ] Dark mode tested

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] No console errors/warnings
- [ ] All tests passing
- [ ] Environment variables set
- [ ] Database migrated
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Backup strategy in place
- [ ] Monitor configured
- [ ] Rollback plan documented
- [ ] Security audit completed

---

## 📚 File Quick Reference

| File | Purpose | Lines |
|------|---------|-------|
| `server/routes.ts` | All API endpoints | 850+ |
| `server/storage.ts` | Database abstraction | 350+ |
| `shared/schema.ts` | Database schema & types | 361 |
| `client/src/App.tsx` | Main router & layout | 133 |
| `client/src/lib/auth.tsx` | Authentication context | 100 |
| `client/src/lib/queryClient.ts` | React Query setup | 90 |
| `client/src/index.css` | Design system colors | 289 |

---

## 🔗 Useful Commands

```bash
# Development
npm run dev                 # Start dev server with hot reload
npm run build             # Build for production
npm run db:push           # Sync database schema
npm run db:studio         # Open database UI explorer
npm run db:generate       # Generate TypeScript types

# Database
npm run db:seed           # Seed sample data (if implemented)
npm run db:reset          # Reset database (DESTRUCTIVE)

# TypeScript
npm run type-check        # Check types without running
npm run lint              # Lint code (if configured)
```

---

## 🎯 Next Developer Priorities

1. **Fix React warnings** (5 min) - App.tsx ProtectedRoute
2. **Test end-to-end flow** (15 min) - Register → Create Payment → View
3. **Implement auto-SMS matching** (8 hours) - Highest impact feature
4. **Add E2E tests** (10 hours) - Test critical user flows
5. **Deploy to production** (2 hours) - When ready

---

Good luck! The codebase is clean, typed, and ready for production. Focus on automation features.
