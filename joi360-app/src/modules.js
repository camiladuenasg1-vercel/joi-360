// `surface: "system"` = la capacidad SÍ está activa, pero su experiencia ya
// vive en otro lugar de la app (wallet → tarjeta de saldo, consumos → Actividad,
// comercios → fila de comercios, inventario → catálogo del comercio).
// No se repite como ícono en el grid de módulos. Antes esto era una lista
// negra hardcodeada dentro de Hub.jsx.
export const MODULES = {
  wallet:          { icon:"account_balance_wallet", label:"Billetera",      bg:"bg-[#DCE4FA]", color:"text-[#1A3270]", surface:"system" },
  consumos:        { icon:"receipt_long",           label:"Consumos",       bg:"bg-[#EEF2FD]", color:"text-[#404255]", surface:"system" },
  comercios:       { icon:"storefront",             label:"Comercios",      bg:"bg-[#DCE4FA]", color:"text-[#565e74]", surface:"system" },
  inventario:      { icon:"inventory_2",            label:"Inventario",     bg:"bg-[#F2F2F7]",  color:"text-[#616161]", surface:"system" },
  facturacion:     { icon:"receipt",                label:"Facturación",    bg:"bg-[#EEF2FD]",  color:"text-[#3949ab]" },
  perfil_ext:      { icon:"manage_accounts",        label:"Perfil Pro",     bg:"bg-[#F2F2F7]",  color:"text-[#424242]" },
  accesos:         { icon:"vpn_key",                label:"Accesos",        bg:"bg-[#EEF2FD]",  color:"text-[#3f51b5]" },
  reservas:        { icon:"event_available",        label:"Reservas",       bg:"bg-[#E6F7F1]",  color:"text-[#4caf50]" },
  loyalty:         { icon:"stars",                  label:"Lealtad",        bg:"bg-[#FDF0E6]",  color:"text-[#E06B00]" },
  eventos:         { icon:"confirmation_number",    label:"Eventos",        bg:"bg-[#FBE7E9]",  color:"text-[#E8394B]" },
  credito:         { icon:"credit_score",           label:"Crédito",        bg:"bg-[#E6F7F1]",  color:"text-[#0BA878]" },
  subsidio:        { icon:"savings",                label:"Subsidio",       bg:"bg-[#EEF2FD]",  color:"text-[#9c27b0]" },
  estacionamiento: { icon:"local_parking",          label:"Parking",        bg:"bg-[#EAF3FC]",  color:"text-[#1976d2]" },
  asistencia:      { icon:"how_to_reg",             label:"Asistencia",     bg:"bg-[#E6F7F1]",  color:"text-[#009688]" },
  cashback:        { icon:"payments",               label:"Cashback",       bg:"bg-[#FEF3B0]",  color:"text-[#8E6200]" },
  control:         { icon:"family_restroom",        label:"Familia",        bg:"bg-[#E6F7F1]",  color:"text-[#558b2f]" },
  menu:            { icon:"restaurant_menu",        label:"Menú",           bg:"bg-[#FDF0E6]",  color:"text-[#E06B00]" },
  promociones:     { icon:"local_offer",            label:"Promos",         bg:"bg-[#FDF0E6]",  color:"text-[#E06B00]" },
  turnos:          { icon:"pending_actions",        label:"Turnos",         bg:"bg-[#EAF3FC]",  color:"text-[#00838f]" },
  bnpl:            { icon:"schedule_send",          label:"BNPL",           bg:"bg-[#EEF2FD]",  color:"text-[#3B5BDB]" },
  transporte:      { icon:"directions_bus",         label:"Transporte",     bg:"bg-[#EAF3FC]",  color:"text-[#0288d1]" },
};

export const QUICK_ACTIONS = [
  { icon:"qr_code_scanner", label:"Pagar QR",  bg:"bg-[#EAF3FC]", fg:"text-[#2E7FD9]", path:"/pay" },
  { icon:"add_card",         label:"Recargar",  bg:"bg-white",      fg:"text-[#1C1C1E]", path:"/pay?tab=recargar" },
  { icon:"contactless",      label:"Bandita",   bg:"bg-[#EEF2FD]",  fg:"text-[#3B5BDB]", path:"/pay?tab=nfc" },
];
export const FAMILIA_ACTION = { icon:"groups", label:"Familia", bg:"bg-[#E6F7F1]", fg:"text-[#0BA878]", path:"/module/control" };
