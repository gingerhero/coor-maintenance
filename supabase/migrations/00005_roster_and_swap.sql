-- Coor Maintenance App - Roster and Swap Tables
-- Migration 00005: roster_entries, swap_requests, notifications

-- Roster entries (Bemanningsark)
CREATE TABLE roster_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  janitor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  budgeted_weekly_hours NUMERIC(5,2),
  schedule JSONB DEFAULT '{}',
  active_from DATE NOT NULL,
  active_to DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Swap requests (sick leave, coverage)
CREATE TABLE swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_janitor_id UUID NOT NULL REFERENCES profiles(id),
  to_janitor_id UUID REFERENCES profiles(id),
  assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  status swap_status NOT NULL DEFAULT 'pending',
  decided_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('assignment', 'avvik', 'swap', 'instruction_update')),
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER roster_entries_updated_at
  BEFORE UPDATE ON roster_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER swap_requests_updated_at
  BEFORE UPDATE ON swap_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
