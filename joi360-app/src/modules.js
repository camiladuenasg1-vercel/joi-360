// `surface: "system"` = la capacidad SÍ está activa, pero su experiencia ya
// vive en otro lugar de la app (wallet → tarjeta de saldo, consumos → Actividad,
// comercios → fila de comercios, inventario → catálogo del comercio).
// No se repite como ícono en el grid de módulos. Antes esto era una lista
// negra hardcodeada dentro de Hub.jsx.
export const MODULES = {
  wallet:          { icon:"account_balance_wallet", label:"Billetera",      bg:"bg-[#dae2fd]", color:"text-[#3525cd]", surface:"system" },
  consumos:        { icon:"receipt_long",           label:"Consumos",       bg:"bg-[#f0ecf9]", color:"text-[#464555]", surface:"system" },
  comercios:       { icon:"storefront",             label:"Comercios",      bg:"bg-[#dae2fd]", color:"text-[#565e74]", surface:"system" },
  inventario:      { icon:"inventory_2",            label:"Inventario",     bg:"bg-[#fafafa]",  color:"text-[#616161]", surface:"system" },
  facturacion:     { icon:"receipt",                label:"Facturación",    bg:"bg-[#e8eaf6]",  color:"text-[#3949ab]" },
  perfil_ext:      { icon:"manage_accounts",        label:"Perfil Pro",     bg:"bg-[#f5f5f5]",  color:"text-[#424242]" },
  accesos:         { icon:"vpn_key",                label:"Accesos",        bg:"bg-[#e8eaf6]",  color:"text-[#3f51b5]" },
  reservas:        { icon:"event_available",        label:"Reservas",       bg:"bg-[#e8f5e9]",  color:"text-[#4caf50]" },
  loyalty:         { icon:"stars",                  label:"Lealtad",        bg:"bg-[#fff8e1]",  color:"text-[#f59e0b]" },
  eventos:         { icon:"confirmation_number",    label:"Eventos",        bg:"bg-[#fce4ec]",  color:"text-[#e91e63]" },
  credito:         { icon:"credit_score",           label:"Crédito",        bg:"bg-[#e8f5e9]",  color:"text-[#388e3c]" },
  subsidio:        { icon:"savings",                label:"Subsidio",       bg:"bg-[#f3e5f5]",  color:"text-[#9c27b0]" },
  estacionamiento: { icon:"local_parking",          label:"Parking",        bg:"bg-[#e3f2fd]",  color:"text-[#1976d2]" },
  asistencia:      { icon:"how_to_reg",             label:"Asistencia",     bg:"bg-[#e0f2f1]",  color:"text-[#009688]" },
  cashback:        { icon:"payments",               label:"Cashback",       bg:"bg-[#ffdbcc]",  color:"text-[#7e3000]" },
  control:         { icon:"family_restroom",        label:"Familia",        bg:"bg-[#f1f8e9]",  color:"text-[#558b2f]" },
  menu:            { icon:"restaurant_menu",        label:"Menú",           bg:"bg-[#fff3e0]",  color:"text-[#ff9800]" },
  promociones:     { icon:"local_offer",            label:"Promos",         bg:"bg-[#fff8e1]",  color:"text-[#f9a825]" },
  turnos:          { icon:"pending_actions",        label:"Turnos",         bg:"bg-[#e0f7fa]",  color:"text-[#00838f]" },
  bnpl:            { icon:"schedule_send",          label:"BNPL",           bg:"bg-[#ede7f6]",  color:"text-[#673ab7]" },
  transporte:      { icon:"directions_bus",         label:"Transporte",     bg:"bg-[#e1f5fe]",  color:"text-[#0288d1]" },
};

export const QUICK_ACTIONS = [
  { icon:"qr_code_scanner", label:"Pagar QR",  bg:"bg-[#e0f7fa]", fg:"text-[#006064]", path:"/pay" },
  { icon:"add_card",         label:"Recargar",  bg:"bg-white",      fg:"text-[#1b1b24]", path:"/pay?tab=recargar" },
  { icon:"contactless",      label:"Bandita",   bg:"bg-[#ede7f6]",  fg:"text-[#673ab7]", path:"/pay?tab=nfc" },
];
export const FAMILIA_ACTION = { icon:"groups", label:"Familia", bg:"bg-[#f1f8e9]", fg:"text-[#33691e]", path:"/module/control" };
