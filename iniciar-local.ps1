$projectRoot = $PSScriptRoot
$phpExecutable = Join-Path $projectRoot '.tools\php\php.exe'

if (-not (Test-Path -LiteralPath $phpExecutable)) {
    Write-Error 'No se encuentra la instalación portátil de PHP en .tools\php\php.exe.'
    exit 1
}

Set-Location -LiteralPath $projectRoot
Write-Host 'Musika Eskola disponible en http://127.0.0.1:8000' -ForegroundColor Green
Write-Host 'Pulsa Ctrl+C para detener el servidor.' -ForegroundColor DarkGray
& $phpExecutable -d upload_max_filesize=100M -d post_max_size=110M -S 127.0.0.1:8000
