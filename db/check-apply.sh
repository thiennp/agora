#!/bin/sh
# Applies every migration in order to an empty Postgres 16 (needs Docker). Used for DB-01.
set -e
cd "$(dirname "$0")/.."
docker rm -f agora-mig >/dev/null 2>&1 || true
docker run -d --name agora-mig -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine >/dev/null
trap 'docker rm -f agora-mig >/dev/null 2>&1' EXIT
i=0
until docker exec agora-mig psql -U postgres -tAc "select 1" >/dev/null 2>&1 && [ $i -ge 3 ]; do i=$((i+1)); sleep 1; [ $i -lt 60 ] || { echo "postgres did not start"; exit 1; }; done
for f in db/migrations/*.sql; do
  echo "apply $f"
  docker exec -i agora-mig psql -U postgres -v ON_ERROR_STOP=1 -q < "$f"
done
echo "all migrations applied"
