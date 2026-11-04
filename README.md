# NexMilestro - Enterprise Project, Operations & Finance SaaS

> **A Commercial-Grade, Multi-Tenant Project Operations Suite Powered by the Nexallot Decoupled Serverless Architecture.**  
> *Developed & Distributed by NexSolve Training & Consulting | Contact: `mehul.gandhi@nexsolve.in`*

[![Platform](https://img.shields.io/badge/Architecture-Decoupled%20Serverless-0f766e?style=for-the-badge)](https://nexsolve.in)
[![Frontend](https://img.shields.io/badge/Frontend-Static%20SPA%20(GitHub%20Pages)-0284c7?style=for-the-badge)](https://nexmilestro.nexsolve.in)
[![Database](https://img.shields.io/badge/Database-Google%20Sheets%20(Cost--Free)-10b981?style=for-the-badge)](https://workspace.google.com/products/sheets/)
[![Middleware](https://img.shields.io/badge/Backend-Google%20Apps%20Script%20API-f59e0b?style=for-the-badge)](https://developers.google.com/apps-script)
[![License](https://img.shields.io/badge/License-Commercial%20SaaS-ef4444?style=for-the-badge)](mailto:mehul.gandhi@nexsolve.in)

---

## 🌟 Executive Product Overview

**NexMilestro** is an enterprise-grade, turn-key Project, Operations & Financial Management SaaS platform built specifically for turnkey interior contractors, architecture studios, general contracting firms, MEP consultancies, and engineering agencies.

Unlike bulky, complex enterprise ERPs with recurring cloud hosting overheads, NexMilestro operates on a **100% serverless, zero-maintenance architecture**:
- **Zero Cloud Hosting Costs:** Deployed as a ultra-fast static Single Page Application (SPA) on **GitHub Pages** using a custom domain (`nexmilestro.nexsolve.in`).
- **Cost-Free Scalable Relational Database:** Powered entirely by **Google Sheets**, offering total client data sovereignty, unlimited storage, and easy manual auditability.
- **Headless JSON API Middleware:** Powered by a high-performance **Google Apps Script Web App** acting as an asynchronous JSON API.
- **Central Master License Gatekeeper:** Dynamic multi-tenant routing that resolves client license keys to their private Google Sheet database, with automated lockout enforcement for expired or suspended tenants.
- **Instant 0ms Transitions:** Employs the **Nexallot Speed Engine** (Bulk Hydration, Local-First Caching in `localStorage`, and Stale-While-Revalidate synchronization) to deliver instant navigation with zero roundtrip waiting times.

---

## 🏗️ 1. Decoupled Serverless Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       STATIC CLIENT (GITHUB PAGES)                          │
│                                                                             │
│  • Custom Domain: https://nexmilestro.nexsolve.in (via CNAME)               │
│  • Single-File Compiled SPA (index.html, 0 external runtime dependencies)   │
│  • Local-First Caching: window._dataCache & localStorage                    │
│  • 0ms Instant Navigation | Optimistic UI Updates                           │
│  • Evaluator Demo Mode (Instant access with realistic sample data)          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                      Direct Fetch JSON API (POST / GET)
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   HEADLESS API GATEWAY (GOOGLE APPS SCRIPT)                 │
│                                                                             │
│  • File: API_Router.gs / Code.gs (doPost & doGet headless dispatcher)       │
│  • Central Master License Gatekeeper (CacheService 5ms resolution)          │
│  • Universal RPC Dispatcher (40+ action endpoints)                          │
│  • SHA-256 Salted Password Hashing & Granular RBAC Permissions Matrix       │
│  • Universal Google Drive File Streamer (Permanent shareable links)         │
└──────────────────────┬───────────────────────────────┬──────────────────────┘
                       │                               │
       Dynamic Routing │                               │ Master Verification
                       ▼                               ▼
┌────────────────────────────────────────┐  ┌─────────────────────────────────┐
│     TENANT PRIVATE GOOGLE SHEET        │  │   CENTRAL MASTER LICENSE SHEET  │
│                                        │  │                                 │
│  15 Canonical Relational Tables:       │  │  Tab: Licenses                  │
│  1. Customers       9. Vendors         │  │  • LicenseKey                   │
│  2. Projects       10. Associates      │  │  • ClientName                   │
│  3. Milestones     11. Transactions    │  │  • ClientEmail                  │
│  4. Tasks          12. Users           │  │  • SpreadsheetID                │
│  5. SiteVisits     13. RolePermissions │  │  • Plan & MaxUsers              │
│  6. Leads          14. DropdownMasters │  │  • IssueDate & ExpiryDate       │
│  7. LeadFollowups  15. CompanyProfile  │  │  • Status (Active/Expired)      │
│  8. Proposals                          │  │                                 │
└────────────────────────────────────────┘  └─────────────────────────────────┘
```

---

## 🔑 2. Commercial Multi-Tenant Licensing Gate

### 2.1 Master License Sheet (`Licenses` Tab)
The central license spreadsheet controls access for all paying clients across the world:
- **Columns:**
  1. `LicenseKey`: Unique client license identifier (e.g., `LIC-BUYER1-2026`).
  2. `ClientName`: Legal company name of the tenant.
  3. `ClientEmail`: Primary billing or administrative contact email.
  4. `SpreadsheetID`: The Google Sheet ID of the client's private database.
  5. `Plan`: Subscription tier (e.g., `Enterprise Pro`, `Annual Growth`).
  6. `IssueDate`: License activation timestamp.
  7. `ExpiryDate`: Subscription validity date (`YYYY-MM-DD`).
  8. `Status`: Commercial status (`Active`, `Expired`, `Suspended`).
  9. `MaxUsers`: Maximum allowed user seat quota.
  10. `LastVerified`: Last verification ping timestamp.

### 2.2 Bootstrapping & Dynamic Routing
1. **Zero Hardcoded IDs:** The frontend never bundles a tenant database ID.
2. **License Retrieval:** On application boot, the client retrieves the license key from URL parameter (`?lic=KEY`), query string, or `localStorage`.
3. **Validation & Full-Screen Lockout:**
   - **Active:** Dynamically links the tenant's private database `SpreadsheetID`, loads company branding, and displays the authenticated Login Screen.
   - **Invalid / Expired / Suspended:** Displays an impenetrable full-screen lockout modal displaying the client's name, lock status, and direct reactivation link (`mehul.gandhi@nexsolve.in`).
4. **License Switcher:** Allows switching tenant databases directly from the login interface.

---

## ⚡ 3. The 0ms Local-First Speed Engine (Nexallot Pattern)

- **Single-Packet Bulk Hydration (`get_initial_data`):** On login, the backend executes a single high-performance RPC that reads all 15 database tabs concurrently and returns them in **one single compressed JSON payload**.
- **Local-First Caching (`localStorage`):** The entire dataset is saved into `localStorage` (`nexmilestro_app_data`). Tab navigation reads from memory in **0ms** with zero loading bars or UI freezes.
- **Stale-While-Revalidate (SWR):** Views render immediately from cache while a silent background sync reconciles modifications.
- **Optimistic UI Updates:** Create, Update, and Delete operations mutate the local cache and re-render the view instantly, streaming the change to Google Sheets in the background.

---

## 📦 4. Complete 15 Enterprise Modules

| # | Module | Core Capabilities |
|---|---|---|
| **1** | **Executive Dashboard** | Workspace filter bar, 4 KPI cards (Projects, Customers, Tasks, Visits), Active Projects milestone progress bars, Urgent Tasks table, Inquiry Conversion Funnel widget, and Expenditure Breakdown progress bars. |
| **2** | **Customer Directory** | Complete 360° client registry, Add/Edit modal, GSTIN/PAN compliance, 1-click WhatsApp chat launch, phone dialer, and Google Drive KYC attachments. |
| **3** | **Project & Milestone Engine** | Multi-stage project tracking, contract budgets, PM assignment, **Manage Milestones modal**, milestone cost comparison (Budgeted vs Actual), and dynamic weighted progress bars. |
| **4** | **Site Visits & Field Supervision** | **Entity Radio Toggle (Lead vs Project)** dynamically updating dropdowns, visitor staff logs, inspection remarks, geo-tagged photo uploads, and client WhatsApp update generators. |
| **5** | **Tasks & Visual Kanban Board** | Dual display modes: Interactive Table Grid and **4-Column Kanban Board** (*To Do*, *In Progress*, *Under Review*, *Completed*), priority indicators, and quick status toggles. |
| **6** | **Lead CRM & Pipeline** | Multi-stage inquiry pipeline, follow-up chronological history, WhatsApp & email triggers, and **1-Click "Convert to Customer"** data migration. |
| **7** | **Proposals & Quotations** | Scope of work generator, line items, rate/quantity calculation, GST % selector, validity tracking, and signed PDF attachment uploads. |
| **8** | **Vendor Directory** | Materials suppliers, trade categorization (Civil, MEP, Woodwork, Glazing), GSTIN/PAN, and payment credit terms. |
| **9** | **Associate & Consultant Hub** | Specialized freelance contractors, structural architects, 3D visualizers, rate basis (Hourly, Daily, Lumpsum, SqFt), margin %, and project task assignments. |
| **10** | **Finance & Bookkeeping** | Complete cash ledger, **Project vs Non-Project Toggle**, Milestone expense attribution, dynamic GST calculation (0%, 5%, 12%, 18%, 28%), TDS deduction, Net totals, and bank account linking. |
| **11** | **Reports & Profitability** | Real-time P&L analytics, Project contract value vs actual spend, net margin %, and **instant 1-click CSV / Excel export**. |
| **12** | **Users & Granular RBAC** | Staff roster, temporary password generation, Force Password Change flag, and an **interactive 15-module Role Permissions Matrix** (`CanView`, `CanAdd`, `CanEdit`, `CanDelete`). |
| **13** | **Dropdowns & Masters** | Centralized master option management eliminating hardcoded values (Project Types, Statuses, Task Priorities, Expense Categories, etc.). |
| **14** | **Company Profile & Multi-Bank** | Legal entity registration, Google Drive official logo upload (renders on header & reports), and multiple corporate bank account managers (Current, Savings, Escrow). |
| **15** | **Help Desk & Diagnostics** | Searchable operational manual, real-time System Diagnostics (License key, connected sheet ID, backend API latency ping), and direct support links (`mehul.gandhi@nexsolve.in`). |

---

## 🗄️ 5. Canonical Google Sheets Database Schema

The system automatically initializes and validates the following 15 tabs and headers:

1. `Customers`: `CustomerID`, `CompanyName`, `ContactPerson`, `Designation`, `Phone`, `AltPhone`, `Email`, `BillingAddress`, `ShippingAddress`, `GSTIN`, `PAN`, `Industry`, `Notes`, `Attachments`, `Status`, `CreatedAt`, `CreatedBy`
2. `Projects`: `ProjectID`, `ProjectName`, `CustomerID`, `ProjectType`, `EstimatedBudget`, `StartDate`, `ExpectedCompletionDate`, `ProjectManager`, `Location`, `Description`, `Attachments`, `Status`, `CreatedAt`, `CreatedBy`
3. `Milestones`: `MilestoneID`, `ProjectID`, `Title`, `Description`, `DueDate`, `Weightage`, `EstimatedCost`, `ActualCost`, `Assignee`, `Status`, `CreatedAt`
4. `Tasks`: `TaskID`, `ProjectID`, `TaskName`, `AssigneeCategory`, `AssignedTo`, `Priority`, `DueDate`, `Description`, `Attachments`, `Status`, `CreatedAt`, `CreatedBy`
5. `SiteVisits`: `VisitID`, `EntityType`, `EntityID`, `VisitedBy`, `VisitDate`, `Location`, `Purpose`, `DiscussionNotes`, `FollowupDate`, `Attachments`, `Status`, `CreatedAt`
6. `Leads`: `LeadID`, `CompanyName`, `ContactPerson`, `Phone`, `Email`, `Source`, `DealValue`, `Priority`, `Industry`, `Notes`, `Status`, `AssignedTo`, `CreatedAt`, `CreatedBy`
7. `LeadFollowups`: `FollowupID`, `LeadID`, `FollowupDate`, `Mode`, `Discussion`, `NextDate`, `Status`, `CreatedBy`
8. `Proposals`: `ProposalID`, `Title`, `EntityType`, `EntityID`, `ProposalDate`, `ValidTill`, `LineItemsJSON`, `Subtotal`, `TaxRate`, `TaxAmount`, `GrandTotal`, `Terms`, `Attachments`, `Status`, `CreatedAt`
9. `Vendors`: `VendorID`, `VendorName`, `Category`, `ContactPerson`, `Phone`, `Email`, `Address`, `GSTIN`, `PAN`, `BankDetails`, `Attachments`, `Status`, `CreatedAt`
10. `Associates`: `AssociateID`, `FullName`, `Specialization`, `Phone`, `Email`, `Address`, `RateType`, `RateAmount`, `MarginPct`, `BankDetails`, `Status`, `CreatedAt`
11. `Transactions`: `TransactionID`, `Date`, `Type`, `IsProjectRelated`, `ProjectID`, `MilestoneID`, `Category`, `BaseAmount`, `GSTRate`, `GSTAmount`, `TDSRate`, `TDSAmount`, `NetAmount`, `PaymentMode`, `BankAccountID`, `RefNo`, `Notes`, `Attachments`, `Status`, `CreatedAt`, `CreatedBy`
12. `Users`: `UserID`, `FullName`, `Email`, `Mobile`, `RoleID`, `PasswordHash`, `MustChangePassword`, `Status`, `LastLogin`, `CreatedAt`
13. `RolePermissions`: `RoleID`, `ModuleID`, `CanView`, `CanAdd`, `CanEdit`, `CanDelete`
14. `DropdownMasters`: `Category`, `Value`, `SortOrder`, `IsActive`
15. `CompanyProfile`: `Key`, `Value`

---

## 🚀 6. Step-by-Step Deployment Guide

### Step 1: Deploy Frontend to GitHub Pages
1. Push this repository to GitHub under your organization (e.g., `https://github.com/nexsolve-tech/nexmilestro`).
2. Navigate to **Repository Settings** > **Pages**.
3. Under **Build and deployment**:
   - Source: **Deploy from a branch**.
   - Branch: `main` | Folder: `/ (root)` or `/docs`.
4. Ensure the `CNAME` file contains your target domain:
   ```text
   nexmilestro.nexsolve.in
   ```
5. Configure your DNS provider with a CNAME record:
   - Host: `nexmilestro` -> Points to `<your-org>.github.io`
   - Enable "Enforce HTTPS" in GitHub Pages settings.

### Step 2: Setup Central Master License Google Sheet
1. Create a new Google Sheet named `NexMilestro - Master License Server`.
2. Open **Extensions** > **Apps Script**, paste `API_Router.gs` (or `NexMilestro_Backend_All.gs`).
3. Reload the Google Sheet. Click on the custom top menu:
   - **🚀 NexMilestro SaaS** > **🔑 Setup Central Master License Sheet (Licenses Tab)**.
4. Note down this Master Spreadsheet's ID (found in the URL between `/d/` and `/edit`).
5. Ensure `MASTER_LICENSE_SPREADSHEET_ID` in `API_Router.gs` matches this ID.

### Step 3: Setup Client Google Sheet Databases
For each new client / tenant:
1. Create a Google Sheet named `NexMilestro DB - [Client Name]`.
2. Open **Extensions** > **Apps Script**, paste `API_Router.gs`.
3. Reload the Sheet and click:
   - **🚀 NexMilestro SaaS** > **⚡ 1-Click Setup All 15 Database Tables & Master Data**.
4. In your **Master License Sheet**, add a row in the `Licenses` tab:
   - `LicenseKey`: `LIC-CLIENT1-2026`
   - `ClientName`: `Client Legal Name`
   - `ClientEmail`: `client@example.com`
   - `SpreadsheetID`: `<Client's Google Sheet ID>`
   - `Plan`: `Enterprise Pro`
   - `IssueDate`: `2026-11-04`
   - `ExpiryDate`: `2027-11-04`
   - `Status`: `Active`
   - `MaxUsers`: `25`

### Step 4: Deploy the Headless Apps Script Web App
1. In the Google Apps Script project, click **Deploy** > **New deployment**.
2. Select type: **Web app**.
3. Configure:
   - **Description:** `NexMilestro Headless API Production`
   - **Execute as:** `Me (your Google account)`
   - **Who has access:** `Anyone` (Required for anonymous headless JSON API requests).
4. Click **Deploy** and copy the **Web App URL** (`https://script.google.com/macros/s/.../exec`).
5. In `Index_Template.html` / `index.html`, verify `window.NEXMILESTRO_API_URL` is set to this URL.
6. Run `node build_production_bundle.js` to compile the final production static asset.

---

## 🎯 7. Commercial Sales & Live Evaluator Preview

To facilitate client demonstrations, product evaluations, and sales pitches, NexMilestro includes a zero-friction evaluation mode:

1. **Instant Demo Access:** On the License Gate modal, click:
   ```text
   ✨ Explore Live Interactive Demo (Instant Access)
   ```
2. **Instant Pre-Seeded Dataset:** Loads a full Indian turnkey architecture and construction company (`NexSolve Architecture & Turnkey Solutions Pvt. Ltd.`) with 4 multi-stage projects, 12 weighted milestones, 10 Kanban tasks, 5 site visits, 6 qualified leads, itemized proposals, 5 vendors, and full financial bookings.
3. **1-Click Role Testing:** On the Login Card, prospective buyers can click:
   - 👑 **Super Admin** (Full unrestricted access across all 15 modules)
   - 🏗️ **Project Manager** (Projects, Milestones, Tasks, Field Logs, Vendors)
   - 👷 **Site Engineer** (Tasks, Field Supervision, Site Visits)
   - 💼 **Sales Lead** (Leads CRM, Follow-ups, Proposals)
   - 💰 **Finance Officer** (Ledger, GST/TDS, P&L Reports)
4. **Interactive Local Mutations:** Evaluators can create real projects, assign milestones, update Kanban lanes, book expenses, and generate quotations with **0ms UI latency** without requiring backend configuration upfront!

---

## 📞 8. Commercial Inquiries & Technical Support

For enterprise customization, white-label distribution, multi-tenant deployment assistance, or license activation:

- **Commercial Director & Architect:** Mehul Gandhi
- **Official Email:** `mehul.gandhi@nexsolve.in`
- **WhatsApp Support:** `+91 98112 23344`
- **Corporate Website:** [https://nexsolve.in](https://nexsolve.in)
- **Hosted Application:** [https://nexmilestro.nexsolve.in](https://nexmilestro.nexsolve.in)

---
*© 2026 NexSolve Training & Consulting. All Rights Reserved. Built with the Nexallot High-Speed Serverless Pattern.*
