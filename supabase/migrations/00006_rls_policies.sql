-- Coor Maintenance App - Row Level Security Policies
-- Migration 00006

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE ns3451_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_janitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE avvik ENABLE ROW LEVEL SECURITY;
ALTER TABLE avvik_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if user is admin or manager
CREATE OR REPLACE FUNCTION auth.is_manager_or_admin()
RETURNS boolean AS $$
  SELECT role IN ('manager', 'admin') FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ========================================
-- PROFILES
-- ========================================
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Managers/admins can view all profiles"
  ON profiles FOR SELECT
  USING (auth.is_manager_or_admin());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can manage profiles"
  ON profiles FOR ALL
  USING (auth.user_role() = 'admin');

-- ========================================
-- NS 3451 CODES (read-only for all, write for admins)
-- ========================================
CREATE POLICY "Anyone authenticated can read NS 3451 codes"
  ON ns3451_codes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage NS 3451 codes"
  ON ns3451_codes FOR ALL
  USING (auth.user_role() = 'admin');

-- ========================================
-- PROPERTIES
-- ========================================
CREATE POLICY "Janitors see assigned properties"
  ON properties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM roster_entries
      WHERE roster_entries.property_id = properties.id
        AND roster_entries.janitor_id = auth.uid()
        AND roster_entries.active_from <= CURRENT_DATE
        AND (roster_entries.active_to IS NULL OR roster_entries.active_to >= CURRENT_DATE)
    )
  );

CREATE POLICY "Managers/admins see all active properties"
  ON properties FOR SELECT
  USING (auth.is_manager_or_admin());

CREATE POLICY "Customers see own properties"
  ON properties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customer_users cu
      WHERE cu.profile_id = auth.uid()
        AND cu.customer_id = properties.customer_id
    )
  );

CREATE POLICY "Managers/admins can manage properties"
  ON properties FOR ALL
  USING (auth.is_manager_or_admin());

-- ========================================
-- CUSTOMERS
-- ========================================
CREATE POLICY "Managers/admins can view all customers"
  ON customers FOR SELECT
  USING (auth.is_manager_or_admin());

CREATE POLICY "Customer users can view own customer org"
  ON customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customer_users cu
      WHERE cu.profile_id = auth.uid()
        AND cu.customer_id = customers.id
    )
  );

CREATE POLICY "Admins can manage customers"
  ON customers FOR ALL
  USING (auth.user_role() = 'admin');

-- ========================================
-- ASSIGNMENTS
-- ========================================
CREATE POLICY "Janitors see own assignments"
  ON assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assignment_janitors
      WHERE assignment_janitors.assignment_id = assignments.id
        AND assignment_janitors.janitor_id = auth.uid()
    )
  );

CREATE POLICY "Janitors can update own assignments (check-in/out)"
  ON assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM assignment_janitors
      WHERE assignment_janitors.assignment_id = assignments.id
        AND assignment_janitors.janitor_id = auth.uid()
    )
  );

CREATE POLICY "Managers/admins can manage all assignments"
  ON assignments FOR ALL
  USING (auth.is_manager_or_admin());

-- ========================================
-- ASSIGNMENT_JANITORS
-- ========================================
CREATE POLICY "Janitors see own assignment links"
  ON assignment_janitors FOR SELECT
  USING (janitor_id = auth.uid());

CREATE POLICY "Managers/admins manage assignment links"
  ON assignment_janitors FOR ALL
  USING (auth.is_manager_or_admin());

-- ========================================
-- INSTRUCTIONS
-- ========================================
CREATE POLICY "Janitors read instructions for assigned properties"
  ON instructions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM roster_entries
      WHERE roster_entries.property_id = instructions.property_id
        AND roster_entries.janitor_id = auth.uid()
        AND roster_entries.active_from <= CURRENT_DATE
        AND (roster_entries.active_to IS NULL OR roster_entries.active_to >= CURRENT_DATE)
    )
  );

CREATE POLICY "Managers/admins manage all instructions"
  ON instructions FOR ALL
  USING (auth.is_manager_or_admin());

