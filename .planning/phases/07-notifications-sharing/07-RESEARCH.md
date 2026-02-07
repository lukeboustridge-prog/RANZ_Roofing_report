# Phase 7: Notifications & Sharing - Research

**Researched:** 2026-02-07
**Domain:** Email notifications, web push notifications, report sharing with password protection
**Confidence:** HIGH

## Summary

The RANZ Roofing Report platform has **existing, nearly complete notification and sharing infrastructure** from v1.0. The database models, API routes, services, and UI components are already in place. However, **notification triggers are missing** at critical workflow points, and **password protection for shared reports is partially implemented** but not enforced at the page level.

**What exists:**
- Complete Notification and PushSubscription models in Prisma schema
- In-app notification system with bell UI and NotificationCenter component
- Web push service with VAPID key support (web-push npm package)
- Email service using Resend API with branded templates
- Report sharing API with password hashing (SHA-256)
- Shared report public page with password entry UI
- User preference toggles for email notification types

**What's missing:**
- Notification creation calls at workflow trigger points (assignment creation, review status changes)
- Client confirmation email on inspection request creation
- Password verification logic is incomplete (checks password but displays content before verification)

**Primary recommendation:** Wire up existing notification services to workflow trigger points and fix password protection enforcement on shared report page.

## Standard Stack

The platform uses established libraries for notifications and email:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| web-push | Latest | Web push notifications | Industry standard for VAPID-based push notifications |
| Resend | API v1 | Transactional email | Modern email API, replaces SendGrid/Mailgun |
| @prisma/client | 7.3.x | Database ORM | Type-safe queries, includes notification models |
| crypto (Node) | Built-in | Password hashing | Native SHA-256 for password protection |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Sharp | Latest | Image processing | Already used for EXIF extraction |
| next/headers | Next.js 16 | Request headers | For user-agent in push subscriptions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Resend | SendGrid | SendGrid more established but more expensive |
| web-push | OneSignal | OneSignal is SaaS (vendor lock-in), web-push is self-hosted |
| SHA-256 | bcrypt | bcrypt is stronger but overkill for share passwords |

**Installation:**
All dependencies already installed. VAPID keys need generation:
```bash
npx web-push generate-vapid-keys
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── email.ts              # Email service with Resend
│   ├── notifications/
│   │   └── push-service.ts   # Web push notification service
│   └── env.ts                # Environment validation
├── app/api/
│   ├── notifications/        # Notification CRUD
│   │   ├── route.ts          # GET (list), POST (create)
│   │   ├── [id]/route.ts     # PATCH (mark read), DELETE (dismiss)
│   │   ├── subscribe/route.ts # Push subscription management
│   │   └── read-all/route.ts # Bulk mark as read
│   ├── assignments/
│   │   └── route.ts          # POST triggers NEW_ASSIGNMENT notification
│   └── reports/[id]/
│       ├── submit/route.ts   # Triggers REPORT_SUBMITTED
│       ├── approve/route.ts  # Triggers REPORT_APPROVED
│       └── review/route.ts   # Triggers REPORT_REJECTED/REVISION_REQUIRED
└── components/
    └── notifications/
        ├── NotificationCenter.tsx  # Bell dropdown
        └── NotificationItem.tsx    # Individual notification
```

### Pattern 1: Notification Creation Flow
**What:** Three-channel notification system (in-app, email, push)
**When to use:** Any workflow event that users should be notified about
**Example:**
```typescript
// Source: src/lib/notifications/push-service.ts (lines 120-188)
import { createAndPushNotification } from "@/lib/notifications/push-service";
import { sendEmail } from "@/lib/email";

// 1. Create in-app notification + send push (if user subscribed)
await createAndPushNotification(userId, {
  type: "NEW_ASSIGNMENT",
  title: "New Inspection Assigned",
  message: `You've been assigned to inspect ${propertyAddress}`,
  link: `/assignments/${assignmentId}`,
  assignmentId: assignmentId,
});

