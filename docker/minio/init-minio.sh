#!/usr/bin/env sh
set -euo pipefail

echo "[minio-init] Waiting for MinIO at http://minio:9000 ..."
until (/usr/bin/mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"); do sleep 2; done

echo "[minio-init] Creating bucket: $MINIO_BUCKET (if not exists)"
/usr/bin/mc mb -p local/"$MINIO_BUCKET" || true

echo "[minio-init] Creating service user: $MINIO_SVC_USER (if not exists)"
/usr/bin/mc admin user add local "$MINIO_SVC_USER" "$MINIO_SVC_PASSWORD" || true

echo "[minio-init] Applying bucket RW policy for service user"
# Build policy JSON with resolved bucket name
cat > /tmp/bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowBucketList",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::${MINIO_BUCKET}"
      ]
    },
    {
      "Sid": "AllowObjectsRW",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucketMultipartUploads",
        "s3:AbortMultipartUpload"
      ],
      "Resource": [
        "arn:aws:s3:::${MINIO_BUCKET}/*"
      ]
    }
  ]
}
EOF

# Create or update policy and attach to service user (new mc syntax)
/usr/bin/mc admin policy create local ${MINIO_BUCKET}-rw /tmp/bucket-policy.json || true
/usr/bin/mc admin policy attach local --user ${MINIO_SVC_USER} ${MINIO_BUCKET}-rw || true

echo "[minio-init] Done"
