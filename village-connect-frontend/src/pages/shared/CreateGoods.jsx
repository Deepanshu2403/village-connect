import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createGoodsRequest } from "../../api/goodsApi";
import { useToast } from "../../context/ToastContext";

const initialForm = { item: "", from: "", to: "", weightKg: "", note: "" };
const inputClass = "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400";

export default function CreateGoods() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError("");

    if (!form.item.trim() || !form.from.trim() || !form.to.trim() || !form.weightKg) {
      setError("Item, from, to, and weight are required.");
      return;
    }
    if (Number(form.weightKg) < 1) {
      setError("Weight must be at least 1 kg.");
      return;
    }

    setLoading(true);
    try {
      await createGoodsRequest({ ...form, weightKg: Number(form.weightKg) });
      addToast("Goods request created successfully", "success");
      navigate("/passenger");
    } catch (err) {
      const message = err.response?.data?.error || "Could not create goods request.";
      setError(message);
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-10 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="font-semibold text-orange-600">Goods delivery</p>
          <h1 className="mt-2 text-3xl font-extrabold text-gray-950">Request parcel delivery</h1>
          <p className="mt-2 text-gray-500">Drivers carrying goods can match with this request.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 rounded-2xl bg-white p-6 shadow-md" noValidate>
          {error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600">{error}</div>}
          <Field label="Item description">
            <input value={form.item} onChange={(e) => update("item", e.target.value)} className={inputClass} placeholder="Seeds, documents, medicine..." />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="From">
              <input value={form.from} onChange={(e) => update("from", e.target.value)} className={inputClass} placeholder="Pickup village" />
            </Field>
            <Field label="To">
              <input value={form.to} onChange={(e) => update("to", e.target.value)} className={inputClass} placeholder="Delivery village" />
            </Field>
            <Field label="Weight (kg)">
              <input type="number" min="1" value={form.weightKg} onChange={(e) => update("weightKg", e.target.value)} className={inputClass} />
            </Field>
          </div>
          <Field label="Note">
            <textarea value={form.note} onChange={(e) => update("note", e.target.value)} className={`${inputClass} min-h-32`} placeholder="Pickup details, fragile item, contact instructions..." />
          </Field>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
          >
            {loading ? "Creating request..." : "Create Goods Request"}
          </button>
        </form>
      </div>
    </main>
  );
}

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-bold text-gray-700">{label}</span>
    {children}
  </label>
);
