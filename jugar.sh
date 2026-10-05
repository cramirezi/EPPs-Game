#!/bin/sh
# Para jugar Misión EPP en Mac o Linux: ./jugar.sh
cd "$(dirname "$0")"
PUERTO=8000
( sleep 1; (open "http://localhost:$PUERTO" || xdg-open "http://localhost:$PUERTO") >/dev/null 2>&1 ) &
echo "Misión EPP en http://localhost:$PUERTO (Ctrl+C para apagar)"
python3 -m http.server "$PUERTO"
