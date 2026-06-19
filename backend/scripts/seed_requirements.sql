-- Seed the Project Requirements content into the portal database.
--
-- IMPORTANT: connect to the APP database (ems_portal), not the default
-- "postgres" database. Run as the DB owner, e.g. on the VPS:
--
--   psql -U admin -d ems_portal -f backend/scripts/seed_requirements.sql
--
-- (Match -U / -d to backend/.env DATABASE_URL; defaults are user "admin",
--  database "ems_portal".)
--
-- Self-contained: creates the table if it doesn't exist yet (so you don't have
-- to start the app first), then clears and re-inserts the content. Idempotent —
-- safe to re-run whenever the content changes. The CREATE TABLE matches the
-- SQLAlchemy model in backend/app/models.py, so the app's create_all on startup
-- sees it already exists and leaves it untouched. The frontend /requirements
-- page always reads this data from the backend — no demo data lives in the client.

BEGIN;

CREATE TABLE IF NOT EXISTS requirement_sections (
  id          SERIAL PRIMARY KEY,
  order_index INTEGER NOT NULL,
  icon_key    VARCHAR NOT NULL,
  title       VARCHAR NOT NULL,
  intro       VARCHAR,
  groups      JSON NOT NULL
);

-- Make sure the app's login role owns / can use the table and its sequence.
-- Matters when this script is run as the postgres superuser: the table would
-- otherwise be owned by postgres and the app user "admin" could not read it.
ALTER TABLE requirement_sections OWNER TO admin;
GRANT ALL PRIVILEGES ON TABLE requirement_sections TO admin;
GRANT ALL PRIVILEGES ON SEQUENCE requirement_sections_id_seq TO admin;

DELETE FROM requirement_sections;

INSERT INTO requirement_sections (order_index, icon_key, title, intro, groups) VALUES
(
  0, 'Mail', 'Gmail Contacts Extraction', NULL,
  '[
    {"heading": "Required Access", "items": [
      "Google account email address to be used",
      "Permission to access Gmail and Google Contacts",
      "OAuth credentials (preferred) or approval to create them"
    ]},
    {"heading": "Required Information", "note": "Desired output format:", "items": [
      "CSV",
      "Excel",
      "Google Sheets",
      "CRM import format"
    ]}
  ]'::json
),
(
  1, 'Share2', 'LinkedIn Automation & Auto Posting', NULL,
  '[
    {"heading": "Required Access", "items": [
      "LinkedIn profile or company page URL",
      "Admin access to the company page (if applicable)",
      "LinkedIn login credentials or authorization method",
      "Any scheduling platform currently being used (Buffer, Hootsuite, etc.)"
    ]},
    {"heading": "Content Requirements", "items": [
      "Company description",
      "Target audience",
      "Industry and niche",
      "Brand guidelines",
      "Preferred tone of voice",
      "Logo and brand assets"
    ]},
    {"heading": "Posting Requirements", "items": [
      "Posting frequency",
      "Preferred posting times"
    ]},
    {"heading": "Optional", "items": [
      "Existing content library",
      "Website/blog links",
      "Competitor LinkedIn pages for reference"
    ]}
  ]'::json
),
(
  2, 'Megaphone', 'Ad Creation Using Your Products', NULL,
  '[
    {"heading": "Product Information Needed", "items": [
      "Product names",
      "Product descriptions",
      "Pricing information",
      "Features and benefits",
      "Target audience",
      "Unique selling points (USP)"
    ]},
    {"heading": "Creative Assets Required", "items": [
      "Product images",
      "Product videos (if available)",
      "Brand logo",
      "Brand colors and fonts",
      "Existing advertisements (if any)"
    ]},
    {"heading": "Platform Information", "note": "Please specify where the ads will be used:", "items": [
      "Facebook",
      "Instagram",
      "LinkedIn",
      "Google Ads",
      "YouTube",
      "Other"
    ]},
    {"heading": "Ad Objectives", "items": [
      "Lead generation",
      "Sales",
      "Website traffic",
      "Brand awareness",
      "Engagement"
    ]},
    {"heading": "Landing Pages", "items": [
      "Website URL",
      "Product pages",
      "Contact forms",
      "Calendly links (if applicable)"
    ]},
    {"heading": "Marketing Goals", "items": [
      "Increase leads",
      "Increase sales",
      "Improve customer engagement",
      "Build brand awareness",
      "Grow email list"
    ]},
    {"heading": "Key Performance Indicators (KPIs)", "items": [
      "Monthly lead target",
      "Revenue target",
      "Cost per lead target",
      "Conversion goals"
    ]}
  ]'::json
),
(
  3, 'KeyRound', 'Credentials and Access',
  'Please provide access using team member invitations whenever possible instead of sharing passwords directly.',
  '[
    {"heading": "Services that may require access", "items": [
      "Google Workspace / Gmail",
      "LinkedIn",
      "Meta Business Suite",
      "Google Ads",
      "Website CMS",
      "CRM platform",
      "Email marketing platform",
      "Analytics tools"
    ]}
  ]'::json
),
(
  4, 'ClipboardCheck', 'Deliverables', 'Please confirm:',
  '[
    {"ordered": true, "items": [
      "Desired completion timeline.",
      "Preferred communication channel (Email, WhatsApp, Slack, etc.).",
      "Weekly or bi-weekly reporting requirements.",
      "Any specific compliance or privacy requirements.",
      "Whether you already have existing automation workflows that need to be integrated."
    ]}
  ]'::json
);

COMMIT;
