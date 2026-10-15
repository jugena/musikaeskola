@echo off
cd /d "%~dp0"
echo Musika Eskola disponible en http://127.0.0.1:8000
echo Pulsa Ctrl+C para detener el servidor.
".tools\php\php.exe" -d upload_max_filesize=100M -d post_max_size=110M -S 127.0.0.1:8000
pause
