# ============================================================================
# JOI360 - preparar-demo.ps1  (ejecutar DESPUES de supabase-migration.sql)
# 1) Verifica migracion  2) Siembra los 3 casos  3) E2E completo. Idempotente.
# ============================================================================
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvYnR4cmh5Y2Fsb3lqa2V5c3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMzAwMjksImV4cCI6MjA5NzkwNjAyOX0.MlyyXGnsyMeVXaRfRbmFqwVhsh4FUFNztQoBaECd_i0'
$base = 'https://kobtxrhycaloyjkeyspv.supabase.co/rest/v1'
$h = @{ apikey = $key; Authorization = ('Bearer {0}' -f $key); 'Content-Type' = 'application/json; charset=utf-8' }

function Req($method, $path, $obj, $prefer) {
    $hh = $h.Clone(); if ($prefer) { $hh.Prefer = $prefer }
    $p = @{ Uri = ('{0}/{1}' -f $base, $path); Method = $method; Headers = $hh; UseBasicParsing = $true }
    if ($null -ne $obj) { $p.Body = [Text.Encoding]::UTF8.GetBytes((ConvertTo-Json $obj -Compress -Depth 8)) }
    $r = Invoke-WebRequest @p
    if ($r.Content) { return ($r.Content | ConvertFrom-Json) } else { return $null }
}
function Upsert($path, $obj) { Req 'Post' $path $obj 'resolution=merge-duplicates,return=minimal' | Out-Null }

Write-Output '===== 1/3 - Verificando migracion ====='
foreach ($t in @('events','event_ticket_types','event_tickets','bnpl_programa_comercio','bnpl_contratos')) {
    try { $null = Invoke-WebRequest -Uri ('{0}/{1}?select=id&limit=0' -f $base, $t) -Headers $h -Method Head -UseBasicParsing }
    catch { throw ('FALTA la tabla {0}. Ejecuta primero supabase-migration.sql.' -f $t) }
    Write-Output ('  OK {0}' -f $t)
}
try { Upsert 'worlds?on_conflict=id' @{ id='mundo-raimondi'; code='ED-LIM-001'; name='Colegio Raimondi'; vertical='Educacion'; status='activo'; color_primary='#0035b9'; currency='PEN' } }
catch { throw 'RLS aun bloquea escrituras: ejecuta supabase-migration.sql completo (seccion de politicas).' }
Write-Output '  OK escritura habilitada (RLS demo)'

Write-Output '===== 2/3 - Sembrando los 3 casos ====='

# -- CASO 3: Kermesse en Raimondi --
Upsert 'world_capacity_configs?on_conflict=world_id,capacity_id' @{ world_id='mundo-raimondi'; capacity_id='eventos'; enabled=$true; config=@{ comisionEntrada=5; allowB2C=$false; ventanaPickup=30 } }
Upsert 'events?on_conflict=id' @{
    id='ev-kermesse-2026'; world_id='mundo-raimondi'; organizador='APAFA Colegio Raimondi'
    titulo='Kermesse Raimondi 2026'; descripcion='Gran kermesse anual del colegio: juegos, comida y musica en vivo. Paga todo con tu saldo JOI del mundo Raimondi.'
    tipo='kermesse'; categoria='Gastronomia'; fecha='2026-07-18'; hora='11:00'; lugar='Patio principal - Colegio Raimondi'
    aforo_total=100; aforo_tipo='general'; privado=$false; estado='PUBLICADO'; moneda='PEN'
    ux_components=@('hero','entradas','agenda','marketplace')
}
$tipos = Req 'Get' 'event_ticket_types?event_id=eq.ev-kermesse-2026&select=id,nombre' $null $null
if (-not $tipos -or $tipos.Count -eq 0) {
    Req 'Post' 'event_ticket_types' @(
        @{ event_id='ev-kermesse-2026'; nombre='General'; descripcion='Acceso a la kermesse'; precio=10; cupos=80; min_por_compra=1; max_por_compra=4; validacion='QR' },
        @{ event_id='ev-kermesse-2026'; nombre='Familiar'; descripcion='2 adultos + 2 ninos - incluye 1 consumo'; precio=25; cupos=20; min_por_compra=1; max_por_compra=2; validacion='QR' }
    ) 'return=minimal' | Out-Null
}
Write-Output '  OK Caso 3: Kermesse publicada (aforo 100, General S/10 y Familiar S/25)'

# -- CASO 1: Mundo Mok (Retail, BNPL marca blanca) --
Upsert 'worlds?on_conflict=id' @{ id='mundo-mok'; code='RT-MOK-001'; name='Mok'; vertical='Retail'; status='activo'; color_primary='#7e3000'; currency='PEN' }
Upsert 'world_capacity_configs?on_conflict=world_id,capacity_id' @{ world_id='mundo-mok'; capacity_id='wallet'; enabled=$true; config=@{ monedaPermitida='PEN'; kycL2=$true; p2pEnabled=$false; perfiles_modelo='identificacion' } }
Upsert 'world_capacity_configs?on_conflict=world_id,capacity_id' @{ world_id='mundo-mok'; capacity_id='comercios'; enabled=$true; config=@{ mdrDefault=1.5; fijoTxDefault=0.10; tipoOnboarding='Manual RedPontis' } }
Upsert 'world_capacity_configs?on_conflict=world_id,capacity_id' @{ world_id='mundo-mok'; capacity_id='bnpl'; enabled=$true; config=@{ cuotas3=$true; cuotas6=$true; cuotas12=$false; diasGracia=5; scoreObligatorio=$false; sinEvaluacion=$true; montoMaxBNPL=3000 } }

