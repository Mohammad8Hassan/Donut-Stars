"use client";

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { authFetch } from "@/app/api/authFetch";
import { AccountCard, AccountInput, AccountSectionHeading } from "@/app/components/account/AccountUi";

export interface Address {
  id: number;
  label: string | null;
  full_name: string;
  phone: string;
  line1: string;
  city: string;
  postal_code: string | null;
  country: string;
  is_default: boolean | number | string;
}

type AddressFormState = {
  label: string;
  full_name: string;
  phone: string;
  line1: string;
  city: string;
  postal_code: string;
  country: string;
  is_default: boolean;
};

const emptyForm = (): AddressFormState => ({
  label: "",
  full_name: "",
  phone: "",
  line1: "",
  city: "",
  postal_code: "",
  country: "",
  is_default: false,
});

const toFormState = (addr: Address): AddressFormState => ({
  label: addr.label ?? "",
  full_name: addr.full_name,
  phone: addr.phone,
  line1: addr.line1,
  city: addr.city,
  postal_code: addr.postal_code ?? "",
  country: addr.country,
  is_default: addr.is_default === true || addr.is_default === 1 || addr.is_default === "1",
});

const buildPayload = (form: AddressFormState) => ({
  label: form.label.trim() || null,
  full_name: form.full_name.trim(),
  phone: form.phone.trim(),
  line1: form.line1.trim(),
  city: form.city.trim(),
  postal_code: form.postal_code.trim() || null,
  country: form.country.trim(),
  is_default: form.is_default,
});

