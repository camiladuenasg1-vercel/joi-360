import React from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "./hooks";
import { logout, session, MODULE_CATALOG, login as doLogin } from "./store";
import { Icon, Pill } from "./ui";

export function AdminDashboard() {
  const st = useStore();
  const nav = useNavigate();
  const mundos = (st.mundos || []);
  const comunidadesActivas = mundos.filter(m => m.estado === "ACTIVO" && !m.redpontis).length;
  const mundosRP = mundos.filter(m => m.redpontis).length;
  const totalCapacidades = mundos.reduce((a, m) => a + (m.modulos||[]).filter(x=>x.enabled).length, 0);

  const totalMundos = (st.mundos||[]).length;
  const mundosActivos = (st.mundos||[]).filter(m => m.estado === "ACTIVO").length;
  const totalModulosActivos = (st.mundos||[]).reduce((a, m) => a + (m.modulos||[]).filter(x => x.enabled).length, 0);
  const totalCom = (st.comercios||[]).length;
  const pendientes = (st.liquidaciones || []).filter(l => l.estado === "PENDIENTE").length;
  const ticketsAbiertos = (st.tickets || []).filter(t => t.estado === "ABIERTO").length;
  const comisionTotal = (st.liquidaciones || []).reduce((a, l) => a + (l.comision || 0), 0);

  // Anunciantes/Promos (JOI Promos) salieron del alcance activo — solo se
  // maneja JOI Eventos como mundo propio de RedPontis.
  const kpis = [
    { label: "Mundos activos", value: mundosActivos, total: totalMundos, icon: "public", color: "#1A3270", link: "/admin/mundos" },
    { label: "Módulos contratados", value: totalModulosActivos, icon: "extension", color: "#2E7FD9", link: "/admin/modulos-mundo" },
    { label: "Comercios en ecosistema", value: totalCom, icon: "storefront", color: "#1A3270", link: "/admin/mundos" },
    { label: "Comisión acumulada", value: `S/ ${comisionTotal.toFixed(0)}`, icon: "account_balance", color: "#0BA878", link: "/admin/liquidacion" },
    { label: "Liq. pendientes", value: pendientes, icon: "pending_actions", color: pendientes > 0 ? "#E8394B" : "#8A8FA8", link: "/admin/liquidacion" },
    { label: "Tickets abiertos", value: ticketsAbiertos, icon: "support_agent", color: ticketsAbiertos > 2 ? "#E8394B" : "#1A3270", link: "/admin/soporte" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-2">
          <span className="text-primary">Ecosistema RedPontis</span><span className="text-outline-variant mx-1">·</span><span>Admin Global</span>
        </div>
        <h1 className="text-3xl font-bold">Panel de Control</h1>
        <p className="text-on-surface-variant mt-1">{mundosActivos} mundos activos · JOI 360 Lima, Perú.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {kpis.map(({ label, value, total, icon, color, link }) => (
          <button key={label} onClick={() => nav(link)} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 text-left hover:border-primary hover:shadow-md transition-all group">
            <div className="flex justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform" style={{ background: color }}>
                <Icon n={icon} className="text-[20px]" />
              </div>
              {total != null && <span className="font-mono text-[10px] text-outline">{total} total</span>}
            </div>
            <p className="text-2xl font-black text-on-surface">{value}</p>
            <p className="font-mono text-[9px] uppercase text-outline mt-1">{label}</p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-outline-variant flex justify-between items-center">
            <h3 className="font-semibold">Mundos del ecosistema</h3>
            <button onClick={() => nav("/admin/mundos")} className="text-primary text-sm hover:underline">Ver todos →</button>
          </div>
          <div className="divide-y divide-outline-variant/60">
            {(st.mundos||[]).map(m => {
              const nMod = (m.modulos||[]).filter(x => x.enabled).length;
              const ac = m.acuerdo;
              const pendienteActivacion = !m.redpontis && !m.entrega?.entregado;
              return (
                <div key={m.id} onClick={() => nav(`/admin/mundos/${m.id}`)} className="px-5 py-4 flex items-center gap-3 hover:bg-surface-container-low cursor-pointer transition-colors">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: m.color }}>{m.nombre[0]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{m.nombre}</p>
                    <p className="font-mono text-[10px] text-on-surface-variant uppercase truncate">{m.vertical} · {nMod} módulos{ac ? ` · ${ac.tipo}` : ""}</p>
                  </div>
                  {pendienteActivacion
                    ? <Pill color="bg-tertiary">PENDIENTE</Pill>
                    : <Pill color={m.estado === "ACTIVO" ? "bg-ok" : "bg-outline"}>{m.estado}</Pill>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-semibold">Liquidaciones recientes</h3>
              <button onClick={() => nav("/admin/liquidacion")} className="text-primary text-sm hover:underline">Gestionar →</button>
            </div>
            {(st.liquidaciones || []).length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-on-surface-variant">
                <Icon n="account_balance" className="text-[32px] text-outline mb-2 block mx-auto" />
                Sin lotes. Ve a <b>Liquidación</b> y ejecuta el corte.
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/60">
                {[...(st.liquidaciones || [])].slice(-4).reverse().map(l => (
                  <div key={l.id} className="px-5 py-3 flex justify-between items-center hover:bg-surface-container-low transition-colors">
                    <div>
                      <p className="text-sm font-medium">{l.mundoNombre}</p>
                      <p className="font-mono text-[10px] text-outline">{l.fecha} · {l.tipoAcuerdo}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold text-primary">S/ {Number(l.comision||0).toFixed(0)}</p>
                      <Pill color={l.estado === "PROCESADA" ? "bg-ok" : "bg-tertiary-container"}>{l.estado}</Pill>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-semibold">Tickets recientes</h3>
              <button onClick={() => nav("/admin/soporte")} className="text-primary text-sm hover:underline">Centro de soporte →</button>
            </div>
            <div className="divide-y divide-outline-variant/60">
              {(st.tickets || []).length === 0 && <p className="px-5 py-8 text-center text-sm text-on-surface-variant">Sin tickets.</p>}
              {[...(st.tickets || [])].slice(-3).reverse().map(t => {
                const mundo = t.mundoId ? (st.mundos||[]).find(m => m.id === t.mundoId) : null;
                return (
                  <div key={t.id} className="px-5 py-3 flex justify-between items-center hover:bg-surface-container-low transition-colors">
                    <div>
                      <p className="text-sm font-medium line-clamp-1">{t.asunto}</p>
                      <p className="font-mono text-[10px] text-outline">{t.origen}{mundo ? ` · ${mundo.nombre}` : ""}</p>
                    </div>
                    <Pill color={t.estado === "ABIERTO" ? "bg-tertiary-container" : t.estado === "EN_PROGRESO" ? "bg-primary" : "bg-ok"}>{t.estado}</Pill>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Login() {
  const nav = useNavigate();
  const [f, setF] = React.useState({ email: "", password: "" });
  const [err, setErr] = React.useState("");
  const [entrando, setEntrando] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setEntrando(true);
    try {
      const ok = await doLogin(f.email, f.password);
      if (ok) nav("/admin");
      else setErr("Credenciales inválidas.");
    } catch {
      setErr("No se pudo verificar. Intenta de nuevo.");
    } finally { setEntrando(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(#1A3270 1px, transparent 1px)", backgroundSize: "24px 24px" }}></div>
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl p-8 relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-black text-lg">RP</div>
          <div>
            <h1 className="text-xl font-black">RedPontis Admin</h1>
            <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest">JOI 360 Ecosystem</p>
          </div>
        </div>
        <p className="text-xs text-on-surface-variant mb-6 pb-4 border-b border-outline-variant">
          Acceso solo con credenciales asignadas por RedPontis. Sin alta de cuenta propia.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div><label className="block text-xs font-medium text-on-surface-variant mb-1">Email</label><input className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="tucorreo@redpontis.com" /></div>
          <div><label className="block text-xs font-medium text-on-surface-variant mb-1">Password</label><input type="password" className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} placeholder="••••••••" /></div>
          {err && <p className="text-xs text-error">{err}</p>}
          <button type="submit" disabled={entrando} className="w-full py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-on-primary-fixed-variant transition-colors shadow-sm disabled:opacity-60">
            {entrando ? "Verificando…" : "Ingresar al ecosistema"}
          </button>
        </form>
        <a href="#/pos" className="mt-4 flex items-center justify-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors">
          <Icon n="storefront" className="text-[16px]" /> ¿Eres operador de un comercio o mundo? Entra con tu código y PIN
        </a>
      </div>
    </div>
  );
}
