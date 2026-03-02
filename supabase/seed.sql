-- Coor Maintenance App - Seed Data for Development
-- Run with: supabase db reset (applies migrations + seed)

-- ========================================
-- NS 3451 Reference Codes
-- ========================================

-- Level 1: Main categories
INSERT INTO ns3451_codes (code, parent_code, title_nb, title_en, level, is_high_risk) VALUES
  ('1', NULL, 'Fellesanlegg', 'Common facilities', 1, false),
  ('2', NULL, 'Bygning', 'Building/Structure', 1, false),
  ('3', NULL, 'VVS', 'Plumbing/HVAC', 1, false),
  ('4', NULL, 'Elkraft', 'Electrical power', 1, false),
  ('5', NULL, 'Tele og automatisering', 'Telecom & automation', 1, false),
  ('6', NULL, 'Andre installasjoner', 'Other installations', 1, false),
  ('7', NULL, 'Utendørs', 'Outdoor areas', 1, false);

-- Level 2: Subcategories (selected examples)
INSERT INTO ns3451_codes (code, parent_code, title_nb, title_en, level, is_high_risk) VALUES
  ('21', '2', 'Grunn og fundamenter', 'Foundation', 2, false),
  ('22', '2', 'Bæresystem', 'Load-bearing system', 2, false),
  ('23', '2', 'Yttervegger', 'Exterior walls', 2, false),
  ('24', '2', 'Innervegger', 'Interior walls', 2, false),
  ('25', '2', 'Dekker', 'Floor structures', 2, false),
  ('26', '2', 'Yttertak', 'Roof', 2, false),
  ('27', '2', 'Trapper, balkonger', 'Stairs, balconies', 2, false),
  ('28', '2', 'Dører og vinduer', 'Doors and windows', 2, false),
  ('31', '3', 'Sanitær', 'Sanitary', 2, false),
  ('32', '3', 'Varme', 'Heating', 2, false),
  ('33', '3', 'Brannslokking', 'Fire extinguishing', 2, true),
  ('34', '3', 'Gass og trykkluft', 'Gas and compressed air', 2, false),
  ('36', '3', 'Luftbehandling', 'Air handling/Ventilation', 2, false),
  ('41', '4', 'Basisinstallasjoner elkraft', 'Basic electrical installations', 2, false),
  ('43', '4', 'Lavspent forsyning', 'Low voltage supply', 2, false),
  ('44', '4', 'Lys', 'Lighting', 2, false),
  ('45', '4', 'Elvarme', 'Electric heating', 2, false),
  ('56', '5', 'Automatisering', 'Automation', 2, false),
  ('63', '6', 'Heiser', 'Elevators', 2, true),
  ('71', '7', 'Bearbeidet terreng', 'Landscaping', 2, false),
  ('72', '7', 'Utendørs konstruksjoner', 'Outdoor constructions', 2, false),
  ('73', '7', 'Utendørs VVS', 'Outdoor plumbing', 2, false),
  ('74', '7', 'Utendørs elkraft', 'Outdoor electrical', 2, false),
  ('76', '7', 'Vei og plass', 'Roads and areas', 2, false);

-- Level 3: Components (selected examples)
INSERT INTO ns3451_codes (code, parent_code, title_nb, title_en, level, is_high_risk) VALUES
  ('231', '23', 'Yttervegg bærevegger', 'Exterior bearing walls', 3, false),
  ('232', '23', 'Yttervegg kledning', 'Exterior cladding', 3, false),
  ('233', '23', 'Yttervegg vinduer', 'Exterior windows', 3, false),
  ('261', '26', 'Taktekking', 'Roof covering', 3, false),
  ('262', '26', 'Takrenner og nedløp', 'Gutters and downpipes', 3, false),
  ('281', '28', 'Ytterdører', 'Exterior doors', 3, false),
  ('282', '28', 'Innerdører', 'Interior doors', 3, false),
  ('283', '28', 'Vinduer', 'Windows', 3, false),
  ('311', '31', 'Sanitærutstyr', 'Sanitary equipment', 3, false),
  ('331', '33', 'Sprinkler', 'Sprinkler system', 3, true),
  ('332', '33', 'Brannslukningsapparat', 'Fire extinguisher', 3, true),
  ('361', '36', 'Ventilasjon', 'Ventilation units', 3, false),
  ('441', '44', 'Innvendig belysning', 'Interior lighting', 3, false),
  ('442', '44', 'Utvendig belysning', 'Exterior lighting', 3, false),
  ('631', '63', 'Personheis', 'Passenger elevator', 3, true),
  ('711', '71', 'Plener og beplantning', 'Lawns and planting', 3, false),
  ('761', '76', 'Veier', 'Roads', 3, false),
  ('762', '76', 'Parkeringsplasser', 'Parking areas', 3, false);

-- ========================================
-- Sample Customers
-- ========================================
INSERT INTO customers (id, organization_name, contact_email, phone) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Poppelhagen Sameie', 'styret@poppelhagen.no', '+4712345678'),
  ('a0000000-0000-0000-0000-000000000002', 'Bjørklia Borettslag', 'post@bjorklia.no', '+4787654321'),
  ('a0000000-0000-0000-0000-000000000003', 'Sentrum Næringspark AS', 'drift@sentrumpark.no', '+4711223344');

-- ========================================
-- Sample Properties
-- ========================================
INSERT INTO properties (id, name, address, center_lat, center_lng, estimated_weekly_hours, customer_id, is_active) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Poppelhagen 1-3', 'Poppelveien 1-3, 0580 Oslo', 59.9265, 10.7897, 6.0, 'a0000000-0000-0000-0000-000000000001', true),
  ('b0000000-0000-0000-0000-000000000002', 'Bjørklia Terrasse', 'Bjørkveien 10, 0571 Oslo', 59.9345, 10.7652, 4.5, 'a0000000-0000-0000-0000-000000000002', true),
  ('b0000000-0000-0000-0000-000000000003', 'Sentrum Næringspark', 'Storgata 15, 0184 Oslo', 59.9133, 10.7522, 8.0, 'a0000000-0000-0000-0000-000000000003', true);
