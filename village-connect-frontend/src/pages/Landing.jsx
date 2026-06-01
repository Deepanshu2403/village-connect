import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  CarFront,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  PackageCheck,
  Route,
  ShieldCheck,
  Star,
  UsersRound,
} from "lucide-react";

const platformHighlights = [
  {
    icon: Route,
    title: "Live village routes",
    text: "Drivers publish trips with seats, timing, vehicle type, and goods capacity in one clear flow.",
  },
  {
    icon: UsersRound,
    title: "Passenger requests",
    text: "Passengers can find a matching trip, request a seat, and track ride status without phone calls.",
  },
  {
    icon: PackageCheck,
    title: "Goods on the same route",
    text: "Parcels and town-item requests connect with drivers already travelling nearby.",
  },
  {
    icon: MessageCircle,
    title: "Built-in coordination",
    text: "Chat, notifications, ratings, and trip updates keep both sides informed before and during travel.",
  },
];

const trustSignals = [
  "Role-based driver and passenger dashboards",
  "OTP-backed account creation",
  "Trip notifications and request status updates",
  "Ratings, chat, and contact details for accountability",
];

const benefits = [
  {
    label: "For passengers",
    title: "Find dependable travel between villages and towns.",
    text: "Search open trips, request seats, chat with drivers, and follow ride progress from one place.",
    icon: UsersRound,
  },
  {
    label: "For drivers",
    title: "Fill seats and carry useful deliveries on planned routes.",
    text: "Post travel, review requests, manage pickups, and keep your day organized from the dashboard.",
    icon: CarFront,
  },
  {
    label: "For families and shops",
    title: "Move goods without arranging a separate vehicle.",
    text: "Send parcels or request items from town through trusted route matches already in motion.",
    icon: PackageCheck,
  },
];

const activityItems = [
  { label: "Seat request", value: "Ramesh +2", tone: "orange" },
  { label: "Goods pickup", value: "25 kg grain bag", tone: "blue" },
  { label: "Trip update", value: "Pickup confirmed", tone: "green" },
];

