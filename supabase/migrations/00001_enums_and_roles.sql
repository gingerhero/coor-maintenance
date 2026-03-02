-- Coor Maintenance App - Enums and Role Types
-- Migration 00001

-- User roles
CREATE TYPE user_role AS ENUM ('janitor', 'manager', 'admin', 'customer');

-- Task frequency types
CREATE TYPE frequency_type AS ENUM ('weekly', 'monthly', 'quarterly', 'yearly', 'every_visit');

-- Season types
CREATE TYPE season_type AS ENUM ('summer', 'winter', 'none');

-- Task execution status
CREATE TYPE execution_status AS ENUM ('done', 'skipped');

-- Skip reasons
CREATE TYPE skip_reason AS ENUM ('not_accessible', 'not_necessary', 'lacked_materials', 'other');

-- Avvik severity
CREATE TYPE avvik_severity AS ENUM ('low', 'medium', 'high');

-- Avvik status
CREATE TYPE avvik_status AS ENUM ('new', 'in_progress', 'resolved');

-- Assignment status
CREATE TYPE assignment_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

-- Time log status
CREATE TYPE timelog_status AS ENUM ('draft', 'submitted', 'approved');

-- Swap request status
CREATE TYPE swap_status AS ENUM ('pending', 'approved', 'rejected');
