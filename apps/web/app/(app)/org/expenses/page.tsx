"use client";

import React, { useEffect, useState } from "react";
import { Plus, DollarSign, Receipt, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Expense } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateSafe } from "@/lib/utils";

type ExpenseForm = {
  amount: string;
  caseId: string;
  animalId: string;
  currency: string;
  category: Expense["category"];
  vendor: string;
  description: string;
  receiptUrl: string;
  reimbursable: boolean;
};

const EMPTY_FORM: ExpenseForm = {
  amount: "",
  caseId: "",
  animalId: "",
  currency: "INR",
  category: "other",
  vendor: "",
  description: "",
  receiptUrl: "",
  reimbursable: false,
};

const CATEGORIES: { value: Expense["category"]; label: string }[] = [
  { value: "veterinary", label: "Veterinary" },
  { value: "medicine", label: "Medicine" },
  { value: "food", label: "Food" },
  { value: "transport", label: "Transport" },
  { value: "shelter", label: "Shelter" },
  { value: "utilities", label: "Utilities" },
  { value: "supplies", label: "Supplies" },
  { value: "abc", label: "ABC" },
  { value: "adoption", label: "Adoption" },
  { value: "other", label: "Other" },
];

export default function OrgExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.listOrgExpenses(filterCategory ? { category: filterCategory } : undefined);
        if (!cancelled) setExpenses(data);
      } catch (err) {
        console.error("Failed to load expenses", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [filterCategory]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setForm({
      amount: String(expense.amount),
      caseId: expense.caseId || "",
      animalId: expense.animalId || "",
      currency: expense.currency,
      category: expense.category,
      vendor: expense.vendor || "",
      description: expense.description || "",
      receiptUrl: expense.receiptUrl || "",
      reimbursable: expense.reimbursable,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const amount = parseFloat(form.amount);
      if (!amount || amount <= 0) throw new Error("Valid amount is required");

      const payload: Record<string, unknown> = {
        amount,
        currency: form.currency,
        category: form.category,
        vendor: form.vendor || undefined,
        description: form.description || undefined,
        receiptUrl: form.receiptUrl || undefined,
        reimbursable: form.reimbursable,
      };

      if (form.caseId) payload.caseId = form.caseId;
      if (form.animalId) payload.animalId = form.animalId;

      if (editing) {
        const updated = await api.updateOrgExpense(editing.id, payload);
        setExpenses((prev) => prev.map((e) => (e.id === editing.id ? updated : e)));
      } else {
        const created = await api.createOrgExpense(payload);
        setExpenses((prev) => [created, ...prev]);
      }
      setShowForm(false);
    } catch (err: any) {
      alert(err?.message || "Failed to save expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense record?")) return;
    try {
      await api.deleteOrgExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      alert(err?.message || "Failed to delete expense");
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

  if (loading) return <PageSpinner />;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Expenses</h1>
          <p className="text-sm text-on-surface-variant">Track spending and maintain a simple ledger</p>
        </div>
        <Button variant="primary" onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Expense</Button>
      </div>

      <Card className="p-4">
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <Button key={cat.value} variant={filterCategory === cat.value ? "primary" : "outline"} size="sm" onClick={() => setFilterCategory(filterCategory === cat.value ? "" : cat.value)}>
              {cat.label}
            </Button>
          ))}
        </div>
      </Card>

      {expenses.length === 0 ? (
        <Card className="p-8">
          <EmptyState icon={Receipt} title="No expenses recorded" description="Start tracking your organization's expenses." />
        </Card>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => (
            <Card key={expense.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-on-surface text-lg">{formatCurrency(expense.amount)}</span>
                    <Badge variant={expense.approved ? "success" : "warning"}>{expense.category}</Badge>
                    {expense.reimbursable && <Badge variant="neutral">Reimbursable</Badge>}
                  </div>
                  {expense.description && <p className="text-sm text-on-surface-variant mt-1">{expense.description}</p>}
                  {expense.vendor && <p className="text-xs text-on-surface-variant">Vendor: {expense.vendor}</p>}
                  <div className="flex gap-2 mt-2">
                    {expense.receiptUrl && (
                      <a href={expense.receiptUrl} target="_blank" rel="noopener" className="text-xs text-primary hover:underline flex items-center gap-1">
                        <Receipt className="w-3 h-3" /> Receipt
                      </a>
                    )}
                     <span className="text-xs text-on-surface-variant">{formatDateSafe(expense.createdAt, "Unknown")}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => openEdit(expense)}>Edit</Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(expense.id)}>Delete</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? "Edit Expense" : "Add Expense"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Amount (INR)</Label>
            <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseForm["category"] })}>
                {CATEGORIES.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
              </Select>
            </div>
            <div>
              <Label>Vendor</Label>
              <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Receipt URL</Label>
            <Input value={form.receiptUrl} onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })} placeholder="https://..." />
          </div>
          <div className="flex items-center gap-2">
            <input id="reimbursable" type="checkbox" checked={form.reimbursable} onChange={(e) => setForm({ ...form, reimbursable: e.target.checked })} className="w-4 h-4 rounded border-outline text-primary focus:ring-primary" />
            <Label htmlFor="reimbursable" className="mb-0">Reimbursable</Label>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : editing ? "Update" : "Add"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}