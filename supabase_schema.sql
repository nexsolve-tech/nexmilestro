-- =========================================================================
-- NEXMILESTRO V2 - ENTERPRISE SUPABASE DATABASE SCHEMA
-- Compatible with PostgreSQL 15+ / Supabase
-- Exposes all tables to the PostgREST API with B-Tree indexes
-- =========================================================================

-- 1. LICENSES
CREATE TABLE IF NOT EXISTS public.licenses (
  "LicenseKey" TEXT PRIMARY KEY,
  "CompanyName" TEXT,
  "AdminEmail" TEXT,
  "MaxUsers" INTEGER DEFAULT 10,
  "ExpiryDate" TEXT DEFAULT 'Unlimited / Lifetime',
  "Status" TEXT DEFAULT 'Active',
  "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "UpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Default License
INSERT INTO public.licenses ("LicenseKey", "CompanyName", "AdminEmail", "MaxUsers", "ExpiryDate", "Status")
VALUES ('LIC-BUYER1-2026', 'StudioSpace Interiors', 'academy@nexsolve.in', 25, '2028-12-31', 'Active')
ON CONFLICT ("LicenseKey") DO NOTHING;

-- 2. USERS
CREATE TABLE IF NOT EXISTS public.users (
  "UserID" TEXT PRIMARY KEY,
  "FullName" TEXT NOT NULL,
  "Email" TEXT NOT NULL,
  "RoleID" TEXT NOT NULL,
  "Status" TEXT DEFAULT 'Active',
  "Mobile" TEXT,
  "Permissions" JSONB DEFAULT '{}'::jsonb,
  "CustomPermissions" JSONB DEFAULT '{}'::jsonb,
  "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "UpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Default Super Admin Users
INSERT INTO public.users ("UserID", "FullName", "Email", "RoleID", "Status", "Mobile")
VALUES 
  ('USR-101', 'Mehul Gandhi', 'mehul.gandhi@nexsolve.in', 'Super Admin', 'Active', '9876543210'),
  ('USR-102', 'Dhwani Gandhi', 'dhwani.gandhi@nexsolve.in', 'Super Admin', 'Active', '9876543211'),
  ('USR-103', 'Meghal Sadhu', 'meghal.sadhu@nexsolve.in', 'Project Manager', 'Active', '9876543212')
ON CONFLICT ("UserID") DO NOTHING;

-- 3. COMPANY SETUP & EMAIL GATEWAY
CREATE TABLE IF NOT EXISTS public.company_settings (
  "ID" TEXT PRIMARY KEY DEFAULT 'MAIN',
  "CompanyName" TEXT DEFAULT 'StudioSpace Interiors',
  "Email" TEXT DEFAULT 'contact@studiospace.in',
  "Contact" TEXT,
  "Address" TEXT,
  "GSTNo" TEXT,
  "PANNo" TEXT,
  "Website" TEXT,
  "Banks" JSONB DEFAULT '[]'::jsonb,
  "SmtpProvider" TEXT DEFAULT 'Gmail',
  "SmtpHost" TEXT DEFAULT 'smtp.gmail.com',
  "SmtpPort" INTEGER DEFAULT 587,
  "SmtpUser" TEXT,
  "SmtpPass" TEXT,
  "SmtpSenderName" TEXT,
  "SmtpSenderEmail" TEXT,
  "EmailVerified" BOOLEAN DEFAULT FALSE,
  "UpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.company_settings ("ID", "CompanyName", "Email")
VALUES ('MAIN', 'StudioSpace Interiors', 'contact@studiospace.in')
ON CONFLICT ("ID") DO NOTHING;

-- 4. CUSTOMERS
CREATE TABLE IF NOT EXISTS public.customers (
  "CustomerID" TEXT PRIMARY KEY,
  "CustomerName" TEXT NOT NULL,
  "ContactPerson" TEXT,
  "Mobile" TEXT,
  "Email" TEXT,
  "CustomerType" TEXT,
  "GSTNo" TEXT,
  "PANNo" TEXT,
  "Address" TEXT,
  "State" TEXT,
  "City" TEXT,
  "Status" TEXT DEFAULT 'Active',
  "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PROJECTS
CREATE TABLE IF NOT EXISTS public.projects (
  "ProjectID" TEXT PRIMARY KEY,
  "ProjectName" TEXT NOT NULL,
  "CustomerID" TEXT,
  "ProjectType" TEXT,
  "StartDate" TEXT,
  "ExpectedEndDate" TEXT,
  "ProjectValue" NUMERIC DEFAULT 0,
  "Status" TEXT DEFAULT 'In Progress',
  "Stage" TEXT DEFAULT 'Execution',
  "AssignedManager" TEXT,
  "WhatsAppGroupLink" TEXT,
  "Attachments" TEXT,
  "CreatedBy" TEXT,
  "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "UpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MILESTONES
CREATE TABLE IF NOT EXISTS public.milestones (
  "MilestoneID" TEXT PRIMARY KEY,
  "ProjectID" TEXT NOT NULL,
  "MilestoneName" TEXT NOT NULL,
  "DueDate" TEXT,
  "CompletionDate" TEXT,
  "Status" TEXT DEFAULT 'Pending',
  "AssignType" TEXT,
  "AssigneeName" TEXT,
  "Cost" NUMERIC DEFAULT 0,
  "Weightage" NUMERIC DEFAULT 0,
  "Remarks" TEXT,
  "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
  "TaskID" TEXT PRIMARY KEY,
  "ProjectID" TEXT,
  "TaskName" TEXT NOT NULL,
  "AssignedType" TEXT DEFAULT 'Staff',
  "AssignedTo" TEXT,
  "StartDate" TEXT,
  "DueDate" TEXT,
  "CompletionDate" TEXT,
  "Priority" TEXT DEFAULT 'Medium',
  "Status" TEXT DEFAULT 'Pending',
  "Description" TEXT,
  "Remarks" TEXT,
  "Attachments" TEXT,
  "CreatedBy" TEXT,
  "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "UpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SITE VISITS (With GPS tracking)
CREATE TABLE IF NOT EXISTS public.site_visits (
  "VisitID" TEXT PRIMARY KEY,
  "ProjectID" TEXT,
  "LeadID" TEXT,
  "VisitDate" TEXT,
  "Purpose" TEXT,
  "Remarks" TEXT,
  "NextFollowupDate" TEXT,
  "Photos" TEXT,
  "AssignedTo" TEXT,
  "Status" TEXT DEFAULT 'Scheduled',
  "CheckInTime" TEXT,
  "CheckOutTime" TEXT,
  "CheckInLocation" TEXT,
  "CheckOutLocation" TEXT,
  "Duration" TEXT,
  "IsBillable" BOOLEAN DEFAULT FALSE,
  "BillingAmount" NUMERIC DEFAULT 0,
  "CreatedBy" TEXT,
  "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "UpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 9. LEADS & FOLLOWUPS
CREATE TABLE IF NOT EXISTS public.leads (
  "LeadID" TEXT PRIMARY KEY,
  "ClientName" TEXT NOT NULL,
  "ContactPerson" TEXT,
  "Mobile" TEXT,
  "Email" TEXT,
  "Source" TEXT,
  "Stage" TEXT DEFAULT 'Inquiry',
  "EstimatedValue" NUMERIC DEFAULT 0,
  "AssignedTo" TEXT,
  "Requirement" TEXT,
  "NextFollowupDate" TEXT,
  "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "UpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lead_followups (
  "FollowupID" TEXT PRIMARY KEY,
  "LeadID" TEXT NOT NULL,
  "FollowupDate" TEXT,
  "InteractionType" TEXT,
  "DiscussionNotes" TEXT,
  "NextFollowupDate" TEXT,
  "Status" TEXT,
  "ConductedBy" TEXT,
  "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 10. PROPOSALS
CREATE TABLE IF NOT EXISTS public.proposals (
  "ProposalID" TEXT PRIMARY KEY,
  "CustomerID" TEXT,
  "LeadID" TEXT,
  "Title" TEXT NOT NULL,
  "ProposalDate" TEXT,
  "ValidUntil" TEXT,
  "Subtotal" NUMERIC DEFAULT 0,
  "TaxAmount" NUMERIC DEFAULT 0,
  "TotalAmount" NUMERIC DEFAULT 0,
  "Status" TEXT DEFAULT 'Draft',
  "Items" JSONB DEFAULT '[]'::jsonb,
  "Notes" TEXT,
  "Attachments" TEXT,
  "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "UpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 11. FINANCE & TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.transactions (
  "TransactionID" TEXT PRIMARY KEY,
  "TransactionDate" TEXT,
  "Type" TEXT,
  "Category" TEXT,
  "Amount" NUMERIC DEFAULT 0,
  "GSTAmount" NUMERIC DEFAULT 0,
  "TotalAmount" NUMERIC DEFAULT 0,
  "PaymentMode" TEXT,
  "BankAccount" TEXT,
  "ProjectID" TEXT,
  "PartyType" TEXT,
  "PartyName" TEXT,
  "ReferenceNo" TEXT,
  "Remarks" TEXT,
  "ReceiptUrl" TEXT,
  "CreatedBy" TEXT,
  "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 12. VENDORS & ASSOCIATES
CREATE TABLE IF NOT EXISTS public.vendors (
  "VendorID" TEXT PRIMARY KEY,
  "VendorName" TEXT NOT NULL,
  "Category" TEXT,
  "ContactPerson" TEXT,
  "Mobile" TEXT,
  "Email" TEXT,
  "GSTNo" TEXT,
  "PANNo" TEXT,
  "Address" TEXT,
  "BankDetails" TEXT,
  "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.associates (
  "AssociateID" TEXT PRIMARY KEY,
  "AssociateName" TEXT NOT NULL,
  "Trade" TEXT,
  "Mobile" TEXT,
  "Email" TEXT,
  "Address" TEXT,
  "RateInfo" TEXT,
  "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 13. DROPDOWN MASTERS
CREATE TABLE IF NOT EXISTS public.dropdown_masters (
  "CategoryKey" TEXT NOT NULL,
  "OptionValue" TEXT NOT NULL,
  PRIMARY KEY ("CategoryKey", "OptionValue")
);

-- 14. CHAT MESSAGES
CREATE TABLE IF NOT EXISTS public.chat_messages (
  "id" BIGSERIAL PRIMARY KEY,
  "Channel" TEXT DEFAULT 'general',
  "SenderID" TEXT NOT NULL,
  "SenderName" TEXT NOT NULL,
  "SenderRole" TEXT,
  "Message" TEXT NOT NULL,
  "AttachmentUrl" TEXT,
  "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- CREATE HIGH-SPEED B-TREE INDEXES FOR MILLION-ROW PERFORMANCE
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks ("ProjectID");
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks ("Status");
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks ("AssignedTo");
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects ("Status");
CREATE INDEX IF NOT EXISTS idx_projects_customer ON public.projects ("CustomerID");
CREATE INDEX IF NOT EXISTS idx_milestones_proj ON public.milestones ("ProjectID");
CREATE INDEX IF NOT EXISTS idx_visits_proj ON public.site_visits ("ProjectID");
CREATE INDEX IF NOT EXISTS idx_visits_lead ON public.site_visits ("LeadID");
CREATE INDEX IF NOT EXISTS idx_tx_proj ON public.transactions ("ProjectID");
CREATE INDEX IF NOT EXISTS idx_tx_date ON public.transactions ("TransactionDate");
CREATE INDEX IF NOT EXISTS idx_leads_stage ON public.leads ("Stage");

-- =========================================================================
-- GRANT PUBLIC PERMISSIONS FOR DATA API
-- =========================================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
