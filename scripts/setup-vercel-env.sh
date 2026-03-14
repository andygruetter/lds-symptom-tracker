#!/usr/bin/env bash
#
# Setup Vercel Environment Variables
# Kann wiederholt ausgefuehrt werden (idempotent).
#
# Usage:
#   ./setup-vercel-env.sh              # Setzt preview UND production
#   ./setup-vercel-env.sh preview      # Nur preview
#   ./setup-vercel-env.sh production   # Nur production
#
# Jedes Target liest seine eigene Env-Datei:
#   preview    → .env.preview
#   production → .env.production
#
# Env-Dateien muessen enthalten:
#   VERCEL_TOKEN=...    (Vercel API Token)
#   VERCEL_PROJECT=...  (Vercel Projektname)
#
# Token erstellen: https://vercel.com/account/tokens
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Script-interne Keys die NICHT als Env Var gesetzt werden
SKIP_KEYS=("VERCEL_TOKEN" "VERCEL_PROJECT" "SUPABASE_ACCESS_TOKEN")

# --- Funktion: Env Vars fuer ein Target setzen ---
setup_target() {
  local TARGET="$1"
  local ENV_FILE="${PROJECT_ROOT}/.env.${TARGET}"

  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Fehler: $ENV_FILE nicht gefunden."
    echo "Erstelle die Datei mit den passenden Environment Variables."
    return 1
  fi

  # VERCEL_TOKEN aus Umgebung oder Env-File lesen
  local TOKEN="${VERCEL_TOKEN:-}"
  if [[ -z "$TOKEN" ]]; then
    TOKEN=$(grep -E "^VERCEL_TOKEN=" "$ENV_FILE" | head -1 | cut -d'=' -f2- || true)
  fi

  if [[ -z "$TOKEN" ]]; then
    echo "Fehler: VERCEL_TOKEN nicht gefunden."
    echo "Setze ihn in $ENV_FILE oder als Umgebungsvariable."
    return 1
  fi

  # VERCEL_PROJECT aus Env-File lesen
  local VERCEL_PROJECT
  VERCEL_PROJECT=$(grep -E "^VERCEL_PROJECT=" "$ENV_FILE" | head -1 | cut -d'=' -f2- || true)

  if [[ -z "$VERCEL_PROJECT" ]]; then
    echo "Fehler: VERCEL_PROJECT nicht in $ENV_FILE definiert."
    return 1
  fi

  echo "=== Target: $TARGET ==="
  echo "Projekt:   $VERCEL_PROJECT"
  echo "Env-Datei: $ENV_FILE"
  echo ""

  # --- Team/Org ID ermitteln ---
  echo "Ermittle Team-ID..."
  local TEAMS_RESPONSE TEAM_ID TEAM_PARAM
  TEAMS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "https://api.vercel.com/v2/teams")

  TEAM_ID=$(echo "$TEAMS_RESPONSE" | jq -r '.teams[0].id // empty' 2>/dev/null || true)

  TEAM_PARAM=""
  if [[ -n "$TEAM_ID" ]]; then
    TEAM_PARAM="?teamId=$TEAM_ID"
  fi

  # --- Projekt-ID ermitteln ---
  echo "Ermittle Projekt-ID fuer '$VERCEL_PROJECT'..."
  local PROJECT_RESPONSE PROJECT_ID
  PROJECT_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "https://api.vercel.com/v9/projects/$VERCEL_PROJECT$TEAM_PARAM")

  PROJECT_ID=$(echo "$PROJECT_RESPONSE" | jq -r '.id // empty' 2>/dev/null)

  if [[ -z "$PROJECT_ID" ]]; then
    echo "Fehler: Projekt '$VERCEL_PROJECT' nicht gefunden."
    echo "Antwort: $PROJECT_RESPONSE"
    return 1
  fi

  echo "Projekt-ID: $PROJECT_ID"
  echo ""

  # --- Bestehende Env Vars laden ---
  echo "Lade bestehende Environment Variables..."
  local EXISTING_ENVS
  EXISTING_ENVS=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "https://api.vercel.com/v9/projects/$PROJECT_ID/env$TEAM_PARAM")

  # --- Env Vars aus Datei lesen und setzen ---
  local SUCCESS=0
  local FAILED=0

  while IFS= read -r line; do
    # Kommentare und leere Zeilen ueberspringen
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue

    local KEY="${line%%=*}"
    local VALUE="${line#*=}"

    # Fuehrende/folgende Leerzeichen entfernen
    KEY=$(echo "$KEY" | xargs)
    [[ -z "$KEY" ]] && continue

    # Script-interne Keys ueberspringen
    local SKIP=false
    for SKIP_KEY in "${SKIP_KEYS[@]}"; do
      [[ "$KEY" == "$SKIP_KEY" ]] && SKIP=true && break
    done
    $SKIP && continue

    # Platzhalter-Werte ueberspringen
    if [[ "$VALUE" == "<HIER_EINTRAGEN>" ]]; then
      echo "  UEBERSPRUNGEN $KEY (Platzhalter — bitte Wert eintragen)"
      continue
    fi

    # Pruefen ob Variable bereits existiert
    local EXISTING_ID
    EXISTING_ID=$(echo "$EXISTING_ENVS" | jq -r \
      --arg key "$KEY" --arg target "$TARGET" \
      '.envs[] | select(.key == $key and (.target[] == $target)) | .id' \
      2>/dev/null | head -1 || true)

    # Falls vorhanden: loeschen
    if [[ -n "$EXISTING_ID" ]]; then
      echo "  Aktualisiere $KEY (loesche alte Version)..."
      curl -s -X DELETE -H "Authorization: Bearer $TOKEN" \
        "https://api.vercel.com/v9/projects/$PROJECT_ID/env/$EXISTING_ID$TEAM_PARAM" > /dev/null
    fi

    # JSON-Payload mit jq erstellen (sicheres Escaping)
    local PAYLOAD
    PAYLOAD=$(jq -n \
      --arg key "$KEY" \
      --arg value "$VALUE" \
      --arg target "$TARGET" \
      '{key: $key, value: $value, target: [$target], type: "encrypted"}')

    # Neue Variable setzen
    echo "  Setze $KEY..."
    local RESPONSE CREATED_ID
    RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
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
  echo "Erfolgreich: $SUCCESS | Fehlerhaft: $FAILED"
  echo ""

  [[ $FAILED -eq 0 ]]
}

