# Application Scope of Work — AI Review QR SaaS Platform
**Product Codename:** MagicReview AI (working title)  
**Version:** 1.0 — Full SOW  
**Prepared for:** Rainhopes  
**Date:** 16 September 2026
---
## 1. Executive Summary
This Scope of Work defines the complete functional and technical specification for building **MagicReview AI**, a multi-tenant, white-label SaaS platform for AI-powered review collection and reputation management. The platform is designed as a four-tier hierarchy: **Super Admin → Reseller → Sub-Reseller → Client (Merchant)** , with full white-labeling at every level.
Unlike every product currently on the market, MagicReview AI is built **compliant-by-design** from day one — meaning it never hard-gates reviews, never selectively solicits positive reviews, and never violates Google's April 2026 review policy updates. Instead, it achieves superior business results through a **parallel-path architecture**: every customer always sees the option to post publicly on Google, while an equally prominent private feedback channel runs alongside it. This removes the policy risk that plagues ResellerBano, SmartReviewer AI, and NeelTeck Reputra, while preserving — and actually improving — the core value proposition of private early-warning and AI-assisted writing.
The platform also introduces **Industry Channels** — pre-configured review funnels tailored to specific verticals (salons, clinics, restaurants, hotels, retail, automotive, etc.) — inspired by SaintAura's multi-industry approach. This is the key scalability lever: instead of a generic one-size-fits-all funnel, each industry channel has its own question set, AI prompts, keyword templates, and routing logic.
**Target build timeline:** 16–20 weeks (4 phases), with Phase 1 (core loop) deliverable in 6 weeks.
---
## 2. Product Philosophy — Why This Wins
### 2.1 The Market Gap
Every competitor in this space sells the same thing: a QR code that shows Google only to happy customers and hides unhappy ones. That model is now explicitly banned. Google's April 2026 policy update states that merchants must not "discourage or prohibit negative reviews, or selectively solicit positive reviews from customers". Review gating — pre-screening customers by sentiment before sending a review link — is a direct violation that can result in profile suspension.
None of the vendor sites in the source material mention this risk. ClickGrow's guide flags it, but it's the exception.
### 2.2 The Compliant Advantage
MagicReview AI's core insight: **you don't need to gate to get results**. The reason review-gating works is not because it hides bad reviews — it's because it reduces friction for happy customers and gives unhappy customers an outlet. Both of those benefits can be achieved without gating.
The parallel-path architecture does exactly this:
Old Model (Violation)	MagicReview AI (Compliant)
4–5★ → Google only	Every rating → Google option always visible
1–3★ → Private form only	1–3★ → Private form *alongside* Google option
AI writes only for positive	AI writes for all public reviews
"Would you like to tell us first?" replaces Google	"Would you like to tell us first?" is an additional choice
The result: the merchant still gets the private early-warning channel, still gets AI-assisted writing that removes friction, still gets SEO-seeded language — but the Google profile is never at risk. This is a genuine market differentiator that can be marketed as "The AI review tool that won't get your Google profile suspended."
### 2.3 The Industry Channel Advantage
SaintAura supports 60+ platforms and positions itself for "salons, clinics, restaurants, and retail stores". But it still uses a generic question set for all of them. MagicReview AI goes further: each industry channel has its own:
- **Questionnaire flow** (a salon asks about stylist skill and ambience; a clinic asks about wait time and bedside manner; a restaurant asks about food quality and service speed)  
- **AI prompt template** (industry-specific vocabulary and tone)  
- **Seed keyword library** (local-SEO phrases that actually work in that vertical)  
- **Routing logic** (a clinic's private feedback goes to a different escalation path than a restaurant's)  
- **Print asset templates** (table tent for restaurants, reception desk standee for clinics, mirror sticker for salons)
---
## 3. System Architecture
### 3.1 Four-Tier Hierarchy
```  
┌─────────────────────────────────────────────────────────────┐  
│  SUPER ADMIN (Rainhopes)                                     │  
│  • Platform infrastructure, AI layer, billing engine         │  
│  • Onboards Resellers, sets global pricing floors            │  
│  • Manages Industry Channel templates                        │  
│  • Hardware fulfillment (standee/NFC production)             │  
└──────────────────────────┬──────────────────────────────────┘  
│  
┌──────────────────────────▼──────────────────────────────────┐  
│  RESELLER (e.g., a digital agency)                           │  
│  • White-label dashboard (own logo, domain, colors)          │  
│  • Onboards and manages Sub-Resellers                        │  
│  • Sets own retail pricing (above Super Admin wholesale)     │  
│  • Earns commission on all downstream subscriptions          │  
│  • Bulk hardware ordering                                     │  
└──────────────────────────┬──────────────────────────────────┘  
│  
┌──────────────────────────▼──────────────────────────────────┐  
│  SUB-RESELLER (e.g., a freelancer or local agency)           │  
│  • Scoped white-label dashboard (parent Reseller branding)   │  
│  • Onboards and manages Clients directly                     │  
│  • Sets own pricing above Sub-Reseller wholesale             │  
│  • Earns commission on client subscriptions                  │  
└──────────────────────────┬──────────────────────────────────┘  
│  
┌──────────────────────────▼──────────────────────────────────┐  
│  CLIENT (Merchant)                                           │  
│  • Own review funnel, QR/NFC assets, analytics               │  
│  • Connects Google Business Profile via OAuth                │  
│  • Manages branches, staff, private feedback inbox           │  
│  • AI review drafts, auto-replies, GBP audit                 │  
└─────────────────────────────────────────────────────────────┘  
```
### 3.2 Multi-Tenant Data Architecture
The platform uses a **shared-table multi-tenant model** with row-level isolation, which is the recommended approach for SaaS platforms that need to scale to thousands of tenants without the operational overhead of separate schemas or databases.
Every table carries two tenant identifiers:  
- `reseller_id` — the top-level Reseller (or `SUPER_ADMIN` for direct clients)  
- `merchant_id` — the specific Client account
Sub-Resellers are modeled as a `reseller_id` with a `parent_reseller_id` foreign key, creating a tree structure of arbitrary depth. This means:
- A Super Admin query with `WHERE reseller_id IS NULL` returns all direct clients  
- A Reseller query with `WHERE reseller_id = 'abc'` returns all their merchants (including those under their Sub-Resellers)  
- A Sub-Reseller query with `WHERE reseller_id = 'def'` returns only their own merchants
Row-Level Security (RLS) policies enforce this at the database level, so even a bug in application code cannot leak data across tenants.
### 3.3 Technology Stack
Layer	Technology	Rationale
**Scan page** (customer-facing)	Next.js static export on Cloudflare Pages, or plain HTML+JS on Cloudflare Workers	Sub-second load globally; no server to manage for highest-traffic surface
**Merchant/Reseller dashboard**	Next.js (React) SPA + Node.js (NestJS) REST API	Mature ecosystem, fast development, strong TypeScript support
**Database**	PostgreSQL (Supabase or managed RDS)	Relational model fits merchants→branches→QRs→reviews→feedback cleanly
**Cache & rate limiting**	Redis (Upstash or managed)	QR-scan rate limiting, session cache, queue for async scan events
**AI layer**	Claude API (Haiku for drafts/replies, Sonnet for audit/content) behind an internal abstraction service	Model-agnostic interface allows swapping vendors without app changes
**QR generation**	Server-side SVG generation (Python `qrcode` or Node `qrcode` library)	Print-ready, scalable, no external dependency
**NFC encoding**	NDEF URL records pointing to short-URL redirect layer	Standard NDEF tags work with all NFC-enabled phones
**Short-URL redirect layer**	Cloudflare Workers or a lightweight Node service	Dynamic destination updates without reprinting QR/NFC assets
**Auth**	Google OAuth (for GBP connection) + magic-link/OTP (merchant login)	No passwords to leak; OAuth is the only way to connect GBP
**Payments**	Razorpay (India-first, UPI, cards) + Stripe (international)	Razorpay for Indian SMBs; Stripe for resellers billing in USD
**Hosting**	Docker containers on Railway or Render	Simple, cost-effective at launch; avoid Kubernetes until real multi-region load
**Object storage**	Cloudflare R2 or AWS S3	PDF audit reports, print asset templates, merchant logos
**Email/WhatsApp**	Postmark (transactional email) + WhatsApp Business API (via Twilio or Interakt)	Review request automation, notification delivery
### 3.4 Scan Page Architecture (Critical Path)
The scan page is the highest-traffic surface and must be treated as a **stateless, edge-rendered application**:
1. Customer scans QR / taps NFC → hits `rvw.rainhopes.in/{shortcode}` (or Reseller's custom domain)  
2. Cloudflare Worker resolves shortcode → merchant ID from a KV store (cached, sub-millisecond)  
3. Worker returns a pre-rendered HTML shell (no server round-trip)  
4. HTML shell contains a small JS bundle that fetches merchant config (branding, seed keywords, industry channel) from an API endpoint  
5. Star rating interaction is client-side; AI draft is fetched via a single API call  
6. "Copy & Open Google" uses `navigator.clipboard` + `window.open` — no server involvement
**Performance targets:**  
- First Contentful Paint: < 800ms on 4G  
- Time to Interactive: < 1.5s on 4G  
- API response for AI draft: < 2s (Haiku) / < 4s (Sonnet)
---
## 4. Module Specification
### Module 1: Super Admin Console
**Purpose:** Platform-level control for Rainhopes.
#### 1.1 Reseller Management  
- Create/edit/suspend Reseller accounts  
- Assign wholesale pricing tiers (per-merchant monthly fee, per-scan overage, AI token limits)  
- Set global pricing floors (Reseller cannot sell below this)  
- View Reseller performance dashboard: merchants onboarded, MRR, churn, hardware orders  
- Impersonate Reseller (for support)
#### 1.2 Industry Channel Management  
- CRUD for Industry Channels (see Module 8)  
- Templates: question sets, AI prompts, seed keyword libraries, routing rules, print assets  
- Assign channels to Resellers (a Reseller may be restricted to certain verticals)  
- A/B testing framework for channel effectiveness
#### 1.3 Hardware Fulfillment  
- Order queue: Reseller/Sub-Reseller/Client orders for QR standees, NFC cards, table tents, stickers  
- Integration with print partner API (or manual CSV export)  
- Inventory tracking (SKU level: acrylic standee 4x6, NFC card, table tent, mirror sticker)  
- Shipping status updates → notify ordering party
#### 1.4 Platform Analytics  
- Global MRR, ARR, churn, LTV by Reseller tier  
- AI token consumption and cost per Reseller/Client  
- Scan volume, review conversion rate, platform-wide star distribution  
- Anomaly alerts (burst scans, suspicious IP patterns)
#### 1.5 Billing Engine  
- Subscription plans: Starter / Professional / Enterprise (feature-flagged)  
- Usage-based billing: scans beyond plan limit, AI token overage  
- Commission calculation: automatic ledger credit to Reseller/Sub-Reseller wallets  
- Payout management: Razorpay/Stripe Connect payouts, manual approval workflow  
- Invoice generation (PDF, GST-compliant for India)
#### 1.6 Compliance Dashboard  
- Real-time monitor of all review funnels for policy-risk patterns  
- Flag any funnel where the Google option is hidden for low ratings (should never happen, but monitor)  
- Generate compliance audit reports per merchant (exportable PDF)  
- Terms of Service management: each Reseller/Client must accept the current ToS version
#### 1.7 AI Model Management  
- Model selection per task (draft generation, auto-reply, audit, content)  
- Prompt template versioning (roll back if quality degrades)  
- Token budget per Reseller/Client  
- Quality feedback loop: flag poor AI outputs, retrain prompts
---
### Module 2: Reseller Console
**Purpose:** White-label control for agencies and distributors.
#### 2.1 White-Label Configuration  
- Custom domain mapping (e.g., `reviews.agencyname.com`)  
- Logo upload, brand color palette, favicon  
- Email "from" name and reply-to address  
- Custom login page background/hero image  
- Optional "Powered by" badge (removable on Enterprise tier)
#### 2.2 Sub-Reseller Management  
- Create/edit/suspend Sub-Reseller accounts  
- Set Sub-Reseller wholesale pricing (above Reseller's own wholesale)  
- View Sub-Reseller performance (merchants, MRR, commission earned)  
- Override permissions: what Sub-Resellers can/cannot do (e.g., can they create Industry Channels? Can they order hardware directly?)
#### 2.3 Client Management  
- View all downstream merchants (direct + via Sub-Resellers)  
- Filter by status (active, trial, suspended, churned)  
- Bulk actions: send announcement, upgrade plan, apply discount  
- Support tools: impersonate merchant, reset QR destination, regenerate API keys
#### 2.4 Commission & Wallet  
- Real-time commission ledger: every merchant subscription generates a commission entry  
- Wallet balance: available (withdrawable), pending (in clearance), reserved (for hardware)  
- Withdrawal request → Super Admin approval → payout via Razorpay/Stripe  
- Commission structure configuration:  
- **Starter Reseller:** buys at wholesale, resells at MRP, keeps 100% of markup (one-time hardware + recurring SaaS markup)  
- **Agency Partner:** 20–30% recurring commission on SaaS subscriptions, plus hardware margin  
- **Franchise Partner:** full white-label, own pricing, Rainhopes provides infra + AI + support only (revenue-share model)
#### 2.5 Bulk Hardware Ordering  
- Select SKU, quantity, shipping address  
- Preview customization (logo placement, QR code position, NFC tag encoding)  
- Order status tracking  
- Reorder history
#### 2.6 Reseller Analytics  
- MRR, ARR, churn by merchant cohort  
- Top-performing merchants and Industry Channels  
- Scan volume trends, review conversion rate trends  
- AI usage and cost breakdown
---
### Module 3: Sub-Reseller Console
**Purpose:** Scoped control for freelancers and local partners.
The Sub-Reseller Console is a **subset of the Reseller Console** with the following restrictions:
- Cannot create or manage other Sub-Resellers  
- Cannot change white-label branding (inherits parent Reseller's branding)  
- Cannot override pricing floors set by parent Reseller  
- Can create and manage Clients within their scope  
- Can view their own commission ledger and request withdrawals  
- Can order hardware through the parent Reseller's fulfillment queue
All other Client management, analytics, and hardware ordering features are available with appropriate scoping.
---
### Module 4: Client (Merchant) Console
**Purpose:** The merchant's day-to-day tool.
#### 4.1 Onboarding Wizard (Target: < 5 minutes)  
1. **Connect Google Business Profile** — OAuth flow; auto-fetch business name, category, address, current review link, star rating, review count  
2. **Select Industry Channel** — pre-populated based on GBP category (e.g., "Salon" → Salon Channel)  
3. **Set Seed Keywords** — merchant enters 3–5 local-SEO phrases they want to rank for (e.g., "best hair salon in Kochi", "bridal makeup Kerala"). AI suggests based on GBP category and location.  
4. **Configure Branding** — upload logo, choose brand colors, select template style for scan page  
5. **Generate QR/NFC Assets** — download print-ready SVG/PDF for standee, table tent, sticker; order physical hardware if desired  
6. **Test the Funnel** — merchant scans their own QR to preview the customer experience  
7. **Go Live** — QR code becomes active; dashboard starts collecting data
#### 4.2 QR/NFC Asset Management  
- **Static QR generation:** print-ready SVG/PDF/PNG at various sizes (business card, table tent, standee, sticker, receipt footer)  
- **Dynamic redirect layer:** short URL (`rvw.rainhopes.in/abc123`) that resolves to the current scan page. Merchant can update destination page (e.g., change branding, switch Industry Channel) without reprinting QR assets.  
- **NFC tag encoding:** write NDEF URL record to NFC tags (orderable hardware, or merchant can encode their own with a provided tool)  
- **Multiple assets per branch:** each branch gets its own QR/NFC set, all managed under one account  
- **Print template gallery:** industry-specific templates (restaurant menu insert, salon mirror sticker, clinic reception standee)
#### 4.3 Dashboard Overview  
- **Today's snapshot:** scans, ratings submitted, public reviews posted, private feedback received  
- **Star distribution:** 1–5 star breakdown (bar chart, last 30 days)  
- **Review conversion rate:** scans → ratings → public posts (funnel visualization)  
- **Review velocity:** reviews per week trend (line chart)  
- **Recent activity feed:** latest scans, ratings, private feedback, Google reviews
#### 4.4 Private Feedback Inbox  
- List of all private feedback submissions (from customers who chose the private path)  
- Each entry shows: star rating, timestamp, branch, customer language, free-text feedback, AI-extracted topic tags (e.g., "staff", "pricing", "wait time", "cleanliness")  
- Status workflow: **New → In Progress → Resolved → Archived**  
- Internal notes (staff-only)  
- **Escalation rules:** if a feedback is tagged "urgent" (AI detects severe negative sentiment or specific keywords like "refund", "legal", "health hazard"), auto-notify owner via WhatsApp/SMS and email  
- **Response templates:** AI-generated suggested responses the merchant can copy/edit and send to the customer (via email or WhatsApp, if contact captured)
#### 4.5 Google Review Inbox  
- List of all Google reviews (fetched via GBP API)  
- AI-drafted replies for each review (owner can edit and post with one click, or enable auto-post)  
- Sentiment classification (positive / neutral / negative)  
- Topic extraction from review text  
- **Auto-reply rules:** owner can set "auto-post replies to 5★ reviews" while requiring approval for 1–4★
#### 4.6 AI Tools  
- **Review Draft Generator:** test and preview what AI drafts look like for different star ratings, languages, and seed keywords  
- **GBP Profile Audit:** run on demand, get a scored PDF with fix recommendations (see Module 7)  
- **Post Generator:** AI-generated Google Business Profile posts (seasonal offers, new services, events) with image generation  
- **Keyword Insight:** suggestions for seed keywords based on local search trends (requires external data source integration)
#### 4.7 Branch Management (Multi-Location)  
- Add/edit/deactivate branches  
- Each branch: own QR/NFC assets, own analytics, own private feedback inbox  
- **Roll-up view:** aggregate analytics across all branches  
- **Branch comparison:** side-by-side star rating, scan volume, conversion rate  
- **Staff assignment:** assign branch managers with scoped dashboard access
#### 4.8 Team & Roles  
- **Owner:** full access  
- **Manager:** access to assigned branches only; can view analytics, manage private feedback, post review replies; cannot change billing or branding  
- **Staff:** view-only access to assigned branch analytics; cannot see private feedback (optional)  
- Role-based access control (RBAC) enforced at API level
#### 4.9 Billing & Subscription  
- Current plan, renewal date, usage this period (scans, AI tokens)  
- Upgrade/downgrade plan  
- Payment history, invoice download  
- Payment method management (Razorpay/Stripe)  
- **Usage alerts:** notify when approaching plan limits (80%, 100%)
#### 4.10 Compliance Panel  
- **Policy status:** green checkmark if the funnel is compliant (Google option always visible)  
- **ToS acceptance log:** shows when merchant last accepted the Terms of Service  
- **Audit trail:** every scan, rating, private feedback submission, and review post is logged with timestamp, device hash, and IP hash  
- **Data retention settings:** merchant can configure how long private feedback and scan logs are retained (default: 24 months)
---
### Module 5: Customer-Facing Scan Page
**Purpose:** The moment of truth. Must be instant, frictionless, and compliant.
#### 5.1 Page Flow (Compliant Parallel-Path)
```  
Step 1: Landing  
├── Merchant logo + brand colors  
├── "How was your experience at [Business Name]?"  
├── 5 large star buttons (tap target: 48px minimum)  
└── Language selector (auto-detected, manual override)
Step 2: After Rating Selection  
├── If 4–5★:  
│   ├── "Great! Would you like to share this on Google?"  
│   ├── AI-drafted review text in editable textarea  
│   ├── "Copy & Open Google" button (primary)  
│   └── [Optional] "Or tell us directly first" link (secondary)  
│  
├── If 3★:  
│   ├── "Thanks for your feedback."  
│   ├── AI-drafted review text in editable textarea  
│   ├── "Copy & Open Google" button (primary)  
│   ├── "Or tell us directly first" button (primary, equal visual weight)  
│   └── Both paths are presented as equal choices  
│  
└── If 1–2★:  
├── "We're sorry to hear that. How can we make it right?"  
├── Private feedback form (textarea, optional contact field)  
├── "Submit private feedback" button (primary)  
├── "Also post on Google" button (visible, same visual weight)  
└── Both options are always presented
Step 3: Completion  
├── If Google path: "Copied! Opening Google..." → redirect to GBP review page  
├── If Private path: "Thank you. The owner will see this shortly." → optional: offer to also post on Google  
└── If both paths taken: show both confirmations  
```
#### 5.2 AI Review Draft Generation  
- Customer selects 2–3 quick tags (e.g., "friendly staff", "quick service", "clean") OR writes free text  
- AI generates a 2–4 sentence review in the customer's detected language  
- **Critical compliance feature:** the text is always editable by the customer before posting. This is both a UX requirement (they should own their words) and a compliance safeguard (the review is not scripted).  
- **Multilingual:** English + Hindi + Tamil + Malayalam + Kannada + Telugu + Bengali + Marathi + Gujarati + Punjabi (11 languages at launch)  
- **Code-mixed support:** Manglish (Malayalam+English), Hinglish (Hindi+English) — AI is prompted to generate natural code-mixed text where appropriate  
- **Seed keyword injection:** merchant's 3–5 seed keywords are injected into the prompt with instruction to use only if natural and contextually appropriate
#### 5.3 Private Feedback Form  
- Star rating (pre-filled from Step 1)  
- Free-text textarea ("What went wrong? How can we fix it?")  
- Optional: name, phone/email (for follow-up)  
- **Consent checkbox:** "I agree to be contacted about this feedback" (required for contact capture)  
- **Privacy note:** "This feedback goes directly to the business owner, not to Google."
#### 5.4 Performance & UX Requirements  
- **No app install, no login, no friction**  
- **Sub-1-second load** on 4G (see architecture section)  
- **Mobile-first design** (95%+ of scans are mobile)  
- **Accessible:** WCAG 2.1 AA compliant (screen reader support, sufficient contrast, large tap targets)  
- **Offline resilience:** if API is unreachable, show a fallback page with a direct Google review link and a "try again" button  
- **PWA-ready:** optional "Add to Home Screen" prompt for repeat visitors
---
### Module 6: AI Layer Specification
#### 6.1 Review Draft Generator
Attribute	Specification
**Model**	Claude Haiku (primary), with Sonnet fallback for complex cases
**Input**	Star rating, selected tags (2–3), optional free text, merchant name, category, seed keywords, customer language
**Output**	2–4 sentence review draft in customer language, editable textarea
**Guardrails**	Never fabricate specifics the customer didn't select. If tags are sparse, keep the draft generic but authentic.
**Latency target**	< 2 seconds (P95)
**Cost per draft**	~$0.0002–0.0005 (Haiku)
#### 6.2 Auto-Reply Generator
Attribute	Specification
**Model**	Claude Haiku
**Input**	Review text, star rating, merchant brand voice description, previous replies (for consistency)
**Output**	1–3 sentence reply draft
**Modes**	**Suggest mode** (owner approves/edits/posts) or **Auto-post mode** (only for 5★ reviews, opt-in)
**Guardrails**	Never promise compensation or refunds without owner approval. Never acknowledge fault for legal-sensitive issues (auto-escalate to human).
**Latency target**	< 2 seconds
#### 6.3 Sentiment & Topic Tagging
Attribute	Specification
**Model**	Claude Haiku (classification pass)
**Input**	Private feedback text, Google review text
**Output**	Sentiment (positive/neutral/negative), topic tags (staff, pricing, wait time, hygiene, ambience, food quality, etc.), urgency flag
**Use case**	Dashboard filtering, escalation rules, trend analysis
#### 6.4 GBP Profile Audit
Attribute	Specification
**Model**	Rule-based checks + Claude Sonnet for recommendations
**Checks**	Profile completeness, photo count and recency, posting frequency, review response rate, keyword usage in description, category accuracy, business hours completeness, Q&A section activity
**Output**	Scored PDF report (0–100) with prioritized fix recommendations
**Use case**	Free lead magnet (give audit free, sell the fix), upsell tool for merchants
#### 6.5 AI Content Generator
Attribute	Specification
**Model**	Claude Sonnet (copy) + image generation API (poster)
**Input**	Merchant brand, industry channel, occasion (Diwali, Christmas, new service launch, etc.)
**Output**	GBP post text + image, social media caption + image
**Use case**	Keep GBP profile active (Google rewards frequent posting), zero merchant effort
#### 6.6 Fraud & Anomaly Detection
Attribute	Specification
**Approach**	Rate limiting + pattern heuristics + optional LLM classifier for edge cases
**Signals**	Burst scans from one IP, identical text across "customers", merchant self-scanning repeatedly, scan-to-rating time < 2 seconds, unusual device fingerprint patterns
**Action**	Flag for review, rate-limit, optionally block
**Use case**	Protect platform credibility with Google; prevent reseller clients from getting suspended
#### 6.7 Voice-to-Review (Phase 4)
Attribute	Specification
**Model**	Speech-to-text API (Whisper or equivalent) + Review Draft Generator
**Flow**	Customer speaks 10 seconds → transcript → AI draft → editable textarea
**Use case**	Older/less tech-savvy customers; even lower friction than typing
---
### Module 7: Analytics & Reporting
#### 7.1 Client Analytics
Metric	Description	Granularity
**Scans**	QR scans + NFC taps	Daily, weekly, monthly
**Rating distribution**	Count of 1–5★ submissions	Daily, branch-level
**Completion rate**	Scans → rating submissions	Daily, branch-level
**Public review conversion**	Rating submissions → Google review posts	Daily, branch-level
**Private feedback rate**	Rating submissions → private feedback submissions	Daily, branch-level
**Review velocity**	Google reviews per week	Weekly, trend line
**Language breakdown**	Which languages customers use	Monthly
**Peak scan times**	Hourly heatmap	Weekly
**Top seed keywords**	Which keywords appear in posted reviews	Monthly
**AI draft acceptance rate**	Drafts posted without edits vs. edited	Monthly
#### 7.2 Reseller Analytics
- MRR, ARR, churn rate by merchant cohort  
- Merchant acquisition trend (new merchants per month)  
- Average revenue per merchant (ARPM)  
- Top-performing Industry Channels (by conversion rate)  
- Hardware order volume and margin  
- Commission earned vs. paid out
#### 7.3 Super Admin Analytics
- Platform-wide MRR, ARR, churn  
- Reseller performance ranking  
- AI token consumption and cost  
- Scan volume and infrastructure cost per scan  
- Compliance incidents (flagged funnels, policy violations)
#### 7.4 Reporting Outputs
- **PDF export:** client-facing monthly report (branded to Reseller)  
- **CSV export:** raw data for custom analysis  
- **WhatsApp-shareable card:** "You crossed 50 reviews! 🎉" — auto-generated image + caption for merchant to share with their network  
- **Email digest:** weekly summary sent to merchant owner (opt-in)
---
### Module 8: Industry Channels
**Purpose:** Pre-configured review funnels tailored to specific verticals. This is the scalability lever — instead of a generic funnel, each industry gets a purpose-built experience.
#### 8.1 Channel Structure
Each Industry Channel is a configuration object containing:
Component	Description
**Question set**	3–5 questions shown after star rating (industry-specific)
**AI prompt template**	Industry-specific tone, vocabulary, and constraints
**Seed keyword library**	20–30 local-SEO phrases that work in this vertical
**Routing rules**	Where private feedback goes, who gets notified, escalation thresholds
**Print asset templates**	Industry-appropriate QR/NFC standee designs
**Dashboard widgets**	Industry-relevant metrics highlighted (e.g., "wait time" for clinics, "food quality" for restaurants)
**Compliance notes**	Industry-specific policy considerations (e.g., healthcare privacy, financial services disclaimers)
#### 8.2 Launch Channels (Phase 1)
Industry	Question Set (after star rating)	Key Seed Keywords	Private Feedback Routing
**Salon & Spa**	"How was your stylist?" "Was the ambience relaxing?" "Would you recommend us?"	"best salon in [city]", "bridal makeup [city]", "hair spa near me"	Owner + branch manager
**Clinic & Healthcare**	"How was your wait time?" "Was the doctor attentive?" "Was the staff helpful?"	"best [specialty] doctor in [city]", "[specialty] clinic near me", "painless treatment [city]"	Owner + clinic manager (compliance: no medical details in AI draft)
**Restaurant & Cafe**	"How was the food?" "How was the service?" "Was the ambience good?"	"best [cuisine] restaurant in [city]", "family restaurant near me", "romantic dinner [city]"	Owner + floor manager
**Hotel & Hospitality**	"How was your stay?" "Was the staff helpful?" "Would you stay again?"	"best hotel in [city]", "budget hotel near [landmark]", "luxury resort [city]"	Owner + front desk manager
**Retail & Fashion**	"How was the product quality?" "Was the staff helpful?" "Would you shop again?"	"best [product] store in [city]", "[brand] showroom near me", "affordable [product] [city]"	Owner + store manager
#### 8.3 Phase 2+ Channels
- **Automotive** (service centers, dealerships)  
- **Real Estate** (property agents, builders)  
- **Education** (coaching centers, schools, colleges)  
- **Fitness** (gyms, yoga studios, personal trainers)  
- **Professional Services** (lawyers, accountants, consultants)  
- **Home Services** (plumbers, electricians, cleaning services)  
- **Pet Care** (vets, groomers, boarding)  
- **Events & Weddings** (photographers, decorators, venues)
#### 8.4 Custom Channel Builder (Phase 3)
Allow Resellers to create their own Industry Channels using a visual builder:
- Drag-and-drop question set  
- AI prompt template editor (with preview)  
- Seed keyword manager  
- Routing rule builder (if X, then notify Y, escalate to Z)  
- Print asset template uploader
This turns Resellers into co-creators and deepens their lock-in to the platform.
---
### Module 9: Hardware & NFC Integration
#### 9.1 Hardware SKUs
SKU	Description	Target Price (India)
**Acrylic Standee 4x6**	UV-printed acrylic, tabletop, QR + NFC	₹699–999
**NFC Business Card**	Matte PVC, credit-card size, QR + NFC	₹299–499
**Table Tent**	Folded card, restaurant/cafe style, QR + NFC	₹399–599
**Mirror Sticker**	Transparent vinyl, salon/clinic mirror, QR + NFC	₹199–299
**Counter Mat**	Rubber base, billing counter, QR + NFC	₹799–1,199
#### 9.2 NFC Encoding
- Standard NDEF URL record pointing to `rvw.rainhopes.in/{shortcode}` (or Reseller's custom domain)  
- Encoding done at fulfillment partner; optionally, merchant can re-encode with a provided mobile app (Phase 4)  
- **Dynamic redirect:** the short URL resolves to the current scan page, so NFC tags never need re-encoding even if the merchant changes their review link or branding
#### 9.3 Print Asset Generation
- **Server-side SVG generation:** merchant logo + brand colors + QR code + NFC symbol + "Tap or Scan" instruction → print-ready SVG  
- **PDF templates:** industry-specific layouts (e.g., restaurant table tent with menu space, salon mirror sticker with service list)  
- **Download options:** SVG, PDF, PNG (300 DPI), EPS  
- **Customization:** merchant can choose template, adjust colors, add tagline
#### 9.4 Fulfillment Workflow
1. Reseller/Client orders via dashboard → order enters queue  
2. Super Admin reviews order → confirms with print partner (API or manual CSV)  
3. Print partner produces and ships → tracking number entered  
4. Ordering party notified via email + WhatsApp  
5. QR/NFC assets activated (short URL resolves) upon shipment
---
### Module 10: Billing, Subscriptions & Commissions
#### 10.1 Plan Tiers
Feature	Starter	Professional	Enterprise
**Price (India)**	₹399/mo	₹999/mo	₹2,499/mo
**Price (International)**	$9/mo	$29/mo	$79/mo
**Branches**	1	3	Unlimited
**QR/NFC assets**	5	20	Unlimited
**Scans/month**	500	5,000	50,000
**AI review drafts**	100/mo	1,000/mo	10,000/mo
**AI auto-replies**	❌	✅	✅
**GBP Audit**	1/mo	4/mo	Unlimited
**AI Post Generator**	❌	4/mo	Unlimited
**Multi-language**	3 languages	11 languages	11 languages
**Private feedback inbox**	✅	✅	✅
**Team roles**	1 user	5 users	Unlimited
**White-label**	❌	❌	✅ (Reseller only)
**Priority support**	❌	Email	WhatsApp + Phone
#### 10.2 Usage-Based Overages
- Scans beyond plan: ₹0.10/scan  
- AI drafts beyond plan: ₹0.50/draft  
- AI auto-replies beyond plan: ₹0.30/reply  
- GBP Audits beyond plan: ₹99/audit
#### 10.3 Reseller Commission Structure
Reseller Tier	Hardware Margin	SaaS Commission	Requirements
**Starter Reseller**	Buys at wholesale, resells at MRP (keeps 100% markup)	0% (they keep the markup they charge)	No minimum
**Agency Partner**	Buys at wholesale	20–30% recurring on SaaS subscription	10+ active merchants
**Franchise Partner**	Buys at wholesale	40–50% recurring, or revenue-share model	50+ active merchants, own support capability
#### 10.4 Payment Flow
```  
Client pays Reseller (or Sub-Reseller)  
│  
▼  
Reseller pays Super Admin wholesale price  
│  
▼  
Super Admin pays AI/infrastructure costs  
│  
▼  
Net margin = Reseller's markup + Super Admin's wholesale margin  
```
**Implementation:** Razorpay/Stripe Connect handles the payment split. Reseller collects from Client → platform automatically deducts wholesale fee and credits Reseller wallet with the margin. Super Admin approves payouts weekly.
#### 10.5 Dunning & Churn Prevention
- **Failed payment:** retry 3 times over 7 days, then suspend account  
- **Grace period:** 3 days after suspension before QR codes stop working  
- **Churn save:** automated email + WhatsApp sequence offering discount or plan downgrade  
- **Win-back:** 30/60/90 day re-engagement campaigns for churned merchants
---
### Module 11: Compliance & Policy Engine
#### 11.1 Built-In Compliance Rules
Rule	Implementation
**Google option always visible**	The "Post on Google" button is never hidden, regardless of star rating. No code path can hide it.
**No selective solicitation**	Every customer sees the same entry point (star picker). Routing is based on *customer choice*, not on hiding the Google option.
**No review quotas**	No feature allows a merchant to set a "target number of reviews" or track staff against a quota.
**No staff-name scripting**	AI prompt never asks customers to mention staff names. Auto-reply never requests it.
**No incentives**	No feature allows offering discounts, gifts, or perks in exchange for reviews.
**No on-premises pressure**	The scan page does not require the customer to complete the review on-site. They can copy the draft and post later.
**Editable AI draft**	Every AI-generated review is presented in an editable textarea. The customer must be able to change it.
**Audit trail**	Every scan, rating, private feedback, and review post is logged with timestamp, device hash, IP hash, and tenant ID.
**ToS versioning**	Every Reseller and Client must accept the current ToS version. Acceptance is logged with timestamp and IP.
**Compliance dashboard**	Super Admin can monitor all funnels for policy-risk patterns. Any anomaly (e.g., a funnel where the Google option is hidden) triggers an alert.
#### 11.2 Risk Mitigation for Resellers
The platform provides a **Compliance Toolkit** for Resellers to share with their clients:
- One-page "Google Review Policy Summary" (plain language, updated with each Google policy change)  
- "Do's and Don'ts" checklist for staff training  
- Template email/WhatsApp messages for review requests (compliant language)  
- Audit report generator: Reseller can run a compliance audit on any merchant funnel and export a PDF
#### 11.3 Data Privacy & Security
- **GDPR/DPDP compliance:** data processing agreement (DPA) available for Resellers; consent capture for private feedback contact details; right-to-erasure workflow  
- **Data retention:** configurable per merchant (default 24 months for scan logs, 36 months for feedback)  
- **Encryption:** OAuth tokens encrypted at rest (AES-256); TLS 1.3 in transit; database encryption at rest  
- **Access control:** RBAC at API level; RLS at database level; audit log for all admin actions  
- **Penetration testing:** annual third-party pentest; bug bounty program (Phase 3)  
- **Incident response:** documented IR plan; 72-hour breach notification (GDPR/DPDP)
---
## 5. Industry Channels — Deep Dive
### 5.1 Why Industry Channels Matter
SaintAura supports 60+ review platforms and targets "salons, clinics, restaurants, and retail stores". But it uses a generic funnel for all of them. MagicReview AI's Industry Channels are different: they are **end-to-end vertical solutions**, not just platform connectors.
A salon owner doesn't just need a review funnel — they need:  
- A question set that asks about the stylist, not the "product"  
- Seed keywords like "bridal makeup in Kochi", not "best service in city"  
- A print asset that looks like it belongs on a salon mirror, not a restaurant table  
- Private feedback routed to the salon manager, with escalation for hygiene complaints
This vertical depth is the product's competitive moat. It's harder to copy than a QR code, and it creates switching costs: a salon that has configured its Industry Channel has invested time in customization that a competitor's generic tool can't match.
### 5.2 Channel Configuration Interface (Super Admin)
```  
Industry Channel: Salon & Spa  
├── Questionnaire  
│   ├── Q1: "How was your stylist?" (tags: skilled, friendly, rushed, unprofessional)  
│   ├── Q2: "Was the ambience relaxing?" (tags: clean, peaceful, noisy, cramped)  
│   └── Q3: "Would you recommend us?" (tags: definitely, maybe, no)  
├── AI Prompt Template  
│   ├── Tone: warm, personal, salon-appropriate  
│   ├── Vocabulary: "stylist", "treatment", "ambience", "pampering"  
│   ├── Constraints: never mention medical procedures; keep under 3 sentences  
│   └── Seed keyword injection: 3–5 keywords from merchant's list  
├── Seed Keyword Library  
│   ├── "best salon in [city]"  
│   ├── "bridal makeup [city]"  
│   ├── "hair spa near me"  
│   ├── "keratin treatment [city]"  
│   └── "affordable salon [city]"  
├── Routing Rules  
│   ├── 1–3★ + "hygiene" tag → notify owner + manager immediately  
│   ├── 1–3★ + "staff" tag → notify manager only  
│   └── All private feedback → dashboard inbox  
├── Print Assets  
│   ├── Mirror sticker template (transparent vinyl)  
│   ├── Reception standee template (acrylic)  
│   └── Business card template (for stylist to hand out)  
└── Dashboard Widgets  
├── "Top stylist mentioned" (extracted from review text)  
├── "Ambience score" (average of Q2 ratings)  
└── "Recommendation rate" (percentage of "definitely" answers)  
```
### 5.3 Channel Activation Flow (Client)
1. Merchant connects GBP → platform auto-detects category ("Beauty Salon")  
2. Platform suggests "Salon & Spa" Channel → merchant confirms or chooses another  
3. Merchant customizes: seed keywords, branding, print assets  
4. Channel is activated → scan page shows salon-specific questions  
5. AI generates salon-specific drafts → dashboard shows salon-specific widgets
---
## 6. Scaling Roadmap
### Phase 1: Core Loop (Weeks 1–6)
**Deliverables:**  
- Super Admin: basic Reseller management, billing engine  
- Client: onboarding wizard, QR generation, dashboard, private feedback inbox, AI review draft (English + Hindi + Malayalam)  
- Scan page: compliant parallel-path, 3 languages, sub-1s load  
- Industry Channels: Salon, Clinic, Restaurant (3 launch channels)  
- Payments: Razorpay integration, 3 plan tiers  
- Infrastructure: PostgreSQL multi-tenant schema, Redis, Cloudflare Pages
**Success metrics:**  
- 10 pilot merchants onboarded  
- 1,000 scans processed  
- Sub-1s scan page load time (P95)  
- 80%+ rating completion rate
### Phase 2: Reseller Layer & AI Expansion (Weeks 7–10)
**Deliverables:**  
- Reseller console: white-label config, Sub-Reseller management, commission ledger  
- Sub-Reseller console: scoped dashboard  
- AI auto-reply (suggest mode + auto-post for 5★)  
- Multi-branch support  
- 8 additional languages  
- 5 additional Industry Channels (Hotel, Retail, Automotive, Education, Fitness)  
- Hardware fulfillment: order queue, print partner integration
**Success metrics:**  
- 5 Resellers onboarded  
- 50 Sub-Resellers onboarded  
- 200 active merchants  
- ₹5L+ MRR
### Phase 3: AI Depth & Analytics (Weeks 11–14)
**Deliverables:**  
- GBP Profile Audit tool (free lead magnet)  
- AI Post Generator (GBP posts + social)  
- Sentiment & topic tagging on all feedback  
- Fraud/anomaly detection  
- Advanced analytics: cohort analysis, churn prediction, keyword insight  
- Custom Industry Channel builder (for Resellers)  
- API for third-party integrations (Zapier, webhooks)
**Success metrics:**  
- 500 active merchants  
- 15% month-over-month merchant growth  
- 80%+ AI draft acceptance rate
### Phase 4: Automation & Scale (Weeks 15–20)
**Deliverables:**  
- WhatsApp/SMS review request automation (post-visit nudge)  
- Voice-to-review (mobile only)  
- NFC self-encoding mobile app  
- Marketplace for Industry Channel templates (Resellers can buy/sell)  
- White-label mobile app (React Native, branded to Reseller)  
- Advanced compliance: automated policy monitoring, audit report generator
**Success metrics:**  
- 1,000+ active merchants  
- ₹20L+ MRR  
- 20+ Resellers  
- 200+ Sub-Resellers
---
## 7. Commercial Model
### 7.1 Pricing Benchmark (Competitor-Informed)
Tier	Competitor Price	MagicReview AI Price
Entry	₹399–999/mo (SmartReviewer, NeelTeck Business)	₹399/mo
Mid	₹999–1,999/mo (NeelTeck Professional)	₹999/mo
Enterprise	₹4,999+/year or ₹1,999–9,999/mo	₹2,499/mo
Hardware (standee/NFC)	₹799–1,999 one-time	₹699–1,199 one-time
### 7.2 Revenue Streams
1. **SaaS subscriptions** (recurring, primary)  
2. **Hardware sales** (one-time, margin 40–60%)  
3. **Usage overages** (scans, AI tokens beyond plan)  
4. **Setup fees** (for white-label Reseller onboarding)  
5. **Industry Channel marketplace** (Phase 4: revenue share on template sales)  
6. **API access** (Phase 3: for third-party integrations)
### 7.3 Unit Economics (Projected)
Metric	Value
**CAC (Client)**	₹500–1,500 (via Reseller channel)
**ARPU (Client)**	₹999/mo
**Gross margin (SaaS)**	75–85%
**Gross margin (Hardware)**	40–60%
**Payback period**	2–3 months
**LTV (Client, 24-month avg)**	₹23,976
**LTV:CAC ratio**	16:1–48:1
---
## 8. Risk Register
Risk	Likelihood	Impact	Mitigation
**Google policy change**	Medium	High	Compliance-by-design; policy monitoring; flexible funnel architecture
**AI cost overrun**	Medium	Medium	Usage-based pricing; Haiku-first model strategy; token budgets per tenant
**Reseller churn**	Medium	High	Deep white-label integration; commission lock-in; marketplace ecosystem
**Merchant churn**	Medium	High	Dunning sequence; WhatsApp engagement; demonstrable ROI (reviews + ranking)
**Hardware supply chain**	Low	Medium	Multiple print partners; buffer inventory; QR-only fallback
**Data breach**	Low	Critical	Encryption at rest/transit; RLS; annual pentest; bug bounty
**Platform dependency (GBP API)**	Medium	High	Fallback to manual review link; direct Google review URL capture at onboarding
---
## 9. Success Criteria (12-Month)
Metric	Target
Active merchants	1,000+
Active Resellers	20+
Active Sub-Resellers	200+
MRR	₹20L+
Scan volume	500K+/month
Review conversion rate	25%+ (industry average: 10–15%)
Private feedback resolution rate	70%+
AI draft acceptance rate	80%+
Scan page P95 load time	< 1s
Platform uptime	99.9%
Google policy violations	Zero
---
## 10. Appendix: Competitive Comparison
Feature	ResellerBano	SmartReviewer AI	NeelTeck Reputra	SaintAura	MagicReview AI
**Review gating**	✅ (violation)	✅ (with escape link)	✅ (violation)	❌ (compliant)	❌ (compliant, parallel path)
**AI review drafts**	❌	✅	✅	✅	✅
**Multilingual**	❌	11 languages	❌	8+ languages	11 languages + code-mixed
**Industry Channels**	❌	❌	❌	Generic verticals	✅ End-to-end verticals
**Reseller/Sub-Reseller hierarchy**	❌	❌	❌	❌	✅ 4-tier
**White-label at every level**	✅ (Reseller only)	❌	❌	❌	✅
**GBP Audit**	❌	❌	✅	❌	✅
**AI Auto-Reply**	❌	❌	✅	❌	✅
**Fraud detection**	❌	❌	❌	❌	✅
**Custom Industry Channel builder**	❌	❌	❌	❌	✅ (Phase 3)
**Compliance dashboard**	❌	❌	❌	❌	✅
**Voice-to-review**	❌	❌	❌	❌	✅ (Phase 4)
**NFC + QR**	✅	❌	❌	❌	✅
**Price (entry)**	₹1,999 (one-time)	₹399/mo	₹999/mo	$5/mo	₹399/mo
*End of Scope of Work — MagicReview AI v1.0*