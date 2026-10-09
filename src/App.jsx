import { useState, useMemo } from "react";
import {
  LayoutDashboard, Users, SlidersHorizontal, BarChart3, Plus, Pencil, Trash2,
  Trophy, X, AlertTriangle, CheckCircle2, Play, Scale, MapPin, BadgeCheck,
} from "lucide-react";

const CRITERIA = [
  { key: "price", label: "Price", hint: "How competitive the pricing is (10 = cheapest)" },
  { key: "quality", label: "Quality", hint: "Product quality and defect rate" },
  { key: "delivery", label: "Delivery", hint: "Lead time and on-time shipping" },
  { key: "reliability", label: "Reliability", hint: "Consistency and contract follow-through" },
];

const SEED = [
  { id: "S-001", name: "Meridian Components", location: "Chennai, India", certifications: ["ISO 9001", "ISO 14001"], price: 6, quality: 9, delivery: 8, reliability: 9 },
  { id: "S-002", name: "Kaito Precision Works", location: "Osaka, Japan", certifications: ["ISO 9001", "IATF 16949"], price: 4, quality: 10, delivery: 7, reliability: 9 },
  { id: "S-003", name: "Lone Star Metals", location: "Houston, USA", certifications: ["ISO 9001"], price: 8, quality: 6, delivery: 6, reliability: 7 },
  { id: "S-004", name: "Rhein Industrietechnik", location: "Stuttgart, Germany", certifications: ["ISO 9001", "ISO 45001"], price: 5, quality: 9, delivery: 9, reliability: 8 },
  { id: "S-005", name: "Pearl Delta Trading", location: "Shenzhen, China", certifications: ["ISO 14001"], price: 9, quality: 5, delivery: 8, reliability: 5 },
];

const DEFAULT_CRITERIA = {
  price: { enabled: true, weight: 25, cutoff: 0 },
  quality: { enabled: true, weight: 35, cutoff: 7 },
  delivery: { enabled: true, weight: 20, cutoff: 0 },
  reliability: { enabled: true, weight: 20, cutoff: 0 },
};

const label = (k) => CRITERIA.find((c) => c.key === k).label;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));

/* ---------- Scoring ---------- */
// Ratings are 1-10 (higher is better). Score = sum(rating * weight%) * 10  -> 0-100.
function evaluate(suppliers, criteria) {
  const active = CRITERIA.filter((c) => criteria[c.key].enabled).map((c) => c.key);
  const rows = suppliers.map((s) => {
    const failed = active.filter((k) => s[k] < criteria[k].cutoff);
    const score = active.reduce((sum, k) => sum + s[k] * criteria[k].weight, 0) / 10;
    return { ...s, score: Math.round(score * 10) / 10, failed, qualified: failed.length === 0 };
  });
  const ranked = rows.filter((r) => r.qualified).sort((a, b) => b.score - a.score);
  const disqualified = rows.filter((r) => !r.qualified);
  return { active, ranked, disqualified };
}

function buildInsights(result, criteria) {
  const { ranked, active } = result;
  if (!ranked.length) return { justification: "", tradeoffs: [] };
  const w = ranked[0];
  const r = ranked[1];
  const strengths = [...active]
    .sort((a, b) => w[b] * criteria[b].weight - w[a] * criteria[a].weight)
    .slice(0, 2)
    .map((k) => `${label(k).toLowerCase()} (${w[k]}/10 at ${criteria[k].weight}% weight)`);
  let justification = `${w.name} scores ${w.score}/100, driven mainly by ${strengths.join(" and ")}.`;
  if (r) justification += ` It leads ${r.name} by ${(w.score - r.score).toFixed(1)} points.`;
  else justification += " It is the only supplier that meets every minimum cutoff.";

  const tradeoffs = [];
  if (r) {
    active.forEach((k) => {
      const d = r[k] - w[k];
      if (d > 0) tradeoffs.push({ type: "give", text: `${r.name} rates ${d} higher on ${label(k).toLowerCase()} (${r[k]} vs ${w[k]}). Choosing ${w.name} means accepting weaker ${label(k).toLowerCase()}.` });
      else if (d < 0) tradeoffs.push({ type: "gain", text: `${w.name} rates ${-d} higher on ${label(k).toLowerCase()} (${w[k]} vs ${r[k]}).` });
    });
  }
  const weakest = [...active].sort((a, b) => w[a] - w[b])[0];
  if (w[weakest] <= 6) tradeoffs.push({ type: "give", text: `${w.name}'s weakest area is ${label(weakest).toLowerCase()} at ${w[weakest]}/10. Plan mitigation in the contract.` });
  if (active.includes("price") && active.includes("delivery")) {
    const cheapest = [...ranked].sort((a, b) => b.price - a.price)[0];
    const fastest = [...ranked].sort((a, b) => b.delivery - a.delivery)[0];
    if (cheapest.id !== fastest.id) tradeoffs.push({ type: "info", text: `Price vs. delivery: ${cheapest.name} is the most price-competitive (${cheapest.price}/10), while ${fastest.name} delivers best (${fastest.delivery}/10). No qualified supplier leads both.` });
  }
  return { justification, tradeoffs };
}

