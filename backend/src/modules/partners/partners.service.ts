/**
 * partners.service.ts
 * Serves real Chennai partner data to the app.
 */

import { query } from "../../config/db";
import { LocationInput } from "../../types/global.types";

export interface PartnerClinic {
  id: string; name: string; address: string; wardName: string | null;
  city: string; phone: string | null; emergencyPhone: string | null;
  latitude: number | null; longitude: number | null;
  acceptsStrays: boolean; emergency24hr: boolean;
  hasSurgery: boolean; hasInpatient: boolean;
  clinicType: string; operatingHours: string | null; website: string | null;
  notes: string | null; isVerified: boolean; distanceKm?: number;
}

export interface PetStore {
  id: string; name: string; address: string; wardName: string | null;
  city: string; phone: string | null;
  latitude: number | null; longitude: number | null;
  hasSupplements: boolean; hasMedicalSupplies: boolean;
  hasFood: boolean; operatingHours: string | null; website: string | null;
  notes: string | null; distanceKm?: number;
}

export interface AbcCentre {
  id: string; name: string; address: string; wardName: string | null;
  city: string; zoneNumber: number | null; divisionNumber: number | null;
  latitude: number | null; longitude: number | null;
  phone: string | null; isGovt: boolean; notes: string | null; distanceKm?: number;
}

export interface WelfareOrg {
  id: string; name: string; orgType: string; address: string;
  wardName: string | null; city: string; phone: string | null;
  email: string | null; website: string | null;
  latitude: number | null; longitude: number | null;
  isVerified: boolean; services: string[]; notes: string | null;
}

export interface EmergencyHelpline {
  id: string; name: string; phone: string;
  available24hr: boolean; covers: string; city: string; notes: string | null;
}

class PartnersService {

  async getClinicsNearby(location: LocationInput, radiusKm = 10, filters?: { emergencyOnly?: boolean; straysOnly?: boolean }): Promise<PartnerClinic[]> {
    const conditions = ["pc.is_active = TRUE", `ST_DWithin(pc.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)`];
    const vals: unknown[] = [location.longitude, location.latitude, radiusKm * 1000];
    if (filters?.emergencyOnly) conditions.push("pc.emergency_24hr = TRUE");
    if (filters?.straysOnly)    conditions.push("pc.accepts_strays = TRUE");

    const result = await query<{ id: string; name: string; address: string; ward_name: string | null; city: string; phone: string | null; emergency_phone: string | null; latitude: string | null; longitude: string | null; accepts_strays: boolean; emergency_24hr: boolean; has_surgery: boolean; has_inpatient: boolean; clinic_type: string; operating_hours: string | null; website: string | null; notes: string | null; is_verified: boolean; distance_km: number; }>(
      `SELECT pc.id,pc.name,pc.address,pc.ward_name,pc.city,pc.phone,pc.emergency_phone,pc.latitude,pc.longitude,pc.accepts_strays,pc.emergency_24hr,pc.has_surgery,pc.has_inpatient,pc.clinic_type,pc.operating_hours,pc.website,pc.notes,pc.is_verified,
              ST_Distance(pc.location,ST_SetSRID(ST_MakePoint($1,$2),4326)::geography)/1000 AS distance_km
       FROM partner_clinics pc WHERE ${conditions.join(" AND ")}
       ORDER BY (CASE WHEN pc.emergency_24hr AND pc.accepts_strays THEN 0 WHEN pc.accepts_strays AND pc.has_surgery THEN 1 WHEN pc.accepts_strays THEN 2 ELSE 3 END),distance_km ASC LIMIT 15`,
      vals
    );
    return result.rows.map(r => ({ id:r.id,name:r.name,address:r.address,wardName:r.ward_name,city:r.city,phone:r.phone,emergencyPhone:r.emergency_phone,latitude:r.latitude?Number(r.latitude):null,longitude:r.longitude?Number(r.longitude):null,acceptsStrays:r.accepts_strays,emergency24hr:r.emergency_24hr,hasSurgery:r.has_surgery,hasInpatient:r.has_inpatient,clinicType:r.clinic_type,operatingHours:r.operating_hours,website:r.website,notes:r.notes,isVerified:r.is_verified,distanceKm:Number(r.distance_km) }));
  }

