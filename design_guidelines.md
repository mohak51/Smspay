# Design Guidelines: SMS-to-UPI Payment Automation System

## Design Approach

**Selected Framework:** Material Design with Financial UI Patterns  
**Rationale:** Information-dense enterprise tool requiring clarity, data hierarchy, and trust signals. Material Design provides robust patterns for forms, tables, and data visualization while maintaining professional credibility for financial operations.

**Core Principles:**
- **Trust & Transparency:** Clear visual hierarchy, explicit state indicators, audit trail visibility
- **Efficiency First:** Minimal clicks to complete tasks, keyboard shortcuts, bulk actions
- **Mobile-Responsive:** Branch staff primarily use phones; desktop provides advanced features for accountants

---

## Typography

**Font System:** Inter (via Google Fonts CDN)
- **Headings:** Inter Bold (600-700)
  - H1: 2xl (24px) - Page titles, dashboard headers
  - H2: xl (20px) - Section headers, card titles
  - H3: lg (18px) - Sub-sections, modal headers
- **Body:** Inter Regular (400)
  - Base: text-base (16px) - Forms, descriptions
  - Small: text-sm (14px) - Table data, metadata
  - Tiny: text-xs (12px) - Timestamps, auxiliary info
- **Monospace:** JetBrains Mono (400) for UTR codes, transaction IDs, amounts

**Hierarchy Rules:**
- Payment amounts: Always bold, larger size (text-lg to text-2xl)
- Status badges: Medium weight (500), uppercase, tracked spacing
- Critical alerts: Semibold (600), red/amber tones

---

## Layout System

**Spacing Primitives:** Use Tailwind units: **2, 4, 6, 8, 12, 16**
- Component padding: p-4 to p-6
- Section spacing: gap-6 to gap-8
- Card spacing: p-6 internally, mb-8 between cards
- Form fields: gap-4 vertically

**Grid System:**
- Dashboard cards: 3-column on desktop (grid-cols-3), 1-column mobile
- Data tables: Full-width with horizontal scroll on mobile
- Forms: 2-column layout on desktop (grid-cols-2), single-column mobile

**Container Strategy:**
- Admin panels: max-w-7xl with px-4 to px-8 padding
- Payment landing page: max-w-2xl centered
- Mobile app: Full-width with safe-area padding

---

## Component Library

### Navigation & Layout

**Admin Sidebar (Desktop):**
- Fixed left sidebar, w-64, dark background treatment
- Icon + label navigation items with active state indicators
- Collapsible on tablet (hamburger menu)
- Quick stats widget at top: Total pending, Auto-matched today

**Mobile Bottom Navigation (App):**
- Fixed bottom bar, 4-5 primary actions
- Icon-first with small labels
- Active state with icon fill + accent underline

**Top Bar:**
- Branch selector dropdown (multi-branch users)
- User avatar + role badge
- Notification bell with unread count badge
- Quick create payment button (prominent, accent color)

### Data Display

**Payment Request Cards:**
- White card with subtle shadow, rounded corners (rounded-lg)
- Header: Invoice number (bold) + amount (large, right-aligned)
- Body: Customer name, mobile, branch tag, timestamp
- Footer: Status badge + action buttons (Send Link, View Details)
- Hover state: slight elevation increase

**Transaction Tables:**
- Sticky header row with sorting indicators
- Alternating row backgrounds for readability
- Status column with colored badges (green=paid, amber=pending, red=unidentified)
- Amount column: right-aligned, monospace, bold
- Action column: icon buttons (match, view, export)

**Status Badges:**
- PENDING: Amber background, dark text
- PAID: Green background, white text
- UNIDENTIFIED: Red background, white text
- PARTIAL: Blue background, white text
- Rounded-full, px-3, py-1, text-xs, uppercase

### Forms & Inputs

**Payment Request Form:**
- Clean vertical layout with labels above inputs
- Required field indicators (red asterisk)
- Inline validation with green checkmark / red error icon
- Amount input: Large, monospace, with ₹ prefix
- Mobile field: Auto-format with country code (+91)
- Branch selector: Searchable dropdown

**Manual Match Interface:**
- Split-view layout: SMS details left, candidate invoices right
- Match score indicator (progress bar or percentage badge)
- Comparison table showing parsed vs. invoice data
- Confirmation dialog with TOTP input for high-value matches

### Interactive Elements

**Primary Actions:**
- Filled buttons with accent color (bg-blue-600)
- Large touch targets (min-h-12 on mobile)
- Loading state with spinner replacing text
- Success state with checkmark icon briefly

**Secondary Actions:**
- Outlined buttons with border
- Icon-only buttons for compact spaces (view, edit, delete)

**Short Link Landing Page:**
- Full-screen mobile-first design
- Invoice details card at top (white, elevated shadow)
- Large QR code centered (min 280px square)
- Prominent "Pay Now" button (full-width on mobile, launches UPI app)
- Alternative "I Paid" button below (ghost style)
- Business logo and trust indicators at bottom

### Feedback & States

**Loading States:**
- Skeleton screens for tables (pulse animation)
- Spinner for buttons during submission
- Progress bar for exports and batch operations

**Empty States:**
- Centered illustration placeholder
- Clear message ("No pending payments")
- Primary action button ("Create First Request")

**Error States:**
- Inline form errors with red text + icon
- Toast notifications for system errors (top-right, auto-dismiss)
- Retry button for failed operations

### Audit & Analytics

**Dashboard Metrics Cards:**
- 4-column grid (2-column on tablet, 1-column mobile)
- Large number (text-3xl, bold) with trend indicator (arrow up/down)
- Small label below
- Subtle background gradient or icon watermark

**Match History Timeline:**
- Vertical timeline with dots and connecting lines
- Each entry shows: timestamp, user, action, match score
- Expandable to show raw SMS and parsed data

---

## Mobile App Specific

**SMS Forwarder Screen:**
- Simple one-screen app with device status indicator
- Recent SMS list showing parsed amounts and send status
- Manual send button for retry
- Settings for webhook URL and token

**Quick Create Flow:**
- Bottom sheet modal for rapid payment request creation
- Auto-fill from recent customers
- Camera integration for scanning invoice numbers

---

## Images

**Landing Page Hero Image:**
- None required - focus on QR code and invoice details for speed

**Dashboard Empty States:**
- Use simple SVG illustrations (undraw.co style) for empty lists
- Keep illustrations minimal and monochrome with accent color highlights

**Trust Indicators:**
- Small bank logos (HDFC, ICICI, SBI) in footer of payment landing page
- Lock icon for security messaging

---

## Animation Principles

**Use Sparingly:**
- Page transitions: Simple fade (150ms)
- Status changes: Subtle color transition (200ms)
- No decorative animations
- Focus on micro-interactions: button press feedback, input focus rings

---

This design creates a professional, trustworthy financial tool optimized for speed and accuracy while maintaining visual clarity across web and mobile platforms.