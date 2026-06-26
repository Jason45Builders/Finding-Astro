export type UserRole = 'citizen' | 'ngo' | 'govt' | 'admin' | 'hospital';

export interface Profile {
  id: string;
  phone: string;
  full_name: string | null;
  role: UserRole;
  identity_tier: number;
  reputation_score: number;
  is_banned: boolean;
  is_available: boolean;
  service_radius_km: number;
  home_location: { lat: number; lng: number } | null;
}

export interface Animal {
  id: string;
  name: string | null;
  species: string;
  breed: string | null;
  color: string | null;
  gender: string | null;
  status: 'community' | 'lost' | 'found' | 'reunited' | 'adopted';
  is_sterilized: boolean;
  location: { lat: number; lng: number };
  territory_label: string | null;
  primary_photo_url: string | null;
  description: string | null;
  created_at: string;
}

export interface CaseRecord {
  id: string;
  case_type: 'rescue' | 'abuse' | 'conflict' | 'lost_pet' | 'abc' | 'wildlife';
  status: 'open' | 'in_review' | 'action_taken' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location: { lat: number; lng: number };
  location_text: string | null;
  evidence_urls: string[];
  created_at: string;
  reporter_name: string | null;
}
