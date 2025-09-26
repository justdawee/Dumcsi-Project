#!/usr/bin/env sh
set -euo pipefail

echo "[minio-init] Waiting for MinIO at http://minio:9000 ..."
until (/usr/bin/mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"); do sleep 2; done

echo "[minio-init] Creating bucket: $MINIO_BUCKET (if not exists)"
/usr/bin/mc mb -p local/"$MINIO_BUCKET" || true

echo "[minio-init] Creating service user: $MINIO_SVC_USER (if not exists)"
/usr/bin/mc admin user add local "$MINIO_SVC_USER" "$MINIO_SVC_PASSWORD" || true

echo "[minio-init] Applying bucket RW policy for service user"
/usr/bin/mc admin policy add local ${MINIO_BUCKET}-rw /policy/bucket-policy.json || true
/usr/bin/mc admin policy set local ${MINIO_BUCKET}-rw user=${MINIO_SVC_USER} || true

echo "[minio-init] Done"

