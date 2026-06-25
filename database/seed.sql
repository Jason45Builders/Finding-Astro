-- ══════════════════════════════════════════════════════════════════════════════
-- Finding Astro — Seed Data (Run after schema.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- Default admin user (for initial setup only — change password in production)
INSERT INTO users (email, password_hash, full_name, role, identity_tier, is_available, reputation_score, active_case_limit, service_radius_km) VALUES
('admin@findingastro.local', '$2b$10$TdIBz6ygwLzvKPUx5YXu3.b2JwrAuWGyWi4BabaA0vKTXNkCNCza.', 'Platform Admin', 'admin', 5, FALSE, 100, 10, 50)
ON CONFLICT (email) DO NOTHING;

-- Default NGO user
INSERT INTO users (email, password_hash, full_name, role, identity_tier, is_available, reputation_score, active_case_limit, service_radius_km) VALUES
('ngo@findingastro.local', '$2b$10$X3xkPyTOIiH7852vjeY2WOIEnMwm.Wobim2APBoFtErOAEB5PUg/K', 'Test NGO', 'ngo', 3, TRUE, 80, 5, 15)
ON CONFLICT (email) DO NOTHING;

-- Default hospital user
INSERT INTO users (email, password_hash, full_name, role, identity_tier, is_available, reputation_score, active_case_limit, service_radius_km) VALUES
('hospital@findingastro.local', '$2b$10$iOXMb/4HWOEv1sLzahHDoOdD1CsCrxK8Hx3/hKzxAdRZQztCGSaS6', 'Test Hospital', 'hospital', 3, TRUE, 75, 5, 20)
ON CONFLICT (email) DO NOTHING;

-- Default citizen user
INSERT INTO users (email, password_hash, full_name, role, identity_tier, is_available, reputation_score, active_case_limit, service_radius_km) VALUES
('citizen@findingastro.local', '$2b$10$3m5usrSeIyOQD1YuIjH0rO92rAlldEkBlMagK0OFzk8gniEy66Efe', 'Test Citizen', 'citizen', 2, FALSE, 60, 3, 10)
ON CONFLICT (email) DO NOTHING;

-- Sample animals (Chennai area)
INSERT INTO animals (name, species, breed, color, gender, approx_age_months, status, is_sterilized, location, territory_label, last_seen_text, description) VALUES
('Raja', 'Dog', 'Indie', 'Brown', 'Male', 24, 'community', TRUE, ST_SetSRID(ST_MakePoint(80.2707, 13.0827), 4326)::geography, 'T. Nagar', 'Seen at the market gate every morning', 'Friendly community dog, vaccinated and neutered. Loved by local vendors.'),
('Luna', 'Dog', 'Indie', 'Black and White', 'Female', 18, 'community', TRUE, ST_SetSRID(ST_MakePoint(80.2500, 13.0600), 4326)::geography, 'Adyar', 'Regular at the beach feeding point', 'Shy but gentle. Does not approach strangers.'),
('Bruno', 'Dog', 'Labrador Mix', 'Golden', 'Male', 36, 'lost', FALSE, ST_SetSRID(ST_MakePoint(80.2800, 13.0900), 4326)::geography, 'Mylapore', 'Went missing from 3rd Cross Street on 15 May', 'Wearing a red collar with tag. Microchipped. Very friendly, may approach strangers.'),
('Mittens', 'Cat', 'Indie', 'Calico', 'Female', 12, 'found', FALSE, ST_SetSRID(ST_MakePoint(80.2600, 13.0700), 4326)::geography, 'Besant Nagar', 'Found in a park, appears friendly', 'Found in the park near the playground. Very friendly, likely a pet. No collar.')
ON CONFLICT DO NOTHING;

-- Sample cases
INSERT INTO cases (animal_id, reporter_user_id, case_type, status, priority, title, description, location, location_text) VALUES
((SELECT id FROM animals WHERE name = 'Bruno' LIMIT 1), (SELECT id FROM users WHERE role = 'citizen' LIMIT 1), 'lost_pet', 'open', 'high', 'Lost dog — Bruno', 'Bruno went missing from home around 6 PM. Last seen near 3rd Cross Street, Mylapore. He is a golden Labrador mix, very friendly.', ST_SetSRID(ST_MakePoint(80.2800, 13.0900), 4326)::geography, '3rd Cross Street, Mylapore'),
(NULL, (SELECT id FROM users WHERE role = 'citizen' LIMIT 1), 'rescue', 'open', 'high', 'Injured puppy on OMR', 'Small puppy hit by a two-wheeler. Bleeding from the leg. Unable to walk. Location: OMR service road near SIPCOT.', ST_SetSRID(ST_MakePoint(80.2300, 12.9500), 4326)::geography, 'OMR service road near SIPCOT')
ON CONFLICT DO NOTHING;

-- Sample ABC events
INSERT INTO abc_events (animal_id, event_type, status, location, requested_by_user_id) VALUES
((SELECT id FROM animals WHERE name = 'Raja' LIMIT 1), 'surgery', 'completed', ST_SetSRID(ST_MakePoint(80.2707, 13.0827), 4326)::geography, (SELECT id FROM users WHERE role = 'ngo' LIMIT 1)),
((SELECT id FROM animals WHERE name = 'Luna' LIMIT 1), 'capture', 'open', ST_SetSRID(ST_MakePoint(80.2500, 13.0600), 4326)::geography, (SELECT id FROM users WHERE role = 'ngo' LIMIT 1))
ON CONFLICT DO NOTHING;

-- Sample funding case
INSERT INTO funding_cases (case_id, type, total_amount, status) VALUES
((SELECT id FROM cases WHERE title LIKE 'Injured puppy%' LIMIT 1), 'PRE_FUNDED', 5000, 'OPEN')
ON CONFLICT DO NOTHING;

-- Sample feeding points
INSERT INTO feeding_points (caretaker_user_id, label, location, location_text, schedule_description, monthly_food_cost_inr, animal_count, abc_coverage, vaccination_status) VALUES
((SELECT id FROM users WHERE role = 'citizen' LIMIT 1), 'T. Nagar Market Gate', ST_SetSRID(ST_MakePoint(80.2707, 13.0827), 4326)::geography, 'T. Nagar Market, Chennai', 'Every morning 7 AM and evening 6 PM', 2000, 5, TRUE, 'verified'),
((SELECT id FROM users WHERE role = 'ngo' LIMIT 1), 'Adyar Beach Feeding Point', ST_SetSRID(ST_MakePoint(80.2500, 13.0600), 4326)::geography, 'Adyar Beach, Chennai', 'Evening 6 PM daily', 1500, 3, TRUE, 'verified')
ON CONFLICT DO NOTHING;

-- Sample safe awareness zones
INSERT INTO safe_awareness_zones (zone_name, ward_name, zone_type, location, radius_metres, animal_count, abc_coverage_pct, vaccination_pct) VALUES
('T. Nagar Safe Zone', 'T. Nagar', 'community', ST_SetSRID(ST_MakePoint(80.2707, 13.0827), 4326)::geography, 500, 5, 100, 100),
('Adyar Beach Zone', 'Adyar', 'community', ST_SetSRID(ST_MakePoint(80.2500, 13.0600), 4326)::geography, 800, 3, 100, 100)
ON CONFLICT DO NOTHING;

-- Sample public outcomes (trust signals)
INSERT INTO public_outcomes (case_id, animal_id, outcome_type, headline, detail, ward_name, is_public) VALUES
((SELECT id FROM cases WHERE title LIKE 'Injured puppy%' LIMIT 1), NULL, 'rescue', 'Injured puppy rescued and treated', 'A responder reached the location within 12 minutes. The puppy is now under care at SKS Veterinary Hospital.', 'T. Nagar', TRUE),
(NULL, (SELECT id FROM animals WHERE name = 'Raja' LIMIT 1), 'vaccination', 'Community dog vaccinated', 'Raja received his annual rabies vaccination today. He is protected and safe to interact with.', 'T. Nagar', TRUE)
ON CONFLICT DO NOTHING;

-- Sample legal aid providers
INSERT INTO legal_aid_providers (name, organisation, phone, email, city, specializations, is_pro_bono, is_active) VALUES
('Adv. Priya Krishnan', 'Animal Welfare Legal Cell', '+919876543210', 'priya@awlcell.org', 'Chennai', ARRAY['animal feeder harassment', 'RWA conflict', 'ABC rights'], TRUE, TRUE),
('Adv. Ramesh Iyer', 'Chennai Legal Aid Society', '+919876543211', 'ramesh@clas.org', 'Chennai', ARRAY['RWA conflict', 'animal feeder harassment'], TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- Sample CSR sponsors
INSERT INTO csr_sponsors (org_name, contact_name, contact_email, contact_phone, commitment_type, committed_amount_inr, active_from, is_active) VALUES
('PetCare India Pvt Ltd', 'Anita Sharma', 'anita@petcare.in', '+919876543212', 'matching', 100000, '2025-01-01', TRUE),
('Chennai Animal Welfare Trust', 'Vikram Rao', 'vikram@cawt.org', '+919876543213', 'pooled', 50000, '2025-01-01', TRUE)
ON CONFLICT DO NOTHING;

-- Sample recovery funding
INSERT INTO recovery_funding (case_id, animal_id, daily_cost_inr, provider_name, provider_type, start_date, status) VALUES
((SELECT id FROM cases WHERE title LIKE 'Injured puppy%' LIMIT 1), NULL, 300, 'SKS Veterinary Hospital', 'clinic', '2025-05-01', 'active')
ON CONFLICT DO NOTHING;
