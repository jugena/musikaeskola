#!/bin/bash
echo "🚀 Sincronizando Musika Eskola con GitHub..."
git add .
git commit -m "Sincronización automática: $(date +'%Y-%m-%d %H:%M:%S')"
git push origin main
echo "✅ ¡Hecho!"
