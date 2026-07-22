const SUPABASE_URL = "https://opfiqgcxodjwgwndmjpl.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZmlxZ2N4b2Rqd2d3bmRtanBsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjM5NjUxNCwiZXhwIjoyMDk3OTcyNTE0fQ.Oqo1md47ELv2SnlXGPFzlJJOvQIpvAa6cabraniO81c";

type Row = Record<string, unknown>;

async function getFirst(table: string, qs: string): Promise<Row | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=id&${qs}`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) return data[0];
  return null;
}

async function insert(table: string, rows: Row[]): Promise<void> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify(rows),
    }
  );
  const text = await res.text();
  if (!res.ok && !text.includes("duplicate key")) {
    console.error(`  ERROR inserting into ${table}: ${res.status} ${text.slice(0, 200)}`);
  } else {
    console.log(`  OK: inserted ${rows.length} row(s) into ${table}`);
  }
}

(async () => {
  console.log("=== Seeding data ===");

  const citizen = await getFirst("users", "role=eq.citizen");
  const ngo = await getFirst("users", "role=eq.ngo");
  const animal = await getFirst("animals", "name=Raja");
  const rescueCase = await getFirst("cases", "case_type=eq.rescue");

  const citizenId = (citizen as Row)?.id ?? "00000000-0000-0000-0000-000000000001";
  const ngoId = (ngo as Row)?.id ?? "00000000-0000-0000-0000-000000000002";
  const rescueCaseId = (rescueCase as Row)?.id ?? "";

  console.log(`Using citizen=${citizenId}, ngo=${ngoId}, case=${rescueCaseId}`);

  await insert("legal_aid_providers", [
    {
      name: "Adv. Priya Krishnan",
      organisation: "Animal Welfare Legal Cell",
      phone: "+919876543210",
      email: "priya@awlcell.org",
      city: "Chennai",
      specializations: ["animal feeder harassment", "RWA conflict", "ABC rights"],
      is_pro_bono: true,
      is_active: true,
    },
    {
      name: "Adv. Ramesh Iyer",
      organisation: "Chennai Legal Aid Society",
      phone: "+919876543211",
      email: "ramesh@clas.org",
      city: "Chennai",
      specializations: ["RWA conflict", "animal feeder harassment"],
      is_pro_bono: true,
      is_active: true,
    },
  ]);

  await insert("safe_awareness_zones", [
    {
      zone_name: "T. Nagar Safe Zone",
      ward_name: "T. Nagar",
      zone_type: "community",
      location: "0101000020E610000000000000000054400000000000002A40",
      radius_metres: 500,
      animal_count: 5,
      abc_coverage_pct: 100,
      vaccination_pct: 100,
    },
    {
      zone_name: "Adyar Beach Zone",
      ward_name: "Adyar",
      zone_type: "community",
      location: "0101000020E610000000000000000054400000000000002A40",
      radius_metres: 800,
      animal_count: 3,
      abc_coverage_pct: 100,
      vaccination_pct: 100,
    },
  ]);

  await insert("feeding_points", [
    {
      caretaker_user_id: citizenId,
      label: "T. Nagar Market Gate",
      location: "0101000020E610000000000000000054400000000000002A40",
      location_text: "T. Nagar Market, Chennai",
      schedule_description: "Every morning 7 AM and evening 6 PM",
      monthly_food_cost_inr: 2000,
      animal_count: 5,
      abc_coverage: true,
      vaccination_status: "verified",
    },
    {
      caretaker_user_id: ngoId,
      label: "Adyar Beach Feeding Point",
      location: "0101000020E610000000000000000054400000000000002A40",
      location_text: "Adyar Beach, Chennai",
      schedule_description: "Evening 6 PM daily",
      monthly_food_cost_inr: 1500,
      animal_count: 3,
      abc_coverage: true,
      vaccination_status: "verified",
    },
  ]);

  await insert("csr_sponsors", [
    {
      org_name: "PetCare India Pvt Ltd",
      contact_name: "Anita Sharma",
      contact_email: "anita@petcare.in",
      contact_phone: "+919876543212",
      commitment_type: "matching",
      committed_amount_inr: 100000,
      active_from: "2025-01-01",
      is_active: true,
    },
    {
      org_name: "Chennai Animal Welfare Trust",
      contact_name: "Vikram Rao",
      contact_email: "vikram@cawt.org",
      contact_phone: "+919876543213",
      commitment_type: "pooled",
      committed_amount_inr: 50000,
      active_from: "2025-01-01",
      is_active: true,
    },
  ]);

  if (rescueCaseId) {
    await insert("recovery_funding", [
      {
        case_id: rescueCaseId,
        animal_id: null,
        daily_cost_inr: 300,
        provider_name: "SKS Veterinary Hospital",
        provider_type: "clinic",
        start_date: "2025-05-01",
        status: "active",
      },
    ]);
  }

  console.log("\n!!! WARDS: No source CSV/JSON/SQL found in workspace for Tambaram City Municipal Corporation.");
  console.log("    Cannot fabricate 70 ward names — must be re-sourced from official civic data.");
  console.log("\n=== Seeding complete ===");
})().catch(console.error);
