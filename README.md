# NexMilestro - Enterprise Project & Milestone Management System

> **Powered by NexSolve Training & Consulting**  
> *A high-performance, full-lifecycle project, milestone, finance, and workforce tracking platform.*

[![Platform](https://img.shields.io/badge/Platform-Google%20Apps%20Script%20%7C%20HTML5-blue)](https://developers.google.com/apps-script)
[![Hosted on](https://img.shields.io/badge/Hosted%20on-GitHub%20Pages-green)](https://nexsolve-tech.github.io/nexmilestro/)
[![License](https://img.shields.io/badge/License-Proprietary%20NexSolve-orange)](#)

---

## 🚀 Overview

**NexMilestro** is an enterprise-grade project management application designed for interior designers, general contractors, engineering firms, and field consultants. It unifies the entire project lifecycle—from prospective client leads and commercial proposals to milestone task execution, on-site supervision, vendor contracts, and client invoicing—into a single, cohesive workspace.

### Key Capabilities

- 📊 **Executive Dashboard**: Real-time project health metrics, overdue milestones, financial burn rate, and team utilization.
- 🎯 **Milestone & Project Engine**: Hierarchical milestone scheduling, status indicators, completion percentage tracking, and deadline alerts.
- 📋 **Task Management**: Fine-grained task assignment, priority tagging (Critical/High/Medium/Low), and execution logs.
- 📍 **Site Visits & Field Supervision**: Structured site observation logging, inspector notes, and client coordination records.
- 💼 **Customer & CRM Directory**: 360-degree client management, billing entities, project history, and relationship tracking.
- 💰 **Finance & Invoicing Engine**: Project budget tracking, milestone billing, vendor payables, receipt uploads, and cashflow monitoring.
- 📑 **Proposals & Quotes**: Standardized quotation generator with automated line-item cost computations and revision controls.
- 🤝 **Vendors & Associates**: Directory of subcontractors, materials suppliers, architects, and freelance specialists.
- 🛡️ **Role-Based Access Control (RBAC)**: Fine-grained permissions for Super Admins, Project Managers, Site Engineers, and Finance Officers.

---

## 🏛️ System Architecture

NexMilestro uses a modern hybrid serverless architecture:

```text
┌────────────────────────────────────────────────────────┐
│               Client-Side Web Application              │
│   (Hosted on GitHub Pages / Apps Script Web App)       │
│                                                        │
│  - Single Page Application (SPA)                       │
│  - Responsive Glassmorphic UI Design System            │
│  - In-Memory Data Caching & Real-Time Filtering        │
└───────────────────────────┬────────────────────────────┘
                            │
               REST / RPC Execution Proxy
                            │
┌───────────────────────────▼────────────────────────────┐
│         Google Apps Script Serverless Backend          │
│                                                        │
│  - Code.gs (Router & Web App Server)                   │
│  - Auth.gs & LicenseClient.gs (Security & Sessions)    │
│  - Database.gs (CRUD Engine & Schema Validation)       │
│  - Business Logic APIs (Project, Finance, Task, etc.)  │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│             Google Sheets Cloud Database               │
│                                                        │
│  - Projects, Milestones, Tasks, FinanceLedger          │
│  - Customers, Vendors, Associates, SiteVisits          │
└────────────────────────────────────────────────────────┘
```

---

## 📁 Repository Directory Structure

```text
nexmilestro/
├── README.md                       # Comprehensive documentation
├── .gitignore                      # Git ignore patterns
├── .claspignore                    # Google Apps Script push ignore
├── appsscript.json                 # Google Apps Script manifest
├── build_production_bundle.js      # Automated single-file bundler
├── dist/
│   └── index.html                  # Standalone production web application
├── nexmilestro_user_guide.html     # User Guide & Operational Manual
│
├── [Modular Apps Script Backend]
│   ├── Code.gs                     # Core routing & web app entry point
│   ├── Auth.gs                     # Authentication & password management
│   ├── Database.gs                 # Data layer & sheet read/write routines
│   ├── Company.gs                  # Corporate profile & company master
│   ├── Customer.gs                 # Customer CRM operations
│   ├── Project.gs                  # Project setup & milestone workflows
│   ├── Task.gs                     # Task scheduling & status changes
│   ├── SiteVisit.gs                # Field visit logs & supervision
│   ├── Proposal.gs                 # Proposals & pricing estimates
│   ├── Vendor.gs                   # Vendor master & purchasing
│   ├── Associate.gs                # Associate & consultant directory
│   ├── Finance.gs                  # Financial bookings & payments
│   ├── User.gs                     # RBAC & staff credential management
│   ├── Lead.gs                     # Lead conversion & sales pipeline
│   └── LicenseClient.gs            # Enterprise license verification
│
└── [Modular UI Components]
    ├── Index.html                  # Master shell & navigation bar
    ├── CSS.html                    # Design tokens & responsive styles
    ├── Dashboard.html              # KPI metrics & analytics charts
    ├── Project1.html               # Project list & milestone modal
    ├── Task1.html                  # Task workflow board
    ├── Customer1.html              # Customer management view
    ├── SiteVisits1.html            # Site visit logs view
    ├── Proposal1.html              # Proposal generation view
    ├── Finance1.html               # Finance booking view
    ├── FinanceJS.html              # Financial transaction scripts
    ├── User1.html                  # User directory & permission modal
    ├── Lead1.html                  # Lead tracking view
    ├── Vendor1.html                # Vendor registry view
    ├── Associate1.html             # Associate directory view
    ├── Report1.html                # Advanced reports & export tools
    ├── Company1.html               # Company settings view
    ├── Master1.html                # Master configuration dropdowns view
    └── Help1.html                  # Operational documentation & support
```

---

## 🔨 Rebuilding the Production Bundle

Whenever you update any modular HTML component in `frontend_modules`:

```bash
node build_production_bundle.js
```

This compiles all modular components into `dist/index.html` instantly.

---

## 🌐 Deploying to GitHub Pages

1. In your GitHub repository settings, navigate to **Pages**.
2. Under **Build and deployment > Branch**, choose **`main`** and **`/dist`** (or copy `dist/index.html` to root).
3. Click **Save**.
4. The application is live at `https://nexsolve-tech.github.io/nexmilestro/`.

---

## 📖 Operational Manual

For full instructions on day-to-day operations, consult the included [NexMilestro User Guide](nexmilestro_user_guide.html).

---

© 2026 NexSolve Training & Consulting. All rights reserved.