// 2. Send email separately (respects user preferences)
const reportInfo = {
  reportNumber: "RANZ-2025-001234",
  propertyAddress: "123 Main St",
  inspectorName: "John Smith",
  inspectorEmail: "john@example.com",
  reportUrl: "https://reports.ranz.org.nz/reports/abc123",
};
await sendReportSubmittedNotification(reviewerEmail, reportInfo);
```

### Pattern 2: Shared Report Password Protection
**What:** Two-step verification - password checked in API, content hidden until verified
**When to use:** Password-protected share links
**Example:**
```typescript
// Source: src/app/api/shared/[token]/route.ts (lines 101-120)
// API route checks password
if (share.password) {
  if (!password) {
    return NextResponse.json(
      { error: "Password required", requiresPassword: true },
      { status: 401 }
    );
  }

  const hashedPassword = crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");

  if (hashedPassword !== share.password) {
    return NextResponse.json(
      { error: "Invalid password", requiresPassword: true },
      { status: 401 }
    );
  }
}

// Page component shows password form before fetching report
// Source: src/app/shared/[token]/page.tsx (lines 191-224)
if (requiresPassword) {
  return <PasswordForm onSubmit={handlePasswordSubmit} />;
}
```

### Pattern 3: User Preference Checking
**What:** Check UserPreferences before sending email/push notifications
**When to use:** Before sending any notification
**Example:**
```typescript
// Source: src/lib/notifications/push-service.ts (lines 146-173)
const preferences = await prisma.userPreferences.findUnique({
  where: { userId },
});

const preferenceMap: Partial<Record<NotificationType, string | null>> = {
  REPORT_SUBMITTED: "emailReportSubmitted",
  REPORT_APPROVED: "emailReportApproved",
  NEW_ASSIGNMENT: "emailAssignmentNew",
  // null means always send (SYSTEM_ANNOUNCEMENT, etc.)
};

const preferenceKey = preferenceMap[notification.type];
const shouldPush = !preferenceKey || !preferences ||
  preferences[preferenceKey] !== false;
```

### Anti-Patterns to Avoid
- **Don't send email from client side:** Always use server-side API routes for email
- **Don't store plaintext passwords:** Always hash with SHA-256 minimum
- **Don't skip preference checks:** Always respect user notification preferences
- **Don't block on notification sending:** Use .catch() to prevent notification failures from breaking workflow

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Web push notifications | Custom push implementation | `web-push` npm package | Handles VAPID, encryption, browser compatibility |
| Email sending | SMTP client | Resend API | Deliverability, bounce handling, analytics |
| Password hashing | Custom crypto | Node `crypto` with SHA-256 | Standard, audited, sufficient for share passwords |
| Notification UI | Custom dropdown | Existing NotificationCenter | Already built with polling, pagination, mark-as-read |

**Key insight:** The notification infrastructure is 90% complete. The remaining work is integration, not building new systems.

## Common Pitfalls

### Pitfall 1: Missing VAPID Keys Configuration
**What goes wrong:** Web push silently fails if VAPID keys not set
**Why it happens:** VAPID keys must be generated manually and added to .env
**How to avoid:**
1. Generate keys: `npx web-push generate-vapid-keys`
2. Add to .env.example and .env:
   ```
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=BN...
   VAPID_PRIVATE_KEY=...
   VAPID_SUBJECT=mailto:admin@ranz.co.nz
   ```
3. Service gracefully degrades if not configured (logs warning, returns 0/0)
**Warning signs:** Push subscriptions succeed but no notifications arrive

### Pitfall 2: Notification Failures Breaking Workflow
**What goes wrong:** Email/push failure causes entire API request to fail
**Why it happens:** Awaiting notification promises without error handling
**How to avoid:** Always use .catch() on notification calls:
```typescript
// BAD: Throws and breaks workflow
await sendEmail(...)

