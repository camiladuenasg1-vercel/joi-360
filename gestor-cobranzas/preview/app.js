"use strict";

const HOY = new Date(2026, 8, 28);
const MONEDA = "PEN";
const TRAMOS = [
  { id: "d1_30",   label: "1 a 30 días",   min: 1,   max: 30,       color: "#1F66B8" },
  { id: "d31_60",  label: "31 a 60 días",  min: 31,  max: 60,       color: "#AB4F00" },
  { id: "d61_90",  label: "61 a 90 días",  min: 61,  max: 90,       color: "#C8202F" },
  { id: "d90_mas", label: "Más de 90 días", min: 91, max: Infinity, color: "#7A1420" },
];

const ESTADOS = {
  PAID:           { label: "Pagado",     cls: "b-paid",      moroso: false },
  PENDING:        { label: "Pendiente",  cls: "b-pending",   moroso: false },
  PARTIALLY_PAID: { label: "Parcial",    cls: "b-partial",   moroso: false },
  OVERDUE:        { label: "Vencido",    cls: "b-overdue",   moroso: true  },
  IN_ARREARS:     { label: "En mora",    cls: "b-arrears",   moroso: true  },
  CANCELLED:      { label: "Anulado",    cls: "b-cancelled", moroso: false },
  SCHEDULED:      { label: "Programado", cls: "b-cancelled", moroso: false },
};

const money = (n) => "S/ " + Number(n).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money0 = (n) => "S/ " + Number(n).toLocaleString("es-PE", { maximumFractionDigits: 0 });
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fecha = (s) => {
  const d = s instanceof Date ? s : new Date(s + "T00:00:00");
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
};
const dias = (a, b) => Math.round((b - a) / 86400000);
const addMes = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
const addDia = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function toast(msg, type = "ok") {
  const box = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = "toast " + type;
  const ic = type === "err" ? "error" : type === "info" ? "info" : "check_circle";
  el.innerHTML = `<span class="msi">${ic}</span><span>${esc(msg)}</span>`;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}

const S = {
  tab: "resumen",
  grupo: "collections-admin",
  rol: "ADMIN",
  caja: null,
  planes: [
    { id: "p-esencial", nombre: "YOKI Esencial",    monto: 49,  periodicidad: "MENSUAL", diaCobro: 5,  modoDia: "FIJO", activo: true, permanencia: 0 },
    { id: "p-full",     nombre: "YOKI Full",        monto: 89,  periodicidad: "MENSUAL", diaCobro: 5,  modoDia: "FIJO", activo: true, permanencia: 3 },
    { id: "p-corp",     nombre: "YOKI Corporativo", monto: 249, periodicidad: "MENSUAL", diaCobro: 10, modoDia: "FIJO", activo: true, permanencia: 6 },
    { id: "p-anual",    nombre: "YOKI Anual",       monto: 890, periodicidad: "ANUAL",   diaCobro: 1,  modoDia: "FIJO", activo: true, permanencia: 12 },
  ],
  suscriptores: [],
  cargos: [],
  reglas: {
    anticipacion: 3, gracia: 5,
    moraTipo: "PORCENTAJE", moraValor: 5, moraSeparada: true, moraTope: 30,
    suspenderTras: 3, reactivacion: "AUTO_AL_PAGAR", cancelarTras: 6, topeRecordatorios: 3,
  },
  avisos: [
    { kind: "PRE_DUE",            label: "Aviso previo al cobro",       offset: -3, on: true },
    { kind: "ON_DUE",             label: "El día del cobro",            offset: 0,  on: true },
    { kind: "POST_DUE_REMINDER",  label: "Recordatorio si sigue impago", offset: 1,  on: true },
    { kind: "GRACE_END",          label: "Fin del período de gracia",   offset: 5,  on: true },
    { kind: "PAYMENT_CONFIRMED",  label: "Confirmación de pago",        offset: 0,  on: true },
  ],
  bitacora: [],
  importJob: null,
  filtros: { q: "", plan: "", estado: "", tramo: "" },
};

function plan(id) { return S.planes.find((p) => p.id === id); }
function planPorNombre(n) { return S.planes.find((p) => p.nombre.toLowerCase() === String(n).trim().toLowerCase()); }

function seed() {
  const perfiles = [
    ["44871203", "Lucía Ramírez Paredes",     "lucia.ramirez@gmail.com",      "987654321", "p-full",     "al_dia"],
    ["41209887", "Diego Salcedo Vargas",      "diego.salcedo@outlook.com",    "986112340", "p-full",     "pendiente"],
    ["70123456", "Mariana Ocampo Ruiz",       "mariana.ocampo@gmail.com",     "912223344", "p-esencial", "mora_30"],
    ["09887654", "Carlos Benavides León",     "cbenavides@empresa.pe",        "998877665", "p-esencial", "al_dia"],
    ["46552118", "Andrea Chávez Molina",      "andrea.chavez@gmail.com",      "977665544", "p-full",     "mora_60"],
    ["72884190", "Renzo Ibáñez Cortez",       "renzo.ibanez@gmail.com",       "933221100", "p-corp",     "pendiente"],
    ["20512345678", "Servicios Andinos SAC",  "facturacion@serviciosandinos.pe", "914785236", "p-corp",  "mora_90"],
    ["43998210", "Paola Núñez Ferrer",        "paola.nunez@gmail.com",        "",          "p-esencial", "al_dia"],
    ["48112907", "Sebastián Loayza Prado",    "sebastian.loayza@gmail.com",   "965874123", "p-full",     "parcial"],
    ["45003311", "Valeria Ttito Quispe",      "valeria.ttito@gmail.com",      "951236478", "p-anual",    "al_dia"],
    ["42665510", "Jorge Alcántara Vega",      "jorge.alcantara@gmail.com",    "900112233", "p-full",     "mora_120"],
    ["47001122", "Camila Fuentes Rojas",      "camila.fuentes@gmail.com",     "911223344", "p-esencial", "pendiente"],
    ["43887766", "Iván Portocarrero Díaz",    "ivan.portocarrero@gmail.com",  "922113355", "p-full",     "al_dia"],
    ["46998877", "Silvana Barrios Peña",      "silvana.barrios@gmail.com",    "933556677", "p-esencial", "mora_30"],
    ["41556677", "Óscar Villanueva Soto",     "oscar.villanueva@gmail.com",   "944778899", "p-corp",     "al_dia"],
    ["48223344", "Daniela Espinoza Cruz",     "daniela.espinoza@gmail.com",   "955001122", "p-full",     "pendiente"],
    ["42998811", "Fernando Cáceres Luna",     "fernando.caceres@gmail.com",   "966334455", "p-esencial", "mora_60"],
    ["45771122", "Gabriela Mendoza Ríos",     "gabriela.mendoza@gmail.com",   "977889900", "p-full",     "al_dia"],
    ["49001133", "Álvaro Del Solar Paz",      "alvaro.delsolar@gmail.com",    "988112233", "p-anual",    "pendiente"],
    ["44223355", "Patricia Loza Cárdenas",    "patricia.loza@gmail.com",      "999223344", "p-esencial", "al_dia"],
    ["47889900", "Rodrigo Tapia Bustos",      "rodrigo.tapia@gmail.com",      "910334455", "p-full",     "mora_30"],
    ["43112244", "Milagros Yañez Arce",       "milagros.yanez@gmail.com",     "921445566", "p-esencial", "al_dia"],
  ];

  let ci = 0;
  perfiles.forEach(([doc, nombre, correo, tel, planId, perfil], i) => {
    const p = plan(planId);
    const sus = {
      id: "s-" + (i + 1), documento: doc, nombre, correo, telefono: tel,
      planId, monto: p.monto, periodicidad: p.periodicidad,
      estado: perfil === "mora_120" ? "SUSPENDED" : "ACTIVE",
      altaEl: iso(addMes(HOY, -(6 + (i % 8)))),
      saldoFavor: 0, perfil,
    };
    S.suscriptores.push(sus);

    const plantillas = {
      al_dia:   [["PAID", -2], ["PAID", -1], ["PENDING", 0.2]],
      pendiente:[["PAID", -2], ["PAID", -1], ["PENDING", 0]],
      parcial:  [["PAID", -2], ["PARTIALLY_PAID", -1], ["PENDING", 0]],
      mora_30:  [["PAID", -3], ["OVERDUE", -1], ["PENDING", 0]],
      mora_60:  [["PAID", -4], ["OVERDUE", -2], ["OVERDUE", -1]],
      mora_90:  [["OVERDUE", -3], ["OVERDUE", -2], ["OVERDUE", -1]],
      mora_120: [["IN_ARREARS", -4], ["IN_ARREARS", -3], ["IN_ARREARS", -2]],
    }[perfil];

    plantillas.forEach(([estado, offMes]) => {
      const base = addMes(HOY, Math.trunc(offMes));
      const venc = new Date(base.getFullYear(), base.getMonth(), p.diaCobro);
      if (offMes > 0) venc.setMonth(venc.getMonth() + 1);
      const cicloIni = new Date(venc.getFullYear(), venc.getMonth(), 1);
      const cicloFin = new Date(venc.getFullYear(), venc.getMonth() + 1, 0);
      const atraso = Math.max(0, dias(venc, HOY) - S.reglas.gracia);
      let mora = 0;
      if (estado === "OVERDUE" || estado === "IN_ARREARS") {
        const meses = Math.max(1, Math.ceil(atraso / 30));
        mora = Math.min(r2(sus.monto * (S.reglas.moraValor / 100) * meses), S.reglas.moraTope);
      }
      const pagado = estado === "PAID" ? sus.monto : estado === "PARTIALLY_PAID" ? r2(sus.monto * 0.4) : 0;
      ci += 1;
      S.cargos.push({
        id: "C-" + String(2600 + ci),
        suscriptorId: sus.id, planId,
        periodo: `${venc.getFullYear()}-${String(venc.getMonth() + 1).padStart(2, "0")}`,
        cicloIni: iso(cicloIni), cicloFin: iso(cicloFin),
        emitido: iso(addDia(venc, -S.reglas.anticipacion)), vence: iso(venc),
        base: sus.monto, mora: r2(mora), pagado: r2(pagado),
        estado, medio: estado === "PAID" ? (ci % 3 === 0 ? "QR" : "CARD") : null,
        pagadoEl: estado === "PAID" ? iso(addDia(venc, -1)) : null,
        intentos: estado === "OVERDUE" || estado === "IN_ARREARS" ? 2 : estado === "PAID" ? 1 : 0,
        avisos: [], manual: false,
      });
    });
  });
}

const total = (c) => r2(c.base + c.mora);
const saldo = (c) => r2(total(c) - c.pagado);
const atrasoDias = (c) => Math.max(0, dias(new Date(c.vence + "T00:00:00"), HOY));
const esMoroso = (c) => ESTADOS[c.estado].moroso;
const sus = (id) => S.suscriptores.find((x) => x.id === id);
const cargosDe = (id) => S.cargos.filter((c) => c.suscriptorId === id);
const deudaDe = (id) => r2(cargosDe(id).filter((c) => esMoroso(c) || c.estado === "PENDING" || c.estado === "PARTIALLY_PAID").reduce((a, c) => a + saldo(c), 0));
const moraDe = (id) => r2(cargosDe(id).filter(esMoroso).reduce((a, c) => a + c.mora, 0));
const atrasoMax = (id) => Math.max(0, ...cargosDe(id).filter(esMoroso).map(atrasoDias), 0);
const tramoDe = (d) => TRAMOS.find((t) => d >= t.min && d <= t.max) || null;

function proximoCobro(s) {
  const p = plan(s.planId);
  const prox = new Date(HOY.getFullYear(), HOY.getMonth() + 1, p.diaCobro);
  return iso(prox);
}

function bita(entidad, accion, detalle) {
  S.bitacora.unshift({ id: "b" + Date.now() + Math.random(), entidad, accion, detalle, quien: "camila@redpontis.pe", cuando: new Date() });
}

const TABS = [
  { k: "resumen",      l: "Resumen",      i: "dashboard" },
  { k: "planes",       l: "Planes",       i: "workspace_premium" },
  { k: "suscriptores", l: "Suscriptores", i: "groups" },
  { k: "carga",        l: "Cargar cartera", i: "upload_file" },
  { k: "cobros",       l: "Cobros",       i: "receipt_long" },
  { k: "morosidad",    l: "Morosidad",    i: "running_with_errors" },
  { k: "prorateo",     l: "Prorateo",     i: "calculate" },
  { k: "reglas",       l: "Reglas y avisos", i: "tune" },
];

