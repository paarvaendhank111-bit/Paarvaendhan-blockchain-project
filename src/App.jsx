import { useState, useMemo } from "react";
import {
  LayoutDashboard, Users, SlidersHorizontal, BarChart3, Plus, Pencil, Trash2,
  Trophy, X, AlertTriangle, CheckCircle2, Play, Scale, MapPin, BadgeCheck, Sparkles, ArrowUpRight, ShieldCheck
} from "lucide-react";

const CRITERIA = [
  { key: "price", label: "Price Competitiveness", hint: "Pricing valuation & cost efficiency (10 = most competitive)" },
  { key: "quality", label: "Quality Standards", hint: "Defect rate, build quality, and durability" },
  { key: "delivery", label: "Delivery Lead Time", hint: "On-time shipping performance and speed" },
  { key: "reliability", label: "Operational Reliability", hint: "Contract compliance and vendor stability" },
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
  let justification = `${w.name} achieved an elite composite score of ${w.score}/100, powered by outstanding performance in ${strengths.join(" and ")}.`;
  if (r) justification += ` It outperforms the runner-up (${r.name}) by a margin of ${(w.score - r.score).toFixed(1)} points.`;
  else justification += " It stands as the exclusive candidate clearing all strict operational thresholds.";

  const tradeoffs = [];
  if (r) {
    active.forEach((k) => {
      const d = r[k] - w[k];
      if (d > 0) tradeoffs.push({ type: "give", text: `${r.name} has a higher rating on ${label(k).toLowerCase()} (${r[k]} vs ${w[k]}). Choosing ${w.name} requires accepting a slight compromise in this dimension.` });
      else if (d < 0) tradeoffs.push({ type: "gain", text: `${w.name} dominates on ${label(k).toLowerCase()}, outperforming ${r.name} by ${-d} points.` });
    });
  }
  const weakest = [...active].sort((a, b) => w[a] - w[b])[0];
  if (w[weakest] <= 6) tradeoffs.push({ type: "give", text: `Note: ${w.name}'s lowest metric is ${label(weakest).toLowerCase()} (${w[weakest]}/10). Ensure SLA safeguards are written into the final contract.` });
  if (active.includes("price") && active.includes("delivery")) {
    const cheapest = [...ranked].sort((a, b) => b.price - a.price)[0];
    const fastest = [...ranked].sort((a, b) => b.delivery - a.delivery)[0];
    if (cheapest.id !== fastest.id) tradeoffs.push({ type: "info", text: `Strategic Trade-off: ${cheapest.name} offers the most aggressive pricing (${cheapest.price}/10), whereas ${fastest.name} leads in delivery velocity (${fastest.delivery}/10).` });
  }
  return { justification, tradeoffs };
}

/* ---------- UI Components ---------- */
const Card = ({ children, className = "" }) => (
  <div className={`premium-card bg-white/95 backdrop-blur-xl border border-slate-100/90 shadow-lg shadow-slate-200/40 rounded-2xl transition-all duration-300 ${className}`}>{children}</div>
);

const Rating = ({ value }) => {
  const tone = value >= 8 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : value >= 6 ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200";
  return <span className={`inline-block min-w-9 text-center px-2.5 py-1 rounded-lg text-xs font-bold border shadow-xs ${tone}`}>{value}</span>;
};

