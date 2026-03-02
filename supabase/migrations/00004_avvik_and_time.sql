-- Coor Maintenance App - Avvik and Time Tables
-- Migration 00004: avvik, avvik_comments, time_logs

-- Avvik (Discrepancies)
CREATE TABLE avvik (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  instruction_id UUID REFERENCES instructions(id) ON DELETE SET NULL,
  ns3451_code TEXT REFERENCES ns3451_codes(code),
  location_description TEXT,
  description TEXT NOT NULL,
  severity avvik_severity NOT NULL DEFAULT 'medium',
  status avvik_status NOT NULL DEFAULT 'new',
  notify_board BOOLEAN DEFAULT false,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  gps_accuracy DOUBLE PRECISION,
  reported_by UUID NOT NULL REFERENCES profiles(id),
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  board_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Avvik comments (manager thread)
CREATE TABLE avvik_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avvik_id UUID NOT NULL REFERENCES avvik(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  is_visible_to_customer BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Time logs (Tidsforbruk)
CREATE TABLE time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  janitor_id UUID NOT NULL REFERENCES profiles(id),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  actual_minutes INTEGER NOT NULL,
  checkin_lat DOUBLE PRECISION,
  checkin_lng DOUBLE PRECISION,
  checkout_lat DOUBLE PRECISION,
  checkout_lng DOUBLE PRECISION,
  notes TEXT,
  status timelog_status NOT NULL DEFAULT 'draft',
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER avvik_updated_at
  BEFORE UPDATE ON avvik
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER time_logs_updated_at
  BEFORE UPDATE ON time_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
