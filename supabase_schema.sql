-- ============================================================
-- EduAssist — Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Task 1: Learning sessions
CREATE TABLE IF NOT EXISTS learning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  source_count INT DEFAULT 0,
  message_count INT DEFAULT 0
);

-- Task 1: Ingested sources metadata
CREATE TABLE IF NOT EXISTS session_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES learning_sessions(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,        -- pdf | pptx | youtube | url
  source_label TEXT,
  chunks_indexed INT DEFAULT 0,
  summary TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task 2: Course planning sessions
CREATE TABLE IF NOT EXISTS planning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task 2: Course plans (versioned)
CREATE TABLE IF NOT EXISTS course_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES planning_sessions(id) ON DELETE CASCADE,
  plan JSONB NOT NULL,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_sources_session ON session_sources(session_id);
CREATE INDEX IF NOT EXISTS idx_course_plans_session ON course_plans(session_id);

-- RLS (Row Level Security) — enable for production
-- ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE session_sources ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE planning_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE course_plans ENABLE ROW LEVEL SECURITY;
