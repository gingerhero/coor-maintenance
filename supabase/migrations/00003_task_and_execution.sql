-- Coor Maintenance App - Task and Execution Tables
-- Migration 00003: instructions, assignments, assignment_janitors, task_executions, photos

-- Instructions / Tasks (per property, versioned)
CREATE TABLE instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  ns3451_code TEXT NOT NULL REFERENCES ns3451_codes(code),
  description TEXT NOT NULL,
  frequency_type frequency_type NOT NULL DEFAULT 'every_visit',
  frequency_interval INTEGER NOT NULL DEFAULT 1,
  season season_type NOT NULL DEFAULT 'none',
  comment TEXT,
  photo_required BOOLEAN DEFAULT false,
  notify_board BOOLEAN DEFAULT false,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Assignments / Visits (Oppdrag)
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_start TIME,
  scheduled_end TIME,
  status assignment_status NOT NULL DEFAULT 'scheduled',
  checkin_at TIMESTAMPTZ,
  checkin_lat DOUBLE PRECISION,
  checkin_lng DOUBLE PRECISION,
  checkin_accuracy DOUBLE PRECISION,
  checkout_at TIMESTAMPTZ,
  checkout_lat DOUBLE PRECISION,
  checkout_lng DOUBLE PRECISION,
  checkout_accuracy DOUBLE PRECISION,
  actual_minutes INTEGER,
  checkin_note TEXT,
  checkout_note TEXT,
  instruction_version INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Assignment <-> Janitor (many-to-many)
CREATE TABLE assignment_janitors (
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  janitor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (assignment_id, janitor_id)
);

-- Task Executions (Utførelse)
CREATE TABLE task_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  instruction_id UUID NOT NULL REFERENCES instructions(id) ON DELETE CASCADE,
  janitor_id UUID NOT NULL REFERENCES profiles(id),
  status execution_status NOT NULL,
  skip_reason skip_reason,
  skip_note TEXT,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  gps_accuracy DOUBLE PRECISION,
  no_avvik_confirmed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Photos (attached to task executions or avvik)
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task_execution', 'avvik')),
  entity_id UUID NOT NULL,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER instructions_updated_at
  BEFORE UPDATE ON instructions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
