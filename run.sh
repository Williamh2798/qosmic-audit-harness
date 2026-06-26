#!/usr/bin/env bash
# Qosmic audit harness — pass any Shopify URL
#
#   ./run.sh https://gingerpeople.com     # full report (needs API key)
#   ./run.sh crawl https://gingerpeople.com

set -e
cd "$(dirname "$0")"

if [[ ! -d node_modules ]]; then
  echo "→ First run: installing dependencies..."
  npm install
fi

if [[ $# -eq 0 ]]; then
  npm start
  exit 0
fi

case "$1" in
  eval)
    shift
    if [[ -z "$1" ]]; then
      echo "Usage: ./run.sh eval <report.md> [manifest.json]"
      exit 1
    fi
    if [[ -n "$2" ]]; then
      npm run eval -- "$1" --manifest "$2"
    else
      npm run eval -- "$1"
    fi
    ;;
  crawl)
    shift
    URL="$1"
    [[ -z "$URL" ]] && { echo "Usage: ./run.sh crawl <url>"; exit 1; }
    [[ "$URL" != http* ]] && URL="https://$URL"
    echo "→ Crawling $URL"
    npm run audit -- "$URL" "${@:2}"
    ;;
  help|-h|--help)
    npm start
    ;;
  *)
    URL="$1"
    [[ "$URL" != http* ]] && URL="https://$URL"
    if [[ -n "$OPENAI_API_KEY" || -n "$ANTHROPIC_API_KEY" ]]; then
      echo "→ Full audit: $URL"
      npm run report -- "$URL" "${@:2}"
    else
      echo "→ No OPENAI_API_KEY or ANTHROPIC_API_KEY — crawling only."
      echo "  Set an API key and re-run ./run.sh $URL for the full report."
      echo "  Or open AGENTS.md in Cursor Agent mode after crawl completes."
      echo ""
      npm run audit -- "$URL" "${@:2}"
    fi
    ;;
esac