function renderTabs() {
  document.getElementById("tabs").innerHTML = TABS.map((t) =>
    `<button class="navtab ${S.tab === t.k ? "on" : ""}" data-tab="${t.k}"><span class="msi">${t.i}</span>${t.l}</button>`
  ).join("");
  document.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => { S.tab = b.dataset.tab; render(); });
}

const ROLES = {
  "collections-admin":    { nivel: "ADMIN",    label: "Administrador", puede: "Todo: planes, precios, reglas, cartera, prorateo y anulaciones." },
  "collections-operator": { nivel: "OPERADOR", label: "Operador",      puede: "Cargar cartera, cobrar, recordar y registrar pagos. No cambia reglas ni precios." },
  "collections-readonly": { nivel: "LECTURA",  label: "Solo lectura",  puede: "Ver y exportar. Ninguna escritura." },
};

const CAJAS = [
  { id: "yoki", scope: "MERCHANT", code: "yoki", titulo: "YOKI",
    detalle: "Gestor de Cobranzas · YOKI · Jockey Plaza", sub: "Comercio · RUC 20512345678 · PEN",
    ruta: "/joi360app/cobranzas/comercio/yoki", ico: "card_membership",
    grad: "linear-gradient(135deg,#6B4FA3,#3B5BDB)" },
  { id: "jockey", scope: "WORLD", code: "JOCKEY-01", titulo: "Jockey Plaza",
    detalle: "Gestor de Cobranzas · Jockey Plaza", sub: "Mundo · cartera propia del mundo · PEN",
    ruta: "/joi360app/cobranzas/mundo/JOCKEY-01", ico: "public",
    grad: "linear-gradient(135deg,#1A3270,#1F66B8)" },
];

function pintarLogin() {
  const cont = document.getElementById("lroles");
  cont.innerHTML = Object.entries(ROLES).map(([g, r]) =>
    `<button class="chip ${S.grupo === g ? "on" : ""}" data-rol="${g}">${r.label}</button>`).join("");
  document.getElementById("lrolhint").innerHTML =
    `<span class="mono">${S.grupo}</span> → nivel <b>${ROLES[S.grupo].nivel}</b>. ${ROLES[S.grupo].puede}`;
  document.querySelectorAll("[data-rol]").forEach((b) => b.onclick = () => { S.grupo = b.dataset.rol; pintarLogin(); });

  document.getElementById("lcajas").innerHTML = CAJAS.map((c) => `
    <button class="lcaja" data-caja="${c.id}">
      <span class="ci" style="background:${c.grad}"><span class="msi">${c.ico}</span></span>
      <span class="cb"><b>${c.titulo}</b><span>${c.detalle}</span><code>${c.ruta}</code></span>
      <span class="msi" style="color:var(--outline)">chevron_right</span>
    </button>`).join("");
  document.querySelectorAll("[data-caja]").forEach((b) => b.onclick = () => entrar(b.dataset.caja));
}

function entrar(cajaId) {
  S.caja = CAJAS.find((c) => c.id === cajaId);
  S.rol = ROLES[S.grupo].nivel;
  document.getElementById("login").style.display = "none";
  document.getElementById("app").style.display = "flex";
  document.getElementById("navTitular").textContent = S.caja.titulo;
  document.getElementById("navRol").textContent = ROLES[S.grupo].label;
  document.getElementById("topTitle").textContent = `Gestor de Cobranzas · ${S.caja.titulo}`;
  document.getElementById("topScope").innerHTML =
    `<span class="dot"></span>${S.caja.scope === "WORLD" ? "Alcance mundo" : "Alcance comercio"}`;
  document.getElementById("titNombre").textContent = S.caja.titulo;
  document.getElementById("titSub").innerHTML = esc(S.caja.sub);
  document.getElementById("titLogo").style.background = S.caja.grad;
  document.getElementById("titLogo").innerHTML = `<span class="msi">${S.caja.ico}</span>`;
  S.tab = "resumen";
  render();
  toast(`Entraste como ${ROLES[S.grupo].label} a la cartera de ${S.caja.titulo}.`, "info");
}

function salir() {
  document.getElementById("app").style.display = "none";
  document.getElementById("login").style.display = "flex";
  pintarLogin();
}

/// El servidor ya bloquea la escritura al nivel LECTURA de forma transversal. Acá se deshabilita
/// con el motivo visible, en vez de esconder la acción: así el operador entiende por qué no puede.
function bloquear(selectores, motivo) {
  selectores.forEach((sel) => document.querySelectorAll(sel).forEach((b) => {
    b.disabled = true; b.title = motivo; b.style.opacity = ".45"; b.style.cursor = "not-allowed";
    b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); toast(motivo, "err"); };
  }));
}

function aplicarSoloLectura() {
  if (S.rol === "LECTURA") {
    bloquear(["#view .btn.bp", "#view .mini", "#view .sw", "#view #drop"],
      "Tu rol es de solo lectura. Red Pontis puede cambiarlo.");
    return;
  }
  if (S.rol === "OPERADOR") {
    bloquear(["#view #nuevoPlan", "#view [data-precio]", "#view #okReglas", "#view .sw"],
      "Cambiar reglas y precios requiere el grupo collections-admin.");
  }
}

function render() {
  renderTabs();
  const v = document.getElementById("view");
  const fn = { resumen: vResumen, planes: vPlanes, suscriptores: vSuscriptores, carga: vCarga, cobros: vCobros, morosidad: vMorosidad, prorateo: vProrateo, reglas: vReglas }[S.tab];
  v.innerHTML = fn();
  const w = { resumen: wResumen, planes: wPlanes, suscriptores: wSuscriptores, carga: wCarga, cobros: wCobros, morosidad: wMorosidad, prorateo: wProrateo, reglas: wReglas }[S.tab];
  if (w) w();
  document.getElementById("roBanner").innerHTML = S.rol === "LECTURA"
    ? `<div class="note n-warn"><span class="msi">visibility</span><div>Estás con el grupo
       <span class="mono">collections-readonly</span>. Podés ver y exportar; las acciones de escritura
       están deshabilitadas.</div></div>`
    : S.rol === "OPERADOR"
      ? `<div class="note n-info"><span class="msi">badge</span><div>Estás con el grupo
         <span class="mono">collections-operator</span>. Podés operar la cobranza; cambiar reglas y
         precios de plan requiere <span class="mono">collections-admin</span>.</div></div>`
      : "";
  aplicarSoloLectura();
  document.querySelector("main.content").scrollTop = 0;
}

function kpi(ico, color, bg, valor, label, det, tab) {
  return `<button class="kpi" ${tab ? `data-goto="${tab}"` : ""}>
    <div class="ico" style="background:${bg};color:${color}"><span class="msi">${ico}</span></div>
    <div class="v">${valor}</div><div class="l">${label}</div>${det ? `<div class="d">${det}</div>` : ""}</button>`;
}

function vResumen() {
  const activos = S.suscriptores.filter((s) => s.estado === "ACTIVE");
  const mrr = r2(activos.reduce((a, s) => a + (s.periodicidad === "ANUAL" ? s.monto / 12 : s.monto), 0));
  const delPeriodo = S.cargos.filter((c) => c.periodo === `${HOY.getFullYear()}-${String(HOY.getMonth() + 1).padStart(2, "0")}`);
  const emitido = r2(delPeriodo.reduce((a, c) => a + total(c), 0));
  const cobrado = r2(S.cargos.filter((c) => c.estado === "PAID").reduce((a, c) => a + c.pagado, 0));
  const pendiente = r2(S.cargos.filter((c) => c.estado === "PENDING" || c.estado === "PARTIALLY_PAID").reduce((a, c) => a + saldo(c), 0));
  const vencido = r2(S.cargos.filter(esMoroso).reduce((a, c) => a + saldo(c), 0));
  const deudores = S.suscriptores.filter((s) => atrasoMax(s.id) > 0);
  const tasa = activos.length ? (deudores.length / activos.length) : 0;

  const porTramo = TRAMOS.map((t) => {
    const m = r2(S.cargos.filter((c) => esMoroso(c) && tramoDe(atrasoDias(c))?.id === t.id).reduce((a, c) => a + saldo(c), 0));
    return { ...t, monto: m };
  });
  const maxTramo = Math.max(1, ...porTramo.map((t) => t.monto));

  const meses = [-4, -3, -2, -1, 0].map((off) => {
    const d = addMes(HOY, off);
    const per = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const cs = S.cargos.filter((c) => c.periodo === per);
    return {
      label: d.toLocaleDateString("es-PE", { month: "short" }).replace(".", ""),
      emitido: r2(cs.reduce((a, c) => a + total(c), 0)),
      cobrado: r2(cs.reduce((a, c) => a + c.pagado, 0)),
    };
  });
  const maxMes = Math.max(1, ...meses.map((m) => m.emitido));

  const prox = {};
  S.cargos.filter((c) => c.estado === "PENDING").forEach((c) => {
    prox[c.vence] = prox[c.vence] || { n: 0, m: 0 };
    prox[c.vence].n += 1; prox[c.vence].m += total(c);
  });
  const proxLista = Object.entries(prox).sort((a, b) => a[0] < b[0] ? -1 : 1).slice(0, 4);

  const porEstado = Object.keys(ESTADOS).map((k) => ({
    k, ...ESTADOS[k],
    n: S.cargos.filter((c) => c.estado === k).length,
    m: r2(S.cargos.filter((c) => c.estado === k).reduce((a, c) => a + total(c), 0)),
  })).filter((x) => x.n > 0);

  return `
  <div class="banner">
    <div>
      <h3>Lo que este panel responde</h3>
      <p>Quién te debe, cuánto te debe, desde cuándo, y cuánto es el prorateo si alguien cambia de plan.
      Desde cualquier fila podés disparar el recordatorio con su link de pago y su QR.</p>
    </div>
    <span class="msi">query_stats</span>
  </div>

  <div class="kpis">
    ${kpi("groups", "#1A3270", "#EEF2FD", activos.length, "Cartera activa", money0(mrr) + " recurrente / mes", "suscriptores")}
    ${kpi("payments", "#097A54", "#E7F5EF", money0(cobrado), "Cobrado acumulado", "todos los períodos", "cobros")}
    ${kpi("hourglass_top", "#1F66B8", "#EAF2FC", money0(pendiente), "Pendiente", S.cargos.filter((c) => c.estado === "PENDING").length + " cargos por vencer", "cobros")}
    ${kpi("running_with_errors", "#C8202F", "#FCECEE", money0(vencido), "Vencido", deudores.length + " deudores", "morosidad")}
    ${kpi("percent", "#AB4F00", "#FDF1E3", (tasa * 100).toFixed(1) + "%", "Tasa de morosidad", "sobre cartera activa", "morosidad")}
    ${kpi("trending_up", "#6B4FA3", "#F1ECF9", money0(emitido), "Emitido este mes", "proyección " + money0(mrr), "cobros")}
  </div>

  <div class="grid2" style="align-items:start">
    <div class="card" style="padding:20px">
      <div class="sech"><div><h3>Emitido y cobrado</h3><p>Últimos cinco períodos</p></div></div>
      <div class="spark">
        ${meses.map((m) => `<div class="col" title="${m.label}: emitido ${money(m.emitido)} · cobrado ${money(m.cobrado)}">
          <div class="s2" style="height:${(m.emitido / maxMes) * 100}%"></div>
          <div class="s1" style="height:${(m.cobrado / maxMes) * 100}%;margin-top:-100%;position:relative"></div>
        </div>`).join("")}
      </div>
      <div style="display:flex;gap:6px">${meses.map((m) => `<div class="sl" style="flex:1">${m.label}</div>`).join("")}</div>
      <div style="display:flex;gap:16px;margin-top:12px;font-size:11px;color:var(--osv)">
        <span><span style="display:inline-block;width:10px;height:10px;background:var(--ok);border-radius:2px;margin-right:5px"></span>Cobrado</span>
        <span><span style="display:inline-block;width:10px;height:10px;background:var(--ov);border-radius:2px;margin-right:5px"></span>Emitido</span>
      </div>
    </div>

    <div class="card" style="padding:20px">
      <div class="sech"><div><h3>Antigüedad de la deuda</h3><p>Cuánto y desde cuándo</p></div></div>
      <div class="bars">
        ${porTramo.map((t) => `<div class="bar">
          <span class="bl">${t.label}</span>
          <span class="btrack"><span class="bfill" style="width:${(t.monto / maxTramo) * 100}%;background:${t.color}"></span></span>
          <span class="bv">${money(t.monto)}</span></div>`).join("")}
      </div>
      <button class="link" data-goto="morosidad" style="margin-top:14px">Ver deudores <span class="msi" style="font-size:14px">arrow_forward</span></button>
    </div>
  </div>

  <div class="grid2" style="align-items:start;margin-top:24px">
    <div class="card" style="padding:20px">
      <div class="sech"><div><h3>Próximos vencimientos</h3><p>Cargos pendientes por fecha</p></div></div>
      ${proxLista.length === 0 ? `<p style="font-size:13px;color:var(--osv)">Sin cargos pendientes.</p>` :
        proxLista.map(([f, x]) => `<div class="kv"><span class="k">${fecha(f)}</span><span class="v">${x.n} cargos · ${money(x.m)}</span></div>`).join("")}
    </div>
    <div class="card" style="padding:20px">
      <div class="sech"><div><h3>Distribución por estado</h3><p>Todos los cargos emitidos</p></div></div>
      ${porEstado.map((e) => `<div class="kv"><span class="k"><span class="badge ${e.cls}">${e.label}</span></span><span class="v">${e.n} · ${money(e.m)}</span></div>`).join("")}
    </div>
  </div>`;
}

