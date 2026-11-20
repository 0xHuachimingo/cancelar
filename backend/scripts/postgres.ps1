# PostgreSQL local de desarrollo (binarios portables, sin servicio de Windows ni permisos de administrador).
#
#   npm run pg:start    inicia el servidor en segundo plano (puerto 5432, solo localhost)
#   npm run pg:stop     lo detiene
#   npm run pg:status   muestra si está corriendo
#   npm run pg:autostart      lo inicia solo al entrar a Windows (acceso directo en la carpeta Inicio del usuario)
#   npm run pg:no-autostart   quita ese acceso directo
#
# Rutas por defecto (se pueden cambiar con las variables PGHOME y PGDATA):
#   binarios: E:\PostgreSQL\17
#   datos:    E:\PostgreSQL\data   (log en E:\PostgreSQL\postgres.log)
param([Parameter(Mandatory = $true)][ValidateSet('start', 'stop', 'status', 'autostart-on', 'autostart-off')][string]$Action)

# Acceso directo en shell:startup: corre «start» oculto al iniciar sesión, sin servicio ni permisos de administrador
$atajo = Join-Path ([Environment]::GetFolderPath('Startup')) 'PostgreSQL ServicioTecnico.lnk'
if ($Action -eq 'autostart-off') {
  if (Test-Path $atajo) { Remove-Item $atajo; Write-Output 'Listo: PostgreSQL ya no arranca solo con Windows.' }
  else { Write-Output 'No estaba configurado el arranque automático.' }
  exit 0
}

$ErrorActionPreference = 'Stop'
$pgHome = if ($env:PGHOME) { $env:PGHOME } else { 'E:\PostgreSQL\17' }
$pgData = if ($env:PGDATA) { $env:PGDATA } else { 'E:\PostgreSQL\data' }
$pgCtl = Join-Path $pgHome 'bin\pg_ctl.exe'
$log = Join-Path (Split-Path $pgData -Parent) 'postgres.log'

if (-not (Test-Path $pgCtl)) { throw "No se encontró $pgCtl. Ver backend/README.md, sección «Instalar PostgreSQL»." }
if (-not (Test-Path (Join-Path $pgData 'PG_VERSION'))) { throw "No hay datos en $pgData. Ver backend/README.md, sección «Instalar PostgreSQL»." }

switch ($Action) {
  'start' {
    & $pgCtl status -D $pgData *> $null
    if ($LASTEXITCODE -eq 0) { Write-Output 'PostgreSQL ya está corriendo.'; exit 0 }
    & $pgCtl start -D $pgData -l $log -w
  }
  'stop' { & $pgCtl stop -D $pgData -m fast -w }
  'status' { & $pgCtl status -D $pgData }
  'autostart-on' {
    $ps = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $lnk = (New-Object -ComObject WScript.Shell).CreateShortcut($atajo)
    $lnk.TargetPath = $ps
    $lnk.Arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$PSCommandPath`" start"
    $lnk.WorkingDirectory = $PSScriptRoot
    $lnk.WindowStyle = 7 # minimizada, para que no aparezca ninguna ventana
    $lnk.Description = 'Inicia PostgreSQL de ServicioTécnico'
    $lnk.Save()
    Write-Output "Listo: PostgreSQL arranca solo al entrar a Windows ($atajo)."
    exit 0
  }
}
exit $LASTEXITCODE
