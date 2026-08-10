import React, { useEffect } from "react";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useUser } from "./userStore.js";
import { refreshWorldsLive } from "./store.js";
import AuthPage from "./pages/Auth.jsx";
import HubPage from "./pages/Hub.jsx";
import MundosPage from "./pages/Mundos.jsx";
import LandingPage from "./pages/Landing.jsx";
import PayPage from "./pages/Pay.jsx";
import ActivityPage from "./pages/Activity.jsx";
import ProfilePage from "./pages/Profile.jsx";
import ModulePage from "./pages/Module.jsx";
import ClaimTicketPage from "./pages/ClaimTicket.jsx";
import PagarQRPage from "./pages/PagarQR.jsx";
import { ToastHost } from "./components/Toast.jsx";

function Guard({ children }) {
  const u = useUser();
  const loc = useLocation();
  if (!u?.auth) return <Navigate to={`/auth?next=${encodeURIComponent(loc.pathname + loc.hash)}`} replace />;
  return children;
}
function Root() {
  const u = useUser();
  if (!u?.auth) return <Navigate to="/auth" replace />;
  if (!u.memberships?.length) return <Navigate to="/landing" replace />;
  return <Navigate to="/hub" replace />;
}

export default function App() {
  // Fase 0 — mundos en vivo: al abrir la app y al volver a la pestaña se
  // refresca la lista de mundos desde Supabase (alta en admin → aparece aquí).
  useEffect(() => {
    refreshWorldsLive();
    const onFocus = () => refreshWorldsLive();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  return (
    <HashRouter>
      <ToastHost />
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/landing" element={<Guard><LandingPage /></Guard>} />
        <Route path="/hub" element={<Guard><HubPage /></Guard>} />
        <Route path="/mundos" element={<Guard><MundosPage /></Guard>} />
        <Route path="/pay" element={<Guard><PayPage /></Guard>} />
        <Route path="/activity" element={<Guard><ActivityPage /></Guard>} />
        <Route path="/profile" element={<Guard><ProfilePage /></Guard>} />
        <Route path="/module/:moduleId" element={<Guard><ModulePage /></Guard>} />
        <Route path="/reclamar/:token" element={<Guard><ClaimTicketPage /></Guard>} />
        <Route path="/pagar/:id" element={<Guard><PagarQRPage /></Guard>} />
        <Route path="*" element={<Root />} />
      </Routes>
    </HashRouter>
  );
}
