"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, MapPin, CheckCircle, ChevronLeft } from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, Label } from "@/components/ui/Input";

const SPECIES_OPTIONS = ["dog", "cat", "bird", "cow", "goat", "other"] as const;
const GENDER_OPTIONS = ["male", "female", "unknown"] as const;

export default function RegisterAnimalPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [animalId, setAnimalId] = useState("");

  const [species, setSpecies] = useState("");
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [color, setColor] = useState("");
  const [gender, setGender] = useState("");
  const [approxAgeMonths, setApproxAgeMonths] = useState("");
  const [distinguishingMarks, setDistinguishingMarks] = useState("");
  const [description, setDescription] = useState("");
  const [territoryLabel, setTerritoryLabel] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationText, setLocationText] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoName, setPhotoName] = useState("");

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocationText("Unable to get GPS. Please type the address.")
    );
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoName(file.name);
    try {
      const res = await api.uploadMedia(file, "animal_photo");
      setPhotoUrl(res.publicUrl);
    } catch {
      setError("Photo upload failed");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!species) { setError("Species is required"); return; }
    if (!location) { setError("Please capture GPS location"); getLocation(); return; }
    setSubmitting(true);
    setError("");
    try {
      const payload: Parameters<typeof api.createAnimal>[0] = {
        species,
        location: { latitude: location.lat, longitude: location.lng },
        status: "community" as const,
        ...(name ? { name } : {}),
        ...(breed ? { breed } : {}),
        ...(color ? { color } : {}),
        ...(gender ? { gender } : {}),
        ...(approxAgeMonths ? { approxAgeMonths: parseInt(approxAgeMonths, 10) } : {}),
        ...(distinguishingMarks ? { distinguishingMarks } : {}),
        ...(description ? { description } : {}),
        ...(territoryLabel ? { territoryLabel } : {}),
        ...(photoUrl ? { primaryPhotoUrl: photoUrl } : {}),
        ...(locationText ? { lastSeenText: locationText } : {}),
      };

      const created = await api.createAnimal(payload);
      setAnimalId(created.id);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Failed to register animal");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <Card className="max-w-xl mx-auto text-center p-8 space-y-6">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle className="w-9 h-9 text-green-600" />
        </div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Animal Registered</h1>
        <p className="text-on-surface-variant text-sm leading-relaxed">Community animal record created successfully.</p>
        <div className="flex gap-3 justify-center">
          <Link href={`/animals/${animalId}`}>
            <Button variant="primary" size="lg">View Profile</Button>
          </Link>
          <Link href="/animals">
            <Button variant="ghost" size="lg" className="bg-surface-container-high">All Animals</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/animals" className="inline-flex items-center gap-1 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors duration-150 ease-out">
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mt-2">Register Community Animal</h1>
      </div>

      <Card className="p-6 sm:p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-error-container text-on-error-container p-4 rounded-md text-sm font-medium">{error}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Species <span className="text-error">*</span></Label>
              <Select value={species} onChange={(e) => setSpecies(e.target.value)} required>
                <option value="">Select species</option>
                {SPECIES_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </Select>
            </div>
            <div>
              <Label>Name (optional)</Label>
              <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bruno" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Breed</Label>
              <Input type="text" value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="e.g. Indie" />
            </div>
            <div>
              <Label>Color</Label>
              <Input type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder="e.g. Brown/Black" />
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Unknown</option>
                {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Approx Age (months)</Label>
              <Input type="number" value={approxAgeMonths} onChange={(e) => setApproxAgeMonths(e.target.value)} placeholder="e.g. 24" min="0" />
            </div>
            <div>
              <Label>Territory Label</Label>
              <Input type="text" value={territoryLabel} onChange={(e) => setTerritoryLabel(e.target.value)} placeholder="e.g. Adyar River Bank" />
            </div>
          </div>

          <div>
            <Label>Distinguishing Marks</Label>
            <Input type="text" value={distinguishingMarks} onChange={(e) => setDistinguishingMarks(e.target.value)} placeholder="e.g. Notched left ear, limps on back leg" />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="General health, behaviour, notes..." />
          </div>

          <div className="space-y-2">
            <Label className="mb-0">Location <span className="text-error">*</span></Label>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input type="text" value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="Address or landmark" className="flex-1 rounded-md" />
              <Button type="button" variant="ghost" onClick={getLocation} className="bg-surface-container-high shrink-0">
                <MapPin className="w-4 h-4" /> Detect Location
              </Button>
            </div>
            {location && <p className="text-xs font-bold text-primary">GPS: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}</p>}
          </div>

          <div>
            <Label>Photo</Label>
            <div className="border-2 border-dashed border-outline-variant hover:border-primary hover:bg-surface-container rounded-md p-6 text-center transition-colors duration-150 ease-out relative cursor-pointer">
              <input type="file" accept="image/*" onChange={handleUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <div className="flex flex-col items-center gap-2">
                <Camera className="w-8 h-8 text-outline" />
                <span className="text-sm font-bold text-on-surface-variant">{photoName || "Click to select a photo"}</span>
                <span className="text-xs text-outline">{photoUrl ? "Photo attached" : "PNG or JPG formats up to 5MB"}</span>
              </div>
            </div>
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting || !location}>
            {submitting ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Register Animal"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