function wResumen() {
  document.querySelectorAll("[data-goto]").forEach((b) => b.onclick = () => { S.tab = b.dataset.goto; render(); });
}

function vPlanes() {
  const filas = S.planes.map((p) => {
    const subs = S.suscriptores.filter((s) => s.planId === p.id);
    const activos = subs.filter((s) => s.estado === "ACTIVE").length;
    const enMora = subs.filter((s) => atrasoMax(s.id) > 0).length;
    const desfasados = subs.filter((s) => s.monto !== p.monto).length;
    const cobrado = r2(S.cargos.filter((c) => c.planId === p.id).reduce((a, c) => a + c.pagado, 0));
    return { p, activos, enMora, desfasados, cobrado };
  });

  return `
  <div class="note n-info"><span class="msi">info</span>
    <div>Cambiar el precio de un plan <b>no altera a los suscriptores que ya lo tienen</b>. Se crea una versión
    nueva y los vigentes siguen con su monto hasta que migres la cartera con una acción explícita.
    Los cargos ya emitidos nunca cambian.</div></div>

  <div class="sech">
    <div><h3>Planes de YOKI</h3><p>Monto, frecuencia y día de cobro</p></div>
    <button class="btn bp" id="nuevoPlan"><span class="msi">add</span>Nuevo plan</button>
  </div>

  <div class="tablewrap"><div class="tablescroll"><table>
    <thead><tr><th>Plan</th><th>Monto</th><th>Frecuencia</th><th>Día de cobro</th><th>Permanencia</th>
      <th class="num">Activos</th><th class="num">En mora</th><th class="num">Cobrado</th><th>Estado</th><th></th></tr></thead>
    <tbody>${filas.map(({ p, activos, enMora, desfasados, cobrado }) => `<tr>
      <td class="strong">${esc(p.nombre)}${desfasados ? `<div style="font-size:10px;color:var(--warning);margin-top:2px">${desfasados} con precio anterior</div>` : ""}</td>
      <td class="num strong">${money(p.monto)}</td>
      <td>${p.periodicidad === "ANUAL" ? "Anual" : "Mensual"}</td>
      <td>${p.modoDia === "FIJO" ? "Día " + p.diaCobro + " del mes" : "Según fecha de alta"}</td>
      <td>${p.permanencia ? p.permanencia + " meses" : "Sin permanencia"}</td>
      <td class="num">${activos}</td>
      <td class="num" style="${enMora ? "color:var(--error);font-weight:600" : ""}">${enMora}</td>
      <td class="num">${money(cobrado)}</td>
      <td><span class="badge ${p.activo ? "b-paid" : "b-cancelled"}">${p.activo ? "Activo" : "Inactivo"}</span></td>
      <td><button class="mini" data-precio="${p.id}"><span class="msi">edit</span>Precio</button></td>
    </tr>`).join("")}</tbody>
  </table></div></div>`;
}

function wPlanes() {
  document.getElementById("nuevoPlan").onclick = drawerNuevoPlan;
  document.querySelectorAll("[data-precio]").forEach((b) => b.onclick = () => drawerPrecio(b.dataset.precio));
}

function drawerNuevoPlan() {
  abrirDrawer({
    titulo: "Nuevo plan", sub: "YOKI · Jockey Plaza", ico: "workspace_premium",
    cuerpo: `
      <div style="display:flex;flex-direction:column;gap:16px">
        <div><label class="fl">Nombre del plan</label><input id="pn" placeholder="Ej. YOKI Premium"></div>
        <div class="grid2">
          <div><label class="fl">Monto (${MONEDA})</label><input id="pm" type="number" step="0.01" min="0" value="0"></div>
          <div><label class="fl">Frecuencia</label><select id="pf">
            <option value="MENSUAL">Mensual</option><option value="TRIMESTRAL">Trimestral</option>
            <option value="SEMESTRAL">Semestral</option><option value="ANUAL">Anual</option></select></div>
        </div>
        <div class="grid2">
          <div><label class="fl">Modo de cobro</label><select id="pmd">
            <option value="FIJO">Día fijo del mes</option><option value="ALTA">Según fecha de alta</option></select></div>
          <div><label class="fl">Día de cobro</label><input id="pd" type="number" min="1" max="31" value="5"></div>
        </div>
        <div><label class="fl">Permanencia mínima (meses)</label><input id="pp" type="number" min="0" value="0">
          <p class="hint">Cero significa sin permanencia. Una baja dentro de la permanencia pide confirmación.</p></div>
        <div class="note n-warn" style="margin:0"><span class="msi">event_repeat</span>
          <div>Si el día de cobro es 29, 30 o 31, en los meses que no tienen ese día el cargo se emite el último día del mes.</div></div>
      </div>`,
    pie: `<button class="btn bo" data-cerrar>Cancelar</button><button class="btn bp" id="okPlan">Crear plan</button>`,
    luego: () => {
      document.getElementById("okPlan").onclick = () => {
        const nombre = document.getElementById("pn").value.trim();
        const monto = Number(document.getElementById("pm").value);
        if (nombre.length < 3) return toast("El nombre del plan necesita al menos 3 caracteres.", "err");
        if (planPorNombre(nombre)) return toast("Ya existe un plan con ese nombre en este comercio.", "err");
        if (!(monto > 0)) return toast("El monto tiene que ser mayor que cero.", "err");
        S.planes.push({
          id: "p-" + Date.now(), nombre, monto: r2(monto),
          periodicidad: document.getElementById("pf").value,
          modoDia: document.getElementById("pmd").value,
          diaCobro: Number(document.getElementById("pd").value) || 1,
          permanencia: Number(document.getElementById("pp").value) || 0,
          activo: true,
        });
        bita("collection_plan", "CREAR", `Plan "${nombre}" creado con monto ${money(monto)}`);
        cerrarDrawer(); toast(`Plan "${nombre}" creado.`); render();
      };
    },
  });
}

function drawerPrecio(planId) {
  const p = plan(planId);
  const vigentes = S.suscriptores.filter((s) => s.planId === planId && s.estado === "ACTIVE");
  abrirDrawer({
    titulo: "Cambiar precio", sub: p.nombre, ico: "price_change",
    cuerpo: `
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="kv"><span class="k">Monto vigente</span><span class="v">${money(p.monto)}</span></div>
        <div><label class="fl">Monto nuevo (${MONEDA})</label><input id="np" type="number" step="0.01" min="0" value="${p.monto}"></div>
        <div class="note n-warn" style="margin:0"><span class="msi">group</span>
          <div><b>${vigentes.length} suscriptores</b> tienen este plan hoy. Al guardar el precio nuevo
          <b>siguen con ${money(p.monto)}</b>. Solo cambian si migrás la cartera con el botón de abajo.</div></div>
        <div style="border-top:1px solid var(--ov);padding-top:16px">
          <label style="display:flex;gap:10px;align-items:flex-start;font-size:13px;cursor:pointer">
            <input type="checkbox" id="mig" style="width:16px;height:16px;margin-top:2px">
            <span>Migrar también a los ${vigentes.length} suscriptores vigentes al precio nuevo.
            <span style="color:var(--osv);display:block;font-size:11px;margin-top:2px">Los cargos ya emitidos no cambian. Queda en bitácora.</span></span>
          </label>
        </div>
      </div>`,
    pie: `<button class="btn bo" data-cerrar>Cancelar</button><button class="btn bp" id="okPrecio">Guardar precio</button>`,
    luego: () => {
      document.getElementById("okPrecio").onclick = () => {
        const nuevo = Number(document.getElementById("np").value);
        if (!(nuevo > 0)) return toast("El monto tiene que ser mayor que cero.", "err");
        const anterior = p.monto;
        const migrar = document.getElementById("mig").checked;
        p.monto = r2(nuevo);
        bita("collection_plan_version", "CREAR", `${p.nombre}: precio ${money(anterior)} → ${money(nuevo)}`);
        if (migrar) {
          vigentes.forEach((s) => { s.monto = r2(nuevo); });
          bita("subscription", "MIGRAR_PRECIO", `${vigentes.length} suscriptores de ${p.nombre} migrados a ${money(nuevo)}`);
          toast(`Precio actualizado y ${vigentes.length} suscriptores migrados.`);
        } else {
          toast(`Precio actualizado. Los ${vigentes.length} vigentes siguen con ${money(anterior)}.`, "info");
        }
        cerrarDrawer(); render();
      };
    },
  });
}

function vSuscriptores() {
  return `
  <div class="fbar">
    <div class="search"><span class="msi">search</span><input id="q" placeholder="Buscar por documento, nombre o correo" value="${esc(S.filtros.q)}"></div>
    <select id="fplan" style="width:auto"><option value="">Todos los planes</option>
      ${S.planes.map((p) => `<option value="${p.id}" ${S.filtros.plan === p.id ? "selected" : ""}>${esc(p.nombre)}</option>`).join("")}</select>
    <select id="festado" style="width:auto"><option value="">Toda la cobranza</option>
      <option value="al_dia" ${S.filtros.estado === "al_dia" ? "selected" : ""}>Al día</option>
      <option value="debe" ${S.filtros.estado === "debe" ? "selected" : ""}>Con deuda</option>
      <option value="suspendido" ${S.filtros.estado === "suspendido" ? "selected" : ""}>Suspendidos</option></select>
    <span class="fcount" id="cnt"></span>
    <button class="btn bo" id="expSus"><span class="msi">download</span>CSV</button>
  </div>
  <div id="tblSus"></div>`;
}

function filtrarSus() {
  const q = S.filtros.q.toLowerCase().trim();
  return S.suscriptores.filter((s) => {
    if (q && !(`${s.documento} ${s.nombre} ${s.correo}`.toLowerCase().includes(q))) return false;
    if (S.filtros.plan && s.planId !== S.filtros.plan) return false;
    if (S.filtros.estado === "al_dia" && deudaDe(s.id) > 0) return false;
    if (S.filtros.estado === "debe" && deudaDe(s.id) <= 0) return false;
    if (S.filtros.estado === "suspendido" && s.estado !== "SUSPENDED") return false;
    return true;
  });
}

function tablaSus() {
  const rows = filtrarSus();
  document.getElementById("cnt").textContent = `${rows.length} de ${S.suscriptores.length}`;
  const box = document.getElementById("tblSus");
  if (rows.length === 0) {
    const hayFiltro = S.filtros.q || S.filtros.plan || S.filtros.estado;
    box.innerHTML = `<div class="tablewrap"><div class="empty">
      <span class="msi">${hayFiltro ? "filter_alt_off" : "group_off"}</span>
      <h4>${hayFiltro ? "Ningún suscriptor coincide con los filtros" : "Todavía no cargaste tu cartera"}</h4>
      <p>${hayFiltro ? "Tu cartera sigue completa. Probá con otros filtros." : "Cargá tu archivo para ver acá a toda tu cartera."}</p>
      <button class="btn ${hayFiltro ? "bo" : "bp"}" id="accEmpty">${hayFiltro ? "Limpiar filtros" : "Cargar cartera"}</button>
    </div></div>`;
    document.getElementById("accEmpty").onclick = () => {
      if (hayFiltro) { S.filtros = { q: "", plan: "", estado: "", tramo: "" }; render(); }
      else { S.tab = "carga"; render(); }
    };
    return;
  }
  box.innerHTML = `<div class="tablewrap"><div class="tablescroll"><table>
    <thead><tr><th>Documento</th><th>Suscriptor</th><th>Plan</th><th class="num">Monto</th>
      <th>Próximo cobro</th><th>Suscripción</th><th class="num">Deuda</th><th>Antigüedad</th><th></th></tr></thead>
    <tbody>${rows.map((s) => {
      const d = deudaDe(s.id), at = atrasoMax(s.id), t = tramoDe(at);
      return `<tr>
        <td class="mono" style="font-size:12px">${esc(s.documento)}</td>
        <td><div class="strong">${esc(s.nombre)}</div><div style="font-size:11px;color:var(--osv)">${esc(s.correo)}</div></td>
        <td>${esc(plan(s.planId).nombre)}</td>
        <td class="num">${money(s.monto)}</td>
        <td style="font-size:12px">${fecha(proximoCobro(s))}</td>
        <td><span class="badge ${s.estado === "ACTIVE" ? "b-paid" : "b-arrears"}">${s.estado === "ACTIVE" ? "Activa" : "Suspendida"}</span></td>
        <td class="num" style="${d > 0 ? "color:var(--error);font-weight:700" : "color:var(--osv)"}">${d > 0 ? money(d) : "—"}</td>
        <td>${at > 0 ? `<span class="badge" style="background:${t.color}1a;color:${t.color}">${at} días</span>` : `<span style="color:var(--osv)">—</span>`}</td>
        <td><button class="mini" data-ficha="${s.id}"><span class="msi">person</span>Ficha</button></td>
      </tr>`;
    }).join("")}</tbody></table></div></div>`;
  document.querySelectorAll("[data-ficha]").forEach((b) => b.onclick = () => drawerFicha(b.dataset.ficha));
}

