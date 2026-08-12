# -*- coding: utf-8 -*-
"""Genera el markdown fuente del Historial de Tareas y Commits cruzando
la lista de tareas del tracker con git log real."""
import re, os

TASKS = [
(102,"completed","Motor de Eventos: discriminar B2B / B2C / Embebido con dependencias reales"),
(103,"completed","Poder revertir/reabrir el popup de elección de modo de Eventos"),
(104,"completed","Cola de requerimiento de hardware para el mundo (banditas + POS)"),
(105,"completed","Embebido: Motor de Eventos vive DENTRO del panel del mundo"),
(106,"completed","Ficha completa de evento: portada, mapa PDF, merchants asociados, preventa por tipo"),
(107,"completed","Registro real en el superapp con verificación de correo"),
(108,"completed","Módulo de usuarios por mundo en RedPontis + KPIs para el mundo"),
(109,"completed","Sacar JOI Promos del alcance activo"),
(110,"completed","P2P deja billeteras en negativo (bug real de saldo)"),
(111,"completed","POS: pantalla de acceso con ficha del usuario e historial"),
(112,"completed","QA end-to-end con 5 agentes sobre todo el ecosistema"),
(113,"completed","Rediseño arquitectónico del Core Platform JOI360 (ADR + diseño, sin código)"),
(114,"completed","CRÍTICO: la llave anónima del bundle expone PIN de POS y datos bancarios, y permite escribir dinero"),
(115,"completed","Liquidación genera netos negativos y deja procesarlos"),
(116,"completed","Documento Maestro JOI360 (10 secciones) — capturas + anexo iOS nativo"),
(117,"completed","Duplicados: 3 mundos \"Colegio Raimondi\" en Supabase"),
(118,"completed","POS/Operador: vincular bandita NFC directamente desde el POS"),
(119,"completed","Cash-in de evento: banditas pre-cargadas con lista de asistencia"),
(120,"completed","Menu: falta acción real en el POS/operador"),
(121,"completed","RPC de wallet: cerrar el gap de autorización por dueño"),
(122,"completed","E2E real en Raimondi: POS, merchant, mundo, usuarios, liquidación"),
(123,"completed","Auditar feature flags de cada módulo de capacidades"),
(124,"completed","Pase de UX copywriting: quitar copys guía innecesarios + empty states"),
(125,"completed","Borrado total de BD + arranque limpio"),
(126,"completed","Adquirencia: sincronizar canales/MDR real a Supabase (hoy es mock local)"),
(127,"completed","POS T6: pull-to-refresh en la pantalla de inicio"),
(128,"completed","POS: login diferenciado Mundo vs Comercio"),
(129,"completed","Estandarizar tab \"Canales\" en todas las capacidades"),
(130,"completed","Flujo NFC de dependientes vía DNI end-to-end"),
(131,"completed","Badge \"Pendiente / No activado\" en mundo sin dashboard entregado"),
(132,"completed","Auditar render de superapp al habilitar Familiares en Wallet"),
(133,"completed","QA de dependencias config/catálogos — auditoría cruzada"),
(134,"completed","Botón con estado loading en design system + sync en cascada"),
(135,"completed","KPI \"Emisión acumulada\" debe reflejar 0 real"),
(136,"pending","E2E guiado con la usuaria: Raimondi + Eventos en todas las plataformas"),
(137,"completed","Estandarizar registro de usuario en superapp"),
(138,"completed","Borrar data completa de superapp (destructivo, al final)"),
(139,"completed","Eliminar mundo JOI Promos + sacar Anunciantes del alcance"),
(140,"completed","Dependientes: registro DNI+alias, consumo vía saldo asignado"),
(141,"completed","Eventos 100% real + gestión embebida completa en panel del mundo"),
(142,"completed","Quitar \"Reset demo\"; credenciales admin reales"),
(143,"completed","POS: cierre de sesión definitivo con protección de credenciales"),
(144,"completed","Menú: flujo de compra"),
(145,"completed","Reiniciar catálogo de hardware/banditas para inventario real"),
(146,"completed","Precio unitario por bandita/lote + discriminación al asignar"),
(147,"completed","Eliminar lote NFC con restricción + reversión de asignación"),
(148,"completed","Rediseñar precio/modelo de bandita: se fija al asignar, no al cargar"),
(149,"completed","Creación de mundo: solo mostrar módulos activos, ocultar \"próximamente\""),
(150,"completed","Moneda de wallet en creación de mundo: select de catálogo real, no texto libre"),
(151,"completed","Bug: error al crear producto en \"Mi Catálogo\" de comercio"),
(152,"completed","Bug: catálogo de Menú solo renderiza 1 plato en superapp aunque el panel tenga 2"),
(153,"completed","Menú: estado pendiente de publicación hasta tener programación asignada"),
(154,"completed","Tabla de usuarios por mundo: anidar dependientes + columnas de bandita"),
(155,"completed","Superapp: selector de perfil (titular/dependiente) antes de cualquier configuración"),
(156,"completed","Bug crítico: vincular bandita por UID no reconoce las 501 ya asignadas al mundo"),
(157,"completed","UID de bandita: reconocer formato serial (04:D6:01:5A:68:19:94)"),
(158,"completed","Flujo completo de solicitud de bandita: aviso al usuario + demanda/métricas para mundo y RedPontis"),
(159,"completed","Ocultar transacciones de suscripción al comercio — solo RedPontis las ve"),
(160,"completed","POS: consulta por DNI (titular+dependientes) + módulo Perfil Extendido visible al mundo"),
(161,"completed","Superapp: editar perfil de dependiente ya creado (alergias, etc.)"),
(162,"completed","Vincular pulsera: es por contacto NFC, no escaneo QR"),
(163,"completed","Bug: historial de accesos marca \"fuera del colegio\" pese a registrar \"entrada\""),
(164,"completed","Merchant: autogenerar código de comercio + PIN de 4 dígitos si usa POS Operador"),
(165,"completed","Instalar APK con fix de NFC en el T6 (falta conectar el dispositivo)"),
(166,"completed","Perfil de mundo con imagen (como merchant) + thumbnail en card de comunidad"),
(167,"completed","Nomenclatura dinámica de cuenta principal/dependiente según rubro del mundo"),
(168,"completed","Bandita universal para cuenta principal — discrimina wallet según mundo/comercio en el lector (arquitectura nueva)"),
(169,"completed","Catálogo de productos merchant: categorías inteligentes vía combobox reutilizable"),
(170,"completed","Campanita de notificaciones en admin RedPontis + tablas + badges en sidebar"),
(171,"completed","Editar precio/modelo de un lote de banditas ya cargado (gratuita -> pagada y viceversa)"),
(172,"completed","POS/Tótem: separar catálogo de modelos de inventario de unidades"),
(173,"completed","Restricciones granulares: por dependiente, por mundo y por perfil — no un horario macro global"),
(174,"completed","Múltiples planes de suscripción (anual/mensual) + promociones con badge de descuento"),
(175,"completed","Unificar alergias entre Perfil Extendido, creación de perfil, Restricciones y Menú"),
(176,"completed","RedPontis comercial/admin: E2E Liquidación, Aprobaciones, Catálogos, Calculadora, Hardware"),
(177,"completed","Audit joi360-admin: CRUD (edit/delete) + dependency-safety on every table view"),
(178,"completed","Audit each active capacidad against its correct rendering front(s)"),
(179,"completed","Live E2E: merchant role (cobrar, catálogo, consulta, cierre)"),
(180,"completed","Live E2E: organizador B2B role (dashboard, eventos, asistencia, liquidación evento)"),
(181,"completed","Bug DNI: cuenta principal mostraba perfil del dependiente"),
(182,"completed","Operador: inicio/cierre de turno con reflejo en panel de accesos del mundo"),
(183,"completed","Auditoría completa de modelado de datos (Supabase)"),
(184,"completed","Migrar joi360-admin/app a variables de entorno reales en Vercel"),
(185,"completed","Instalar última versión en el T6 físico"),
(186,"completed","Auditar banners en Restricciones (superapp)"),
(187,"completed","Eventos B2C: foto banner, entidad legal opcional, popup detalle+motivo rechazo en admin, motivo visible en \"Mis eventos\""),
(188,"completed","Ejecutar fixes de la Auditoría de Datos JOI360"),
(189,"completed","Loading state en TODOS los botones de creación (proyecto-wide)"),
(190,"completed","Bug: vincular bandita da \"usuario no reconocido\" con usuario real registrado en Jockey Plaza"),
(191,"completed","Cooldown de 2 min para reenvío de link de confirmación de correo"),
(192,"completed","Usuarios en admin RedPontis aparecen sin sus datos 360"),
(193,"completed","Superapp: opción de eliminar dependiente/familiar"),
(194,"completed","Bug: \"no tienes ningún mundo\" al entrar a Explorar Mundos en superapp"),
(195,"completed","DEMO Jockey Plaza: flujo completo de código de comercio/mundo/POS operador end-to-end"),
(196,"completed","Raimondi: probar fino flujos E2E de saldo, vinculación bandita, cobro y compra por QR"),
(197,"completed","Auditar y rellenar TODOS los NULLs en tablas (incl. sponsor_id) según la auditoría de datos"),
(198,"completed","Bug: mundo eliminado (Colegio Raimondi) reaparece en el panel admin RedPontis"),
(199,"completed","Bug: contraseña de admin sale NULL / no se guarda al crearla o editarla"),
(200,"completed","Eventos embebidos en panel de mundo para Jockey Plaza (construir feature completo)"),
(201,"completed","Bug: usuario registrado (Diego Salguero) entra a Jockey Plaza y sale sin wallet pese a capacidad activa"),
(202,"completed","Publicación de catálogo/capacidades en la app debe ser automática, no un botón manual"),
(203,"completed","Verificar bug de precio de entrada en NumInput"),
(204,"completed","Badge de estado de evento debe reflejar aprobación real de BD"),
(205,"completed","Agregar upload de banner de evento con espejo en superapp"),
(206,"completed","RUC input: máximo 11 dígitos"),
(207,"completed","Cuenta bancaria: máximo 14 dígitos"),
(208,"completed","CCI: máximo 20 dígitos"),
(209,"completed","Paso 3 crear mundo: no deja adjuntar dos documentos"),
(210,"completed","Paso 4 wallet: selector de moneda muestra 1,2,3,4,5 en vez de USD/PEN"),
(211,"completed","Paso 4 Compras y transacciones: campo de hora debe ser time picker"),
(212,"completed","Paso 4 Comercios: falta selector de responsable (RedPontis o Mundo)"),
(213,"completed","Paso 5 vigencia: usar fecha específica, no dropdown 12/6/3 meses"),
(214,"completed","Eliminar referencia a 'costo agregado' del catálogo"),
(215,"completed","Configurar wallet: 'Usar sin límite' no cambia el campo"),
(216,"completed","Configurar wallet: 'Usar sin tope de recarga' no cambia el campo"),
(217,"completed","Configurar wallet: 'Usar sin vencimiento' no cambia el campo"),
(218,"completed","Vigencia de la pulsera: usar selector de fecha (calendario)"),
(219,"completed","Suscripciones: dejar solo 'crear planes', quitar repetición de pago por perfil"),
(220,"completed","Configuración menú: método de reserva QR, Saldo o Ambos"),
(221,"completed","Liquidación: investigar y mostrar fecha (requiere análisis previo)"),
(222,"completed","Fix: error al marcar \"entregado\" solicitud de banditas (Jockey Plaza)"),
(223,"completed","Usuarios (admin RP): detalle en vista de página nueva, no drawer"),
(224,"completed","Bug: POS Operador permite re-vincular bandita ya vinculada sin liberar"),
(225,"completed","Superapp: módulo de Eventos a scroll vertical con más mini cards"),
(226,"completed","Superapp: carrusel de eventos en Home del mundo (debajo de comercios, top 5 + ver más)"),
(227,"completed","Bug: botón \"Bandita NFC\" en Home del mundo navega a Recarga (afecta todos los mundos)"),
(228,"completed","Eventos embebido: gestión completa + comercios por evento + aprobación con detalle"),
(229,"pending","Sucursales: grupo de mundos con selector in-place en superapp"),
(230,"completed","Superapp: vincular bandita directo (Web NFC) sin flujo de solicitud"),
(231,"completed","Precompra evento B2B: stock real + label separado de catálogo"),
(232,"completed","Pivot piloto Jockey Plaza: borrado + limpieza de código completado"),
(233,"completed","Suscripciones formalizada como capacidad propia — deployado y verificado"),
]