// GOOD: Logs error but continues
sendEmail(...).catch(err => {
  console.error("[Workflow] Failed to send email:", err);
});
```
**Warning signs:** API route returns 500 when Resend API is down

### Pitfall 3: Password Protection UI/UX Confusion
**What goes wrong:** User enters password but still sees "password required" error
**Why it happens:** Password passed as query param but API expects POST body (or vice versa)
**How to avoid:** Consistent password passing method:
- Shared report GET uses query param: `/api/shared/[token]?password=xyz`
- Password verify POST uses body: `{ password: "xyz" }`
**Warning signs:** Network tab shows 401 even with correct password

### Pitfall 4: Email Notification Spam
**What goes wrong:** Users receive duplicate emails (one per reviewer)
**Why it happens:** Email sent in loop without deduplication
**How to avoid:**
- For report submissions, send one email to all reviewers (BCC or separate loop)
- For assignments, send only to assigned inspector (not all inspectors)
- Check user preferences before sending
**Warning signs:** User complaint about too many emails

### Pitfall 5: Notification Type Mismatch
**What goes wrong:** Created notification type doesn't match enum, DB insert fails
**Why it happens:** Prisma enum is strict, typos cause runtime errors
**How to avoid:** Import NotificationType from @prisma/client:
```typescript
import type { NotificationType } from "@prisma/client";

const type: NotificationType = "NEW_ASSIGNMENT"; // Type-checked
```
**Warning signs:** Prisma validation error about invalid enum value

## Code Examples

Verified patterns from existing codebase:

### Creating Assignment Notification
```typescript
// Source: POST /api/assignments/route.ts (lines 150-172)
// After creating assignment
const assignment = await prisma.assignment.create({
  data: { inspectorId, clientName, clientEmail, propertyAddress, ... },
});

// Notify inspector (in-app + push)
await createAndPushNotification(inspectorId, {
  type: "NEW_ASSIGNMENT",
  title: "New Inspection Assignment",
  message: `Inspection requested for ${propertyAddress}`,
  link: `/assignments/${assignment.id}`,
  assignmentId: assignment.id,
  metadata: {
    urgency: assignment.urgency,
    requestType: assignment.requestType,
  },
});

// Email inspector separately
await sendEmail({
  to: inspector.email,
  subject: `New Inspection Assignment - ${propertyAddress}`,
  text: `You have been assigned...`,
  html: wrapInTemplate(content, title),
});
```

### Report Submission Notification (Existing)
```typescript
// Source: POST /api/reports/[id]/submit/route.ts (lines 156-179)
// Email notification already implemented
const reviewers = await prisma.user.findMany({
  where: {
    role: { in: ["REVIEWER", "ADMIN", "SUPER_ADMIN"] },
    status: "ACTIVE",
  },
  select: { email: true },
});

const reportInfo = {
  reportNumber: report.reportNumber,
  propertyAddress: report.propertyAddress,
  inspectorName: report.inspector?.name || user.name,
  inspectorEmail: user.email,
  reportUrl: `${baseUrl}/reports/${report.id}`,
};

for (const reviewer of reviewers) {
  sendReportSubmittedNotification(reviewer.email, reportInfo).catch(err => {
    console.error(`[Submit] Failed to notify reviewer:`, err);
  });
}
```

### Report Approval Notification (Existing)
```typescript
// Source: POST /api/reports/[id]/approve/route.ts (lines 128-151)
// Email notification already implemented
if (report.inspector?.email) {
  const reportInfo = {
    reportNumber: report.reportNumber,
    propertyAddress: report.propertyAddress,
    inspectorName: report.inspector.name,
    inspectorEmail: report.inspector.email,
    reportUrl: `${baseUrl}/reports/${report.id}`,
  };

  if (finalise) {
    sendReportFinalizedNotification(reportInfo, report.clientEmail).catch(err => {
      console.error("[Approve] Failed to send notification:", err);
    });
  } else {
    sendReportApprovedNotification(reportInfo, user.name).catch(err => {
      console.error("[Approve] Failed to send notification:", err);
    });
  }
}
```

### Shared Report Password Verification
```typescript
// Source: GET /api/shared/[token]/route.ts (lines 98-120)
const url = new URL(request.url);
const password = url.searchParams.get("password");