function AddressFormFields({
  form,
  setForm,
}: {
  form: AddressFormState;
  setForm: Dispatch<SetStateAction<AddressFormState>>;
}) {
  return (
    <div className="grid gap-4">
      <AccountInput
        label="Label"
        placeholder="Home, Office, Gift..."
        value={form.label}
        onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <AccountInput
          label="Full Name"
          placeholder="Full name"
          value={form.full_name}
          onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
        />
        <AccountInput
          label="Phone"
          placeholder="Phone number"
          value={form.phone}
          onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
        />
      </div>
      <AccountInput
        label="Address Line"
        placeholder="Street, building, unit..."
        value={form.line1}
        onChange={(e) => setForm((prev) => ({ ...prev, line1: e.target.value }))}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <AccountInput
          label="City"
          placeholder="City"
          value={form.city}
          onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
        />
        <AccountInput
          label="Postal Code"
          placeholder="Postal code"
          value={form.postal_code}
          onChange={(e) => setForm((prev) => ({ ...prev, postal_code: e.target.value }))}
        />
        <AccountInput
          label="Country"
          placeholder="Country"
          value={form.country}
          onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
        />
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700">
        <input
          type="checkbox"
          checked={form.is_default}
          onChange={(e) => setForm((prev) => ({ ...prev, is_default: e.target.checked }))}
          className="h-4 w-4 rounded border-zinc-300 text-rose-500 focus:ring-rose-300"
        />
        Set as default address
      </label>
    </div>
  );
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [savingAdd, setSavingAdd] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormState>(emptyForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<AddressFormState>(emptyForm());
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const loadAddresses = async () => {
    const res = await authFetch("/api/addresses", { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to load addresses");
    }

    const data = await res.json();
    const normalized = (data.addresses ?? []).map((addr: Address) => ({
      ...addr,
      is_default: addr.is_default === true || addr.is_default === 1 || addr.is_default === "1",
    }));
    setAddresses(normalized);
  };

  useEffect(() => {
    async function load() {
      try {
        await loadAddresses();
      } catch {
        setListError("Failed to load addresses.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const onAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!form.full_name.trim() || !form.phone.trim() || !form.line1.trim() || !form.city.trim() || !form.country.trim()) {
      setAddError("Please fill all required fields.");
      return;
    }

    setSavingAdd(true);

    try {
      const res = await authFetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(form)),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setAddError(data?.error ?? "Failed to add address.");
        return;
      }

      await loadAddresses();
      setShowAddForm(false);
      setForm(emptyForm());
    } catch {
      setAddError("Failed to add address.");
    } finally {
      setSavingAdd(false);
    }
  };

  const startEditing = (address: Address) => {
    setEditError(null);
    setEditingId(address.id);
    setEditingForm(toFormState(address));
  };

  const onEditAddress = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId === null) return;

    setEditError(null);

    if (
      !editingForm.full_name.trim() ||
      !editingForm.phone.trim() ||
      !editingForm.line1.trim() ||
      !editingForm.city.trim() ||
      !editingForm.country.trim()
    ) {
      setEditError("Please fill all required fields.");
      return;
    }

    setSavingEdit(true);

    try {
      const res = await authFetch(`/api/addresses/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(editingForm)),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setEditError(data?.error ?? "Failed to update address.");
        return;
      }

      await loadAddresses();
      setEditingId(null);
      setEditingForm(emptyForm());
    } catch {
      setEditError("Failed to update address.");
    } finally {
      setSavingEdit(false);
    }
  };

  const onDeleteAddress = async (addressId: number) => {
    const confirmed = window.confirm("Delete this address?");
    if (!confirmed) return;

    setListError(null);
    setDeletingId(addressId);

    try {
      const res = await authFetch(`/api/addresses/${addressId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setListError(data?.error ?? "Failed to delete address.");
        return;
      }

      if (editingId === addressId) {
        setEditingId(null);
        setEditingForm(emptyForm());
      }

      await loadAddresses();
    } catch {
      setListError("Failed to delete address.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <AccountCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <AccountSectionHeading
            title="Manage delivery destinations"
            description="Your default address can be reused at checkout, while any saved address stays ready for quick selection."
          />

          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-500"
            >
              Add New Address
            </button>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {loading ? <p className="text-sm text-zinc-500">Loading...</p> : null}
          {!loading && listError ? <p className="text-sm text-rose-600">{listError}</p> : null}

          {!loading && addresses.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-500">
              You have no saved addresses yet.
            </div>
          ) : null}

          {addresses.map((addr) => (
            <div key={addr.id} className="rounded-[28px] border border-zinc-200 bg-gradient-to-br from-white to-rose-50 p-5">
              {editingId === addr.id ? (
                <form onSubmit={onEditAddress} className="grid gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-lg font-black tracking-tight text-zinc-950">Edit address</p>
                    {editError ? <p className="text-sm text-rose-600">{editError}</p> : null}
                  </div>

                  <AddressFormFields form={editingForm} setForm={setEditingForm} />

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-70"
                    >
                      {savingEdit ? "Saving..." : "Save Address"}
                    </button>
                    <button
                      type="button"
                      disabled={savingEdit}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-white disabled:opacity-70"
                      onClick={() => {
                        setEditingId(null);
                        setEditingForm(emptyForm());
                        setEditError(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xl font-black tracking-tight text-zinc-950">{addr.label ?? "Address"}</p>
                      {addr.is_default ? (
                        <span className="rounded-full border border-rose-200 bg-rose-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-600">
                          Default
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 space-y-1 text-sm leading-6 text-zinc-600">
                      <p className="font-semibold text-zinc-900">{addr.full_name}</p>
                      <p>{addr.phone}</p>
                      <p>{addr.line1}</p>
                      <p>
                        {addr.city}
                        {addr.postal_code ? `, ${addr.postal_code}` : ""}
                      </p>
                      <p>{addr.country}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-800 transition hover:border-rose-200 hover:bg-white"
                      onClick={() => startEditing(addr)}
                      disabled={deletingId === addr.id}
                    >
                      Edit
                    </button>
                    <button
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-rose-200 px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-70"
                      onClick={() => onDeleteAddress(addr.id)}
                      disabled={deletingId === addr.id}
                    >
                      {deletingId === addr.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </AccountCard>

      {showAddForm ? (
        <AccountCard>
          <AccountSectionHeading
            title="Add another destination"
            description="Save an address once and keep it available for future orders."
          />

          <form onSubmit={onAddAddress} className="mt-6 grid gap-4">
            {addError ? <p className="text-sm text-rose-600">{addError}</p> : null}

            <AddressFormFields form={form} setForm={setForm} />

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={savingAdd}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-rose-500 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-400 disabled:opacity-70"
              >
                {savingAdd ? "Saving..." : "Save Address"}
              </button>
              <button
                type="button"
                disabled={savingAdd}
                onClick={() => {
                  setShowAddForm(false);
                  setAddError(null);
                }}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-zinc-200 px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-70"
              >
                Cancel
              </button>
            </div>
          </form>
        </AccountCard>
      ) : null}
    </div>
  );
}