/* ---------- Small UI parts ---------- */
const Card = ({ children, className = "" }) => (
  <div className={`bg-white border border-slate-200 rounded-lg ${className}`}>{children}</div>
);

const Rating = ({ value }) => {
  const tone = value >= 8 ? "bg-emerald-100 text-emerald-800" : value >= 6 ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-800";
  return <span className={`inline-block min-w-8 text-center px-2 py-0.5 rounded text-sm font-semibold ${tone}`}>{value}</span>;
};

/* ---------- Supplier modal ---------- */
function SupplierModal({ initial, onSave, onClose }) {
  const [f, setF] = useState(
    initial ? { ...initial, certifications: initial.certifications.join(", ") }
      : { name: "", location: "", certifications: "", price: 5, quality: 5, delivery: 5, reliability: 5 }
  );
  const [err, setErr] = useState("");
  const submit = () => {
    if (!f.name.trim() || !f.location.trim()) return setErr("Enter a supplier name and a location.");
    onSave({
      ...f,
      name: f.name.trim(),
      location: f.location.trim(),
      certifications: f.certifications.split(",").map((c) => c.trim()).filter(Boolean),
    });
  };
  const input = "w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-600";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 bg-opacity-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-full overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">{initial ? `Edit ${initial.id}` : "Add supplier"}</h2>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">Supplier name
            <input className={`${input} mt-1`} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </label>
          <label className="block text-sm font-medium text-slate-700">Location
            <input className={`${input} mt-1`} placeholder="City, Country" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
          </label>
          <label className="block text-sm font-medium text-slate-700">Certifications (comma separated)
            <input className={`${input} mt-1`} placeholder="ISO 9001, ISO 14001" value={f.certifications} onChange={(e) => setF({ ...f, certifications: e.target.value })} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            {CRITERIA.map((c) => (
              <label key={c.key} className="block text-sm font-medium text-slate-700">
                <span className="flex justify-between">{c.label}<span className="text-sky-700 font-semibold">{f[c.key]}/10</span></span>
                <input type="range" min="1" max="10" value={f[c.key]} onChange={(e) => setF({ ...f, [c.key]: Number(e.target.value) })} className="w-full mt-1" />
              </label>
            ))}
          </div>
          {err && <p className="text-sm text-red-700 flex items-center gap-1"><AlertTriangle size={14} />{err}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md border border-slate-300 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} className="px-4 py-2 text-sm rounded-md bg-sky-700 text-white hover:bg-sky-800">{initial ? "Save changes" : "Add supplier"}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Views ---------- */
function Dashboard({ suppliers, history, onStart, onOpenResult }) {
  const stats = [
    { label: "Registered suppliers", value: suppliers.length, icon: Users },
    { label: "Completed evaluations", value: history.length, icon: CheckCircle2 },
    { label: "Certified suppliers", value: suppliers.filter((s) => s.certifications.length).length, icon: BadgeCheck },
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-600">Where your supplier evaluations stand.</p>
        </div>
        <button onClick={onStart} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-sky-700 text-white text-sm font-medium hover:bg-sky-800">
          <Play size={16} /> Start new evaluation
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-md bg-slate-100 text-sky-800"><s.icon size={22} /></div>
            <div>
              <div className="text-3xl font-semibold text-slate-900">{s.value}</div>
              <div className="text-sm text-slate-600">{s.label}</div>
            </div>
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <h2 className="font-semibold text-slate-900 mb-3">Recent selections</h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-600">No evaluations yet. Start one to see your selected suppliers here.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.slice(0, 5).map((h) => (
              <li key={h.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Trophy size={18} className="text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">{h.winner}</div>
                    <div className="text-xs text-slate-500">{h.date} · {h.compared} compared · {h.criteria}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-emerald-700">{h.score}/100</span>
                  <button onClick={() => onOpenResult(h)} className="text-sm text-sky-700 hover:underline">View</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Suppliers({ suppliers, onAdd, onEdit, onDelete }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Suppliers</h1>
          <p className="text-sm text-slate-600">Ratings run from 1 to 10. Higher is better, including price.</p>
        </div>
        <button onClick={onAdd} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-sky-700 text-white text-sm font-medium hover:bg-sky-800">
          <Plus size={16} /> Add supplier
        </button>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-max">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Supplier</th>
              {CRITERIA.map((c) => <th key={c.key} className="px-3 py-3 font-medium text-center">{c.label}</th>)}
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Certifications</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {suppliers.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500">{s.id}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                {CRITERIA.map((c) => <td key={c.key} className="px-3 py-3 text-center"><Rating value={s[c.key]} /></td>)}
                <td className="px-4 py-3 text-slate-700"><span className="inline-flex items-center gap-1"><MapPin size={13} className="text-slate-400" />{s.location}</span></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {s.certifications.length ? s.certifications.map((c) => <span key={c} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">{c}</span>) : <span className="text-slate-400">None</span>}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <button onClick={() => onEdit(s)} aria-label={`Edit ${s.name}`} className="p-1.5 rounded hover:bg-slate-200 text-slate-600"><Pencil size={15} /></button>
                  <button onClick={() => onDelete(s)} aria-label={`Delete ${s.name}`} className="p-1.5 rounded hover:bg-red-100 text-red-600"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-600">No suppliers yet. Add one to begin.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function CriteriaView({ criteria, setCriteria, supplierCount, onRun }) {
  const activeKeys = CRITERIA.filter((c) => criteria[c.key].enabled).map((c) => c.key);
  const total = activeKeys.reduce((a, k) => a + criteria[k].weight, 0);
  const valid = activeKeys.length > 0 && total === 100;
  const canRun = valid && supplierCount > 0;
  const set = (k, patch) => setCriteria({ ...criteria, [k]: { ...criteria[k], ...patch } });
  const balance = () => {
    const n = activeKeys.length;
    if (!n) return;
    const next = { ...criteria };
    const base = Math.floor(100 / n);
    activeKeys.forEach((k, i) => { next[k] = { ...next[k], weight: base + (i === 0 ? 100 - base * n : 0) }; });
    setCriteria(next);
  };
  const diff = 100 - total;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">New selection</h1>
        <p className="text-sm text-slate-600">Choose what matters, set how much it matters, and set minimum ratings a supplier must meet.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {CRITERIA.map((c) => {
            const v = criteria[c.key];
            return (
              <Card key={c.key} className={`p-5 ${v.enabled ? "" : "opacity-60"}`}>
                <div className="flex items-start justify-between gap-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={v.enabled} onChange={(e) => set(c.key, { enabled: e.target.checked })} className="mt-1 h-4 w-4" />
                    <span>
                      <span className="block font-semibold text-slate-900">{c.label}</span>
                      <span className="block text-xs text-slate-500">{c.hint}</span>
                    </span>
                  </label>
                </div>
                {v.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
                    <div>
                      <div className="flex items-center justify-between text-sm text-slate-700 mb-1">
                        <span>Weight</span>
                        <span className="flex items-center gap-1">
                          <input type="number" min="0" max="100" value={v.weight} aria-label={`${c.label} weight`}
                            onChange={(e) => set(c.key, { weight: clamp(Math.round(Number(e.target.value)), 0, 100) })}
                            className="w-16 border border-slate-300 rounded px-2 py-1 text-right text-sm" />%
                        </span>
                      </div>
                      <input type="range" min="0" max="100" value={v.weight} onChange={(e) => set(c.key, { weight: Number(e.target.value) })} className="w-full" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm text-slate-700 mb-1">
                        <span>Minimum rating (cutoff)</span>
                        <span className="font-semibold text-sky-700">{v.cutoff === 0 ? "None" : `≥ ${v.cutoff}`}</span>
                      </div>
                      <input type="range" min="0" max="10" value={v.cutoff} onChange={(e) => set(c.key, { cutoff: Number(e.target.value) })} className="w-full" />
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
        <div>
          <Card className="p-5 lg:sticky lg:top-6">
            <h2 className="font-semibold text-slate-900 mb-3">Weight total</h2>
            <div className={`text-4xl font-semibold ${valid ? "text-emerald-700" : "text-red-700"}`}>{total}%</div>
            <div className="h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
              <div className={`h-full ${valid ? "bg-emerald-600" : total > 100 ? "bg-red-600" : "bg-amber-500"}`} style={{ width: `${Math.min(total, 100)}%` }} />
            </div>
            <p className={`text-sm mt-3 flex items-start gap-2 ${valid ? "text-emerald-700" : "text-red-700"}`} role="status">
              {valid ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
              {activeKeys.length === 0 ? "Select at least one criterion."
                : valid ? "Weights add up to exactly 100%."
                : diff > 0 ? `Add ${diff}% more. Weights must total exactly 100%.`
                : `Remove ${-diff}%. Weights must total exactly 100%.`}
            </p>
            <button onClick={balance} disabled={!activeKeys.length} className="w-full mt-4 px-4 py-2 text-sm rounded-md border border-slate-300 hover:bg-slate-50 disabled:opacity-50">Split weights evenly</button>
            <button onClick={onRun} disabled={!canRun} className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md bg-sky-700 text-white hover:bg-sky-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed">
              <Scale size={16} /> Compare suppliers
            </button>
            {supplierCount === 0 && <p className="text-xs text-slate-500 mt-2">Add suppliers before comparing.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Results({ result, criteria, onEdit }) {
  if (!result) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Results</h1>
        <Card className="p-8 text-center">
          <p className="text-slate-600 mb-4">No comparison yet. Set your criteria and compare suppliers to see rankings.</p>
          <button onClick={onEdit} className="px-4 py-2 text-sm rounded-md bg-sky-700 text-white hover:bg-sky-800">Set criteria</button>
        </Card>
      </div>
    );
  }
  const { ranked, disqualified, active } = result;
  const { justification, tradeoffs } = buildInsights(result, criteria);
  const winner = ranked[0];
  const barColors = ["bg-sky-700", "bg-teal-600", "bg-indigo-500", "bg-amber-500"];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Results</h1>
          <p className="text-sm text-slate-600">Scored on {active.map((k) => `${label(k)} ${criteria[k].weight}%`).join(", ")}.</p>
        </div>
        <button onClick={onEdit} className="px-4 py-2 text-sm rounded-md border border-slate-300 hover:bg-slate-50">Adjust criteria</button>
      </div>

      {winner ? (
        <Card className="p-6 border-emerald-300 bg-emerald-50">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-emerald-600 text-white shrink-0"><Trophy size={24} /></div>
            <div>
              <div className="text-sm text-emerald-800 font-medium">Recommended supplier</div>
              <div className="text-2xl font-semibold text-slate-900">{winner.name} <span className="text-emerald-700">· {winner.score}/100</span></div>
              <p className="text-sm text-slate-700 mt-2 max-w-2xl">{justification}</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6 border-red-300 bg-red-50 flex gap-3">
          <AlertTriangle className="text-red-700 shrink-0" />
          <p className="text-sm text-red-800">No supplier meets all minimum cutoffs. Lower a cutoff in Criteria to widen the field.</p>
        </Card>
      )}

      {ranked.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Ranking</h2>
          <ol className="space-y-3">
            {ranked.map((r, i) => (
              <li key={r.id} className="flex items-center gap-3">
                <span className="w-6 text-sm text-slate-500 text-right">{i + 1}</span>
                <span className={`w-44 text-sm truncate ${i === 0 ? "font-semibold text-slate-900" : "text-slate-700"}`}>{r.name}</span>
                <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
                  <div className={`h-full ${i === 0 ? "bg-emerald-600" : "bg-slate-400"}`} style={{ width: `${r.score}%` }} />
                </div>
                <span className="w-12 text-sm font-semibold text-right">{r.score}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {ranked.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold text-slate-900 mb-1">Criterion by criterion</h2>
          <p className="text-xs text-slate-500 mb-4">Rating out of 10 for each supplier on every active criterion.</p>
          <div className="space-y-5">
            {active.map((k) => (
              <div key={k}>
                <div className="text-sm font-medium text-slate-800 mb-2">{label(k)} <span className="text-slate-500 font-normal">· weight {criteria[k].weight}%</span></div>
                <div className="space-y-1.5">
                  {ranked.map((r, i) => (
                    <div key={r.id} className="flex items-center gap-3">
                      <span className="w-44 text-xs text-slate-600 truncate">{r.name}</span>
                      <div className="flex-1 h-3 bg-slate-100 rounded overflow-hidden">
                        <div className={`h-full ${barColors[i % barColors.length]}`} style={{ width: `${r[k] * 10}%` }} />
                      </div>
                      <span className="w-6 text-xs font-semibold text-right">{r[k]}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tradeoffs.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Trade-offs</h2>
          <ul className="space-y-2">
            {tradeoffs.map((t, i) => (
              <li key={i} className={`text-sm rounded-md px-3 py-2 border ${t.type === "give" ? "bg-amber-50 border-amber-200 text-amber-900" : t.type === "gain" ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-sky-50 border-sky-200 text-sky-900"}`}>{t.text}</li>
            ))}
          </ul>
        </Card>
      )}

      {disqualified.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Did not meet minimum cutoffs</h2>
          <ul className="divide-y divide-slate-100">
            {disqualified.map((d) => (
              <li key={d.id} className="py-2 text-sm flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-800">{d.name}</span>
                <span className="text-red-700">
                  {d.failed.map((k) => `${label(k)} ${d[k]} (needs ≥ ${criteria[k].cutoff})`).join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/* ---------- App ---------- */
export default function SupplierSelectionSystem() {
  const [view, setView] = useState("dashboard");
  const [suppliers, setSuppliers] = useState(SEED);
  const [criteria, setCriteria] = useState(DEFAULT_CRITERIA);
  const [result, setResult] = useState(null);
  const [resultCriteria, setResultCriteria] = useState(DEFAULT_CRITERIA);
  const [history, setHistory] = useState([]);
  const [modal, setModal] = useState(null); // null | { supplier?: obj }

  const nextId = useMemo(() => {
    const max = suppliers.reduce((m, s) => Math.max(m, parseInt(s.id.split("-")[1], 10) || 0), 0);
    return `S-${String(max + 1).padStart(3, "0")}`;
  }, [suppliers]);

  const saveSupplier = (data) => {
    setSuppliers((list) => data.id ? list.map((s) => (s.id === data.id ? data : s)) : [...list, { ...data, id: nextId }]);
    setModal(null);
  };
  const deleteSupplier = (s) => {
    if (window.confirm(`Delete ${s.name}? This cannot be undone.`)) setSuppliers((l) => l.filter((x) => x.id !== s.id));
  };

  const run = () => {
    const res = evaluate(suppliers, criteria);
    setResult(res);
    setResultCriteria(criteria);
    if (res.ranked[0]) {
      setHistory((h) => [{
        id: `E-${Date.now()}`,
        date: new Date().toLocaleDateString(),
        winner: res.ranked[0].name,
        score: res.ranked[0].score,
        compared: suppliers.length,
        criteria: res.active.map(label).join(", "),
        res, criteriaSnap: criteria,
      }, ...h]);
    }
    setView("results");
  };
  const openHistory = (h) => { setResult(h.res); setResultCriteria(h.criteriaSnap); setView("results"); };

  const nav = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "suppliers", label: "Suppliers", icon: Users },
    { id: "criteria", label: "New selection", icon: SlidersHorizontal },
    { id: "results", label: "Results", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col md:flex-row">
      <aside className="md:w-60 bg-slate-900 text-slate-200 md:min-h-screen shrink-0">
        <div className="px-5 py-4 md:py-6 border-b border-slate-800">
          <div className="font-semibold text-white">Supplier Select</div>
          <div className="text-xs text-slate-400">Evaluation & selection</div>
        </div>
        <nav className="flex md:flex-col p-2 gap-1 overflow-x-auto">
          {nav.map((n) => (
            <button key={n.id} onClick={() => setView(n.id)} aria-current={view === n.id ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm whitespace-nowrap ${view === n.id ? "bg-sky-700 text-white" : "hover:bg-slate-800"}`}>
              <n.icon size={17} /> {n.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-4 md:p-8 max-w-6xl w-full">
        {view === "dashboard" && <Dashboard suppliers={suppliers} history={history} onStart={() => setView("criteria")} onOpenResult={openHistory} />}
        {view === "suppliers" && <Suppliers suppliers={suppliers} onAdd={() => setModal({})} onEdit={(s) => setModal({ supplier: s })} onDelete={deleteSupplier} />}
        {view === "criteria" && <CriteriaView criteria={criteria} setCriteria={setCriteria} supplierCount={suppliers.length} onRun={run} />}
        {view === "results" && <Results result={result} criteria={resultCriteria} onEdit={() => setView("criteria")} />}
      </main>

      {modal && <SupplierModal initial={modal.supplier} onSave={saveSupplier} onClose={() => setModal(null)} />}
    </div>
  );
}
