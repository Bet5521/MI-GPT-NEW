#!/bin/sh
# MiGPT 容器入口：启动 Web 控制台（默认 6060），MiGPT 主进程由控制台管理
mkdir -p /app/config /app/logs
export MIGPT_UI_PORT="${MIGPT_UI_PORT:-6060}"

# 兜底：确保 .migpt.js 存在（默认走结构化配置）
if [ ! -f /app/.migpt.js ]; then
  cat > /app/.migpt.js <<'JSEOF'
// managed by migpt-webui
import fs from "node:fs";
export default JSON.parse(
  fs.readFileSync(new URL("./config/migpt.json", import.meta.url), "utf8")
);
JSEOF
fi

if [ "${MIGPT_AUTOSTART:-0}" = "1" ]; then
  node /app/webui/autostart.js >> /app/logs/webui.log 2>&1 &
fi

exec node /app/webui/server.js
