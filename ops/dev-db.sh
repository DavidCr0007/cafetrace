#!/usr/bin/env bash
set -euo pipefail

# PostgreSQL efímero y aislado para desarrollo local sin Docker. Nunca usa el
# clúster del sistema ni elimina datos automáticamente.
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="${CAFETRACE_RUNTIME_DIR:-$PROJECT_ROOT/.runtime}"
DATA_DIR="${CAFETRACE_PGDATA:-$RUNTIME_DIR/postgres}"
SOCKET_DIR="${CAFETRACE_PGSOCKET:-$RUNTIME_DIR/postgres-socket}"
LOG_FILE="$RUNTIME_DIR/postgres.log"
# 55432 evita colisionar con la instancia PostgreSQL del sistema en 5432.
PORT="${CAFETRACE_PGPORT:-55432}"
DB_USER="${CAFETRACE_DB_USER:-cafetrace}"
DB_PASSWORD="${CAFETRACE_DB_PASSWORD:-cafetrace}"
DB_NAME="${CAFETRACE_DB_NAME:-cafetrace}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'ERROR: falta el comando %s. Instala PostgreSQL 16 o superior.\n' "$1" >&2
    exit 127
  fi
}

for command_name in initdb pg_ctl pg_isready createdb psql grep; do
  require_command "$command_name"
done

if [[ ! "$PORT" =~ ^[0-9]+$ ]] || (( PORT < 1024 || PORT > 65535 )); then
  printf 'ERROR: CAFETRACE_PGPORT debe ser un puerto entre 1024 y 65535.\n' >&2
  exit 2
fi
for sql_identifier in "$DB_USER" "$DB_NAME"; do
  if [[ ! "$sql_identifier" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
    printf 'ERROR: usuario y base solo admiten identificadores PostgreSQL simples.\n' >&2
    exit 2
  fi
done

cluster_running() {
  pg_ctl -D "$DATA_DIR" status >/dev/null 2>&1
}

wait_until_ready() {
  local attempt
  for attempt in $(seq 1 30); do
    if PGPASSWORD="$DB_PASSWORD" pg_isready -h 127.0.0.1 -p "$PORT" -U "$DB_USER" -d postgres >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.2
  done
  printf 'ERROR: PostgreSQL no quedó disponible. Revisa %s\n' "$LOG_FILE" >&2
  return 1
}

initialize_cluster() {
  mkdir -p "$RUNTIME_DIR" "$SOCKET_DIR"
  chmod 700 "$RUNTIME_DIR" "$SOCKET_DIR"
  if [[ -f "$DATA_DIR/PG_VERSION" ]]; then
    return
  fi

  local password_file
  password_file="$(mktemp "$RUNTIME_DIR/pg-password.XXXXXX")"
  chmod 600 "$password_file"
  printf '%s' "$DB_PASSWORD" > "$password_file"
  if ! initdb \
    -D "$DATA_DIR" \
    --username="$DB_USER" \
    --pwfile="$password_file" \
    --auth-local=scram-sha-256 \
    --auth-host=scram-sha-256 \
    --encoding=UTF8 \
    --locale=C.UTF-8; then
    rm -f "$password_file"
    exit 1
  fi
  rm -f "$password_file"
}

start_cluster() {
  initialize_cluster
  if cluster_running; then
    printf 'PostgreSQL local ya está activo en 127.0.0.1:%s.\n' "$PORT"
    return
  fi
  if pg_isready -h 127.0.0.1 -p "$PORT" >/dev/null 2>&1; then
    printf 'ERROR: el puerto %s pertenece a otra instancia PostgreSQL. No se modificó.\n' "$PORT" >&2
    exit 1
  fi
  pg_ctl -D "$DATA_DIR" -l "$LOG_FILE" -o "-h 127.0.0.1 -p $PORT -k $SOCKET_DIR" start >/dev/null
  wait_until_ready
  if ! PGPASSWORD="$DB_PASSWORD" psql -h 127.0.0.1 -p "$PORT" -U "$DB_USER" -d postgres -tAc \
    "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -qx 1; then
    PGPASSWORD="$DB_PASSWORD" createdb -h 127.0.0.1 -p "$PORT" -U "$DB_USER" -O "$DB_USER" "$DB_NAME"
  fi
  printf 'PostgreSQL local listo: postgresql://%s:***@127.0.0.1:%s/%s\n' "$DB_USER" "$PORT" "$DB_NAME"
}

stop_cluster() {
  if [[ ! -f "$DATA_DIR/PG_VERSION" ]] || ! cluster_running; then
    printf 'PostgreSQL local ya está detenido.\n'
    return
  fi
  pg_ctl -D "$DATA_DIR" stop -m fast >/dev/null
  printf 'PostgreSQL local detenido.\n'
}

show_status() {
  if [[ -f "$DATA_DIR/PG_VERSION" ]] && cluster_running; then
    PGPASSWORD="$DB_PASSWORD" pg_isready -h 127.0.0.1 -p "$PORT" -U "$DB_USER" -d "$DB_NAME"
    printf 'Datos: %s\nLog: %s\n' "$DATA_DIR" "$LOG_FILE"
    return
  fi
  printf 'PostgreSQL local detenido.\n'
  return 1
}

case "${1:-start}" in
  start) start_cluster ;;
  stop) stop_cluster ;;
  restart) stop_cluster; start_cluster ;;
  status) show_status ;;
  *) printf 'Uso: %s {start|stop|restart|status}\n' "$0" >&2; exit 2 ;;
esac
