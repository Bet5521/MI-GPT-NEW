// 可选：容器启动时自动拉起 MiGPT 主进程（MIGPT_AUTOSTART=1）
const PORT = process.env.MIGPT_UI_PORT || 6060;
await new Promise((r) => setTimeout(r, 3000));
try {
  const r = await fetch(`http://127.0.0.1:${PORT}/api/start`, { method: "POST" });
  console.log("[autostart]", await r.text());
} catch (e) {
  console.error("[autostart] failed:", e.message);
}