export default function Landing() {
  const navigate = useNavigate();

  const handleRoleSelect = (role, mode = "login") => {
    navigate("/login", { state: { role, mode } });
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f8f3] text-gray-950">
      <section className="relative border-b border-orange-100 bg-[linear-gradient(180deg,#fff7ed_0%,#f7f8f3_72%)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-300 to-transparent" />
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-4">
            <Link to="/" className="group inline-flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-sm font-extrabold text-white shadow-lg shadow-orange-200 transition-transform group-hover:-translate-y-0.5">
                VC
              </span>
              <span>
                <span className="block text-base font-extrabold tracking-tight text-gray-950">
                  Village Connect
                </span>
                <span className="block text-xs font-semibold text-gray-500">
                  Rural mobility platform
                </span>
              </span>
            </Link>
            <div className="hidden items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3 py-2 text-xs font-bold text-green-700 shadow-sm backdrop-blur sm:flex">
              <ShieldCheck className="h-4 w-4" />
              Community-first transport
            </div>
          </header>

          <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1.02fr_0.98fr] lg:py-12">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-orange-700 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Rides, parcels, and town errands in one app
              </div>

              <h1 className="mt-5 text-[2.65rem] font-black leading-[0.98] tracking-tight text-gray-950 sm:text-6xl lg:text-7xl">
                Rural travel made clear, trusted, and coordinated.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
                VillageConnect helps drivers, passengers, and families coordinate shared rides,
                goods delivery, chat, notifications, and trip updates with a simple village-first workflow.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
                <button
                  type="button"
                  onClick={() => handleRoleSelect("passenger")}
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-orange-200 transition-all hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-orange-200"
                >
                  Passenger Login
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSelect("driver")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-extrabold text-gray-900 shadow-sm transition-all hover:-translate-y-0.5 hover:border-green-300 hover:bg-green-50 focus:outline-none focus:ring-4 focus:ring-green-100"
                >
                  <CarFront className="h-4 w-4 text-green-600" />
                  Driver Login
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSelect("passenger", "signup")}
                  className="inline-flex items-center justify-center rounded-2xl border border-orange-200 bg-white/80 px-5 py-3 text-sm font-bold text-orange-700 transition-all hover:-translate-y-0.5 hover:bg-orange-50 focus:outline-none focus:ring-4 focus:ring-orange-100"
                >
                  Join as Passenger
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSelect("driver", "signup")}
                  className="inline-flex items-center justify-center rounded-2xl border border-green-200 bg-white/80 px-5 py-3 text-sm font-bold text-green-700 transition-all hover:-translate-y-0.5 hover:bg-green-50 focus:outline-none focus:ring-4 focus:ring-green-100"
                >
                  Join as Driver
                </button>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <TrustMetric value="Rides" label="seat requests and trip status" />
                <TrustMetric value="Goods" label="parcel and town-item delivery" />
                <TrustMetric value="OTP" label="verified onboarding flow" />
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
              <div className="relative rounded-[2rem] border border-white bg-white/86 p-3 shadow-2xl shadow-green-900/10 backdrop-blur">
                <div className="rounded-[1.45rem] border border-gray-100 bg-gray-950 p-4 text-white shadow-inner">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-orange-300">
                        Active route
                      </p>
                      <h2 className="mt-1 text-xl font-black">Rampur to Sitapur</h2>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-400/15 px-3 py-1 text-xs font-bold text-green-200">
                      <span className="h-2 w-2 rounded-full bg-green-400" />
                      Open
                    </span>
                  </div>

                  <div className="mt-5 rounded-2xl bg-white p-4 text-gray-950">
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                      <RoutePoint iconTone="green" title="Rampur Chauraha" subtitle="Pickup village stop" />
                      <div className="hidden h-px bg-gradient-to-r from-green-300 via-orange-300 to-red-300 sm:block" />
                      <RoutePoint iconTone="orange" title="Sitapur Market" subtitle="Town drop point" />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <InfoTile icon={Clock3} label="Today" value="6:30 PM" />
                      <InfoTile icon={UsersRound} label="Seats" value="3 left" />
                      <InfoTile icon={PackageCheck} label="Goods" value="25 kg" />
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-black">
                          RK
                        </span>
                        <div>
                          <p className="font-extrabold">Ravi Kumar</p>
                          <p className="mt-0.5 text-xs text-gray-300">Driver • Bolero</p>
                        </div>
                      </div>
                      <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-amber-300/15 px-3 py-1 text-xs font-bold text-amber-200">
                        <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                        4.8 trusted rating
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-4 text-gray-950">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-extrabold">Live activity</p>
                        <Bell className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="space-y-2">
                        {activityItems.map((item) => (
                          <ActivityRow key={item.label} {...item} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-extrabold uppercase tracking-wide text-orange-600">
            What VillageConnect handles
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
            One clean workflow for the trips people already need to make.
          </h2>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {platformHighlights.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-100/70"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-orange-600 transition-colors group-hover:bg-orange-500 group-hover:text-white">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-base font-black text-gray-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-green-900 via-green-800 to-gray-950 p-6 text-white shadow-xl shadow-green-900/10 sm:p-8">
            <p className="text-xs font-extrabold uppercase tracking-wide text-orange-300">
              Trust indicators
            </p>
            <h2 className="mt-3 max-w-xl text-3xl font-black tracking-tight sm:text-4xl">
              Designed for accountability in close-knit communities.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-green-50/80">
              The product keeps core details visible: who is travelling, where they are going,
              what is being carried, and which action is pending next.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {trustSignals.map((signal) => (
              <div
                key={signal}
                className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-[#f7f8f3] p-4 transition-all hover:border-green-200 hover:bg-green-50"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                <p className="text-sm font-bold leading-6 text-gray-800">{signal}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {benefits.map(({ icon: Icon, label, title, text }) => (
            <article
              key={label}
              className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-green-200 hover:shadow-xl hover:shadow-green-100/60"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-green-50 text-green-700">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="text-xs font-extrabold uppercase tracking-wide text-green-700">{label}</p>
              </div>
              <h3 className="mt-5 text-xl font-black leading-tight text-gray-950">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-amber-500 to-green-600 p-1 shadow-2xl shadow-orange-200">
          <div className="grid gap-6 rounded-[1.35rem] bg-gray-950 p-6 text-white sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-orange-300">
                Start with the role you need today
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Book a seat, post a route, or move goods through the same trusted network.
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
              <button
                type="button"
                onClick={() => handleRoleSelect("passenger", "signup")}
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-gray-950 transition-all hover:-translate-y-0.5 hover:bg-orange-50"
              >
                Create Passenger Account
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect("driver", "signup")}
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 hover:bg-white/15"
              >
                Create Driver Account
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function TrustMetric({ value, label }) {
  return (
    <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm backdrop-blur">
      <p className="text-2xl font-black text-gray-950">{value}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-gray-500">{label}</p>
    </div>
  );
}

function RoutePoint({ iconTone, title, subtitle }) {
  const toneClass = iconTone === "green" ? "text-green-600 bg-green-50" : "text-orange-600 bg-orange-50";

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-2xl ${toneClass}`}>
        <MapPin className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-gray-950">{title}</p>
        <p className="truncate text-xs font-medium text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-3">
      <Icon className="h-4 w-4 text-orange-500" />
      <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-black text-gray-950">{value}</p>
    </div>
  );
}

function ActivityRow({ label, value, tone }) {
  const tones = {
    orange: "bg-orange-100 text-orange-700",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
        <p className="truncate text-xs font-black text-gray-900">{value}</p>
      </div>
      <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${tones[tone]}`} />
    </div>
  );
}
