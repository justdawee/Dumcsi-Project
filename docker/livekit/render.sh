#!/usr/bin/env sh
# Avoid 'set' flags for BusyBox portability
echo "[livekit-config] render.sh start"

echo "[livekit-config] Starting render"
echo "[livekit-config] LIVEKIT_API_KEY=${LIVEKIT_API_KEY:-}"

# Generate RO key/secret if empty
if [ -z "${LIVEKIT_RO_API_KEY:-}" ]; then 
  LIVEKIT_RO_API_KEY=$(head -c 16 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 12)
  export LIVEKIT_RO_API_KEY
  echo "[livekit-config] Generated LIVEKIT_RO_API_KEY"
fi
if [ -z "${LIVEKIT_RO_API_SECRET:-}" ]; then 
  LIVEKIT_RO_API_SECRET=$(head -c 32 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32)
  export LIVEKIT_RO_API_SECRET
  echo "[livekit-config] Generated LIVEKIT_RO_API_SECRET"
fi

mkdir -p /config

# Write config directly without envsubst
cat > /config/livekit.yaml <<EOF
log_level: info
port: 7880
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 50200
keys:
  ${LIVEKIT_API_KEY}: ${LIVEKIT_API_SECRET}
  ${LIVEKIT_RO_API_KEY}: ${LIVEKIT_RO_API_SECRET}
EOF

echo "[livekit-config] LiveKit config created at /config/livekit.yaml"
