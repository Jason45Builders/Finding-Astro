export interface DuplicateAnimalCandidate {
  id: string;
  name: string | null;
  species: string;
  status: string;
  location: { latitude: number; longitude: number } | null;
  territoryLabel: string | null;
  description: string | null;
  distinguishingMarks: string | null;
  score: number;
}

function jaccardSimilarity(a: string | null, b: string | null): number {
  if (!a || !b) return 0;
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function scoreDuplicateCandidate(candidate: DuplicateAnimalCandidate, reference: { species: string; location: { latitude: number; longitude: number } | null; description: string | null; distinguishingMarks: string | null }): number {
  let score = 0;
  if (candidate.species.toLowerCase() === reference.species.toLowerCase()) score += 40;
  if (candidate.territoryLabel && reference.location) {
    const dist = haversineKm(candidate.location?.latitude ?? 0, candidate.location?.longitude ?? 0, reference.location.latitude, reference.location.longitude);
    if (dist < 1) score += 30;
    else if (dist < 5) score += 15;
  }
  score += jaccardSimilarity(candidate.description, reference.description) * 20;
  score += jaccardSimilarity(candidate.distinguishingMarks, reference.distinguishingMarks) * 10;
  return Math.min(100, Math.round(score));
}

export function findPotentialDuplicates(candidates: DuplicateAnimalCandidate[], reference: { species: string; location: { latitude: number; longitude: number } | null; description: string | null; distinguishingMarks: string | null }, minScore = 50): DuplicateAnimalCandidate[] {
  return candidates
    .map((c) => ({ ...c, score: scoreDuplicateCandidate(c, reference) }))
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score);
}