function wSuscriptores() {
  tablaSus();
  const q = document.getElementById("q");
  q.oninput = () => { S.filtros.q = q.value; tablaSus(); };
  document.getElementById("fplan").onchange = (e) => { S.filtros.plan = e.target.value; tablaSus(); };
  document.getElementById("festado").onchange = (e) => { S.filtros.estado = e.target.value; tablaSus(); };
  document.getElementById("expSus").onclick = () => exportar("cartera", filtrarSus().map((s) => ({
    documento: s.documento, nombre: s.nombre, correo: s.correo, telefono: s.telefono,
    plan: plan(s.planId).nombre, monto: s.monto, proximo_cobro: proximoCobro(s),
    suscripcion: s.estado, deuda: deudaDe(s.id), mora: moraDe(s.id), antiguedad_dias: atrasoMax(s.id),
  })));
}

function drawerFicha(id) {
  const s = sus(id);
  const cs = cargosDe(id).slice().sort((a, b) => a.vence < b.vence ? 1 : -1);
  const p = plan(s.planId);
  const d = deudaDe(id), at = atrasoMax(id);
  const avisos = cs.flatMap((c) => c.avisos.map((a) => ({ ...a, cargo: c.id })));
  abrirDrawer({
    titulo: s.nombre, sub: `${s.documento} · ${p.nombre}`, ico: "person", ancho: 620,
    cuerpo: `
      ${d > 0 ? `<div class="note n-err"><span class="msi">running_with_errors</span>
        <div>Debe <b>${money(d)}</b> en ${cs.filter((c) => saldo(c) > 0 && c.estado !== "CANCELLED").length} cargos.
        El más viejo lleva <b>${at} días</b> de atraso. Mora acumulada ${money(moraDe(id))}.</div></div>`
        : `<div class="note n-ok"><span class="msi">check_circle</span><div>Está al día. Sin cargos pendientes de pago.</div></div>`}

      <div class="sech" style="margin-top:4px"><h3 style="font-size:13px">Datos</h3></div>
      <div class="kv"><span class="k">Correo</span><span class="v">${esc(s.correo)}</span></div>
      <div class="kv"><span class="k">Teléfono</span><span class="v">${s.telefono ? esc(s.telefono) : "—"}</span></div>
      <div class="kv"><span class="k">Plan</span><span class="v">${esc(p.nombre)} · ${money(s.monto)}</span></div>
      <div class="kv"><span class="k">Frecuencia</span><span class="v">${p.periodicidad === "ANUAL" ? "Anual" : "Mensual"}</span></div>
      <div class="kv"><span class="k">Alta</span><span class="v">${fecha(s.altaEl)}</span></div>
      <div class="kv"><span class="k">Próximo cobro</span><span class="v">${fecha(proximoCobro(s))}</span></div>
      <div class="kv"><span class="k">Saldo a favor</span><span class="v">${s.saldoFavor > 0 ? money(s.saldoFavor) : "—"}</span></div>

      <div class="sech" style="margin-top:22px"><h3 style="font-size:13px">Historial de cargos</h3></div>
      <div class="tl">${cs.map((c) => `<div class="tli">
        <span class="tic"><span class="msi" style="color:${esMoroso(c) ? "var(--error)" : c.estado === "PAID" ? "var(--ok)" : "var(--info)"}">
          ${c.estado === "PAID" ? "check_circle" : esMoroso(c) ? "error" : "schedule"}</span></span>
        <span class="tt"><b>${c.periodo} · ${money(total(c))} <span class="badge ${ESTADOS[c.estado].cls}">${ESTADOS[c.estado].label}</span></b>
          <span>Vence ${fecha(c.vence)}${c.mora > 0 ? ` · mora ${money(c.mora)}` : ""}${saldo(c) > 0 && c.estado !== "PENDING" ? ` · saldo ${money(saldo(c))}` : ""}</span></span>
        <span class="td">${c.id}</span></div>`).join("")}</div>

      <div class="sech" style="margin-top:22px"><h3 style="font-size:13px">Avisos enviados</h3></div>
      ${avisos.length === 0 ? `<p style="font-size:12px;color:var(--osv)">Todavía no se le envió ningún aviso desde el panel.</p>`
        : `<div class="tl">${avisos.map((a) => `<div class="tli">
            <span class="tic"><span class="msi" style="color:var(--info)">${a.tipo === "QR" ? "qr_code_2" : a.tipo === "LINK" ? "link" : "mail"}</span></span>
            <span class="tt"><b>${esc(a.label)}</b><span>${a.cargo} · ${a.manual ? "manual" : "automático"}</span></span>
            <span class="td">${a.cuando}</span></div>`).join("")}</div>`}

      <div class="sech" style="margin-top:22px"><h3 style="font-size:13px">Acciones</h3></div>
      <div class="chips">
        <button class="chip" id="fProrateo"><span class="msi" style="font-size:15px">calculate</span> Cambiar de plan</button>
        ${d > 0 ? `<button class="chip" id="fRecordar"><span class="msi" style="font-size:15px">notifications_active</span> Mandar recordatorio</button>` : ""}
      </div>`,
    pie: `<button class="btn bo" data-cerrar>Cerrar</button>`,
    luego: () => {
      document.getElementById("fProrateo").onclick = () => { cerrarDrawer(); S.tab = "prorateo"; S.prorateoSus = id; render(); };
      const r = document.getElementById("fRecordar");
      if (r) r.onclick = () => {
        const c = cs.find((x) => saldo(x) > 0 && x.estado !== "CANCELLED");
        cerrarDrawer(); drawerCobrar(c.id);
      };
    },
  });
}

function vCobros() {
  return `
  <div class="fbar">
    <div class="search"><span class="msi">search</span><input id="cq" placeholder="Buscar por suscriptor o id de cargo" value="${esc(S.filtros.q)}"></div>
    <select id="cest" style="width:auto"><option value="">Todos los estados</option>
      ${Object.keys(ESTADOS).map((k) => `<option value="${k}" ${S.filtros.estado === k ? "selected" : ""}>${ESTADOS[k].label}</option>`).join("")}</select>
    <select id="cplan" style="width:auto"><option value="">Todos los planes</option>
      ${S.planes.map((p) => `<option value="${p.id}" ${S.filtros.plan === p.id ? "selected" : ""}>${esc(p.nombre)}</option>`).join("")}</select>
    <span class="fcount" id="ccnt"></span>
    <button class="btn bo" id="expCob"><span class="msi">download</span>CSV</button>
  </div>
  <div id="tblCob"></div>`;
}

function filtrarCargos() {
  const q = S.filtros.q.toLowerCase().trim();
  return S.cargos.filter((c) => {
    const s = sus(c.suscriptorId);
    if (q && !(`${c.id} ${s.nombre} ${s.documento}`.toLowerCase().includes(q))) return false;
    if (S.filtros.estado && c.estado !== S.filtros.estado) return false;
    if (S.filtros.plan && c.planId !== S.filtros.plan) return false;
    return true;
  }).sort((a, b) => a.vence < b.vence ? 1 : -1);
}

function tablaCobros() {
  const rows = filtrarCargos();
  document.getElementById("ccnt").textContent = `${rows.length} de ${S.cargos.length}`;
  const box = document.getElementById("tblCob");
  if (rows.length === 0) {
    box.innerHTML = `<div class="tablewrap"><div class="empty"><span class="msi">filter_alt_off</span>
      <h4>Ningún cargo coincide con los filtros</h4><p>Los cargos siguen ahí. Probá con otros filtros.</p>
      <button class="btn bo" id="limpiaC">Limpiar filtros</button></div></div>`;
    document.getElementById("limpiaC").onclick = () => { S.filtros = { q: "", plan: "", estado: "", tramo: "" }; render(); };
    return;
  }
  box.innerHTML = `<div class="tablewrap"><div class="tablescroll"><table>
    <thead><tr><th>Cargo</th><th>Suscriptor</th><th>Período</th><th>Vence</th>
      <th class="num">Base</th><th class="num">Mora</th><th class="num">Total</th><th class="num">Saldo</th>
      <th>Estado</th><th>Medio</th><th class="num">Int.</th><th></th></tr></thead>
    <tbody>${rows.map((c) => {
      const s = sus(c.suscriptorId);
      const at = atrasoDias(c);
      return `<tr>
        <td class="mono" style="font-size:11px">${c.id}</td>
        <td><div class="strong" style="font-size:12px">${esc(s.nombre)}</div><div style="font-size:10px;color:var(--osv)">${esc(plan(c.planId).nombre)}</div></td>
        <td class="mono" style="font-size:11px">${c.periodo}</td>
        <td style="font-size:12px">${fecha(c.vence)}${esMoroso(c) ? `<div style="font-size:10px;color:var(--error)">+${at} días</div>` : ""}</td>
        <td class="num">${money(c.base)}</td>
        <td class="num" style="${c.mora > 0 ? "color:var(--warning)" : "color:var(--outline)"}">${c.mora > 0 ? money(c.mora) : "—"}</td>
        <td class="num strong">${money(total(c))}</td>
        <td class="num" style="${saldo(c) > 0 ? "color:var(--error);font-weight:600" : "color:var(--ok)"}">${saldo(c) > 0 ? money(saldo(c)) : money(0)}</td>
        <td><span class="badge ${ESTADOS[c.estado].cls}">${ESTADOS[c.estado].label}</span></td>
        <td style="font-size:11px;color:var(--osv)">${c.medio || "—"}</td>
        <td class="num" style="font-size:11px">${c.intentos}</td>
        <td>${saldo(c) > 0 && c.estado !== "CANCELLED"
          ? `<button class="mini" data-cobrar="${c.id}"><span class="msi">bolt</span>Cobrar</button>`
          : `<span style="color:var(--outline);font-size:11px">—</span>`}</td>
      </tr>`;
    }).join("")}</tbody></table></div></div>`;
  document.querySelectorAll("[data-cobrar]").forEach((b) => b.onclick = () => drawerCobrar(b.dataset.cobrar));
}

function wCobros() {
  tablaCobros();
  const q = document.getElementById("cq");
  q.oninput = () => { S.filtros.q = q.value; tablaCobros(); };
  document.getElementById("cest").onchange = (e) => { S.filtros.estado = e.target.value; tablaCobros(); };
  document.getElementById("cplan").onchange = (e) => { S.filtros.plan = e.target.value; tablaCobros(); };
  document.getElementById("expCob").onclick = () => exportar("cobros", filtrarCargos().map((c) => ({
    cargo: c.id, suscriptor: sus(c.suscriptorId).nombre, documento: sus(c.suscriptorId).documento,
    plan: plan(c.planId).nombre, periodo: c.periodo, emitido: c.emitido, vence: c.vence,
    base: c.base, mora: c.mora, total: total(c), pagado: c.pagado, saldo: saldo(c),
    estado: c.estado, medio: c.medio || "", intentos: c.intentos,
  })));
}

