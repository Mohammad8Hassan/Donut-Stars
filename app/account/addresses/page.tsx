"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/app/api/authFetch";

// `is_default` may arrive as boolean/number/string from DB JSON.
// We normalize it before any UI or payload logic.
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

// Shared empty state used for both Add and Edit form resets.
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

// Convert raw address model into strict form model (especially `is_default`).
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

// Build consistent API payload for Add/Edit operations.
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

  // Reused after create/update/delete so screen always reflects DB state.
  const loadAddresses = async () => {
    // Avoid stale cached responses when default flag changes.
    const res = await authFetch("/api/addresses", { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to load addresses");
    }

    const data = await res.json();
    // Main bug fix:
    // MySQL TINYINT often comes through as 0/1 (sometimes string), not boolean.
    // Without this normalization, default checkbox and badge can desync.
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

    if (
      !form.full_name.trim() ||
      !form.phone.trim() ||
      !form.line1.trim() ||
      !form.city.trim() ||
      !form.country.trim()
    ) {
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
      <div className="mx-auto max-w-3xl py-10 px-4 flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Addresses</h1>

        <div className="bg-white border shadow-sm rounded-xl p-6">
          <p className="text-gray-600 mb-4 text-sm">
            Manage your saved addresses.
          </p>

          {loading && <p className="text-sm text-gray-500">Loading...</p>}
          {!loading && listError && <p className="text-sm text-red-600 mb-4">{listError}</p>}

          {!loading && addresses.length === 0 && (
            <p className="text-sm text-gray-500">
              You have no saved addresses.
            </p>
          )}

          <div className="flex flex-col gap-4">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="border rounded-lg p-4 flex justify-between items-start"
              >
                {editingId === addr.id ? (
                  <form onSubmit={onEditAddress} className="w-full flex flex-col gap-3">
                    {editError && <p className="text-sm text-red-600">{editError}</p>}

                    <input
                      className="border rounded-lg px-3 py-2 text-sm"
                      placeholder="Label (optional)"
                      value={editingForm.label}
                      onChange={(e) => setEditingForm((prev) => ({ ...prev, label: e.target.value }))}
                    />
                    <input
                      className="border rounded-lg px-3 py-2 text-sm"
                      placeholder="Full Name *"
                      value={editingForm.full_name}
                      onChange={(e) => setEditingForm((prev) => ({ ...prev, full_name: e.target.value }))}
                    />
                    <input
                      className="border rounded-lg px-3 py-2 text-sm"
                      placeholder="Phone *"
                      value={editingForm.phone}
                      onChange={(e) => setEditingForm((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                    <input
                      className="border rounded-lg px-3 py-2 text-sm"
                      placeholder="Address Line *"
                      value={editingForm.line1}
                      onChange={(e) => setEditingForm((prev) => ({ ...prev, line1: e.target.value }))}
                    />
                    <input
                      className="border rounded-lg px-3 py-2 text-sm"
                      placeholder="City *"
                      value={editingForm.city}
                      onChange={(e) => setEditingForm((prev) => ({ ...prev, city: e.target.value }))}
                    />
                    <input
                      className="border rounded-lg px-3 py-2 text-sm"
                      placeholder="Postal Code (optional)"
                      value={editingForm.postal_code}
                      onChange={(e) => setEditingForm((prev) => ({ ...prev, postal_code: e.target.value }))}
                    />
                    <input
                      className="border rounded-lg px-3 py-2 text-sm"
                      placeholder="Country *"
                      value={editingForm.country}
                      onChange={(e) => setEditingForm((prev) => ({ ...prev, country: e.target.value }))}
                    />

                    <label className="text-sm flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingForm.is_default}
                        onChange={(e) => setEditingForm((prev) => ({ ...prev, is_default: e.target.checked }))}
                      />
                      Set as default address
                    </label>

                    <div className="flex gap-2 text-sm">
                      <button
                        type="submit"
                        disabled={savingEdit}
                        className="text-blue-600 hover:underline disabled:opacity-70"
                      >
                        {savingEdit ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        disabled={savingEdit}
                        className="text-gray-700 hover:underline disabled:opacity-70"
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
                  <>
                    <div>
                      <p className="font-medium">
                        {addr.label ?? "Address"}
                        {addr.is_default && (
                          <span className="ml-2 text-xs text-pink-600 font-semibold">
                            DEFAULT
                          </span>
                        )}
                      </p>

                      <p className="text-sm">{addr.full_name}</p>
                      <p className="text-sm">{addr.phone}</p>
                      <p className="text-sm">
                        {addr.line1}, {addr.city}
                      </p>
                      {addr.postal_code && (
                        <p className="text-sm">{addr.postal_code}</p>
                      )}
                      <p className="text-sm">{addr.country}</p>
                    </div>

                    <div className="flex gap-2 text-sm">
                      <button
                        className="text-blue-600 hover:underline"
                        onClick={() => startEditing(addr)}
                        disabled={deletingId === addr.id}
                      >
                        Edit
                      </button>
                      <button
                        className="text-red-600 hover:underline disabled:opacity-70"
                        onClick={() => onDeleteAddress(addr.id)}
                        disabled={deletingId === addr.id}
                      >
                        {deletingId === addr.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-6 bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600"
            >
              Add New Address
            </button>
          )}

          {showAddForm && (
            <form onSubmit={onAddAddress} className="mt-6 border rounded-lg p-4 flex flex-col gap-3">
              <p className="text-sm font-medium">New Address</p>

              {addError && <p className="text-sm text-red-600">{addError}</p>}

              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Label (optional)"
                value={form.label}
                onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
              />
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Full Name *"
                value={form.full_name}
                onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
              />
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Phone *"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Address Line *"
                value={form.line1}
                onChange={(e) => setForm((prev) => ({ ...prev, line1: e.target.value }))}
              />
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="City *"
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              />
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Postal Code (optional)"
                value={form.postal_code}
                onChange={(e) => setForm((prev) => ({ ...prev, postal_code: e.target.value }))}
              />
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Country *"
                value={form.country}
                onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
              />

              <label className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_default: e.target.checked }))}
                />
                Set as default address
              </label>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={savingAdd}
                  className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 disabled:opacity-70"
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
                  className="border px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-70"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
  );
}