/* ---------- Supplier Modal ---------- */
function SupplierModal({ initial, onSave, onClose }) {
  const [f, setF] = useState(
    initial ? { ...initial, certifications: initial.certifications.join(", ") }
      : { name: "", location: "", certifications: "", price: 5, quality: 5, delivery: 5, reliability: 5 }
  );
  const [err, setErr] = useState("");
  const submit = () => {
    if (!f.name.trim() || !f.location.trim()) return setErr("Please enter both a supplier name and location.");
    onSave({
      ...f,
      name: f.name.trim(),
      location: f.location.trim(),
      certifications: f.certifications.split(",").map((c) => c.trim()).filter(Boolean),
    });
  };
  const input = "w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in" role="dialog" aria-modal="true">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-8 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{initial ? `Edit ${initial.id}` : "Register New Supplier"}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Input baseline supplier capabilities and compliance ratings</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>
        <div className="space-y-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Supplier Name
            <input className={`${input} mt-1.5`} placeholder="e.g. Apex Global Solutions" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Location
            <input className={`${input} mt-1.5`} placeholder="City, Country" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Certifications (Comma separated)
            <input className={`${input} mt-1.5`} placeholder="ISO 9001, IATF 16949" value={f.certifications} onChange={(e) => setF({ ...f, certifications: e.target.value })} />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {CRITERIA.map((c) => (
              <div key={c.key} className="bg-slate-50/60 p-3.5 rounded-2xl border border-slate-100">
                <label className="block text-xs font-bold text-slate-700">
                  <span className="flex justify-between items-center mb-1.5">
                    <span>{c.label}</span>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-xs font-extrabold">{f[c.key]}/10</span>
                  </span>
                  <input type="range" min="1" max="10" value={f[c.key]} onChange={(e) => setF({ ...f, [c.key]: Number(e.target.value) })} className="w-full accent-indigo-600 cursor-pointer mt-1" />
                </label>
              </div>
            ))}
          </div>
          {err && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2"><AlertTriangle size={15} className="shrink-0" />{err}</div>}
        </div>
        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={submit} className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all">
            {initial ? "Save Changes" : "Register Supplier"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Views ---------- */
function Dashboard({ suppliers, history, onStart, onOpenResult }) {
  const stats = [
    { label: "Active Suppliers", value: suppliers.length, icon: Users, gradient: "from-blue-500 to-indigo-600", light: "bg-blue-50 text-blue-600" },
    { label: "Evaluations Completed", value: history.length, icon: CheckCircle2, gradient: "from-emerald-500 to-teal-600", light: "bg-emerald-50 text-emerald-600" },
    { label: "Certified Vendors", value: suppliers.filter((s) => s.certifications.length).length, icon: BadgeCheck, gradient: "from-violet-500 to-purple-600", light: "bg-violet-50 text-violet-600" },
  ];
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-xs font-semibold mb-3">
            <Sparkles size={13} /> Enterprise Procurement Engine
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Smart Supplier Selection</h1>
          <p className="text-slate-300 text-sm mt-2 leading-relaxed">Evaluate, rank, and make data-driven vendor decisions with advanced weighted multi-criteria decision matrices.</p>
        </div>
        <button onClick={onStart} className="relative z-10 inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-bold shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all">
          <Play size={16} fill="currentColor" /> Start New Evaluation
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {stats.map((s) => (
          <Card key={s.label} className="p-6 flex items-center gap-5 group hover:-translate-y-1 transition-all">
            <div className={`p-4 rounded-2xl ${s.light} group-hover:scale-110 transition-transform`}><s.icon size={26} /></div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{s.value}</div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-7">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recent Selection Decisions</h2>
            <p className="text-xs text-slate-500">Audit trail of past evaluations and winning vendors</p>
          </div>
        </div>
        {history.length === 0 ? (
          <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <Trophy size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-700">No evaluations recorded yet</p>
            <p className="text-xs text-slate-400 mt-1">Run your first evaluation from the criteria tab to populate audit logs.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {history.slice(0, 5).map((h) => (
              <div key={h.id} className="py-4 flex items-center justify-between gap-4 hover:bg-slate-50/80 px-4 rounded-2xl transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 shrink-0"><Trophy size={18} /></div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-sm truncate flex items-center gap-2">
                      {h.winner}
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-extrabold rounded-md border border-emerald-200">{h.score}/100</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{h.date} · {h.compared} suppliers evaluated · {h.criteria}</div>
                  </div>
                </div>
                <button onClick={() => onOpenResult(h)} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition-colors">
                  View Report <ArrowUpRight size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Suppliers({ suppliers, onAdd, onEdit, onDelete }) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Supplier Directory</h1>
          <p className="text-sm text-slate-500">Comprehensive database of active vendors and performance ratings (1-10 scale).</p>
        </div>
        <button onClick={onAdd} className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all">
          <Plus size={16} /> Register Supplier
        </button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-max">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">ID</th>
                <th className="px-6 py-4 text-left">Supplier Name</th>
                {CRITERIA.map((c) => <th key={c.key} className="px-4 py-4 text-center">{c.label.split(" ")[0]}</th>)}
                <th className="px-6 py-4 text-left">Location</th>
                <th className="px-6 py-4 text-left">Certifications</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="px-6 py-4 text-xs font-bold text-slate-400">{s.id}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{s.name}</td>
                  {CRITERIA.map((c) => <td key={c.key} className="px-4 py-4 text-center"><Rating value={s[c.key]} /></td>)}
                  <td className="px-6 py-4 text-slate-600 text-xs font-medium"><span className="inline-flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" />{s.location}</span></td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {s.certifications.length ? s.certifications.map((cert) => <span key={cert} className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">{cert}</span>) : <span className="text-slate-400 text-xs italic">None</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button onClick={() => onEdit(s)} aria-label={`Edit ${s.name}`} className="p-2 rounded-xl hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 transition-colors mr-1"><Pencil size={15} /></button>
                    <button onClick={() => onDelete(s)} aria-label={`Delete ${s.name}`} className="p-2 rounded-xl hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-400 font-medium">No suppliers registered. Add one to begin evaluation.</td></tr>
              )}
            </tbody>
          </table>
        </div>
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
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Configure Evaluation Criteria</h1>
        <p className="text-sm text-slate-500">Define weighted importance metrics and mandatory quality threshold cutoffs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-5">
          {CRITERIA.map((c) => {
            const v = criteria[c.key];
            return (
              <Card key={c.key} className={`p-6 transition-opacity ${v.enabled ? "opacity-100" : "opacity-50 bg-slate-50/50"}`}>
                <div className="flex items-start justify-between gap-4">
                  <label className="flex items-start gap-3.5 cursor-pointer select-none">
                    <input type="checkbox" checked={v.enabled} onChange={(e) => set(c.key, { enabled: e.target.checked })} className="mt-1 h-5 w-5 rounded-md accent-indigo-600" />
                    <div>
                      <span className="block font-bold text-slate-900 text-base">{c.label}</span>
                      <span className="block text-xs text-slate-400 mt-0.5">{c.hint}</span>
                    </div>
                  </label>
                </div>
                {v.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6 pt-5 border-t border-slate-100">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        <span>Weight Importance</span>
                        <span className="text-indigo-600 font-extrabold">{v.weight}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={v.weight} onChange={(e) => set(c.key, { weight: Number(e.target.value) })} className="w-full accent-indigo-600 cursor-pointer" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        <span>Minimum Cutoff</span>
                        <span className="text-indigo-600 font-extrabold">{v.cutoff === 0 ? "None Required" : `≥ ${v.cutoff} / 10`}</span>
                      </div>
                      <input type="range" min="0" max="10" value={v.cutoff} onChange={(e) => set(c.key, { cutoff: Number(e.target.value) })} className="w-full accent-indigo-600 cursor-pointer" />
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <div>
          <Card className="p-6 lg:sticky lg:top-6 space-y-6">
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Weight Distribution</h2>
              <div className={`text-4xl font-black tracking-tight ${valid ? "text-emerald-600" : "text-rose-600"}`}>{total}%</div>
              <div className="h-2.5 bg-slate-100 rounded-full mt-3 overflow-hidden shadow-inner">
                <div className={`h-full transition-all duration-300 ${valid ? "bg-emerald-500" : total > 100 ? "bg-rose-500" : "bg-amber-500"}`} style={{ width: `${Math.min(total, 100)}%` }} />
              </div>
            </div>

            <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-start gap-3 ${valid ? "bg-emerald-50/80 border-emerald-200 text-emerald-800" : "bg-rose-50/80 border-rose-200 text-rose-800"}`} role="status">
              {valid ? <CheckCircle2 size={18} className="shrink-0 text-emerald-600 mt-0.5" /> : <AlertTriangle size={18} className="shrink-0 text-rose-600 mt-0.5" />}
              <div>
                {activeKeys.length === 0 ? "Please enable at least one criterion."
                  : valid ? "Weight allocation is perfectly balanced at 100%."
                  : diff > 0 ? `Underweight by ${diff}%. Adjust weights to total 100%.`
                  : `Overweight by ${-diff}%. Reduce weights to total 100%.`}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button onClick={balance} disabled={!activeKeys.length} className="w-full px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50">
                Auto-Split Weights Evenly
              </button>
              <button onClick={onRun} disabled={!canRun} className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-98 transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed">
                <Scale size={18} /> Run Comparative Analysis
              </button>
            </div>
            {supplierCount === 0 && <p className="text-xs text-slate-400 text-center">Note: Register suppliers before running comparison.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Results({ result, criteria, onEdit }) {
  if (!result) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Evaluation Results</h1>
          <p className="text-sm text-slate-500">Comparative ranking and multi-criteria analytical insights.</p>
        </div>
        <Card className="p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl mx-auto flex items-center justify-center">
            <BarChart3 size={32} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No active comparison generated</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Configure your criteria weights and run an evaluation to review rankings.</p>
          </div>
          <button onClick={onEdit} className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 hover:scale-105 transition-all">
            Configure Criteria
          </button>
        </Card>
      </div>
    );
  }

  const { ranked, disqualified, active } = result;
  const { justification, tradeoffs } = buildInsights(result, criteria);
  const winner = ranked[0];
  const barColors = ["bg-indigo-600", "bg-violet-600", "bg-blue-600", "bg-teal-600", "bg-amber-500"];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Evaluation Results</h1>
          <p className="text-sm text-slate-500">Scored across {active.map((k) => `${label(k)} (${criteria[k].weight}%)`).join(", ")}.</p>
        </div>
        <button onClick={onEdit} className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs">
          Adjust Criteria
        </button>
      </div>

      {winner ? (
        <Card className="p-8 border-emerald-200 bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/40 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start gap-6 relative z-10">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/30 shrink-0">
              <Trophy size={32} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold uppercase tracking-wider mb-2">
                <ShieldCheck size={14} /> Recommended Winning Supplier
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                {winner.name} 
                <span className="px-3 py-1 bg-emerald-600 text-white text-lg font-black rounded-xl shadow-sm">{winner.score} <span className="text-xs font-normal opacity-80">/ 100</span></span>
              </h2>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed max-w-3xl">{justification}</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6 border-rose-200 bg-rose-50/60 flex items-center gap-4 text-rose-900">
          <AlertTriangle size={24} className="shrink-0 text-rose-600" />
          <div className="text-sm font-semibold">No suppliers cleared all strict minimum cutoffs. Consider easing rating cutoffs in the criteria configuration.</div>
        </Card>
      )}

      {ranked.length > 0 && (
        <Card className="p-7">
          <h2 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-600" /> Final Supplier Ranking & Composite Scores
          </h2>
          <div className="space-y-4">
            {ranked.map((r, i) => (
              <div key={r.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 ${i === 0 ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30" : "bg-slate-100 text-slate-600"}`}>{i + 1}</span>
                <span className={`w-48 text-sm truncate ${i === 0 ? "font-extrabold text-slate-900" : "font-semibold text-slate-700"}`}>{r.name}</span>
                <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div className={`h-full transition-all duration-500 rounded-full ${i === 0 ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-slate-400"}`} style={{ width: `${r.score}%` }} />
                </div>
                <span className="w-16 text-right text-sm font-black text-slate-900">{r.score} pts</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {ranked.length > 0 && (
        <Card className="p-7">
          <h2 className="text-base font-bold text-slate-900 mb-2">Granular Criterion Performance</h2>
          <p className="text-xs text-slate-400 mb-6">Normalized 1-10 scores across active evaluation metrics</p>
          <div className="space-y-6">
            {active.map((k) => (
              <div key={k} className="space-y-2.5">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex justify-between">
                  <span>{label(k)}</span>
                  <span className="text-indigo-600">Weight: {criteria[k].weight}%</span>
                </div>
                <div className="space-y-2 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                  {ranked.map((r, idx) => (
                    <div key={r.id} className="flex items-center gap-4">
                      <span className="w-44 text-xs font-semibold text-slate-700 truncate">{r.name}</span>
                      <div className="flex-1 h-3 bg-slate-200/60 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColors[idx % barColors.length]}`} style={{ width: `${r[k] * 10}%` }} />
                      </div>
                      <span className="w-8 text-xs font-bold text-right text-slate-900">{r[k]} / 10</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tradeoffs.length > 0 && (
        <Card className="p-7">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Scale size={18} className="text-indigo-600" /> Analytical Trade-off Insights
          </h2>
          <div className="space-y-3">
            {tradeoffs.map((t, i) => (
              <div key={i} className={`p-4 rounded-2xl text-sm border font-medium flex items-start gap-3 ${t.type === "give" ? "bg-amber-50/80 border-amber-200 text-amber-900" : t.type === "gain" ? "bg-emerald-50/80 border-emerald-200 text-emerald-900" : "bg-indigo-50/80 border-indigo-200 text-indigo-900"}`}>
                <div className="mt-0.5 shrink-0 font-extrabold">•</div>
                <div>{t.text}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {disqualified.length > 0 && (
        <Card className="p-7">
          <h2 className="text-base font-bold text-slate-900 mb-4">Disqualified Vendors (Failed Cutoffs)</h2>
          <div className="divide-y divide-slate-100">
            {disqualified.map((d) => (
              <div key={d.id} className="py-3 text-sm flex flex-wrap items-center justify-between gap-3">
                <span className="font-bold text-slate-800">{d.name}</span>
                <span className="px-3 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  {d.failed.map((k) => `${label(k)}: scored ${d[k]} (Required ≥ ${criteria[k].cutoff})`).join(" · ")}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------- App Shell ---------- */
export default function SupplierSelectionSystem() {
  const [view, setView] = useState("dashboard");
  const [suppliers, setSuppliers] = useState(SEED);
  const [criteria, setCriteria] = useState(DEFAULT_CRITERIA);
  const [result, setResult] = useState(null);
  const [resultCriteria, setResultCriteria] = useState(DEFAULT_CRITERIA);
  const [history, setHistory] = useState([]);
  const [modal, setModal] = useState(null);

  const nextId = useMemo(() => {
    const max = suppliers.reduce((m, s) => Math.max(m, parseInt(s.id.split("-")[1], 10) || 0), 0);
    return `S-${String(max + 1).padStart(3, "0")}`;
  }, [suppliers]);

  const saveSupplier = (data) => {
    setSuppliers((list) => data.id ? list.map((s) => (s.id === data.id ? data : s)) : [...list, { ...data, id: nextId }]);
    setModal(null);
  };
  const deleteSupplier = (s) => {
    if (window.confirm(`Are you sure you want to delete ${s.name}? This action cannot be undone.`)) {
      setSuppliers((l) => l.filter((x) => x.id !== s.id));
    }
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
    { id: "criteria", label: "New Selection", icon: SlidersHorizontal },
    { id: "results", label: "Results", icon: BarChart3 },
  ];

  return (
    <div className="premium-app min-h-screen text-slate-800 flex flex-col md:flex-row font-sans selection:bg-indigo-500 selection:text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');
        .premium-app { font-family: 'DM Sans', sans-serif; background: #f5f7fb; }
        .premium-app h1,.premium-app h2,.premium-app h3 { font-family: 'Manrope','DM Sans',sans-serif; }
        .premium-sidebar { background: #101426; background-image: radial-gradient(circle at 0% 0%, rgba(99,102,241,.18), transparent 34%); }
        .premium-card { border-radius: 20px; box-shadow: 0 5px 24px rgba(22,34,68,.045); }
        .premium-card:hover { box-shadow: 0 12px 34px rgba(22,34,68,.075); }
        .premium-nav { position: relative; }
        .premium-nav[aria-current="page"]::before { content:''; position:absolute; left:-1rem; top:25%; height:50%; width:3px; border-radius:9px; background:#a5b4fc; }
        .premium-main { background-image: radial-gradient(ellipse at 95% 0%, rgba(99,102,241,.07), transparent 28%); }
        .premium-topbar { background: rgba(255,255,255,.86); backdrop-filter: blur(16px); border: 1px solid rgba(226,232,240,.8); }
        .premium-kicker { letter-spacing:.16em; }
        .premium-app button { transition: transform .18s ease, box-shadow .18s ease, background-color .18s ease, color .18s ease; }
        .premium-app button:focus-visible, .premium-app input:focus-visible { outline: 3px solid rgba(99,102,241,.35); outline-offset: 2px; }
        .premium-app input[type=range] { accent-color:#6366f1; }
        .premium-app table thead { background:#f8f9fd; }
        .premium-app tbody tr { transition: background .18s ease; }
        .premium-app ::selection { background:rgba(99,102,241,.2); color:#171b35; }
        @media(max-width:767px) { .premium-sidebar { min-height:auto; } .premium-main { padding:1rem!important; } .premium-brand { padding:1.1rem 1.25rem!important; } }
      `}</style>
      <aside className="premium-sidebar md:w-72 text-slate-300 md:min-h-screen shrink-0 flex flex-col justify-between border-r border-slate-800/80 shadow-2xl">
        <div>
          <div className="premium-brand px-6 py-8 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-400 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-900/50 ring-1 ring-white/15">
                <Scale size={21} strokeWidth={2.4} />
              </div>
              <div>
                <div className="font-extrabold text-white text-[17px] tracking-tight">Supplier<span className="text-indigo-300">Select</span></div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[.2em] mt-1">Procurement intelligence</div>
              </div>
            </div>
          </div>
          <div className="px-5 pt-7 pb-2 text-[10px] font-extrabold uppercase tracking-[.2em] text-slate-500">Workspace</div>
          <nav className="px-4 py-2 space-y-2">
            {nav.map((n) => (
              <button key={n.id} onClick={() => setView(n.id)} aria-current={view === n.id ? "page" : undefined}
                className={`premium-nav w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-bold ${view === n.id ? "bg-indigo-500/15 text-white ring-1 ring-inset ring-indigo-400/20 shadow-lg shadow-black/10" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${view === n.id ? "bg-indigo-400/20 text-indigo-200" : "bg-white/5 text-slate-400"}`}><n.icon size={17} /></span>
                {n.label}
                {view === n.id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-300" />}
              </button>
            ))}
          </nav>
          <div className="mx-5 mt-8 p-4 rounded-2xl border border-white/10 bg-white/[.035]">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200"><ShieldCheck size={15} className="text-emerald-400" /> Decision engine active</div>
            <p className="text-[11px] leading-relaxed text-slate-500 mt-2">Weighted scoring and qualification thresholds are ready to use.</p>
          </div>
        </div>
        <div className="p-6 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-xs font-extrabold text-white ring-1 ring-white/10">SS</div>
            <div><div className="text-xs font-bold text-slate-200">SupplierSelect</div><div className="text-[10px] text-slate-500 mt-0.5">Enterprise workspace · v1.0</div></div>
            <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.65)]" />
          </div>
        </div>
      </aside>

      <main className="premium-main flex-1 min-w-0 px-4 py-5 sm:px-6 lg:px-10 lg:py-8 w-full">
        <div className="max-w-[1440px] mx-auto">
          <header className="premium-topbar rounded-2xl px-5 py-4 sm:px-6 mb-8 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div>
              <div className="premium-kicker text-[10px] font-extrabold text-indigo-500 uppercase mb-1">{({ dashboard: "OVERVIEW", suppliers: "SUPPLIER INTELLIGENCE", criteria: "DECISION WORKSPACE", results: "ANALYTICS & INSIGHTS" })[view]}</div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">{({ dashboard: "Good to see you.", suppliers: "Supplier directory", criteria: "Build your evaluation", results: "Evaluation report" })[view]}</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">{({ dashboard: "Here’s what’s happening across your supplier network.", suppliers: "Manage your partners and compare operational performance.", criteria: "Set priorities, define thresholds, and find the best-fit supplier.", results: "Explore rankings, performance scores, and decision trade-offs." })[view]}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold"><span className="w-2 h-2 rounded-full bg-emerald-500" /> System operational</div>
              <button onClick={() => setView("criteria")} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-bold shadow-lg shadow-slate-900/10 hover:bg-indigo-700 hover:-translate-y-0.5"><Plus size={15} /> New evaluation</button>
            </div>
          </header>
          <div className="pb-8">
            {view === "dashboard" && <Dashboard suppliers={suppliers} history={history} onStart={() => setView("criteria")} onOpenResult={openHistory} />}
            {view === "suppliers" && <Suppliers suppliers={suppliers} onAdd={() => setModal({})} onEdit={(s) => setModal({ supplier: s })} onDelete={deleteSupplier} />}
            {view === "criteria" && <CriteriaView criteria={criteria} setCriteria={setCriteria} supplierCount={suppliers.length} onRun={run} />}
            {view === "results" && <Results result={result} criteria={resultCriteria} onEdit={() => setView("criteria")} />}
          </div>
          <footer className="flex flex-wrap justify-between gap-2 border-t border-slate-200/80 pt-4 text-[11px] text-slate-400">
            <span>SupplierSelect · Smarter sourcing, clearer decisions.</span><span>{suppliers.length} suppliers in workspace</span>
          </footer>
        </div>
      </main>

      {modal && <SupplierModal initial={modal.supplier} onSave={saveSupplier} onClose={() => setModal(null)} />}
    </div>
  );
}