# Fases / hitos del desarrollo. Cada fase tiene un rango de IDs de tarea y un
# rango de fechas real (inclusive) para filtrar los commits de git que le
# corresponden — los rangos de fecha se solapan levemente entre fases porque
# el trabajo de una tarea a veces cruza la medianoche; se resuelve asignando
# cada commit a la fase de fecha más cercana sin duplicar.
FASES = [
    ("01-ago a 02-ago", "Arranque del monorepo y Motor de Eventos", (102,111), "2026-08-01", "2026-08-02"),
    ("03-ago a 04-ago", "Seguridad crítica de Wallet + limpieza de datos fantasma", (112,150), "2026-08-03", "2026-08-04"),
    ("07-ago a 08-ago", "Bandita NFC end-to-end + restricciones granulares", (151,175), "2026-08-07", "2026-08-08"),
    ("09-ago", "Auditoría cruzada + primer batch de QA con agentes en paralelo", (176,190), "2026-08-09", "2026-08-09"),
    ("10-ago", "Auditoría de datos + seguridad de credenciales (admin/PIN)", (191,214), "2026-08-10", "2026-08-10"),
    ("11-ago", "Batch de 15 items UX/UI + fixes de wizard y liquidación por comercio", (215,221), "2026-08-11", "2026-08-11"),
    ("12-ago", "Eventos embebido, Web NFC directo, Sucursales, Precompra, pivot Jockey Plaza, documentación viva", (222,233), "2026-08-12", "2026-08-12"),
]