  async getStoresNearby(location: LocationInput, radiusKm = 5, medicalOnly = false): Promise<PetStore[]> {
    const conditions = ["ps.is_active = TRUE", `ST_DWithin(ps.location,ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,$3)`];
    const vals: unknown[] = [location.longitude, location.latitude, radiusKm * 1000];
    if (medicalOnly) conditions.push("(ps.has_supplements=TRUE OR ps.has_medical_supplies=TRUE)");

    const result = await query<{ id:string;name:string;address:string;ward_name:string|null;city:string;phone:string|null;latitude:string|null;longitude:string|null;has_supplements:boolean;has_medical_supplies:boolean;has_food:boolean;operating_hours:string|null;website:string|null;notes:string|null;distance_km:number; }>(
      `SELECT ps.id,ps.name,ps.address,ps.ward_name,ps.city,ps.phone,ps.latitude,ps.longitude,ps.has_supplements,ps.has_medical_supplies,ps.has_food,ps.operating_hours,ps.website,ps.notes,
              ST_Distance(ps.location,ST_SetSRID(ST_MakePoint($1,$2),4326)::geography)/1000 AS distance_km
       FROM pet_stores ps WHERE ${conditions.join(" AND ")}
       ORDER BY (CASE WHEN ps.has_medical_supplies THEN 0 WHEN ps.has_supplements THEN 1 ELSE 2 END),distance_km ASC LIMIT 8`,
      vals
    );
    return result.rows.map(r => ({ id:r.id,name:r.name,address:r.address,wardName:r.ward_name,city:r.city,phone:r.phone,latitude:r.latitude?Number(r.latitude):null,longitude:r.longitude?Number(r.longitude):null,hasSupplements:r.has_supplements,hasMedicalSupplies:r.has_medical_supplies,hasFood:r.has_food,operatingHours:r.operating_hours,website:r.website,notes:r.notes,distanceKm:Number(r.distance_km) }));
  }

  async getAbcCentres(location?: LocationInput): Promise<AbcCentre[]> {
    const vals: unknown[] = [];
    let distExpr = "NULL::double precision AS distance_km";
    let whereClause = "is_active = TRUE";
    if (location) {
      vals.push(location.longitude,location.latitude);
      whereClause += ` AND location IS NOT NULL`;
      distExpr = `ST_Distance(location,ST_SetSRID(ST_MakePoint($1,$2),4326)::geography)/1000`;
    }
    const result = await query<{ id:string;name:string;address:string;ward_name:string|null;city:string;zone_number:number|null;division_number:number|null;latitude:string|null;longitude:string|null;phone:string|null;is_govt:boolean;notes:string|null;distance_km:number|null; }>(
      `SELECT id,name,address,ward_name,city,zone_number,division_number,latitude,longitude,phone,is_govt,notes,${distExpr} FROM abc_centres WHERE ${whereClause} ORDER BY zone_number NULLS LAST`,vals);
    return result.rows.map(r => ({ id:r.id,name:r.name,address:r.address,wardName:r.ward_name,city:r.city,zoneNumber:r.zone_number,divisionNumber:r.division_number,latitude:r.latitude?Number(r.latitude):null,longitude:r.longitude?Number(r.longitude):null,phone:r.phone,isGovt:r.is_govt,notes:r.notes,distanceKm:r.distance_km!==null?Number(r.distance_km):undefined }));
  }

  async getWelfareOrgs(filters?: { verifiedOnly?: boolean; orgType?: string }): Promise<WelfareOrg[]> {
    const conditions = ["is_active = TRUE"];
    const vals: unknown[] = [];
    if (filters?.verifiedOnly) conditions.push("is_verified = TRUE");
    if (filters?.orgType) { vals.push(filters.orgType); conditions.push(`org_type = $${vals.length}`); }
    const result = await query<{ id:string;name:string;org_type:string;address:string;ward_name:string|null;city:string;phone:string|null;email:string|null;website:string|null;latitude:string|null;longitude:string|null;is_verified:boolean;services:string[];notes:string|null; }>(
      `SELECT id,name,org_type,address,ward_name,city,phone,email,website,latitude,longitude,is_verified,services,notes FROM welfare_organisations WHERE ${conditions.join(" AND ")} ORDER BY is_verified DESC,name ASC`,vals);
    return result.rows.map(r => ({ id:r.id,name:r.name,orgType:r.org_type,address:r.address,wardName:r.ward_name,city:r.city,phone:r.phone,email:r.email,website:r.website,latitude:r.latitude?Number(r.latitude):null,longitude:r.longitude?Number(r.longitude):null,isVerified:r.is_verified,services:r.services,notes:r.notes }));
  }

  async getHelplines(): Promise<EmergencyHelpline[]> {
    const result = await query<{ id:string;name:string;phone:string;available_24hr:boolean;covers:string;city:string;notes:string|null; }>(
      `SELECT id,name,phone,available_24hr,covers,city,notes FROM emergency_helplines WHERE is_active=TRUE ORDER BY available_24hr DESC,name ASC`);
    return result.rows.map(r => ({ id:r.id,name:r.name,phone:r.phone,available24hr:r.available_24hr,covers:r.covers,city:r.city,notes:r.notes }));
  }
}

export const partnersService = new PartnersService();