function matrizQr(semilla) {
  let h = 2166136261;
  for (let i = 0; i < semilla.length; i++) { h ^= semilla.charCodeAt(i); h = Math.imul(h, 16777619); }
  const n = 25, cel = [];
  let x = h >>> 0;
  const sig = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const marca = (i < 7 && j < 7) || (i < 7 && j >= n - 7) || (i >= n - 7 && j < 7);
    let on;
    if (marca) {
      const li = i % (n - 7) < 7 ? i % n : i, lj = j;
      const bi = i < 7 ? i : i - (n - 7), bj = j < 7 ? j : j - (n - 7);
      on = bi === 0 || bi === 6 || bj === 0 || bj === 6 || (bi >= 2 && bi <= 4 && bj >= 2 && bj <= 4);
    } else on = sig() > 0.52;
    if (on) cel.push(`<rect x="${j}" y="${i}" width="1" height="1"/>`);
  }
  return `<svg class="qr" viewBox="0 0 ${n} ${n}" xmlns="http://www.w3.org/2000/svg"><rect width="${n}" height="${n}" fill="#fff"/><g fill="#1A3270">${cel.join("")}</g></svg>`;
}

function drawerCobrar(cargoId) {
  const c = S.cargos.find((x) => x.id === cargoId);
  const s = sus(c.suscriptorId);
  const token = "pay_" + c.id.toLowerCase().replace("-", "") + "_" + Math.abs(c.id.charCodeAt(2) * 7919).toString(36);
  const url = `https://pagos.joi360.pe/c/${token}`;
  abrirDrawer({
    titulo: "Cobrar este cargo", sub: `${c.id} · ${s.nombre}`, ico: "bolt", ancho: 560,
    cuerpo: `
      <div class="card" style="padding:16px;margin-bottom:18px">
        <div class="kv"><span class="k">Suscriptor</span><span class="v">${esc(s.nombre)}</span></div>
        <div class="kv"><span class="k">Período</span><span class="v">${c.periodo}</span></div>
        <div class="kv"><span class="k">Vence</span><span class="v">${fecha(c.vence)}${esMoroso(c) ? ` · <span style="color:var(--error)">${atrasoDias(c)} días de atraso</span>` : ""}</span></div>
        <div class="kv"><span class="k">Monto base</span><span class="v">${money(c.base)}</span></div>
        ${c.mora > 0 ? `<div class="kv"><span class="k">Mora acumulada</span><span class="v" style="color:var(--warning)">${money(c.mora)}</span></div>` : ""}
        ${c.pagado > 0 ? `<div class="kv"><span class="k">Ya pagado</span><span class="v" style="color:var(--ok)">${money(c.pagado)}</span></div>` : ""}
        <div class="kv"><span class="k">Total a cobrar</span><span class="v" style="font-size:17px;color:var(--primary)">${money(saldo(c))}</span></div>
      </div>

      <div class="sech"><div><h3 style="font-size:13px">QR de pago</h3><p>Se puede mostrar en pantalla o adjuntar al aviso</p></div></div>
      ${matrizQr(token)}
      <p class="hint" style="text-align:center;margin-bottom:18px">Representación visual. El QR real lo emite el backend con la librería <span class="mono">qrcode</span>, que ya es dependencia del proyecto.</p>

      <div class="sech"><div><h3 style="font-size:13px">Link de pago</h3><p>Un solo cargo, con vencimiento, no adivinable</p></div></div>
      <div class="copybox" style="margin-bottom:8px"><span style="flex:1">${url}</span>
        <button class="mini" id="cp"><span class="msi">content_copy</span>Copiar</button></div>
      <p class="hint" style="margin-bottom:18px">El suscriptor paga sin crear cuenta. Si el cargo ya está pagado, el link lo informa y no permite pagar dos veces.</p>

      <div class="sech"><div><h3 style="font-size:13px">Mandar recordatorio</h3><p>Acá está el valor de la gestión previa</p></div></div>
      <div class="chips" style="margin-bottom:14px">
        <button class="chip on" data-inc="LINK">Incluir link</button>
        <button class="chip on" data-inc="QR">Incluir QR</button>
      </div>
      <div class="note n-info" style="margin:0"><span class="msi">mark_email_read</span>
        <div>Se manda a <b>${esc(s.correo)}</b> con la marca de YOKI. Queda en la bitácora del suscriptor.
        Tope de ${S.reglas.topeRecordatorios} recordatorios manuales por día por persona.</div></div>`,
    pie: `<button class="btn bo" data-cerrar>Cerrar</button>
          <button class="btn bo" id="pagoManual"><span class="msi">price_check</span>Registrar pago</button>
          <button class="btn bp" id="okAviso"><span class="msi">send</span>Enviar recordatorio</button>`,
    luego: () => {
      const inc = new Set(["LINK", "QR"]);
      document.querySelectorAll("[data-inc]").forEach((b) => b.onclick = () => {
        const k = b.dataset.inc;
        if (inc.has(k)) { inc.delete(k); b.classList.remove("on"); } else { inc.add(k); b.classList.add("on"); }
      });
      document.getElementById("cp").onclick = () => {
        navigator.clipboard?.writeText(url);
        toast("Link de pago copiado.", "info");
      };
      document.getElementById("okAviso").onclick = () => {
        if (inc.size === 0) return toast("Elegí al menos link o QR.", "err");
        c.avisos.unshift({
          label: "Recordatorio de pago", tipo: inc.has("QR") && inc.has("LINK") ? "LINK+QR" : [...inc][0],
          manual: true, cuando: new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "short" }),
        });
        bita("notification_event", "ENVIAR_MANUAL", `Recordatorio a ${s.nombre} por ${c.id} (${[...inc].join(" + ")})`);
        cerrarDrawer(); toast(`Recordatorio enviado a ${s.nombre}.`); render();
      };
      document.getElementById("pagoManual").onclick = () => {
        const monto = saldo(c);
        c.pagado = r2(c.pagado + monto);
        c.estado = "PAID"; c.medio = "MANUAL"; c.pagadoEl = iso(HOY);
        bita("payment", "PAGO_MANUAL", `${s.nombre} · ${c.id} · ${money(monto)} registrado como MANUAL`);
        cerrarDrawer(); toast(`Pago de ${money(monto)} registrado. El cargo quedó pagado.`); render();
      };
    },
  });
}

function vMorosidad() {
  const deudores = S.suscriptores
    .map((s) => ({ s, deuda: deudaDe(s.id), mora: moraDe(s.id), at: atrasoMax(s.id), n: cargosDe(s.id).filter((c) => saldo(c) > 0 && c.estado !== "CANCELLED").length }))
    .filter((x) => x.at > 0)
    .sort((a, b) => b.deuda - a.deuda);

  const porTramo = TRAMOS.map((t) => {
    const g = deudores.filter((x) => tramoDe(x.at)?.id === t.id);
    return { ...t, n: g.length, monto: r2(g.reduce((a, x) => a + x.deuda, 0)) };
  });
  const filtrados = S.filtros.tramo ? deudores.filter((x) => tramoDe(x.at)?.id === S.filtros.tramo) : deudores;
  const totalDeuda = r2(deudores.reduce((a, x) => a + x.deuda, 0));

  return `
  <div class="banner" style="background:linear-gradient(135deg,#7A1420,#C8202F)">
    <div><h3>${deudores.length} personas te deben ${money(totalDeuda)}</h3>
      <p>Ordenado por monto. Desde cualquier fila podés mandar el recordatorio con su link y su QR,
      o seleccionar un tramo completo y mandarlo a todos.</p></div>
    <span class="msi">running_with_errors</span>
  </div>

  <div class="kpis">
    ${porTramo.map((t) => `<button class="kpi" data-tramo="${t.id}" style="${S.filtros.tramo === t.id ? "border-color:" + t.color + ";box-shadow:0 0 0 2px " + t.color + "22" : ""}">
      <div class="ico" style="background:${t.color}1a;color:${t.color}"><span class="msi">schedule</span></div>
      <div class="v">${money0(t.monto)}</div><div class="l">${t.label}</div>
      <div class="d">${t.n} ${t.n === 1 ? "deudor" : "deudores"}</div></button>`).join("")}
  </div>

  <div class="sech">
    <div><h3>${S.filtros.tramo ? "Deudores de " + TRAMOS.find((t) => t.id === S.filtros.tramo).label : "Todos los deudores"}</h3>
      <p>${filtrados.length} de ${deudores.length}</p></div>
    <div style="display:flex;gap:10px">
      ${S.filtros.tramo ? `<button class="btn bo" id="verTodos">Ver todos</button>` : ""}
      <button class="btn bo" id="expMor"><span class="msi">download</span>CSV</button>
      <button class="btn bp" id="masivo"><span class="msi">campaign</span>Recordar a los ${filtrados.length}</button>
    </div>
  </div>

  <div class="tablewrap"><div class="tablescroll"><table>
    <thead><tr><th>Suscriptor</th><th>Contacto</th><th>Plan</th><th class="num">Cargos</th>
      <th class="num">Deuda</th><th class="num">Mora</th><th>Antigüedad</th><th>Tramo</th><th></th></tr></thead>
    <tbody>${filtrados.map(({ s, deuda, mora, at, n }) => {
      const t = tramoDe(at);
      return `<tr>
        <td><div class="strong">${esc(s.nombre)}</div><div class="mono" style="font-size:10px;color:var(--osv)">${esc(s.documento)}</div></td>
        <td style="font-size:11px;color:var(--osv)">${esc(s.correo)}${s.telefono ? `<br>${esc(s.telefono)}` : ""}</td>
        <td style="font-size:12px">${esc(plan(s.planId).nombre)}</td>
        <td class="num">${n}</td>
        <td class="num strong" style="color:var(--error)">${money(deuda)}</td>
        <td class="num" style="color:var(--warning)">${mora > 0 ? money(mora) : "—"}</td>
        <td class="num">${at} días</td>
        <td><span class="badge" style="background:${t.color}1a;color:${t.color}">${t.label}</span></td>
        <td><button class="mini" data-cobrar="${cargosDe(s.id).filter((c) => saldo(c) > 0 && c.estado !== "CANCELLED").sort((a, b) => a.vence < b.vence ? -1 : 1)[0].id}">
          <span class="msi">notifications_active</span>Recordar</button></td>
      </tr>`;
    }).join("")}</tbody></table></div></div>`;
}

function wMorosidad() {
  document.querySelectorAll("[data-tramo]").forEach((b) => b.onclick = () => {
    S.filtros.tramo = S.filtros.tramo === b.dataset.tramo ? "" : b.dataset.tramo; render();
  });
  const vt = document.getElementById("verTodos");
  if (vt) vt.onclick = () => { S.filtros.tramo = ""; render(); };
  document.querySelectorAll("[data-cobrar]").forEach((b) => b.onclick = () => drawerCobrar(b.dataset.cobrar));
  document.getElementById("masivo").onclick = () => {
    const deudores = S.suscriptores.filter((s) => atrasoMax(s.id) > 0 && (!S.filtros.tramo || tramoDe(atrasoMax(s.id))?.id === S.filtros.tramo));
    abrirDrawer({
      titulo: "Recordatorio masivo", sub: `${deudores.length} destinatarios`, ico: "campaign",
      cuerpo: `<div class="note n-warn"><span class="msi">group</span>
          <div>Va a <b>${deudores.length} personas</b>${S.filtros.tramo ? ` del tramo <b>${TRAMOS.find((t) => t.id === S.filtros.tramo).label}</b>` : ""}.
          Quien haya pagado entre esta selección y el envío queda excluido automáticamente.</div></div>
        <div class="tl" style="max-height:260px;overflow-y:auto">${deudores.map((s) => `<div class="tli">
          <span class="tic"><span class="msi">person</span></span>
          <span class="tt"><b>${esc(s.nombre)}</b><span>${esc(s.correo)} · debe ${money(deudaDe(s.id))}</span></span></div>`).join("")}</div>`,
      pie: `<button class="btn bo" data-cerrar>Cancelar</button><button class="btn bp" id="okMasivo">Enviar a ${deudores.length}</button>`,
      luego: () => {
        document.getElementById("okMasivo").onclick = () => {
          deudores.forEach((s) => {
            const c = cargosDe(s.id).filter((x) => saldo(x) > 0 && x.estado !== "CANCELLED")[0];
            if (c) c.avisos.unshift({ label: "Recordatorio masivo", tipo: "LINK+QR", manual: true, cuando: new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "short" }) });
          });
          bita("notification_event", "ENVIAR_MASIVO", `Recordatorio masivo a ${deudores.length} deudores`);
          cerrarDrawer(); toast(`Recordatorio enviado a ${deudores.length} personas.`); render();
        };
      },
    });
  };
  document.getElementById("expMor").onclick = () => {
    const rows = S.suscriptores.filter((s) => atrasoMax(s.id) > 0 && (!S.filtros.tramo || tramoDe(atrasoMax(s.id))?.id === S.filtros.tramo));
    exportar("morosidad", rows.map((s) => ({
      documento: s.documento, nombre: s.nombre, correo: s.correo, telefono: s.telefono,
      plan: plan(s.planId).nombre, cargos_pendientes: cargosDe(s.id).filter((c) => saldo(c) > 0).length,
      deuda: deudaDe(s.id), mora: moraDe(s.id), antiguedad_dias: atrasoMax(s.id), tramo: tramoDe(atrasoMax(s.id)).label,
    })));
  };
}

