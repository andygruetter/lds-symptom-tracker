#!/usr/bin/env bash
#
# Setup Vercel Environment Variables fuer Preview
# Kann wiederholt ausgefuehrt werden (idempotent).
#
# Liest VERCEL_TOKEN und alle Env Vars aus .env.preview
# Alternativ: export VERCEL_TOKEN="..." oder als Argument uebergeben.
#
# Token erstellen: https://vercel.com/account/tokens
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# --- Konfiguration ---
VERCEL_PROJECT="lds-symptom-tracker-preview"
ENV_FILE="${PROJECT_ROOT}/.env.preview"
TARGET="preview"  # preview | production | development

# --- Token aus .env.preview oder Environment oder Argument lesen ---
if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  if [[ -f "$ENV_FILE" ]]; then
    VERCEL_TOKEN=$(grep -E "^VERCEL_TOKEN=" "$ENV_FILE" | head -1 | cut -d'=' -f2- || true)
  fi
fi
VERCEL_TOKEN="${VERCEL_TOKEN:-${1:-}}"

if [[ -z "$VERCEL_TOKEN" ]]; then
  echo "Fehler: VERCEL_TOKEN nicht gesetzt."
  echo ""
  echo "Erstelle einen Token unter: https://vercel.com/account/tokens"
  echo "Speichere ihn in .env.preview als VERCEL_TOKEN=dein-token"
  echo "Oder: export VERCEL_TOKEN=\"dein-token\""
  echo "Oder: $0 dein-token"
  exit 1
fi

# --- .env.preview lesen ---
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Fehler: $ENV_FILE nicht gefunden."
  exit 1
fi

echo "=== Vercel Environment Setup ==="
echo "Projekt:     $VERCEL_PROJECT"
echo "Umgebung:    $TARGET"
echo "Env-Datei:   $ENV_FILE"
echo ""

# --- Team/Org ID ermitteln ---
echo "Ermittle Team-ID..."
TEAMS_RESPONSE=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v2/teams")

TEAM_ID=$(echo "$TEAMS_RESPONSE" | jq -r '.teams[0].id // empty' 2>/dev/null || true)

# --- Projekt-ID ermitteln ---
echo "Ermittle Projekt-ID fuer '$VERCEL_PROJECT'..."
TEAM_PARAM=""
if [[ -n "$TEAM_ID" ]]; then
  TEAM_PARAM="?teamId=$TEAM_ID"
fi

PROJECT_RESPONSE=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/$VERCEL_PROJECT$TEAM_PARAM")

PROJECT_ID=$(echo "$PROJECT_RESPONSE" | jq -r '.id // empty' 2>/dev/null)

if [[ -z "$PROJECT_ID" ]]; then
  echo "Fehler: Projekt '$VERCEL_PROJECT' nicht gefunden."
  echo "Antwort: $PROJECT_RESPONSE"
  exit 1
fi

echo "Projekt-ID:  $PROJECT_ID"
echo ""

# --- Bestehende Env Vars fuer Target laden ---
echo "Lade bestehende Environment Variables..."
EXISTING_ENVS=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/$PROJECT_ID/env$TEAM_PARAM")

# --- Env Vars aus Datei lesen und setzen ---
SUCCESS=0
FAILED=0

while IFS= read -r line; do
  # Kommentare und leere Zeilen ueberspringen
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue

  KEY="${line%%=*}"
  VALUE="${line#*=}"

  # Fuehrende/folgende Leerzeichen entfernen
  KEY=$(echo "$KEY" | xargs)
  [[ -z "$KEY" ]] && continue

  # VERCEL_TOKEN ist nur fuer das Script, nicht als Env Var setzen
  [[ "$KEY" == "VERCEL_TOKEN" ]] && continue

  # Pruefen ob Variable bereits existiert
  EXISTING_ID=$(echo "$EXISTING_ENVS" | jq -r \
    --arg key "$KEY" --arg target "$TARGET" \
    '.envs[] | select(.key == $key and (.target[] == $target)) | .id' \
    2>/dev/null | head -1 || true)

  # Falls vorhanden: loeschen
  if [[ -n "$EXISTING_ID" ]]; then
    echo "  Aktualisiere $KEY (loesche alte Version)..."
    curl -s -X DELETE -H "Authorization: Bearer $VERCEL_TOKEN" \
      "https://api.vercel.com/v9/projects/$PROJECT_ID/env/$EXISTING_ID$TEAM_PARAM" > /dev/null
  fi

  # JSON-Payload mit jq erstellen (sicheres Escaping)
  PAYLOAD=$(jq -n \
    --arg key "$KEY" \
    --arg value "$VALUE" \
    --arg target "$TARGET" \
    '{key: $key, value: $value, target: [$target], type: "encrypted"}')

  # Neue Variable setzen
  echo "  Setze $KEY..."
  RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "https://api.vercel.com/v10/projects/$PROJECT_ID/env$TEAM_PARAM")

  CREATED_ID=$(echo "$RESPONSE" | jq -r '.created.id // .id // empty' 2>/dev/null || true)

  if [[ -n "$CREATED_ID" ]]; then
    SUCCESS=$((SUCCESS + 1))
  else
    echo "    FEHLER: $(echo "$RESPONSE" | jq -r '.error.message // .message // "Unbekannt"' 2>/dev/null)"
    FAILED=$((FAILED + 1))
  fi

done < "$ENV_FILE"

echo ""
echo "=== Ergebnis ==="
echo "Erfolgreich: $SUCCESS"
echo "Fehlerhaft:  $FAILED"
echo ""

if [[ $FAILED -eq 0 ]]; then
  echo "Alle Environment Variables wurden gesetzt!"
  echo "Erstelle jetzt einen PR, um ein Preview-Deployment auszuloesen."
else
  echo "Es gab Fehler. Pruefe die Ausgabe oben."
  exit 1
fi
