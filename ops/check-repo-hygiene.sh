#!/usr/bin/env bash
set -euo pipefail

failures=0

is_allowed_project_path() {
  local path="$1"

  case "$path" in
    .env.example|.gitignore|README.md|Resumen_CaféTrace.md|docker-compose.yml|LICENSE|LICENSE.*|CHANGELOG.md|CONTRIBUTING.md|SECURITY.md|.github/*|backend/*|blockchain/*|docs/*|frontend/*|loadtests/*|mobile/*|ops/*)
      return 0
      ;;
  esac

  return 1
}

is_forbidden_path() {
  local path="$1"

  case "$path" in
    .env.example|*/.env.example)
      return 1
      ;;
    .git-new/*|*/.git-new/*|*/.git/*|.env|*/.env|.env.*|*/.env.*|*.env|*/.env|*.pem|*.key|*.p12|*.pfx|*.crt|*.cer|*.db|*.sqlite|*.sqlite3|*.log|*.dump|*.sql|*/node_modules/*|*/.next/*|*/.venv/*|*/venv/*|*/__pycache__/*|*/.pytest_cache/*|*/backups/*)
      return 0
      ;;
  esac

  return 1
}

while IFS= read -r path; do
  # Un archivo borrado del árbol de trabajo queda en el índice hasta el commit;
  # el gate remoto evaluará únicamente archivos presentes en el commit.
  [[ -e "$path" ]] || continue

  if ! is_allowed_project_path "$path"; then
    printf 'ERROR: ruta fuera del alcance autorizado del proyecto: %s\n' "$path" >&2
    failures=1
  fi

  if is_forbidden_path "$path"; then
    printf 'ERROR: archivo no permitido en el repositorio: %s\n' "$path" >&2
    failures=1
  fi

  size=$(wc -c < "$path")
  if (( size > 1048576 )); then
    printf 'ERROR: archivo mayor de 1 MiB sin aprobación/LFS: %s (%s bytes)\n' "$path" "$size" >&2
    failures=1
  fi
done < <(git ls-files)

if (( failures != 0 )); then
  exit 1
fi

printf 'Higiene del repositorio validada: sin secretos, artefactos o archivos grandes rastreados.\n'