const COLUMNAS = ["documento", "nombre", "correo", "telefono", "plan", "monto", "periodicidad", "fecha_primer_cobro"];
const OBLIGATORIAS = ["documento", "nombre", "correo", "plan", "monto", "fecha_primer_cobro"];
const PERIODICIDADES = ["MENSUAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL"];

const MOTIVOS = {
  documento_invalido: "El documento tiene que ser DNI de 8 dígitos, RUC de 11, o carné de 9 a 12 alfanumérico.",
  nombre_invalido: "El nombre necesita al menos 3 caracteres.",
  correo_invalido: "El correo no tiene un formato válido.",
  telefono_invalido: "El teléfono, si viene, tiene que tener 9 dígitos.",
  plan_no_existe: "Ese plan no existe en este comercio.",
  monto_invalido: "El monto tiene que ser numérico y mayor que cero.",
  periodicidad_invalida: "La periodicidad tiene que ser MENSUAL, TRIMESTRAL, SEMESTRAL o ANUAL.",
  fecha_invalida: "La fecha tiene que venir como AAAA-MM-DD y ser una fecha real.",
  documento_duplicado_en_archivo: "Ese documento ya apareció en una fila anterior del mismo archivo.",
};

function parseCsv(texto) {
  const lineas = texto.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim() !== "");
  if (lineas.length === 0) return { error: "El archivo está vacío." };
  const cab = lineas[0].split(",").map((h) => h.trim().toLowerCase());
  const faltan = OBLIGATORIAS.filter((c) => !cab.includes(c));
  if (faltan.length) return { error: `Faltan columnas obligatorias: ${faltan.join(", ")}.` };
  if (lineas.length === 1) return { error: "El archivo trae encabezados pero ninguna fila de datos." };
  const filas = lineas.slice(1).map((l, i) => {
    const celdas = l.split(",").map((c) => c.trim());
    const o = { _fila: i + 2 };
    cab.forEach((h, j) => { if (COLUMNAS.includes(h)) o[h] = celdas[j] == null ? "" : celdas[j]; });
    return o;
  });
  return { filas };
}

function validarFila(f, vistos) {
  const errores = [];
  const doc = String(f.documento || "");
  const esDni = /^\d{8}$/.test(doc), esRuc = /^\d{11}$/.test(doc), esCe = /^[A-Za-z0-9]{9,12}$/.test(doc);
  if (!doc || !(esDni || esRuc || esCe)) errores.push("documento_invalido");
  else if (vistos.has(doc)) errores.push("documento_duplicado_en_archivo");

  if (!f.nombre || f.nombre.trim().length < 3) errores.push("nombre_invalido");
  if (!f.correo || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.correo)) errores.push("correo_invalido");
  if (f.telefono && !/^\d{9}$/.test(f.telefono)) errores.push("telefono_invalido");
  if (!planPorNombre(f.plan)) errores.push("plan_no_existe");

  const montoTexto = String(f.monto || "").replace(",", ".");
  const monto = Number(montoTexto);
  if (!montoTexto || Number.isNaN(monto) || !(monto > 0)) errores.push("monto_invalido");

  const per = String(f.periodicidad || "").toUpperCase();
  if (per && !PERIODICIDADES.includes(per)) errores.push("periodicidad_invalida");

  const fv = String(f.fecha_primer_cobro || "");
  const fok = /^\d{4}-\d{2}-\d{2}$/.test(fv) && !Number.isNaN(new Date(fv + "T00:00:00").getTime());
  if (!fok) errores.push("fecha_invalida");

  if (!errores.includes("documento_invalido") && !errores.includes("documento_duplicado_en_archivo")) vistos.add(doc);

  const existente = S.suscriptores.find((s) => s.documento === doc);
  return { fila: f, errores, monto: r2(monto), periodicidad: per || null, accion: existente ? "ACTUALIZAR" : "ALTA", existente };
}

function vCarga() {
  const j = S.importJob;
  if (!j) {
    return `
    <div class="note n-info"><span class="msi">info</span>
      <div>La carga tiene dos pasos: primero se valida fila por fila y recién después se puede confirmar.
      <b>Las filas con error no bloquean a las correctas.</b></div></div>
    <div class="drop" id="drop">
      <span class="msi">cloud_upload</span>
      <h4>Arrastrá tu archivo CSV acá</h4>
      <p>O hacé clic para elegirlo. En este directorio hay uno de ejemplo: <span class="mono">ejemplo-cartera-yoki.csv</span></p>
      <input type="file" id="file" accept=".csv,text/csv" style="display:none">
    </div>
    <div class="sech" style="margin-top:24px"><div><h3>Columnas que espera el archivo</h3>
      <p>Se resuelven por nombre, no por posición</p></div>
      <button class="btn bo" id="plantilla"><span class="msi">download</span>Descargar plantilla</button></div>
    <div class="tablewrap"><div class="tablescroll"><table>
      <thead><tr><th>Columna</th><th>Obligatoria</th><th>Regla</th></tr></thead>
      <tbody>
        <tr><td class="mono">documento</td><td>Sí</td><td>DNI 8 dígitos, RUC 11, o carné 9 a 12 alfanumérico</td></tr>
        <tr><td class="mono">nombre</td><td>Sí</td><td>Mínimo 3 caracteres</td></tr>
        <tr><td class="mono">correo</td><td>Sí</td><td>Formato de correo válido</td></tr>
        <tr><td class="mono">telefono</td><td>No</td><td>Si viene, 9 dígitos</td></tr>
        <tr><td class="mono">plan</td><td>Sí</td><td>Tiene que coincidir con un plan del comercio</td></tr>
        <tr><td class="mono">monto</td><td>Sí</td><td>Numérico mayor que cero. Acepta coma decimal</td></tr>
        <tr><td class="mono">periodicidad</td><td>No</td><td>MENSUAL, TRIMESTRAL, SEMESTRAL o ANUAL</td></tr>
        <tr><td class="mono">fecha_primer_cobro</td><td>Sí</td><td>AAAA-MM-DD, fecha real</td></tr>
      </tbody></table></div></div>`;
  }

  const val = j.resultados.filter((r) => r.errores.length === 0);
  const inv = j.resultados.filter((r) => r.errores.length > 0);
  const altas = val.filter((r) => r.accion === "ALTA");
  const upd = val.filter((r) => r.accion === "ACTUALIZAR");
  const cambios = upd.map((r) => {
    const d = [];
    if (r.existente.correo !== r.fila.correo) d.push(["correo", r.existente.correo, r.fila.correo]);
    if ((r.existente.telefono || "") !== (r.fila.telefono || "")) d.push(["teléfono", r.existente.telefono || "—", r.fila.telefono || "—"]);
    if (r.existente.monto !== r.monto) d.push(["monto", money(r.existente.monto), money(r.monto)]);
    if (r.existente.nombre !== r.fila.nombre) d.push(["nombre", r.existente.nombre, r.fila.nombre]);
    return { r, d };
  }).filter((x) => x.d.length > 0);

  return `
  <div class="sech"><div><h3>Validación de <span class="mono">${esc(j.filename)}</span></h3>
    <p>${j.resultados.length} filas leídas · estado ${j.estado}</p></div>
    <button class="btn bo" id="otroArchivo"><span class="msi">restart_alt</span>Cargar otro archivo</button></div>

  <div class="kpis">
    ${kpi("fact_check", "#1A3270", "#EEF2FD", j.resultados.length, "Filas leídas", "")}
    ${kpi("check_circle", "#097A54", "#E7F5EF", val.length, "Válidas", `${altas.length} altas · ${upd.length} actualizaciones`)}
    ${kpi("error", "#C8202F", "#FCECEE", inv.length, "Con error", inv.length ? "no bloquean a las válidas" : "ninguna")}
    ${kpi("published_with_changes", "#6B4FA3", "#F1ECF9", cambios.length, "Con cambios reales", "de las actualizaciones")}
  </div>

  ${inv.length ? `<div class="sec">
    <div class="sech"><div><h3>Filas con error</h3><p>Estas no se van a importar. El resto sí.</p></div>
      <button class="btn bo" id="expErr"><span class="msi">download</span>Descargar errores</button></div>
    <div class="tablewrap"><div class="tablescroll"><table>
      <thead><tr><th>Fila</th><th>Documento</th><th>Nombre</th><th>Motivo</th></tr></thead>
      <tbody>${inv.map((r) => `<tr>
        <td class="mono">${r.fila._fila}</td>
        <td class="mono" style="font-size:11px">${esc(r.fila.documento)}</td>
        <td style="font-size:12px">${esc(r.fila.nombre)}</td>
        <td>${r.errores.map((e) => `<div style="font-size:11px;color:var(--error);display:flex;gap:6px;align-items:flex-start">
          <span class="msi" style="font-size:13px">error</span><span><b class="mono">${e}</b> — ${MOTIVOS[e]}</span></div>`).join("")}</td>
      </tr>`).join("")}</tbody></table></div></div></div>` : ""}

  ${cambios.length ? `<div class="sec">
    <div class="sech"><div><h3>Vista previa de cambios</h3><p>Qué se va a modificar en la cartera que ya tenés</p></div></div>
    <div class="tablewrap"><div class="tablescroll"><table>
      <thead><tr><th>Suscriptor</th><th>Campo</th><th>Antes</th><th>Después</th></tr></thead>
      <tbody>${cambios.flatMap(({ r, d }) => d.map((c, k) => `<tr>
        <td>${k === 0 ? `<div class="strong" style="font-size:12px">${esc(r.fila.nombre)}</div><div class="mono" style="font-size:10px;color:var(--osv)">${esc(r.fila.documento)}</div>` : ""}</td>
        <td style="font-size:12px">${c[0]}</td>
        <td style="font-size:12px;color:var(--osv)">${esc(c[1])}</td>
        <td style="font-size:12px;font-weight:600;color:var(--primary)">${esc(c[2])}</td>
      </tr>`)).join("")}</tbody></table></div></div></div>` : ""}

  ${altas.length ? `<div class="sec">
    <div class="sech"><div><h3>Altas nuevas</h3><p>${altas.length} personas que todavía no están en la cartera</p></div></div>
    <div class="tablewrap"><div class="tablescroll"><table>
      <thead><tr><th>Documento</th><th>Nombre</th><th>Correo</th><th>Plan</th><th class="num">Monto</th><th>Primer cobro</th></tr></thead>
      <tbody>${altas.map((r) => `<tr>
        <td class="mono" style="font-size:11px">${esc(r.fila.documento)}</td>
        <td class="strong" style="font-size:12px">${esc(r.fila.nombre)}</td>
        <td style="font-size:11px;color:var(--osv)">${esc(r.fila.correo)}</td>
        <td style="font-size:12px">${esc(r.fila.plan)}</td>
        <td class="num">${money(r.monto)}</td>
        <td style="font-size:12px">${fecha(r.fila.fecha_primer_cobro)}</td>
      </tr>`).join("")}</tbody></table></div></div></div>` : ""}

  <div class="note ${j.estado === "APLICADO" ? "n-ok" : "n-warn"}">
    <span class="msi">${j.estado === "APLICADO" ? "task_alt" : "pending_actions"}</span>
    <div>${j.estado === "APLICADO"
      ? `Carga aplicada: ${j.creadas} altas y ${j.actualizadas} actualizaciones. Quedó registrada en la bitácora.`
      : `Revisá el resumen y confirmá. Se importan solo las <b>${val.length} filas válidas</b>. Las ${inv.length} con error quedan afuera.`}</div></div>

  ${j.estado !== "APLICADO" ? `<div style="display:flex;gap:10px;justify-content:flex-end">
    <button class="btn bo" id="cancelarJob">Cancelar</button>
    <button class="btn bp" id="aplicarJob" ${val.length === 0 ? "disabled" : ""}>
      <span class="msi">task_alt</span>Confirmar e importar ${val.length} filas</button></div>` : ""}`;
}

