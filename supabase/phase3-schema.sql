-- Phase 3: Maestro Intelligence Layer Schema
-- Extends the base schema with tables for ProductImprovementAgent

-- ============================================
-- ANALYSES TABLE
-- Stores all analysis runs from ProductImprovementAgent
-- ============================================

CREATE TABLE IF NOT EXISTS analyses (
  analysis_id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(project_id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running', -- running, completed, failed
  agent_insights JSONB, -- Raw insights from Claude
  suggestions_count INTEGER DEFAULT 0,
  patterns_detected_count INTEGER DEFAULT 0,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_by TEXT DEFAULT 'ProductImprovementAgent'
);

CREATE INDEX IF NOT EXISTS idx_analyses_project ON analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_triggered ON analyses(triggered_at DESC);

-- ============================================
-- IMPROVEMENT SUGGESTIONS TABLE
-- Individual improvement suggestions from analyses
-- ============================================

CREATE TABLE IF NOT EXISTS improvement_suggestions (
  suggestion_id TEXT PRIMARY KEY,
  analysis_id TEXT REFERENCES analyses(analysis_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- performance, ux, security, architecture, code_quality
  priority INTEGER DEFAULT 3, -- 1=critical, 2=high, 3=medium, 4=low, 5=nice-to-have
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, implemented, archived
  impact_score DECIMAL(3,2), -- 0.00 to 1.00
  implementation_effort TEXT, -- small, medium, large
  estimated_hours DECIMAL(5,1),
  code_location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  implemented_at TIMESTAMPTZ,
  implemented_by TEXT,
  rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_suggestions_analysis ON improvement_suggestions(analysis_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON improvement_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_category ON improvement_suggestions(category);
CREATE INDEX IF NOT EXISTS idx_suggestions_priority ON improvement_suggestions(priority);

-- ============================================
-- PATTERN LIBRARY TABLE
-- Learned patterns from multiple analyses
-- ============================================

CREATE TABLE IF NOT EXISTS pattern_library (
  pattern_id TEXT PRIMARY KEY,
  pattern_type TEXT NOT NULL, -- error_pattern, usage_pattern, performance_pattern, security_pattern
  pattern_name TEXT NOT NULL,
  pattern_description TEXT,
  pattern_data JSONB NOT NULL, -- Flexible JSON storage for pattern details
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  times_observed INTEGER DEFAULT 1,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  related_analyses TEXT[], -- Array of analysis_ids
  actionable BOOLEAN DEFAULT true,
  tags TEXT[]
);

CREATE INDEX IF NOT EXISTS idx_patterns_type ON pattern_library(pattern_type);
CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON pattern_library(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_observed ON pattern_library(times_observed DESC);

-- ============================================
-- IMPACT TRACKING TABLE
-- Tracks the impact of implemented suggestions
-- ============================================

CREATE TABLE IF NOT EXISTS impact_tracking (
  tracking_id TEXT PRIMARY KEY,
  suggestion_id TEXT REFERENCES improvement_suggestions(suggestion_id) ON DELETE CASCADE,
  approval_date TIMESTAMPTZ,
  implementation_date TIMESTAMPTZ,
  before_metrics JSONB, -- Metrics before implementation
  after_metrics JSONB, -- Metrics after implementation
  impact_assessment TEXT, -- positive, neutral, negative, mixed
  impact_score DECIMAL(3,2), -- Actual measured impact (0.00 to 1.00)
  notes TEXT,
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  measured_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_impact_suggestion ON impact_tracking(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_impact_assessment ON impact_tracking(impact_assessment);

-- ============================================
-- ANALYSIS SCHEDULE TABLE
-- Tracks when analyses should run
-- ============================================

CREATE TABLE IF NOT EXISTS analysis_schedule (
  schedule_id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(project_id) ON DELETE CASCADE,
  schedule_type TEXT DEFAULT 'daily', -- daily, weekly, monthly, manual
  cron_expression TEXT DEFAULT '0 0 * * *', -- Default: midnight daily
  enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT, -- success, failed, skipped
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedule_project ON analysis_schedule(project_id);
CREATE INDEX IF NOT EXISTS idx_schedule_enabled ON analysis_schedule(enabled);
CREATE INDEX IF NOT EXISTS idx_schedule_next_run ON analysis_schedule(next_run_at);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE improvement_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE impact_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_schedule ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE PERMISSIVE POLICIES (for development)
-- ============================================

CREATE POLICY "Allow all access to analyses" ON analyses FOR ALL USING (true);
CREATE POLICY "Allow all access to improvement_suggestions" ON improvement_suggestions FOR ALL USING (true);
CREATE POLICY "Allow all access to pattern_library" ON pattern_library FOR ALL USING (true);
CREATE POLICY "Allow all access to impact_tracking" ON impact_tracking FOR ALL USING (true);
CREATE POLICY "Allow all access to analysis_schedule" ON analysis_schedule FOR ALL USING (true);

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View for active improvement suggestions
CREATE OR REPLACE VIEW active_improvements AS
SELECT
  s.*,
  a.project_id,
  a.triggered_at as analysis_date
FROM improvement_suggestions s
JOIN analyses a ON s.analysis_id = a.analysis_id
WHERE s.status IN ('pending', 'approved')
ORDER BY s.priority ASC, s.impact_score DESC;

-- View for implemented improvements with impact
CREATE OR REPLACE VIEW improvements_with_impact AS
SELECT
  s.*,
  i.impact_assessment,
  i.impact_score as measured_impact,
  i.before_metrics,
  i.after_metrics,
  i.measured_at
FROM improvement_suggestions s
LEFT JOIN impact_tracking i ON s.suggestion_id = i.suggestion_id
WHERE s.status = 'implemented'
ORDER BY s.implemented_at DESC;
