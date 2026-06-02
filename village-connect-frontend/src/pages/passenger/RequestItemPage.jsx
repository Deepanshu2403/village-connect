import { useState } from "react";
import {
  FileText,
  Loader2,
  Package,
  Pill,
  Shirt,
  ShoppingBag,
  Smartphone,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createItemRequest } from "../../api/itemApi";
import BackButton from "../../components/common/BackButton";
import LocationSearch from "../../components/location/LocationSearch";
import { useToast } from "../../context/ToastContext";
import { formatQuantity } from "../../utils/formatQuantity";

const CATEGORIES = [
  { value: "medicine", label: "Medicine", desc: "Prescription drugs, OTC medicines", icon: Pill },
  { value: "grocery", label: "Grocery", desc: "Rice, flour, vegetables, dal", icon: ShoppingBag },
  { value: "electronics", label: "Electronics", desc: "Mobile parts, batteries, cables", icon: Smartphone },
  { value: "documents", label: "Documents", desc: "Forms, certificates, papers", icon: FileText },
  { value: "clothing", label: "Clothing", desc: "Clothes, footwear, fabric", icon: Shirt },
  { value: "other", label: "Other", desc: "Anything else", icon: Package },
];

export default function RequestItemPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    itemName: "",
    quantity: 1,
    quantityUnit: "items",
    description: "",
    category: "other",
    budget: "",
  });
  const [pickupLocation, setPickupLocation] = useState({ name: "", lat: null, lng: null });
  const [deliveryLocation, setDeliveryLocation] = useState({ name: "", lat: null, lng: null });

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.itemName.trim()) {
      setError("Item name is required");
      return;
    }
    if (!pickupLocation.name.trim()) {
      setError("Pickup location is required");
      return;
    }
    if (!deliveryLocation.name.trim()) {
      setError("Delivery location is required");
      return;
    }

    setLoading(true);
    try {
      await createItemRequest({
        ...form,
        quantity: Number(form.quantity),
        budget: form.budget ? Number(form.budget) : null,
        from: pickupLocation.name,
        to: deliveryLocation.name,
        fromLat: pickupLocation.lat,
        fromLng: pickupLocation.lng,
        toLat: deliveryLocation.lat,
        toLng: deliveryLocation.lng,
      });
      addToast("Item request sent. Nearby drivers will see it.", "success");
      navigate("/passenger");
    } catch (err) {
      const message = err.response?.data?.error || "Failed to submit request";
      setError(message);
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-root min-h-screen bg-gray-50 px-4 pb-10 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-5">
          <BackButton label="Back to Dashboard" to="/passenger" />
          <h1 className="mt-2 text-xl font-extrabold text-gray-900">
            Request Item from Town
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Ask a driver going to town to bring items back for you.
          </p>
        </div>

        <section className="mb-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-orange-700">
            How it works
          </p>
          <div className="space-y-1.5">
            {[
              "Describe the item you need from town",
              "Nearby drivers see your request",
              "A driver going that route accepts and brings it",
              "Pay the driver when the item is delivered",
            ].map((step, index) => (
              <div key={step} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                  {index + 1}
                </span>
                <p className="text-xs text-orange-800">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-bold text-gray-700">
              Item Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const active = form.category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, category: cat.value }))}
                    className={`flex items-center gap-2 rounded-xl border-2 p-3 text-left transition-all ${
                      active
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 bg-white hover:border-orange-200"
                    }`}
                  >
                    <Icon className={`h-5 w-5 flex-shrink-0 ${active ? "text-orange-600" : "text-gray-500"}`} />
                    <div className="min-w-0">
                      <p className={`text-xs font-bold ${active ? "text-orange-700" : "text-gray-800"}`}>
                        {cat.label}
                      </p>
                      <p className="line-clamp-2 text-xs leading-tight text-gray-400">{cat.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="Item Name *">
            <input
              type="text"
              name="itemName"
              value={form.itemName}
              onChange={handleChange}
              placeholder="e.g. Paracetamol 500mg, Basmati rice 5kg"
              className={inputClass}
              required
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Quantity & Unit">
              <div className="flex gap-2">
                <input
                  type="number"
                  name="quantity"
                  min="1"
                  max="100"
                  value={form.quantity}
                  onChange={handleChange}
                  className={`${inputClass} w-24 flex-none`}
                />
                <select
                  name="quantityUnit"
                  value={form.quantityUnit}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="items">Items</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="g">Grams (g)</option>
                  <option value="packets">Packets</option>
                  <option value="litres">Litres</option>
                </select>
              </div>
              {Number(form.quantity) > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  Will show as: <strong>{formatQuantity(form.quantity, form.quantityUnit)}</strong>
                </p>
              )}
            </Field>
            <Field label="Budget (Rs)">
              <input
                type="number"
                name="budget"
                min="0"
                value={form.budget}
                onChange={handleChange}
                placeholder="Optional"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Description / Special Instructions">
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Brand preference, dosage, size, color, etc."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </Field>

          <LocationSearch
            label="Pickup From (Town / Market)"
            placeholder="e.g. Main Market, Bathinda"
            value={pickupLocation}
            onChange={setPickupLocation}
            onCoordinatesChange={(coords) =>
              setPickupLocation((current) => ({ ...current, ...coords }))
            }
            showCurrentLocation={false}
          />

          <LocationSearch
            label="Deliver To (Your Location)"
            placeholder="e.g. Your location or address"
            value={deliveryLocation}
            onChange={setDeliveryLocation}
            onCoordinatesChange={(coords) =>
              setDeliveryLocation((current) => ({ ...current, ...coords }))
            }
            showCurrentLocation
          />

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-4 text-base font-extrabold text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Package className="h-5 w-5" />}
            {loading ? "Submitting..." : "Send Request to Drivers"}
          </button>
        </form>
      </div>
    </main>
  );
}

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-bold text-gray-700">{label}</span>
    {children}
  </label>
);

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";