function wCarga() {
  const j = S.importJob;
  if (!j) {
    const drop = document.getElementById("drop");
    const file = document.getElementById("file");
    drop.onclick = () => file.click();
    drop.ondragover = (e) => { e.preventDefault(); drop.classList.add("over"); };
    drop.ondragleave = () => drop.classList.remove("over");
    drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove("over"); if (e.dataTransfer.files[0]) leer(e.dataTransfer.files[0]); };
    file.onchange = () => { if (file.files[0]) leer(file.files[0]); };
    document.getElementById("plantilla").onclick = () => {
      descargar("plantilla-cartera.csv", COLUMNAS.join(",") + "\n" + "44871203,Nombre Apellido,correo@dominio.com,987654321,YOKI Full,89.00,MENSUAL,2026-10-05\n");
      toast("Plantilla descargada.", "info");
    };
    return;
  }
  const oa = document.getElementById("otroArchivo");
  if (oa) oa.onclick = () => { S.importJob = null; render(); };
  const ee = document.getElementById("expErr");
  if (ee) ee.onclick = () => exportar("errores-carga", j.resultados.filter((r) => r.errores.length).map((r) => ({
    fila: r.fila._fila, documento: r.fila.documento, nombre: r.fila.nombre,
    codigos: r.errores.join(" | "), motivos: r.errores.map((e) => MOTIVOS[e]).join(" | "),
  })));
  const cj = document.getElementById("cancelarJob");
  if (cj) cj.onclick = () => { S.importJob = null; toast("Carga cancelada. No se importó nada.", "info"); render(); };
  const aj = document.getElementById("aplicarJob");
  if (aj) aj.onclick = aplicarCarga;
}

function leer(f) {
  if (!/\.csv$/i.test(f.name)) return toast("El archivo tiene que ser un CSV.", "err");
  const fr = new FileReader();
  fr.onload = () => {
    const { error, filas } = parseCsv(String(fr.result));
    if (error) return toast(error, "err");
    const vistos = new Set();
    S.importJob = { filename: f.name, estado: "VALIDADO", resultados: filas.map((x) => validarFila(x, vistos)), creadas: 0, actualizadas: 0 };
    const v = S.importJob.resultados.filter((r) => r.errores.length === 0).length;
    toast(`${filas.length} filas leídas · ${v} válidas · ${filas.length - v} con error`, filas.length - v ? "info" : "ok");
    render();
  };
  fr.onerror = () => toast("No se pudo leer el archivo.", "err");
  fr.readAsText(f, "utf-8");
}

function aplicarCarga() {
  const j = S.importJob;
  const val = j.resultados.filter((r) => r.errores.length === 0);
  let creadas = 0, actualizadas = 0;
  val.forEach((r) => {
    const p = planPorNombre(r.fila.plan);
    if (r.existente) {
      const s = r.existente;
      if (s.correo !== r.fila.correo) bita("subscriber", "ACTUALIZAR", `${s.nombre}: correo ${s.correo} → ${r.fila.correo}`);
      if (s.monto !== r.monto) bita("subscription", "ACTUALIZAR", `${s.nombre}: monto ${money(s.monto)} → ${money(r.monto)}`);
      s.correo = r.fila.correo; s.telefono = r.fila.telefono || ""; s.nombre = r.fila.nombre; s.monto = r.monto;
      actualizadas += 1;
    } else {
      const id = "s-imp-" + (S.suscriptores.length + 1) + "-" + creadas;
      S.suscriptores.push({
        id, documento: r.fila.documento, nombre: r.fila.nombre, correo: r.fila.correo,
        telefono: r.fila.telefono || "", planId: p.id, monto: r.monto,
        periodicidad: r.periodicidad || p.periodicidad, estado: "ACTIVE",
        altaEl: iso(HOY), saldoFavor: 0, perfil: "importado",
      });
      const venc = new Date(r.fila.fecha_primer_cobro + "T00:00:00");
      S.cargos.push({
        id: "C-" + String(3900 + S.cargos.length), suscriptorId: id, planId: p.id,
        periodo: `${venc.getFullYear()}-${String(venc.getMonth() + 1).padStart(2, "0")}`,
        cicloIni: iso(new Date(venc.getFullYear(), venc.getMonth(), 1)),
        cicloFin: iso(new Date(venc.getFullYear(), venc.getMonth() + 1, 0)),
        emitido: iso(addDia(venc, -S.reglas.anticipacion)), vence: iso(venc),
        base: r.monto, mora: 0, pagado: 0, estado: "SCHEDULED",
        medio: null, pagadoEl: null, intentos: 0, avisos: [], manual: false,
      });
      creadas += 1;
    }
  });
  j.estado = "APLICADO"; j.creadas = creadas; j.actualizadas = actualizadas;
  bita("import_job", "APLICAR", `${j.filename}: ${creadas} altas, ${actualizadas} actualizaciones, ${j.resultados.length - val.length} rechazadas`);
  toast(`Importado: ${creadas} altas y ${actualizadas} actualizaciones.`);
  render();
}

function prorratear({ cicloIni, cicloFin, efectiva, montoActual, montoNuevo }) {
  const ini = new Date(cicloIni + "T00:00:00");
  const fin = new Date(cicloFin + "T00:00:00");
  const ef = new Date(efectiva + "T00:00:00");
  if (ef < ini || ef > fin) return { error: "La fecha efectiva tiene que caer dentro del ciclo en curso." };
  const diasCiclo = dias(ini, fin) + 1;
  const consumidos = dias(ini, ef);
  const restantes = diasCiclo - consumidos;
  const credito = montoActual * restantes / diasCiclo;
  const cargo = montoNuevo * restantes / diasCiclo;
  const neto = r2(cargo - credito);
  return {
    diasCiclo, consumidos, restantes,
    credito: r2(credito), cargo: r2(cargo), neto,
    direccion: neto > 0 ? "CARGO" : neto < 0 ? "CREDITO" : "NINGUNO",
  };
}

function vProrateo() {
  const elegido = S.prorateoSus || S.suscriptores[0].id;
  const s = sus(elegido);
  const pActual = plan(s.planId);
  const cicloIni = iso(new Date(HOY.getFullYear(), HOY.getMonth(), 1));
  const cicloFin = iso(new Date(HOY.getFullYear(), HOY.getMonth() + 1, 0));
  const destino = S.prorateoPlan && S.prorateoPlan !== s.planId ? S.prorateoPlan : (S.planes.find((p) => p.id !== s.planId) || pActual).id;
  const pNuevo = plan(destino);
  const efectiva = S.prorateoFecha || iso(HOY);
  const res = prorratear({ cicloIni, cicloFin, efectiva, montoActual: s.monto, montoNuevo: pNuevo.monto });

  return `
  <div class="note n-info"><span class="msi">functions</span>
    <div>El prorateo se calcula sobre los <b>días que quedan del ciclo</b>: se acredita lo no usado del plan
    actual y se cobra lo que resta del plan nuevo. El redondeo se aplica <b>una sola vez sobre el neto</b>,
    para que la suma no se desvíe. Nada se aplica hasta que confirmes.</div></div>

  <div class="grid2" style="align-items:start">
    <div class="card" style="padding:20px">
      <div class="sech"><div><h3>Simulador</h3><p>Elegí la persona, el plan destino y la fecha</p></div></div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div><label class="fl">Suscriptor</label><select id="prSus">
          ${S.suscriptores.map((x) => `<option value="${x.id}" ${x.id === elegido ? "selected" : ""}>${esc(x.nombre)} · ${esc(plan(x.planId).nombre)}</option>`).join("")}</select></div>
        <div class="grid2">
          <div><label class="fl">Plan actual</label><input value="${esc(pActual.nombre)} · ${money(s.monto)}" disabled></div>
          <div><label class="fl">Plan destino</label><select id="prPlan">
            ${S.planes.filter((p) => p.id !== s.planId).map((p) => `<option value="${p.id}" ${p.id === destino ? "selected" : ""}>${esc(p.nombre)} · ${money(p.monto)}</option>`).join("")}</select></div>
        </div>
        <div><label class="fl">Fecha efectiva del cambio</label>
          <input type="date" id="prFecha" value="${efectiva}" min="${cicloIni}" max="${cicloFin}">
          <p class="hint">Ciclo en curso: ${fecha(cicloIni)} a ${fecha(cicloFin)}</p></div>
      </div>
    </div>

    <div class="card" style="padding:20px">
      <div class="sech"><div><h3>Cálculo</h3><p>Lo que se le va a cobrar o acreditar</p></div></div>
      ${res.error ? `<div class="note n-err" style="margin:0"><span class="msi">error</span><div>${res.error}</div></div>` : `
      <div class="kv"><span class="k">Días totales del ciclo</span><span class="v mono">${res.diasCiclo}</span></div>
      <div class="kv"><span class="k">Días ya consumidos</span><span class="v mono">${res.consumidos}</span></div>
      <div class="kv"><span class="k">Días que quedan</span><span class="v mono">${res.restantes}</span></div>
      <div class="kv"><span class="k">Crédito por lo no usado<br><span style="font-size:11px">${money(s.monto)} × ${res.restantes} / ${res.diasCiclo}</span></span>
        <span class="v" style="color:var(--ok)">− ${money(res.credito)}</span></div>
      <div class="kv"><span class="k">Cargo por lo que resta<br><span style="font-size:11px">${money(pNuevo.monto)} × ${res.restantes} / ${res.diasCiclo}</span></span>
        <span class="v" style="color:var(--info)">+ ${money(res.cargo)}</span></div>
      <div style="margin-top:16px;padding:16px;border-radius:10px;background:${res.direccion === "CARGO" ? "var(--info-bg)" : res.direccion === "CREDITO" ? "var(--ok-bg)" : "var(--sc)"}">
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--osv);margin-bottom:6px">
          ${res.direccion === "CARGO" ? "A cobrar ahora" : res.direccion === "CREDITO" ? "Saldo a favor" : "Sin movimiento"}</div>
        <div style="font-size:30px;font-weight:900;color:${res.direccion === "CARGO" ? "var(--info)" : res.direccion === "CREDITO" ? "var(--ok)" : "var(--osv)"}">
          ${money(Math.abs(res.neto))}</div>
        <p style="font-size:12px;color:var(--osv);margin-top:8px">
          ${res.direccion === "CARGO" ? `Sube de ${money(s.monto)} a ${money(pNuevo.monto)}. Se emite un cargo por la diferencia y el próximo ciclo sale completo al precio nuevo.`
            : res.direccion === "CREDITO" ? `Baja de ${money(s.monto)} a ${money(pNuevo.monto)}. La diferencia queda como saldo a favor y se descuenta del próximo cargo.`
            : "Los montos coinciden: solo cambia el plan, sin movimiento de dinero."}</p>
      </div>
      ${pActual.permanencia ? `<div class="note n-warn" style="margin-top:14px"><span class="msi">lock_clock</span>
        <div>${esc(pActual.nombre)} tiene permanencia de ${pActual.permanencia} meses. Verificá que ya se haya cumplido.</div></div>` : ""}
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">
        <button class="btn bp" id="prAplicar"><span class="msi">published_with_changes</span>Aplicar cambio de plan</button></div>`}
    </div>
  </div>

  <div class="sec" style="margin-top:24px">
    <div class="sech"><div><h3>Casos que el motor tiene que resolver igual</h3>
      <p>Los mismos que quedan como pruebas obligatorias en tasks.md T-60</p></div></div>
    <div class="tablewrap"><div class="tablescroll"><table>
      <thead><tr><th>Caso</th><th>Ciclo</th><th>Efectiva</th><th>De → a</th><th class="num">Días rest.</th><th class="num">Neto</th><th>Dirección</th></tr></thead>
      <tbody>${[
        ["Sube a mitad de ciclo", 30, 15, 50, 80], ["Baja a mitad de ciclo", 30, 15, 80, 50],
        ["Mismo monto", 30, 10, 50, 50], ["Efectiva = inicio", 30, 1, 50, 80],
        ["Efectiva = fin", 30, 30, 50, 80], ["Febrero", 28, 14, 49, 89],
      ].map(([nombre, dc, dia, ma, mn]) => {
        const ini = new Date(2026, dc === 28 ? 1 : 8, 1);
        const fin = new Date(ini.getFullYear(), ini.getMonth() + 1, 0);
        const ef = new Date(ini.getFullYear(), ini.getMonth(), dia);
        const r = prorratear({ cicloIni: iso(ini), cicloFin: iso(fin), efectiva: iso(ef), montoActual: ma, montoNuevo: mn });
        return `<tr><td class="strong" style="font-size:12px">${nombre}</td><td class="num">${r.diasCiclo}</td>
          <td class="num">día ${dia}</td><td class="num">${money(ma)} → ${money(mn)}</td>
          <td class="num">${r.restantes}</td><td class="num strong">${money(r.neto)}</td>
          <td><span class="badge ${r.direccion === "CARGO" ? "b-pending" : r.direccion === "CREDITO" ? "b-paid" : "b-cancelled"}">${r.direccion}</span></td></tr>`;
      }).join("")}</tbody></table></div></div>
  </div>`;
}

