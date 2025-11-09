-- Maestro Phase 3: Continuous Analysis Engine
-- Database Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Analysis History Table
-- Stores complete analysis results for each project run
CREATE TABLE IF NOT EXISTS analysis_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id VARCHAR(255) NOT NULL,
  analysis_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  suggestions_count INTEGER NOT NULL DEFAULT 0,
  approved_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  implemented_count INTEGER NOT NULL DEFAULT 0,
  analysis_data JSONB NOT NULL, -- Complete analysis results
  code_snapshot TEXT, -- Git commit hash or snapshot reference
  model_version VARCHAR(100) NOT NULL, -- Claude model used
  execution_time_ms INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pattern Library Table
-- Learns from approved/rejected suggestions to improve future analysis
CREATE TABLE IF NOT EXISTS pattern_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pattern_name VARCHAR(255) NOT NULL,
  pattern_type VARCHAR(20) NOT NULL CHECK (pattern_type IN ('approved', 'rejected')),
  description TEXT NOT NULL,
  code_example TEXT NOT NULL,
  context JSONB, -- Additional context about when/why pattern was approved/rejected
  frequency INTEGER NOT NULL DEFAULT 1, -- How many times this pattern appeared
  confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.5, -- 0.0 to 1.0
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Impact Tracking Table
-- Measures results of approved suggestions
CREATE TABLE IF NOT EXISTS impact_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  improvement_id VARCHAR(255) NOT NULL,
  project_id VARCHAR(255) NOT NULL,
  metric_type VARCHAR(50) NOT NULL CHECK (
    metric_type IN ('performance', 'errors', 'code_quality', 'user_experience')
  ),
  baseline_value DECIMAL(10,2) NOT NULL,
  current_value DECIMAL(10,2) NOT NULL,
  improvement_percentage DECIMAL(5,2) NOT NULL,
  measurement_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metadata JSONB, -- Additional measurement details
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Code Snapshots Table
-- Tracks code state for comparison between analyses
CREATE TABLE IF NOT EXISTS code_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id VARCHAR(255) NOT NULL,
  snapshot_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  file_count INTEGER NOT NULL,
  total_lines INTEGER NOT NULL,
  file_checksums JSONB NOT NULL, -- { "file.ts": "checksum", ... }
  git_commit VARCHAR(255), -- Git commit hash if available
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suggestion Quality Metrics Table
-- Self-improvement: tracks quality of ProductImprovementAgent suggestions
CREATE TABLE IF NOT EXISTS suggestion_quality_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES analysis_history(id) ON DELETE CASCADE,
  total_suggestions INTEGER NOT NULL,
  approval_rate DECIMAL(5,2) NOT NULL, -- Percentage 0-100
  implementation_rate DECIMAL(5,2) NOT NULL, -- Percentage 0-100
  avg_confidence_score DECIMAL(3,2) NOT NULL, -- 0.0-1.0
  pattern_matches INTEGER NOT NULL DEFAULT 0, -- How many matched known patterns
  research_triggers INTEGER NOT NULL DEFAULT 0, -- How many triggered research
  quality_score DECIMAL(5,2) NOT NULL, -- Overall quality score 0-100
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analysis_history_project ON analysis_history(project_id);
CREATE INDEX IF NOT EXISTS idx_analysis_history_date ON analysis_history(analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_pattern_library_type ON pattern_library(pattern_type);
CREATE INDEX IF NOT EXISTS idx_pattern_library_name ON pattern_library(pattern_name);
CREATE INDEX IF NOT EXISTS idx_impact_tracking_improvement ON impact_tracking(improvement_id);
CREATE INDEX IF NOT EXISTS idx_impact_tracking_project ON impact_tracking(project_id);
CREATE INDEX IF NOT EXISTS idx_code_snapshots_project ON code_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_code_snapshots_date ON code_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_suggestion_quality_analysis ON suggestion_quality_metrics(analysis_id);

-- Row Level Security (RLS) - Enable for security
ALTER TABLE analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE impact_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_quality_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all operations for authenticated users
-- Note: Adjust these policies based on your authentication setup
CREATE POLICY "Allow all for service role" ON analysis_history FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON pattern_library FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON impact_tracking FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON code_snapshots FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON suggestion_quality_metrics FOR ALL USING (true);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for pattern_library updated_at
CREATE TRIGGER update_pattern_library_updated_at
  BEFORE UPDATE ON pattern_library
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- View: Recent Analysis Summary
CREATE OR REPLACE VIEW recent_analysis_summary AS
SELECT
  project_id,
  COUNT(*) as total_analyses,
  SUM(suggestions_count) as total_suggestions,
  SUM(approved_count) as total_approved,
  SUM(rejected_count) as total_rejected,
  SUM(implemented_count) as total_implemented,
  AVG(execution_time_ms) as avg_execution_time,
  MAX(analysis_date) as last_analysis_date
FROM analysis_history
WHERE analysis_date >= NOW() - INTERVAL '30 days'
GROUP BY project_id;

-- View: Pattern Library Stats
CREATE OR REPLACE VIEW pattern_library_stats AS
SELECT
  pattern_type,
  COUNT(*) as pattern_count,
  AVG(confidence_score) as avg_confidence,
  SUM(frequency) as total_occurrences
FROM pattern_library
GROUP BY pattern_type;

-- Comments for documentation
COMMENT ON TABLE analysis_history IS 'Stores complete analysis results from ProductImprovementAgent runs';
COMMENT ON TABLE pattern_library IS 'Learns from approved/rejected suggestions to improve future analysis';
COMMENT ON TABLE impact_tracking IS 'Measures real-world impact of implemented suggestions';
COMMENT ON TABLE code_snapshots IS 'Tracks code state changes for comparison between analyses';
COMMENT ON TABLE suggestion_quality_metrics IS 'Tracks quality of ProductImprovementAgent suggestions for self-improvement';
