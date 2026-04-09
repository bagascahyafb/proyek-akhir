#!/usr/bin/env sh
set -eu

PORT_VALUE="${PORT:-7860}"

exec uvicorn api:app --host 0.0.0.0 --port "${PORT_VALUE}"