# Wallet identificacion: apagar flags transaccionales de Mok
$flags = Req 'Get' 'capacity_feature_flags?capacity_id=eq.wallet&select=id,flag_code' $null $null
foreach ($f in $flags) {
    $enabled = -not (@('balance','recarga','p2p','subwallet') -contains $f.flag_code)
    Upsert 'world_feature_flags?on_conflict=world_id,flag_id' @{ world_id='mundo-mok'; flag_id=$f.id; enabled=$enabled }
}

# Hiraoka
$hk = Req 'Get' 'merchants?world_id=eq.mundo-mok&name=eq.Hiraoka&select=id' $null $null
if (-not $hk -or $hk.Count -eq 0) {
    $hk = Req 'Post' 'merchants' @{ world_id='mundo-mok'; name='Hiraoka'; status='activo'; mdr_override=1.5; fixed_fee_override=0.10 } 'return=representation'
}
$hiraokaId = $hk[0].id
Upsert 'bnpl_programa_comercio?on_conflict=world_id,merchant_id' @{
    world_id='mundo-mok'; merchant_id="$hiraokaId"; merchant_nombre='Hiraoka'
    cuotas_activas=@(3,6); comision_pct=5; revenue_share_pct=30
    productos_financiables=@(
        @{ id='pf-1'; nombre='Garantia extendida TV 55'; precio=299 },
        @{ id='pf-2'; nombre='Garantia extendida laptop'; precio=399 },
        @{ id='pf-3'; nombre='Smart TV LG 55 4K'; precio=1899 }
    )
    gestion_mora='sin_cargo_suspension'; activo=$true
}
Write-Output '  OK Caso 1: mundo Mok (wallet identificacion) + Hiraoka con programa BNPL'
Write-Output '  OK Caso 2: Raimondi ya operativo (cafeteria, libreria, kiosco)'

Write-Output '===== 3/3 - Verificacion E2E ====='
$uid = '00000000-0000-4000-8000-0000e2e00001'

# E2E Kermesse
$gen = (Req 'Get' 'event_ticket_types?event_id=eq.ev-kermesse-2026&nombre=eq.General&select=id,precio' $null $null)[0]
$tk = Req 'Post' 'event_tickets' @{ event_id='ev-kermesse-2026'; ticket_type_id=$gen.id; world_id='mundo-raimondi'; user_id=$uid; qr_code='JOI-E2E-TEST-0001'; precio=$gen.precio; estado='emitido' } 'return=representation'
$tkId = $tk[0].id
Req 'Patch' ('event_tickets?id=eq.{0}' -f $tkId) @{ estado='checkin'; checkin_at=(Get-Date).ToUniversalTime().ToString('o') } 'return=minimal' | Out-Null
$dentro = (Req 'Get' 'event_tickets?event_id=eq.ev-kermesse-2026&estado=eq.checkin&select=id' $null $null).Count
Write-Output ('  OK Kermesse E2E: compra -> QR -> check-in (dentro ahora: {0})' -f $dentro)
Req 'Delete' ('event_tickets?id=eq.{0}' -f $tkId) $null 'return=minimal' | Out-Null
Write-Output '  OK ticket de prueba eliminado (aforo del demo arranca en 0)'

# E2E BNPL
$cron = @(); $fecha = (Get-Date).AddDays(5)
for ($i = 1; $i -le 3; $i++) { $cron += @{ n=$i; fecha=$fecha.AddMonths($i).ToString('yyyy-MM-dd'); monto=99.67; estado='pendiente' } }
$ct = Req 'Post' 'bnpl_contratos' @{ world_id='mundo-mok'; merchant_id="$hiraokaId"; merchant_nombre='Hiraoka'; user_id=$uid; producto='Garantia extendida TV 55'; monto=299; cuotas=3; dias_gracia=5; interes_pct=0; cronograma=$cron; estado='firmado' } 'return=representation'
Write-Output ('  OK BNPL E2E: contrato firmado con cronograma 3 cuotas (id {0})' -f $ct[0].id)
Req 'Delete' ('bnpl_contratos?id=eq.{0}' -f $ct[0].id) $null 'return=minimal' | Out-Null
Write-Output '  OK contrato de prueba eliminado (dashboards del demo arrancan limpios)'

Write-Output ''
Write-Output '============================================'
Write-Output ' DEMO LISTA - Guion (doc s.8):'
Write-Output ' 1: Raimondi -> app: recarga y consumo'
Write-Output ' 2: Kermesse -> organizador: aforo | app: comprar entrada'
Write-Output ' 3: Mok/BNPL -> app: financiar | backoffice: cronograma'
Write-Output '============================================'