-- ========================================
-- TASK EXECUTIONS
-- ========================================
CREATE POLICY "Janitors can insert own executions"
  ON task_executions FOR INSERT
  WITH CHECK (janitor_id = auth.uid());

CREATE POLICY "Janitors can view own executions"
  ON task_executions FOR SELECT
  USING (janitor_id = auth.uid());

CREATE POLICY "Managers/admins can view all executions"
  ON task_executions FOR SELECT
  USING (auth.is_manager_or_admin());

-- ========================================
-- AVVIK
-- ========================================
CREATE POLICY "Janitors can create avvik"
  ON avvik FOR INSERT
  WITH CHECK (reported_by = auth.uid());

CREATE POLICY "Janitors can view avvik they reported"
  ON avvik FOR SELECT
  USING (reported_by = auth.uid());

CREATE POLICY "Managers/admins can manage all avvik"
  ON avvik FOR ALL
  USING (auth.is_manager_or_admin());

CREATE POLICY "Customers can view avvik for their properties"
  ON avvik FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customer_users cu
      JOIN properties p ON p.customer_id = cu.customer_id
      WHERE cu.profile_id = auth.uid()
        AND p.id = avvik.property_id
    )
  );

-- ========================================
-- AVVIK COMMENTS
-- ========================================
CREATE POLICY "Authors can insert comments"
  ON avvik_comments FOR INSERT
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Managers/admins can view all comments"
  ON avvik_comments FOR SELECT
  USING (auth.is_manager_or_admin());

CREATE POLICY "Customers see customer-visible comments"
  ON avvik_comments FOR SELECT
  USING (
    is_visible_to_customer = true
    AND EXISTS (
      SELECT 1 FROM avvik a
      JOIN properties p ON p.id = a.property_id
      JOIN customer_users cu ON cu.customer_id = p.customer_id
      WHERE a.id = avvik_comments.avvik_id
        AND cu.profile_id = auth.uid()
    )
  );

-- ========================================
-- PHOTOS
-- ========================================
CREATE POLICY "Users can insert own photos"
  ON photos FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can view photos they uploaded"
  ON photos FOR SELECT
  USING (uploaded_by = auth.uid());

CREATE POLICY "Managers/admins can view all photos"
  ON photos FOR SELECT
  USING (auth.is_manager_or_admin());

-- ========================================
-- TIME LOGS
-- ========================================
CREATE POLICY "Janitors manage own time logs"
  ON time_logs FOR INSERT
  WITH CHECK (janitor_id = auth.uid());

CREATE POLICY "Janitors view own time logs"
  ON time_logs FOR SELECT
  USING (janitor_id = auth.uid());

CREATE POLICY "Janitors update own draft time logs"
  ON time_logs FOR UPDATE
  USING (janitor_id = auth.uid() AND status = 'draft');

CREATE POLICY "Managers/admins manage all time logs"
  ON time_logs FOR ALL
  USING (auth.is_manager_or_admin());

-- ========================================
-- ROSTER ENTRIES
-- ========================================
CREATE POLICY "Janitors view own roster entries"
  ON roster_entries FOR SELECT
  USING (janitor_id = auth.uid());

CREATE POLICY "Managers/admins manage all roster entries"
  ON roster_entries FOR ALL
  USING (auth.is_manager_or_admin());

-- ========================================
-- SWAP REQUESTS
-- ========================================
CREATE POLICY "Janitors manage own swap requests"
  ON swap_requests FOR INSERT
  WITH CHECK (from_janitor_id = auth.uid());

CREATE POLICY "Janitors view own swap requests"
  ON swap_requests FOR SELECT
  USING (from_janitor_id = auth.uid() OR to_janitor_id = auth.uid());

CREATE POLICY "Managers/admins manage all swap requests"
  ON swap_requests FOR ALL
  USING (auth.is_manager_or_admin());

-- ========================================
-- NOTIFICATIONS
-- ========================================
CREATE POLICY "Users view own notifications"
  ON notifications FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can mark own notifications as read"
  ON notifications FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());