# --- Hauptlogik ---
TARGET_ARG="${1:-all}"

case "$TARGET_ARG" in
  preview|production)
    TARGETS=("$TARGET_ARG")
    ;;
  all|"")
    TARGETS=("preview" "production")
    ;;
  *)
    echo "Fehler: Unbekanntes Target '$TARGET_ARG'"
    echo ""
    echo "Usage: $0 [preview|production|all]"
    echo ""
    echo "  preview      Setzt Env Vars aus .env.preview"
    echo "  production   Setzt Env Vars aus .env.production"
    echo "  all          Setzt beide (Standard)"
    exit 1
    ;;
esac

echo "=========================================="
echo "  Vercel Environment Setup"
echo "=========================================="
echo ""
echo "Targets: ${TARGETS[*]}"
echo ""

TOTAL_FAILED=0
for TARGET in "${TARGETS[@]}"; do
  if ! setup_target "$TARGET"; then
    TOTAL_FAILED=$((TOTAL_FAILED + 1))
  fi
done

echo "=========================================="
if [[ $TOTAL_FAILED -eq 0 ]]; then
  echo "Alle Targets erfolgreich konfiguriert!"
  echo "Erstelle jetzt einen PR oder pushe auf main, um ein Deployment auszuloesen."
else
  echo "Es gab Fehler bei $TOTAL_FAILED Target(s)."
  exit 1
fi
