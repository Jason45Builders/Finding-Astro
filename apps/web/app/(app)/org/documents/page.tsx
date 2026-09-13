"use client";

import React, { useEffect, useState } from "react";
import { Plus, Upload, FileText, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

type DocTab = "organization" | "animals";

const ORG_DOC_TYPES = ["registration_certificate", "12A", "80G", "FCRA", "PAN", "bank_documents", "government_permissions", "veterinary_agreements", "insurance", "other"];
const ANIMAL_DOC_TYPES = ["medical_report", "prescription", "bill", "lab_report", "x_ray", "adoption_agreement", "other"];

export default function OrgDocumentsPage() {
  const { user } = useAuth();
  const [orgDocs, setOrgDocs] = useState<any[]>([]);
  const [animalDocs, setAnimalDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DocTab>("organization");
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [showAnimalForm, setShowAnimalForm] = useState(false);

  const [orgForm, setOrgForm] = useState({ documentType: "registration_certificate", url: "", expiryDate: "" });
  const [animalForm, setAnimalForm] = useState({ animalId: "", documentType: "medical_report", url: "", notes: "" });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [orgDocsData, animalDocsData] = await Promise.all([
          api.listOrgDocuments(),
          api.listOrgAnimalDocuments(),
        ]);
        if (!cancelled) {
          setOrgDocs(orgDocsData);
          setAnimalDocs(animalDocsData);
        }
      } catch (err) {
        console.error("Failed to load documents", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createOrgDocument({
        documentType: orgForm.documentType,
        url: orgForm.url,
        expiryDate: orgForm.expiryDate || undefined,
      });
      setOrgDocs((prev) => [created, ...prev]);
      setShowOrgForm(false);
      setOrgForm({ documentType: "registration_certificate", url: "", expiryDate: "" });
    } catch (err: any) {
      alert(err?.message || "Failed to add document");
    }
  };

  const handleAnimalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createOrgAnimalDocument({
        animalId: animalForm.animalId,
        documentType: animalForm.documentType,
        url: animalForm.url,
        notes: animalForm.notes || undefined,
      });
      setAnimalDocs((prev) => [created, ...prev]);
      setShowAnimalForm(false);
      setAnimalForm({ animalId: "", documentType: "medical_report", url: "", notes: "" });
    } catch (err: any) {
      alert(err?.message || "Failed to add document");
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Documents</h1>
        <p className="text-sm text-on-surface-variant">Manage organization and animal documents</p>
      </div>

      <div className="flex gap-2 border-b border-outline-variant">
        <button onClick={() => setTab("organization")} className={`px-4 py-2 text-sm font-bold border-b-2 ${tab === "organization" ? "border-primary text-primary" : "border-transparent text-on-surface-variant"}`}>Organization</button>
        <button onClick={() => setTab("animals")} className={`px-4 py-2 text-sm font-bold border-b-2 ${tab === "animals" ? "border-primary text-primary" : "border-transparent text-on-surface-variant"}`}>Animals</button>
      </div>

      {tab === "organization" ? (
        <>
          <div className="flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md text-on-surface">Organization Documents</h2>
            <Button variant="primary" onClick={() => setShowOrgForm(true)}><Plus className="w-4 h-4 mr-2" />Add Document</Button>
          </div>
          {orgDocs.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FileText} title="No documents" description="Add registration certificates, 80G, FCRA, and other org documents." /></Card>
          ) : (
            <div className="space-y-3">
              {orgDocs.map((doc) => (
                <Card key={doc.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-on-surface capitalize">{doc.documentType.replace("_", " ")}</p>
                        <Badge variant={doc.verified ? "success" : "warning"}>{doc.verified ? "Verified" : "Unverified"}</Badge>
                      </div>
                      <a href={doc.url} target="_blank" rel="noopener" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                        <ExternalLink className="w-3 h-3" /> View Document
                      </a>
                      {doc.expiryDate && <p className="text-xs text-on-surface-variant mt-1">Expires: {new Date(doc.expiryDate).toLocaleDateString()}</p>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md text-on-surface">Animal Documents</h2>
            <Button variant="primary" onClick={() => setShowAnimalForm(true)}><Plus className="w-4 h-4 mr-2" />Add Document</Button>
          </div>
          {animalDocs.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FileText} title="No documents" description="Add medical reports, prescriptions, and other animal documents." /></Card>
          ) : (
            <div className="space-y-3">
              {animalDocs.map((doc) => (
                <Card key={doc.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-on-surface capitalize">{doc.documentType.replace("_", " ")}</p>
                      <p className="text-xs text-on-surface-variant">Animal: {doc.animalId}</p>
                      {doc.notes && <p className="text-xs text-on-surface-variant mt-1">{doc.notes}</p>}
                      <a href={doc.url} target="_blank" rel="noopener" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                        <ExternalLink className="w-3 h-3" /> View Document
                      </a>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Modal open={showOrgForm} onClose={() => setShowOrgForm(false)} title="Add Organization Document">
        <form onSubmit={handleOrgSubmit} className="space-y-4">
          <div>
            <Label>Document Type</Label>
            <Select value={orgForm.documentType} onChange={(e) => setOrgForm({ ...orgForm, documentType: e.target.value })}>
              {ORG_DOC_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
            </Select>
          </div>
          <div>
            <Label>Document URL</Label>
            <Input value={orgForm.url} onChange={(e) => setOrgForm({ ...orgForm, url: e.target.value })} placeholder="https://..." required />
          </div>
          <div>
            <Label>Expiry Date (optional)</Label>
            <Input type="date" value={orgForm.expiryDate} onChange={(e) => setOrgForm({ ...orgForm, expiryDate: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowOrgForm(false)}>Cancel</Button>
            <Button type="submit">Add</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showAnimalForm} onClose={() => setShowAnimalForm(false)} title="Add Animal Document">
        <form onSubmit={handleAnimalSubmit} className="space-y-4">
          <div>
            <Label>Animal ID</Label>
            <Input value={animalForm.animalId} onChange={(e) => setAnimalForm({ ...animalForm, animalId: e.target.value })} required />
          </div>
          <div>
            <Label>Document Type</Label>
            <Select value={animalForm.documentType} onChange={(e) => setAnimalForm({ ...animalForm, documentType: e.target.value })}>
              {ANIMAL_DOC_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
            </Select>
          </div>
          <div>
            <Label>Document URL</Label>
            <Input value={animalForm.url} onChange={(e) => setAnimalForm({ ...animalForm, url: e.target.value })} placeholder="https://..." required />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Input value={animalForm.notes} onChange={(e) => setAnimalForm({ ...animalForm, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowAnimalForm(false)}>Cancel</Button>
            <Button type="submit">Add</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}