function wProrateo() {
  const ps = document.getElementById("prSus");
  ps.onchange = () => { S.prorateoSus = ps.value; S.prorateoPlan = null; render(); };
  const pp = document.getElementById("prPlan");
  if (pp) pp.onchange = () => { S.prorateoPlan = pp.value; render(); };
  const pf = document.getElementById("prFecha");
  if (pf) pf.onchange = () => { S.prorateoFecha = pf.value; render(); };
  const ap = document.getElementById("prAplicar");
  if (ap) ap.onclick = () => {
    const s = sus(S.prorateoSus || S.suscriptores[0].id);
    const pNuevo = plan(S.prorateoPlan || S.planes.find((p) => p.id !== s.planId).id);
    const cicloIni = iso(new Date(HOY.getFullYear(), HOY.getMonth(), 1));
    const cicloFin = iso(new Date(HOY.getFullYear(), HOY.getMonth() + 1, 0));
    const res = prorratear({ cicloIni, cicloFin, efectiva: S.prorateoFecha || iso(HOY), montoActual: s.monto, montoNuevo: pNuevo.monto });
    if (res.error) return toast(res.error, "err");
    const antes = plan(s.planId).nombre, montoAntes = s.monto;
    s.planId = pNuevo.id; s.monto = pNuevo.monto; s.periodicidad = pNuevo.periodicidad;
    if (res.direccion === "CARGO") {
      S.cargos.push({
        id: "C-" + String(4500 + S.cargos.length), suscriptorId: s.id, planId: pNuevo.id,
        periodo: `${HOY.getFullYear()}-${String(HOY.getMonth() + 1).padStart(2, "0")}-AJ`,
        cicloIni, cicloFin, emitido: iso(HOY), vence: iso(addDia(HOY, 5)),
        base: res.neto, mora: 0, pagado: 0, estado: "PENDING",
        medio: null, pagadoEl: null, intentos: 0, avisos: [], manual: true,
      });
      toast(`Plan cambiado. Se emitió un cargo de ajuste por ${money(res.neto)}.`);
    } else if (res.direccion === "CREDITO") {
      s.saldoFavor = r2(s.saldoFavor + Math.abs(res.neto));
      toast(`Plan cambiado. Quedó ${money(Math.abs(res.neto))} de saldo a favor.`);
    } else toast("Plan cambiado sin movimiento de dinero.");
    bita("plan_change", "APLICAR", `${s.nombre}: ${antes} (${money(montoAntes)}) → ${pNuevo.nombre} (${money(pNuevo.monto)}) · ${res.restantes}/${res.diasCiclo} días · neto ${money(res.neto)}`);
    S.tab = "suscriptores"; render();
  };
}

function vReglas() {
  const r = S.reglas;
  return `
  <div class="note n-warn"><span class="msi">history</span>
    <div>Un cambio de reglas afecta <b>solo a los cargos futuros</b>. Los cargos ya emitidos conservan
    las reglas con las que nacieron: cada uno guarda su propia copia.</div></div>

  <div class="grid2" style="align-items:start">
    <div class="card" style="padding:20px">
      <div class="sech"><div><h3>Reglas de cobranza</h3><p>Cómo se cobra y qué pasa si no pagan</p></div></div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="grid2">
          <div><label class="fl">Emitir con anticipación</label><input type="number" min="0" id="rAnt" value="${r.anticipacion}"><p class="hint">días antes del vencimiento</p></div>
          <div><label class="fl">Días de gracia</label><input type="number" min="0" id="rGra" value="${r.gracia}"><p class="hint">antes de considerarlo vencido</p></div>
        </div>
        <div style="border-top:1px solid var(--ov);padding-top:14px">
          <label class="fl">Mora</label>
          <div class="grid2" style="gap:12px">
            <select id="rMt"><option value="NONE" ${r.moraTipo === "NONE" ? "selected" : ""}>Sin mora</option>
              <option value="FIJO" ${r.moraTipo === "FIJO" ? "selected" : ""}>Monto fijo</option>
              <option value="PORCENTAJE" ${r.moraTipo === "PORCENTAJE" ? "selected" : ""}>Porcentaje</option></select>
            <input type="number" min="0" step="0.5" id="rMv" value="${r.moraValor}">
          </div>
          <div class="grid2" style="gap:12px;margin-top:12px">
            <div><label class="fl">Tope acumulable</label><input type="number" min="0" id="rMc" value="${r.moraTope}"></div>
            <div><label class="fl">Presentación</label><select id="rMs">
              <option value="1" ${r.moraSeparada ? "selected" : ""}>Concepto separado</option>
              <option value="0" ${!r.moraSeparada ? "selected" : ""}>Sumada al cargo</option></select></div>
          </div>
        </div>
        <div style="border-top:1px solid var(--ov);padding-top:14px" class="grid2">
          <div><label class="fl">Suspender tras</label><input type="number" min="1" id="rSus" value="${r.suspenderTras}"><p class="hint">cargos vencidos</p></div>
          <div><label class="fl">Cancelar tras</label><input type="number" min="1" id="rCan" value="${r.cancelarTras}"><p class="hint">meses suspendido</p></div>
        </div>
        <div><label class="fl">Reactivación</label><select id="rRe">
          <option value="AUTO_AL_PAGAR" ${r.reactivacion === "AUTO_AL_PAGAR" ? "selected" : ""}>Automática al pagar</option>
          <option value="MANUAL" ${r.reactivacion === "MANUAL" ? "selected" : ""}>Manual</option></select></div>
        <div><label class="fl">Tope de recordatorios manuales por día</label><input type="number" min="1" id="rTope" value="${r.topeRecordatorios}"></div>
        <button class="btn bp" id="okReglas" style="align-self:flex-end"><span class="msi">save</span>Guardar reglas</button>
      </div>
    </div>

    <div class="card" style="padding:20px">
      <div class="sech"><div><h3>Calendario de avisos</h3><p>Relativo a la fecha de vencimiento</p></div></div>
      ${S.avisos.map((a, i) => `<div class="rowflex">
        <span class="msi" style="color:${a.on ? "var(--primary)" : "var(--outline)"}">
          ${a.kind === "PAYMENT_CONFIRMED" ? "check_circle" : a.offset < 0 ? "schedule_send" : a.offset === 0 ? "event" : "notifications_active"}</span>
        <span class="rf1"><b>${esc(a.label)}</b>
          <span>${a.kind === "PAYMENT_CONFIRMED" ? "al acreditarse el pago" : a.offset === 0 ? "el día del vencimiento" : a.offset < 0 ? `${Math.abs(a.offset)} días antes` : `${a.offset} días después`}</span></span>
        <button class="sw ${a.on ? "on" : ""}" data-aviso="${i}"><i></i></button>
      </div>`).join("")}
      <div class="note n-ok" style="margin-top:16px"><span class="msi">block</span>
        <div><b>Si el cargo ya está pagado, sus avisos pendientes no se envían.</b> Se verifica al momento
        de enviar, no al programar, y queda registrado como <span class="mono">SKIPPED_ALREADY_PAID</span>.</div></div>
      <div class="note n-warn" style="margin-top:12px"><span class="msi">mail_lock</span>
        <div>El envío automático por correo está <b>pendiente de definición</b>: no hay proveedor
        transaccional en el backend. Mientras tanto el recordatorio manual funciona copiando el link.</div></div>
    </div>
  </div>

  <div class="sec" style="margin-top:24px">
    <div class="sech"><div><h3>Bitácora</h3><p>Todo cambio sensible queda registrado</p></div></div>
    ${S.bitacora.length === 0 ? `<div class="tablewrap"><div class="empty"><span class="msi">history</span>
      <h4>Sin movimientos todavía</h4><p>Cargá cartera, cambiá un precio o aplicá un prorateo y vas a verlo acá.</p></div></div>`
      : `<div class="tablewrap"><div class="tablescroll"><table>
      <thead><tr><th>Cuándo</th><th>Entidad</th><th>Acción</th><th>Detalle</th><th>Usuario</th></tr></thead>
      <tbody>${S.bitacora.slice(0, 20).map((b) => `<tr>
        <td class="mono" style="font-size:11px">${b.cuando.toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
        <td class="mono" style="font-size:11px">${b.entidad}</td>
        <td><span class="badge b-pending">${b.accion}</span></td>
        <td style="font-size:12px">${esc(b.detalle)}</td>
        <td style="font-size:11px;color:var(--osv)">${b.quien}</td></tr>`).join("")}</tbody></table></div></div>`}
  </div>`;
}

function wReglas() {
  document.querySelectorAll("[data-aviso]").forEach((b) => b.onclick = () => {
    const a = S.avisos[Number(b.dataset.aviso)];
    a.on = !a.on;
    bita("notification_rule", a.on ? "ACTIVAR" : "DESACTIVAR", a.label);
    render();
  });
  document.getElementById("okReglas").onclick = () => {
    const n = (id) => Number(document.getElementById(id).value);
    const gracia = n("rGra"), suspender = n("rSus"), tipo = document.getElementById("rMt").value;
    const valor = n("rMv"), tope = n("rMc");
    if (suspender < 1) return toast("Suspender tras cero cargos no es una regla válida.", "err");
    if (gracia > suspender * 30) return toast("La gracia no puede ser mayor que el plazo de suspensión.", "err");
    if (tipo !== "NONE" && tope > 0 && tope < valor) return toast("El tope de mora no puede ser menor que una sola aplicación.", "err");
    Object.assign(S.reglas, {
      anticipacion: n("rAnt"), gracia, moraTipo: tipo, moraValor: valor, moraTope: tope,
      moraSeparada: document.getElementById("rMs").value === "1",
      suspenderTras: suspender, cancelarTras: n("rCan"),
      reactivacion: document.getElementById("rRe").value, topeRecordatorios: n("rTope"),
    });
    bita("collection_rule", "ACTUALIZAR", `Reglas guardadas · gracia ${gracia}d · mora ${tipo} ${valor} · suspende tras ${suspender}`);
    toast("Reglas guardadas. Aplican solo a cargos futuros.");
    render();
  };
}

function abrirDrawer({ titulo, sub, ico, cuerpo, pie, luego, ancho }) {
  document.getElementById("drawer").innerHTML = `<div class="ov"><div class="bg" data-cerrar></div>
    <aside class="dw" ${ancho ? `style="width:${ancho}px"` : ""}>
      <div class="dh"><div style="display:flex;gap:12px;align-items:center">
        <div style="width:40px;height:40px;border-radius:8px;background:var(--primary-fixed);color:var(--primary);display:flex;align-items:center;justify-content:center"><span class="msi">${ico}</span></div>
        <div><h3>${esc(titulo)}</h3><p>${esc(sub)}</p></div></div>
        <button class="x" data-cerrar><span class="msi">close</span></button></div>
      <div class="db">${cuerpo}</div>${pie ? `<div class="df">${pie}</div>` : ""}</aside></div>`;
  document.querySelectorAll("[data-cerrar]").forEach((b) => b.onclick = cerrarDrawer);
  if (luego) luego();
}
function cerrarDrawer() { document.getElementById("drawer").innerHTML = ""; }

function descargar(nombre, contenido) {
  const blob = new Blob(["\ufeff" + contenido], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function exportar(nombre, filas) {
  if (!filas.length) return toast("No hay filas para exportar con los filtros actuales.", "info");
  const cab = Object.keys(filas[0]);
  const cel = (v) => { const s = String(v == null ? "" : v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [cab.join(","), ...filas.map((f) => cab.map((c) => cel(f[c])).join(","))].join("\n");
  descargar(`${nombre}-${iso(HOY)}.csv`, csv);
  toast(`${filas.length} filas exportadas.`, "info");
}

seed();
pintarLogin();
document.getElementById("btnSalir").onclick = salir;
document.getElementById("btnExport").onclick = () => {
  const mapa = { suscriptores: "expSus", cobros: "expCob", morosidad: "expMor" };
  const b = document.getElementById(mapa[S.tab]);
  if (b) return b.click();
  exportar("cartera", S.suscriptores.map((s) => ({
    documento: s.documento, nombre: s.nombre, correo: s.correo, telefono: s.telefono,
    plan: plan(s.planId).nombre, monto: s.monto, proximo_cobro: proximoCobro(s),
    deuda: deudaDe(s.id), mora: moraDe(s.id), antiguedad_dias: atrasoMax(s.id),
  })));
};