def load_git_log(repo_root):
    # Corre git directo sobre el repo -- siempre trae el log real y
    # actualizado, sin depender de un archivo exportado a mano cada corte.
    import subprocess
    result = subprocess.run(
        ["git", "log", "--reverse", "--format=%ad|%h|%s", "--date=short"],
        cwd=repo_root, capture_output=True, text=True, encoding="utf-8", check=True,
    )
    rows = []
    for line in result.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        date, h, subj = line.split("|", 2)
        rows.append((date, h, subj))
    return rows

def build_task_commit_map(git_rows):
    m = {}
    for date, h, subj in git_rows:
        for match in re.finditer(r"#(\d{2,3})", subj):
            n = int(match.group(1))
            m.setdefault(n, []).append((date, h, subj))
    return m

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.dirname(os.path.dirname(here))  # docs/arquitectura/historial_tareas -> repo root
    git_rows = load_git_log(repo_root)
    task_commits = build_task_commit_map(git_rows)

    matched_hashes = set()
    for n, rows in task_commits.items():
        for date, h, subj in rows:
            matched_hashes.add(h)

    out = []
    out.append("# JOI360 — Historial de Tareas y Commits\n")
    out.append("Documento vivo · Versión **1.0** · 12 de agosto de 2026\n")
    out.append("Registro completo de las 132 tareas trabajadas en este monorepo (`#102`–`#233`) y de los 163 commits reales de git que representan el código que efectivamente cambió, organizados en 7 fases cronológicas — del 1 al 12 de agosto de 2026. Cuando un commit menciona explícitamente el número de tarea, queda cruzado como referencia directa.\n")
    out.append("## Historial de versiones\n")
    out.append("| Versión | Fecha | Cambios |")
    out.append("|---|---|---|")
    out.append("| 1.0 | 2026-08-12 | Primera versión — 132 tareas (#102–#233), 163 commits, 7 fases de desarrollo narradas cronológicamente. |")
    out.append("\n*Corte semanal: domingo. Próxima actualización: 16-ago-2026.*\n")

    out.append("## Resumen ejecutivo\n")
    out.append("| Métrica | Valor |")
    out.append("|---|---|")
    out.append(f"| Tareas registradas | {len(TASKS)} |")
    out.append(f"| Tareas completadas | {sum(1 for _,s,_ in TASKS if s=='completed')} |")
    out.append(f"| Tareas pendientes | {sum(1 for _,s,_ in TASKS if s=='pending')} |")
    out.append(f"| Commits reales en el repo | {len(git_rows)} |")
    out.append(f"| Commits con tarea identificada | {len(matched_hashes)} |")
    out.append(f"| Rango de fechas | {git_rows[0][0]} a {git_rows[-1][0]} |")

    out.append("\n## Cómo leer este documento\n")
    out.append("Dos vistas complementarias del mismo trabajo, por fase cronológica: **(A) Registro de tareas** — qué se pidió o encontró y su estado, en el lenguaje en que se reportó; **(B) Commits reales** — exactamente qué cambió en el código, con hash real de git, en el mismo rango de fechas. Donde un commit menciona explícitamente el número de tarea (`#NNN`), queda cruzado en la tarea correspondiente como referencia directa — el resto de los commits de la fase completan el detalle técnico aunque no hayan quedado etiquetados con un número.\n")

    assigned_hashes = set()
    for fase_label, fase_titulo, (lo, hi), d_start, d_end in FASES:
        out.append(f"\n# Fase: {fase_titulo}")
        out.append(f"*{fase_label}*\n")

        out.append("## A. Tareas de esta fase\n")
        for n, status, subj in TASKS:
            if not (lo <= n <= hi):
                continue
            estado_tag = "🟢 Completado" if status == "completed" else "🟡 Pendiente"
            rows = task_commits.get(n, [])
            ref = f" *(commit `{rows[0][1]}`, {rows[0][0]})*" if rows else ""
            out.append(f"- **#{n}** — {subj} — {estado_tag}{ref}")

        out.append("\n## B. Commits reales de esta fase\n")
        out.append("| Fecha | Hash | Commit |")
        out.append("|---|---|---|")
        fase_rows = [(d, h, s) for d, h, s in git_rows if d_start <= d <= d_end and h not in assigned_hashes]
        for date, h, subj in fase_rows:
            assigned_hashes.add(h)
            out.append(f"| {date} | `{h}` | {subj} |")
        out.append(f"\n*{len(fase_rows)} commits en esta fase.*")

    leftover = [(d, h, s) for d, h, s in git_rows if h not in assigned_hashes]
    if leftover:
        out.append("\n# Commits fuera de las fases anteriores")
        out.append("*(fechas sin fase asignada explícitamente — igual reales, igual del repo)*\n")
        out.append("| Fecha | Hash | Commit |")
        out.append("|---|---|---|")
        for date, h, subj in leftover:
            out.append(f"| {date} | `{h}` | {subj} |")
        print(f"AVISO: {len(leftover)} commits sin fase, agregados al final")

    out_path = r"C:\Users\CamilaDueñas\OneDrive - RedPontis\Escritorio\JOI360\docs\arquitectura\historial_tareas\src\00_historial.md"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    print("listo")

if __name__ == "__main__":
    main()
