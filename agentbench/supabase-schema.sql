-- AgentBench Database Schema
-- Execute this SQL in your Supabase project SQL editor

-- 1. Create projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    targets TEXT[] NOT NULL, -- Store array of agent names to be evaluated
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add comments
COMMENT ON TABLE projects IS '存储评测项目信息';
COMMENT ON COLUMN projects.targets IS '定义该项目需要评测的所有Agent';

-- 2. Create test_cases table
CREATE TABLE test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    tags TEXT[], -- Store array of test case tags
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add comments
COMMENT ON TABLE test_cases IS '存储标准化的测试用例库';

-- 3. Create evaluations table (core evaluation records)
CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    evaluator_name TEXT,
    evidence_urls TEXT[], -- Store array of screenshot/video URLs
    created_at TIMESTAMPTZ DEFAULT now(),

    -- Core capability dimensions (JSONB format)
    core_delivery_capability JSONB,
    cognition_planning_capability JSONB,
    interaction_communication_capability JSONB,
    efficiency_resourcefulness_capability JSONB,
    engineering_scalability_capability JSONB,

    -- Overall comments
    overall_notes TEXT
);

-- Add comments
COMMENT ON TABLE evaluations IS '存储每一次具体的评测打分和记录';
COMMENT ON COLUMN evaluations.core_delivery_capability IS 'JSONB object storing scores and notes, e.g., {"first_try_success_rate": 5, "first_try_completion_rate": 4, "first_try_usability": 3, "notes": "首次交付成功但UI简陋"}';
COMMENT ON COLUMN evaluations.cognition_planning_capability IS 'JSONB object storing scores and notes for cognitive and planning abilities';
COMMENT ON COLUMN evaluations.interaction_communication_capability IS 'JSONB object storing scores and notes for interaction and communication abilities';
COMMENT ON COLUMN evaluations.efficiency_resourcefulness_capability IS 'JSONB object storing scores and notes for efficiency and resource utilization';
COMMENT ON COLUMN evaluations.engineering_scalability_capability IS 'JSONB object storing scores and notes for engineering and scalability aspects';

-- Create indexes for better performance
CREATE INDEX idx_evaluations_project_id ON evaluations(project_id);
CREATE INDEX idx_evaluations_test_case_id ON evaluations(test_case_id);
CREATE INDEX idx_evaluations_agent_name ON evaluations(agent_name);
CREATE INDEX idx_evaluations_created_at ON evaluations(created_at);

-- Set up Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust as needed for your security requirements)
CREATE POLICY "Enable read access for all users" ON projects FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON projects FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON projects FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON test_cases FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON test_cases FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON test_cases FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON test_cases FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON evaluations FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON evaluations FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON evaluations FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON evaluations FOR DELETE USING (true);