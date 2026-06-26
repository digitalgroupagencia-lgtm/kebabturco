#!/bin/bash
cd "$(dirname "$0")/.." || exit 1
echo "A iniciar helper Demo visita (painel pode ligar sozinho)..."
npm run visit-print:helper
