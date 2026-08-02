import React from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Shell, Toaster } from "./ui";
import { Login, AdminDashboard } from "./PagesCore";
import { Mundos } from "./Mundos";
import { MundoDetail } from "./MundoDetail";
import { MundoFront, ComercioFront, Landing, AnuncianteFront } from "./Fronts";
import { OrganizadorFront } from "./OrganizadorFront";
import { OperadorApp } from "./OperadorApp";
import { Catalogo } from "./Catalogo";
import { CatalogoProductos } from "./CatalogoProductos";
import { CatalogosGlobales } from "./Catalogos";
import { HardwarePOS } from "./HardwarePOS";
import { Gobierno } from "./Gobierno";
import { ContratoView } from "./Contrato";
import { Anunciantes } from "./Anunciantes";
import { Liquidacion } from "./Liquidacion";
import { Usuarios } from "./Usuarios";
import { Soporte } from "./Soporte";
import { Monitoreo } from "./Monitoreo";
import { Calculadora } from "./Calculadora";
import { Adquirencia } from "./Adquirencia";
import { Emision } from "./Emision";
import { Resumen } from "./Resumen";
import { ModulosMundo } from "./ModulosMundo";
import { refreshMundosLive, reconciliarLiquidacionesRemoto, reconciliarTicketsRemoto } from "./store.js";

const A = ({ title, children }) => <Shell title={title}>{children}</Shell>;

// Sin esto, un error en CUALQUIER vista deja la pantalla de error congelada
// para SIEMPRE, incluso navegando a otras rutas sanas — porque el ErrorBoundary
// nunca recibe señal de que cambió la página. Usamos location.pathname como
// `key` para forzar un remount limpio del boundary en cada navegación.
function RoutedErrorBoundary({ children }) {
  const location = useLocation();
  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>;
}

export default function App() {
  // Trae mundos creados directo en Supabase / otro browser-sesión admin,
  // así "Mundo no encontrado" deja de bloquear paneles que sí existen remoto.
  // Encadenado: reconciliarLiquidacionesRemoto necesita st.mundos poblado
  // para resolver mundoNombre de cada lote real.
  React.useEffect(() => { refreshMundosLive().then(() => reconciliarLiquidacionesRemoto()); reconciliarTicketsRemoto(); }, []);
  return (
    <HashRouter>
      <Toaster />
      <RoutedErrorBoundary>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<A title="JOI 360 · Dashboard"><AdminDashboard /></A>} />
        <Route path="/admin/mundos" element={<A title="JOI 360 · Mundos"><Mundos /></A>} />
        <Route path="/admin/mundos/:id" element={<A title="JOI 360 · Mundo"><MundoDetail /></A>} />
        {/* New unified catalog + old routes kept for deep links */}
        <Route path="/admin/catalogos" element={<A title="JOI 360 · Catálogos Globales"><CatalogosGlobales /></A>} />
        <Route path="/admin/gobierno" element={<A title="JOI 360 · Gobierno"><Gobierno /></A>} />
        <Route path="/admin/catalogo" element={<A title="JOI 360 · Capacidades"><Catalogo /></A>} />
        <Route path="/admin/catalogo-productos" element={<A title="JOI 360 · Catálogo de Productos"><CatalogoProductos /></A>} />
        <Route path="/admin/hardware-pos" element={<A title="JOI 360 · Hardware / POS"><HardwarePOS /></A>} />
        <Route path="/contrato/:id" element={<ContratoView />} />
        <Route path="/admin/anunciantes" element={<A title="JOI 360 · Anunciantes"><Anunciantes /></A>} />
        <Route path="/admin/usuarios" element={<A title="JOI 360 · Usuarios"><Usuarios /></A>} />
        <Route path="/admin/liquidacion" element={<A title="JOI 360 · Liquidación"><Liquidacion /></A>} />
        <Route path="/admin/soporte" element={<A title="JOI 360 · Soporte"><Soporte /></A>} />
        <Route path="/admin/monitoreo" element={<A title="JOI 360 · Monitoreo de Errores"><Monitoreo /></A>} />
        <Route path="/admin/calculadora" element={<A title="JOI 360 · Calculadora Comercial"><Calculadora /></A>} />
        <Route path="/admin/adquirencia" element={<A title="JOI 360 · Adquirencia"><Adquirencia /></A>} />
        <Route path="/admin/emision" element={<A title="JOI 360 · Emisión"><Emision /></A>} />
        <Route path="/admin/resumen" element={<A title="JOI 360 · Resumen Operativo"><Resumen /></A>} />
        <Route path="/admin/modulos-mundo" element={<A title="JOI 360 · Vista por Capacidad"><ModulosMundo /></A>} />
        <Route path="/mundo/:id" element={<MundoFront />} />
        <Route path="/comercio/:id" element={<ComercioFront />} />
        <Route path="/operador/:comercioId" element={<OperadorApp />} />
        <Route path="/anunciante/:id" element={<AnuncianteFront />} />
        <Route path="/organizador/:id" element={<OrganizadorFront />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </RoutedErrorBoundary>
    </HashRouter>
  );
}
