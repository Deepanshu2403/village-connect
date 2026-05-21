import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, PackageCheck, ShieldCheck, UsersRound } from "lucide-react";

const features = [
  {
    icon: UsersRound,
    title: "Shared rural rides",
    text: "Drivers post routes between villages and towns, passengers book open seats in seconds.",
  },
  {
    icon: PackageCheck,
    title: "Goods delivery",
    text: "Send parcels with trusted drivers already travelling along the same route.",
  },
  {
    icon: ShieldCheck,
    title: "Community-first",
    text: "Role-based accounts, notifications, chat, and ratings keep every trip accountable.",
  },
];

export default function Landing() {
  const navigate = useNavigate();

  const handleRoleSelect = (role, mode = "login") => {
    navigate("/login", { state: { role, mode } });
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div>
          <Link to="/" className="mb-10 inline-flex items-center gap-3 font-extrabold text-gray-900">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-500 text-white">
              VC
            </span>
            Village Connect
          </Link>

          <p className="mb-4 inline-flex rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-700">
            Rural rides and goods movement in one app
          </p>
          <h1 className="max-w-3xl text-5xl font-extrabold leading-tight text-gray-950 sm:text-6xl lg:text-7xl">
            Travel together. Deliver smarter. Stay connected.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            Village Connect helps rural communities coordinate seats, parcels, driver routes,
            messages, and trip updates through one simple platform.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => handleRoleSelect("driver")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
            >
              Driver Login <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect("passenger")}
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 font-semibold text-gray-800 transition hover:border-orange-400"
            >
              Passenger Login
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect("driver", "signup")}
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 font-semibold text-gray-800 transition hover:border-orange-400"
            >
              Join as Driver
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect("passenger", "signup")}
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 font-semibold text-gray-800 transition hover:border-orange-400"
            >
              Join as Passenger
            </button>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-2xl bg-white p-5 shadow-md">
                <Icon className="h-7 w-7 text-orange-500" />
                <h2 className="mt-4 font-bold text-gray-950">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">{text}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="relative min-h-[520px] overflow-hidden rounded-3xl bg-gray-900 shadow-2xl">
          <img
            src="https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80"
            alt="Rural road through farms"
            className="absolute inset-0 h-full w-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="rounded-2xl bg-white p-5 shadow-md">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-500">Today, 6:30 PM</p>
                  <h3 className="mt-1 text-xl font-extrabold text-gray-950">
                    Rampur to Sitapur
                  </h3>
                </div>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                  3 seats
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="font-bold text-gray-900">Driver</p>
                  <p className="text-gray-500">Ravi Kumar</p>
                </div>
                <div className="rounded-xl bg-orange-50 p-3">
                  <p className="font-bold text-gray-900">Goods</p>
                  <p className="text-orange-700">Up to 25 kg</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
