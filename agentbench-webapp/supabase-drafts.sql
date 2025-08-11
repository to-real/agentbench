-- 创建评测草稿表
-- 用于存储评测过程中的草稿数据，支持自动保存和云端同步

CREATE TABLE evaluation_drafts (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 草稿标识
    project_id TEXT NOT NULL,
    test_case_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    evaluator_id TEXT NOT NULL,
    
    -- 评测员信息
    evaluator_name TEXT,
    
    -- 表单数据 (JSONB)
    form_data JSONB NOT NULL DEFAULT '{}',
    
    -- 时间戳
    local_updated_at BIGINT NOT NULL,
    cloud_updated_at BIGINT NOT NULL,
    
    -- 同步状态
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict', 'error')),
    
    -- 版本信息
    version INTEGER NOT NULL DEFAULT 1,
    
    -- 元数据
    metadata JSONB DEFAULT '{}',
    
    -- 创建时间
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- 更新时间
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- 约束
    CONSTRAINT unique_draft_key UNIQUE (project_id, test_case_id, agent_name, evaluator_id)
);

-- 创建索引
CREATE INDEX idx_evaluation_drafts_evaluator_id ON evaluation_drafts(evaluator_id);
CREATE INDEX idx_evaluation_drafts_project_id ON evaluation_drafts(project_id);
CREATE INDEX idx_evaluation_drafts_created_at ON evaluation_drafts(created_at);
CREATE INDEX idx_evaluation_drafts_sync_status ON evaluation_drafts(sync_status);
CREATE INDEX idx_evaluation_drafts_updated_at ON evaluation_drafts(updated_at);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_evaluation_drafts_updated_at 
    BEFORE UPDATE ON evaluation_drafts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 添加注释
COMMENT ON TABLE evaluation_drafts IS '评测草稿表：存储评测过程中的草稿数据，支持自动保存和云端同步';
COMMENT ON COLUMN evaluation_drafts.form_data IS '表单数据，JSON格式存储所有评测字段的值和时间戳';
COMMENT ON COLUMN evaluation_drafts.local_updated_at IS '本地更新时间戳（毫秒）';
COMMENT ON COLUMN evaluation_drafts.cloud_updated_at IS '云端更新时间戳（毫秒）';
COMMENT ON COLUMN evaluation_drafts.sync_status IS '同步状态：pending（待同步）、synced（已同步）、conflict（冲突）、error（错误）';
COMMENT ON COLUMN evaluation_drafts.metadata IS '元数据，包含设备信息、浏览器信息、会话ID等';

-- 创建清理过期草稿的函数
CREATE OR REPLACE FUNCTION cleanup_old_drafts(max_age_ms BIGINT DEFAULT 604800000)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM evaluation_drafts 
    WHERE cloud_updated_at < (EXTRACT(EPOCH FROM now()) * 1000 - max_age_ms);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 创建获取存储统计的函数
CREATE OR REPLACE FUNCTION get_draft_storage_stats(evaluator_id TEXT DEFAULT NULL)
RETURNS TABLE (
    total_drafts BIGINT,
    total_size BIGINT,
    oldest_draft BIGINT,
    newest_draft BIGINT,
    drafts_by_status JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_drafts,
        COALESCE(SUM(OCTET_LENGTH(form_data::text)), 0) as total_size,
        MIN(cloud_updated_at) as oldest_draft,
        MAX(cloud_updated_at) as newest_draft,
        COALESCE(jsonb_object_agg(sync_status, count), '{}'::jsonb) as drafts_by_status
    FROM evaluation_drafts
    WHERE (evaluator_id IS NULL OR evaluation_drafts.evaluator_id = get_draft_storage_stats.evaluator_id);
END;
$$ LANGUAGE plpgsql;