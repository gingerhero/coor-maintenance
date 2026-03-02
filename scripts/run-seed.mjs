import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log('Seeding NS 3451 codes, customers, and properties...')

  // Run seed SQL via Supabase SQL endpoint
  const seedSql = readFileSync('supabase/seed.sql', 'utf-8')
  // Split into individual INSERT statements and run via rpc or direct
  // Instead, use the REST API to insert data

  // ---- NS 3451 Codes ----
  const ns3451Level1 = [
    { code: '1', parent_code: null, title_nb: 'Fellesanlegg', title_en: 'Common facilities', level: 1, is_high_risk: false },
    { code: '2', parent_code: null, title_nb: 'Bygning', title_en: 'Building/Structure', level: 1, is_high_risk: false },
    { code: '3', parent_code: null, title_nb: 'VVS', title_en: 'Plumbing/HVAC', level: 1, is_high_risk: false },
    { code: '4', parent_code: null, title_nb: 'Elkraft', title_en: 'Electrical power', level: 1, is_high_risk: false },
    { code: '5', parent_code: null, title_nb: 'Tele og automatisering', title_en: 'Telecom & automation', level: 1, is_high_risk: false },
    { code: '6', parent_code: null, title_nb: 'Andre installasjoner', title_en: 'Other installations', level: 1, is_high_risk: false },
    { code: '7', parent_code: null, title_nb: 'Utendørs', title_en: 'Outdoor areas', level: 1, is_high_risk: false },
  ]

  const ns3451Level2 = [
    { code: '21', parent_code: '2', title_nb: 'Grunn og fundamenter', title_en: 'Foundation', level: 2, is_high_risk: false },
    { code: '22', parent_code: '2', title_nb: 'Bæresystem', title_en: 'Load-bearing system', level: 2, is_high_risk: false },
    { code: '23', parent_code: '2', title_nb: 'Yttervegger', title_en: 'Exterior walls', level: 2, is_high_risk: false },
    { code: '24', parent_code: '2', title_nb: 'Innervegger', title_en: 'Interior walls', level: 2, is_high_risk: false },
    { code: '25', parent_code: '2', title_nb: 'Dekker', title_en: 'Floor structures', level: 2, is_high_risk: false },
    { code: '26', parent_code: '2', title_nb: 'Yttertak', title_en: 'Roof', level: 2, is_high_risk: false },
    { code: '27', parent_code: '2', title_nb: 'Trapper, balkonger', title_en: 'Stairs, balconies', level: 2, is_high_risk: false },
    { code: '28', parent_code: '2', title_nb: 'Dører og vinduer', title_en: 'Doors and windows', level: 2, is_high_risk: false },
    { code: '31', parent_code: '3', title_nb: 'Sanitær', title_en: 'Sanitary', level: 2, is_high_risk: false },
    { code: '32', parent_code: '3', title_nb: 'Varme', title_en: 'Heating', level: 2, is_high_risk: false },
    { code: '33', parent_code: '3', title_nb: 'Brannslokking', title_en: 'Fire extinguishing', level: 2, is_high_risk: true },
    { code: '36', parent_code: '3', title_nb: 'Luftbehandling', title_en: 'Air handling/Ventilation', level: 2, is_high_risk: false },
    { code: '41', parent_code: '4', title_nb: 'Basisinstallasjoner elkraft', title_en: 'Basic electrical', level: 2, is_high_risk: false },
    { code: '43', parent_code: '4', title_nb: 'Lavspent forsyning', title_en: 'Low voltage supply', level: 2, is_high_risk: false },
    { code: '44', parent_code: '4', title_nb: 'Lys', title_en: 'Lighting', level: 2, is_high_risk: false },
    { code: '56', parent_code: '5', title_nb: 'Automatisering', title_en: 'Automation', level: 2, is_high_risk: false },
    { code: '63', parent_code: '6', title_nb: 'Heiser', title_en: 'Elevators', level: 2, is_high_risk: true },
    { code: '71', parent_code: '7', title_nb: 'Bearbeidet terreng', title_en: 'Landscaping', level: 2, is_high_risk: false },
    { code: '72', parent_code: '7', title_nb: 'Utendørs konstruksjoner', title_en: 'Outdoor constructions', level: 2, is_high_risk: false },
    { code: '73', parent_code: '7', title_nb: 'Utendørs VVS', title_en: 'Outdoor plumbing', level: 2, is_high_risk: false },
    { code: '76', parent_code: '7', title_nb: 'Vei og plass', title_en: 'Roads and areas', level: 2, is_high_risk: false },
  ]

  const ns3451Level3 = [
    { code: '231', parent_code: '23', title_nb: 'Yttervegg bærevegger', title_en: 'Exterior bearing walls', level: 3, is_high_risk: false },
    { code: '232', parent_code: '23', title_nb: 'Yttervegg kledning', title_en: 'Exterior cladding', level: 3, is_high_risk: false },
    { code: '233', parent_code: '23', title_nb: 'Yttervegg vinduer', title_en: 'Exterior windows', level: 3, is_high_risk: false },
    { code: '261', parent_code: '26', title_nb: 'Taktekking', title_en: 'Roof covering', level: 3, is_high_risk: false },
    { code: '262', parent_code: '26', title_nb: 'Takrenner og nedløp', title_en: 'Gutters and downpipes', level: 3, is_high_risk: false },
    { code: '281', parent_code: '28', title_nb: 'Ytterdører', title_en: 'Exterior doors', level: 3, is_high_risk: false },
    { code: '282', parent_code: '28', title_nb: 'Innerdører', title_en: 'Interior doors', level: 3, is_high_risk: false },
    { code: '311', parent_code: '31', title_nb: 'Sanitærutstyr', title_en: 'Sanitary equipment', level: 3, is_high_risk: false },
    { code: '331', parent_code: '33', title_nb: 'Sprinkler', title_en: 'Sprinkler system', level: 3, is_high_risk: true },
    { code: '332', parent_code: '33', title_nb: 'Brannslukningsapparat', title_en: 'Fire extinguisher', level: 3, is_high_risk: true },
    { code: '361', parent_code: '36', title_nb: 'Ventilasjon', title_en: 'Ventilation units', level: 3, is_high_risk: false },
    { code: '441', parent_code: '44', title_nb: 'Innvendig belysning', title_en: 'Interior lighting', level: 3, is_high_risk: false },
    { code: '442', parent_code: '44', title_nb: 'Utvendig belysning', title_en: 'Exterior lighting', level: 3, is_high_risk: false },
    { code: '631', parent_code: '63', title_nb: 'Personheis', title_en: 'Passenger elevator', level: 3, is_high_risk: true },
    { code: '711', parent_code: '71', title_nb: 'Plener og beplantning', title_en: 'Lawns and planting', level: 3, is_high_risk: false },
    { code: '761', parent_code: '76', title_nb: 'Veier', title_en: 'Roads', level: 3, is_high_risk: false },
    { code: '762', parent_code: '76', title_nb: 'Parkeringsplasser', title_en: 'Parking areas', level: 3, is_high_risk: false },
  ]

  // Insert NS 3451 codes in order (parent first)
  for (const codes of [ns3451Level1, ns3451Level2, ns3451Level3]) {
    const { error } = await supabase.from('ns3451_codes').upsert(codes, { onConflict: 'code' })
    if (error) console.error('NS 3451 insert error:', error.message)
  }
  console.log('  NS 3451 codes inserted (45 codes across 3 levels)')

  // ---- Customers ----
  const customers = [
    { id: 'a0000000-0000-0000-0000-000000000001', organization_name: 'Poppelhagen Sameie', contact_email: 'styret@poppelhagen.no', phone: '+4712345678' },
    { id: 'a0000000-0000-0000-0000-000000000002', organization_name: 'Bjørklia Borettslag', contact_email: 'post@bjorklia.no', phone: '+4787654321' },
    { id: 'a0000000-0000-0000-0000-000000000003', organization_name: 'Sentrum Næringspark AS', contact_email: 'drift@sentrumpark.no', phone: '+4711223344' },
  ]
  const { error: custErr } = await supabase.from('customers').upsert(customers, { onConflict: 'id' })
  if (custErr) console.error('Customer insert error:', custErr.message)
  else console.log('  3 customers inserted')

  // ---- Properties ----
  const properties = [
    { id: 'b0000000-0000-0000-0000-000000000001', name: 'Poppelhagen 1-3', address: 'Poppelveien 1-3, 0580 Oslo', center_lat: 59.9265, center_lng: 10.7897, estimated_weekly_hours: 6.0, customer_id: 'a0000000-0000-0000-0000-000000000001', is_active: true },
    { id: 'b0000000-0000-0000-0000-000000000002', name: 'Bjørklia Terrasse', address: 'Bjørkveien 10, 0571 Oslo', center_lat: 59.9345, center_lng: 10.7652, estimated_weekly_hours: 4.5, customer_id: 'a0000000-0000-0000-0000-000000000002', is_active: true },
    { id: 'b0000000-0000-0000-0000-000000000003', name: 'Sentrum Næringspark', address: 'Storgata 15, 0184 Oslo', center_lat: 59.9133, center_lng: 10.7522, estimated_weekly_hours: 8.0, customer_id: 'a0000000-0000-0000-0000-000000000003', is_active: true },
  ]
  const { error: propErr } = await supabase.from('properties').upsert(properties, { onConflict: 'id' })
  if (propErr) console.error('Property insert error:', propErr.message)
  else console.log('  3 properties inserted')

  // ---- Create test users ----
  console.log('\nCreating test users...')

  const testUsers = [
    { email: 'janitor@coor.no', password: 'test1234', role: 'janitor', name: 'Ole Vansen' },
    { email: 'manager@coor.no', password: 'test1234', role: 'manager', name: 'Kari Nordmann' },
    { email: 'admin@coor.no', password: 'test1234', role: 'admin', name: 'Per Admin' },
    { email: 'kunde@poppelhagen.no', password: 'test1234', role: 'customer', name: 'Styre Poppelhagen' },
  ]

  for (const user of testUsers) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.name },
    })

    if (error) {
      console.error(`  Error creating ${user.email}: ${error.message}`)
      continue
    }

    // Create profile record
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: user.name,
      email: user.email,
      role: user.role,
      is_active: true,
    }, { onConflict: 'id' })

    if (profileErr) {
      console.error(`  Profile error for ${user.email}: ${profileErr.message}`)
    } else {
      console.log(`  Created: ${user.email} (${user.role})`)
    }
  }

  // ---- Link janitor to properties ----
  const { data: janitorProfile } = await supabase.from('profiles').select('id').eq('email', 'janitor@coor.no').single()
  if (janitorProfile) {
    const { data: allProps } = await supabase.from('properties').select('id, estimated_weekly_hours')
    if (allProps) {
      const rosterEntries = allProps.map(p => ({
        janitor_id: janitorProfile.id,
        property_id: p.id,
        budgeted_weekly_hours: p.estimated_weekly_hours,
        active_from: new Date().toISOString().split('T')[0],
        schedule: { mon: true, tue: true, wed: true, thu: true, fri: true },
      }))
      await supabase.from('roster_entries').upsert(rosterEntries)
      console.log('  Linked janitor to all 3 properties via roster')
    }
  }

  // ---- Link manager to properties ----
  const { data: managerProfile } = await supabase.from('profiles').select('id').eq('email', 'manager@coor.no').single()
  if (managerProfile) {
    await supabase.from('properties').update({ manager_id: managerProfile.id }).is('manager_id', null)
    console.log('  Linked manager to all properties')
  }

  // ---- Link customer user ----
  const { data: customerProfile } = await supabase.from('profiles').select('id').eq('email', 'kunde@poppelhagen.no').single()
  if (customerProfile) {
    await supabase.from('customer_users').upsert({
      profile_id: customerProfile.id,
      customer_id: 'a0000000-0000-0000-0000-000000000001',
    })
    console.log('  Linked customer user to Poppelhagen Sameie')
  }

  console.log('\n========================================')
  console.log('Done! Test login credentials:')
  console.log('  janitor@coor.no      / test1234  (Vaktmester)')
  console.log('  manager@coor.no      / test1234  (Driftssjef)')
  console.log('  admin@coor.no        / test1234  (Admin)')
  console.log('  kunde@poppelhagen.no / test1234  (Kunde)')
  console.log('========================================')
}

main().catch(err => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
