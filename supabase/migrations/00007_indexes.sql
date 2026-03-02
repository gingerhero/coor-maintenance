-- Coor Maintenance App - Performance Indexes
-- Migration 00007

-- Assignments
CREATE INDEX idx_assignments_property_date ON assignments(property_id, scheduled_date);
CREATE INDEX idx_assignments_status ON assignments(status);
CREATE INDEX idx_assignments_scheduled_date ON assignments(scheduled_date);

-- Assignment janitors
CREATE INDEX idx_assignment_janitors_janitor ON assignment_janitors(janitor_id);

-- Task executions
CREATE INDEX idx_task_executions_assignment ON task_executions(assignment_id);
CREATE INDEX idx_task_executions_instruction ON task_executions(instruction_id);
CREATE INDEX idx_task_executions_janitor ON task_executions(janitor_id);
CREATE INDEX idx_task_executions_completed ON task_executions(instruction_id, completed_at DESC);

-- Instructions
CREATE INDEX idx_instructions_property ON instructions(property_id, is_active);
CREATE INDEX idx_instructions_ns3451 ON instructions(ns3451_code);

-- Avvik
CREATE INDEX idx_avvik_property_status ON avvik(property_id, status);
CREATE INDEX idx_avvik_severity ON avvik(severity, status);
CREATE INDEX idx_avvik_reported_by ON avvik(reported_by);

-- Time logs
CREATE INDEX idx_time_logs_janitor_date ON time_logs(janitor_id, date);
CREATE INDEX idx_time_logs_property ON time_logs(property_id);
CREATE INDEX idx_time_logs_status ON time_logs(status);

-- Roster entries
CREATE INDEX idx_roster_janitor ON roster_entries(janitor_id, active_from, active_to);
CREATE INDEX idx_roster_property ON roster_entries(property_id);

-- Notifications
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, read_at);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id) WHERE read_at IS NULL;

-- Photos
CREATE INDEX idx_photos_entity ON photos(entity_type, entity_id);

-- NS 3451
CREATE INDEX idx_ns3451_parent ON ns3451_codes(parent_code);
CREATE INDEX idx_ns3451_level ON ns3451_codes(level);

-- Swap requests
CREATE INDEX idx_swap_from ON swap_requests(from_janitor_id);
CREATE INDEX idx_swap_status ON swap_requests(status);