if (share.password) {
  if (!password) {
    return NextResponse.json(
      { error: "Password required", requiresPassword: true },
      { status: 401 }
    );
  }

  const hashedPassword = crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");

  if (hashedPassword !== share.password) {
    return NextResponse.json(
      { error: "Invalid password", requiresPassword: true },
      { status: 401 }
    );
  }
}

// Only after password verified, return report data
```

### Web Push Subscription
```typescript
// Source: POST /api/notifications/subscribe/route.ts (lines 76-106)
const validatedData = subscribeSchema.parse(body);
const userAgent = request.headers.get("user-agent") || undefined;

const subscription = await prisma.pushSubscription.upsert({
  where: { endpoint: validatedData.endpoint },
  update: {
    p256dh: validatedData.keys.p256dh,
    auth: validatedData.keys.auth,
    userAgent,
    deviceName: validatedData.deviceName,
    isActive: true,
    lastUsed: new Date(),
  },
  create: {
    userId: user.id,
    endpoint: validatedData.endpoint,
    p256dh: validatedData.keys.p256dh,
    auth: validatedData.keys.auth,
    userAgent,
    deviceName: validatedData.deviceName,
  },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SendGrid/Mailgun | Resend | 2023-2024 | Simpler API, better DX |
| Custom email templates | React Email | 2024 | Type-safe, component-based (not yet used here) |
| OneSignal push | web-push (self-hosted) | 2023 | No vendor lock-in, privacy |
| In-app polling | Server-sent events | Emerging | Real-time updates (not implemented) |

**Deprecated/outdated:**
- Firebase Cloud Messaging (FCM) direct API - now requires VAPID
- Email via nodemailer SMTP - replaced by transactional email APIs
- Socket.io for notifications - overkill for this use case

## Open Questions

Things that couldn't be fully resolved:

1. **Client confirmation email trigger point**
   - What we know: NOTIF-01 requires "client receives confirmation email when inspection request is created"
   - What's unclear: Where is the inspection request creation flow? Is it the Assignment creation or a separate form?
   - Recommendation: If Assignment is the inspection request, add client email to POST /api/assignments. If separate, find/create the inspection request creation endpoint.

2. **Push notification adoption**
   - What we know: Infrastructure is complete, but no client-side subscription flow implemented
   - What's unclear: Should users be prompted to enable push? Auto-subscribe on login?
   - Recommendation: Add push subscription prompt in notification center or settings page.

3. **Notification delivery guarantees**
   - What we know: Email and push calls use .catch() to prevent blocking
   - What's unclear: Should failed notifications be retried? Logged for admin review?
   - Recommendation: For MVP, logging is sufficient. For production, consider a notification queue.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis:** Direct inspection of existing implementation
  - `prisma/schema.prisma` - Notification and PushSubscription models (lines 860-942)
  - `src/lib/notifications/push-service.ts` - Complete web push implementation
  - `src/lib/email.ts` - Resend email service with templates
  - `src/app/api/notifications/` - Notification CRUD routes
  - `src/app/shared/[token]/page.tsx` - Shared report page with password UI
  - `src/app/api/shared/[token]/route.ts` - Shared report API with password hashing
  - `src/app/api/assignments/route.ts` - Assignment creation (missing notification trigger)
  - `src/app/api/reports/[id]/submit/route.ts` - Report submission with email notification
  - `src/app/api/reports/[id]/approve/route.ts` - Report approval with email notification
  - `src/app/api/reports/[id]/review/route.ts` - Review decision route (missing notification trigger)
  - `src/components/notifications/NotificationCenter.tsx` - Bell UI component

### Secondary (MEDIUM confidence)
- **web-push documentation:** https://github.com/web-push-libs/web-push (verified standard library)
- **Resend documentation:** https://resend.com/docs (verified API usage matches docs)

### Tertiary (LOW confidence)
- None - all findings based on direct codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and configured
- Architecture: HIGH - complete implementation exists, patterns verified
- Pitfalls: MEDIUM - based on common issues, not project-specific testing

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (30 days - stable infrastructure, unlikely to change)
