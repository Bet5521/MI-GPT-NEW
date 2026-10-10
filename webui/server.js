// MiGPT Web 控制台 —— 零依赖（仅用 Node 内置模块）
// 端口默认 6060，可用 MIGPT_UI_PORT 覆盖。
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const APP_DIR = "/app";
const CONFIG_DIR = path.join(APP_DIR, "config");
const CONFIG_JSON = path.join(CONFIG_DIR, "migpt.json");
const MIGPT_JS = path.join(APP_DIR, ".migpt.js");
const ENV_FILE = path.join(APP_DIR, ".env");
// mi-service-lite 的登录态文件：工作目录 /app 下的 .mi.json
// mi-gpt 只会把 speaker 的 userId/password/did 传进 getMiService()，
// speaker.passToken 不会透传，所以必须直接写这个文件才能免密/跳过风控。
const MI_JSON = path.join(APP_DIR, ".mi.json");
const MI_JSON_BAK = path.join(CONFIG_DIR, ".mi.json"); // 落到已挂载的 /app/config，容器重建不丢
const UI_LOG_DIR = process.env.MIGPT_LOG_DIR || "/tmp";
const LOG_DIR = path.join(APP_DIR, "logs");
const LOG_FILE = path.join(LOG_DIR, "migpt.log");
const PID_FILE = path.join(LOG_DIR, "migpt.pid");
const PORT = Number(process.env.MIGPT_UI_PORT || 6060);
const AUTH_USER = process.env.WEB_AUTH_USER || "";
const AUTH_PASS = process.env.WEB_AUTH_PASS || "";

const MANAGED_MARK = "// managed by migpt-webui";

const BOOTSTRAP = `${MANAGED_MARK}
import fs from "node:fs";
export default JSON.parse(
  fs.readFileSync(new URL("./config/migpt.json", import.meta.url), "utf8")
);
`;

const DEFAULT_CONFIG = {
  systemTemplate: "",
  bot: { name: "傻妞", profile: "性别：女\n性格：乖巧可爱\n爱好：喜欢搞怪，爱吃醋。" },
  master: { name: "陆小千", profile: "性别：男\n性格：善良正直" },
  speaker: {
    userId: "",
    password: "",
    did: "",
    callAIKeywords: ["请", "你", "傻妞"],
    wakeUpKeywords: ["打开", "进入", "召唤"],
    exitKeywords: ["关闭", "退出", "再见"],
    onEnterAI: ["你好，我是傻妞，很高兴认识你"],
    onExitAI: ["傻妞已退出"],
    onAIAsking: ["让我先想想", "请稍等"],
    onAIReplied: ["我说完了", "还有其他问题吗"],
    onAIError: ["啊哦，出错了，请稍后再试吧！"],
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 3],
    playingCommand: [],
    tts: "xiaoai",
    switchSpeakerKeywords: [],
    streamResponse: false,
    exitKeepAliveAfter: 30,
    checkTTSStatusAfter: 3,
    checkInterval: 1000,
    debug: false,
    enableTrace: false,
    timeout: 5000,
  },
};

const DEFAULT_ENV_TEXT = [
  "# OpenAI（也支持智谱 GLM / 通义千问 / MoonShot / DeepSeek 等兼容 OpenAI 的模型）",
  "OPENAI_MODEL=glm-4-flash",
  "OPENAI_API_KEY=",
  "OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4",
  "",
  "# 第三方 TTS（可选）",
  "# TTS_BASE_URL=http://192.168.6.x:4321/xxxx/api",
  "",
].join("\n");

function ensureDirs() {
  for (const d of [CONFIG_DIR, LOG_DIR, UI_LOG_DIR]) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }
  if (!fs.existsSync(CONFIG_JSON)) {
    fs.writeFileSync(CONFIG_JSON, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n");
  }
  if (!fs.existsSync(ENV_FILE)) {
    fs.writeFileSync(ENV_FILE, DEFAULT_ENV_TEXT);
  }
  if (!fs.existsSync(MIGPT_JS)) {
    fs.writeFileSync(MIGPT_JS, BOOTSTRAP);
  }
  if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, "");
  restoreMiJson();
}

// ---------- .mi.json（米家登录态 / passToken） ----------
// 内容形如：
// { "mina": { "pass": { "passToken": "V1:..." } }, "miiot": { "pass": { "passToken": "V1:..." } } }
// getMiService() 会把 store[service] 整体展开成 account，再用 account.pass.passToken
// 作为 cookie 去请求 /pass/serviceLogin —— 命中 code===0 就直接跳过密码登录（也就绕开风控）。
function readMiJsonFile(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}
function maskToken(t) {
  if (!t) return "";
  return t.length <= 14 ? t.slice(0, 4) + "***" : t.slice(0, 10) + "***" + t.slice(-6);
}
function pickToken(obj) {
  return (obj && ((obj.mina && obj.mina.pass && obj.mina.pass.passToken) ||
                  (obj.miiot && obj.miiot.pass && obj.miiot.pass.passToken))) || "";
}
function miJsonStatus() {
  const live = readMiJsonFile(MI_JSON);
  const src = live || readMiJsonFile(MI_JSON_BAK);
  if (!src) return { exists: false, hasToken: false, masked: "", location: MI_JSON };
  const t = pickToken(src);
  const complete = !!(src.mina && src.mina.pass && src.mina.pass.passToken &&
                      src.miiot && src.miiot.pass && src.miiot.pass.passToken);
  return {
    exists: true,
    hasToken: !!t,
    complete,
    masked: maskToken(t),
    location: MI_JSON,
    persisted: fs.existsSync(MI_JSON_BAK),
  };
}
// 容器重建后 /app/.mi.json 会丢，从挂载目录恢复回来
function restoreMiJson() {
  if (fs.existsSync(MI_JSON)) return;
  try {
    if (fs.existsSync(MI_JSON_BAK)) {
      fs.copyFileSync(MI_JSON_BAK, MI_JSON);
      console.log("[mi.json] 已从持久化副本恢复 /app/.mi.json");
    }
  } catch {}
}
// token 为空字符串表示清除 passToken
// 只写 mina/miiot 的 pass.passToken —— 不写 userId / deviceId / did，
// 剩下的（serviceToken、ssecurity、deviceId 等）由 mi-gpt 登录成功后自己往里补。
function writeMiJson(token) {
  ensureDirs();
  let merged = readMiJsonFile(MI_JSON) || readMiJsonFile(MI_JSON_BAK);
  if (!merged || typeof merged !== "object") {
    // 首次生成：严格按模板结构
    const pass = token ? { passToken: token } : {};
    merged = { mina: { pass: { ...pass } }, miiot: { pass: { ...pass } } };
    const text = JSON.stringify(merged, null, 2) + "\n";
    fs.writeFileSync(MI_JSON, text);
    try { fs.writeFileSync(MI_JSON_BAK, text); } catch {}
    return merged;
  }
  for (const svc of ["mina", "miiot"]) {
    const node = merged[svc] && typeof merged[svc] === "object" ? merged[svc] : {};
    const pass = node.pass && typeof node.pass === "object" ? node.pass : {};
    if (token) pass.passToken = token;
    else delete pass.passToken;
    if (Object.keys(pass).length) node.pass = pass;
    else delete node.pass;
    merged[svc] = node;
  }
  const text = JSON.stringify(merged, null, 2) + "\n";
  fs.writeFileSync(MI_JSON, text);
  try {
    fs.writeFileSync(MI_JSON_BAK, text); // 同步一份到挂载卷，防止容器重建丢失
  } catch {}
  return merged;
}

// ---------- 进程管理 ----------
function readPid() {
  try {
    const pid = Number(fs.readFileSync(PID_FILE, "utf8").trim());
    return Number.isFinite(pid) && pid > 0 ? pid : 0;
  } catch {
    return 0;
  }
}
function alive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
function isRunning() {
  return alive(readPid());
}
function parsePidStart(pid) {
  // 用 /proc/<pid>/stat 第 22 字段（starttime）粗略算存活时长不可靠，这里用 pid 文件 mtime
  try {
    const st = fs.statSync(PID_FILE);
    return Math.round((Date.now() - st.mtimeMs) / 1000);
  } catch {
    return 0;
  }
}

function startMiGpt() {
  if (isRunning()) return { ok: false, msg: "MiGPT 已在运行" };
  ensureDirs();
  const fd = fs.openSync(LOG_FILE, "a");
  const stamp = `\n===== start @ ${new Date().toLocaleString("zh-CN")} =====\n`;
  fs.writeSync(fd, stamp);
  const child = spawn("node", ["--env-file=" + ENV_FILE, "app.js"], {
    cwd: APP_DIR,
    detached: true,
    stdio: ["ignore", fd, fd],
    env: { ...process.env },
  });
  fs.writeFileSync(PID_FILE, String(child.pid));
  child.unref();
  fs.closeSync(fd);
  return { ok: true, msg: `已启动 MiGPT（pid ${child.pid}）`, pid: child.pid };
}

function stopMiGpt() {
  const pid = readPid();
  if (!pid || !alive(pid)) {
    try { fs.rmSync(PID_FILE, { force: true }); } catch {}
    return { ok: true, msg: "MiGPT 未在运行" };
  }
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try { process.kill(pid, "SIGTERM"); } catch {}
  }
  // 等最多 8 秒确认退出，否则 SIGKILL
  const t0 = Date.now();
  while (Date.now() - t0 < 8000) {
    if (!alive(pid)) break;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
  }
  if (alive(pid)) {
    try { process.kill(-pid, "SIGKILL"); } catch { try { process.kill(pid, "SIGKILL"); } catch {} }
  }
  try { fs.rmSync(PID_FILE, { force: true }); } catch {}
  return { ok: true, msg: "已停止 MiGPT" };
}

// ---------- 配置读写 ----------
function readConfigState() {
  ensureDirs();
  let raw = "";
  if (fs.existsSync(MIGPT_JS)) raw = fs.readFileSync(MIGPT_JS, "utf8");
  const managed = !fs.existsSync(MIGPT_JS) || raw.includes(MANAGED_MARK);
  let config = null;
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_JSON, "utf8"));
  } catch {
    config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
  let env = "";
  try {
    env = fs.readFileSync(ENV_FILE, "utf8");
  } catch {}
  return { managed, config, raw, env, mi: miJsonStatus() };
}

function writeConfig(body) {
  ensureDirs();
  const mode = body.mode === "raw" ? "raw" : "struct";
  if (body.env != null) fs.writeFileSync(ENV_FILE, String(body.env));
  if (mode === "raw") {
    fs.writeFileSync(MIGPT_JS, String(body.raw ?? ""));
    const tok = body.miPassToken != null ? String(body.miPassToken).trim() : null;
    if (tok !== null) {
      writeMiJson(tok, String(body.userId ?? "").trim());
      return { ok: true, msg: tok ? "已保存自定义 .migpt.js，并写入 .mi.json" : "已保存自定义 .migpt.js，并清除 passToken", mi: miJsonStatus() };
    }
    return { ok: true, msg: "已保存自定义 .migpt.js", mi: miJsonStatus() };
  }
  let cfg = body.config;
  if (typeof cfg === "string") cfg = JSON.parse(cfg);
  fs.writeFileSync(CONFIG_JSON, JSON.stringify(cfg, null, 2) + "\n");
  fs.writeFileSync(MIGPT_JS, BOOTSTRAP);

  let msg = "配置已保存（结构化模式）";
  let tok = body.miPassToken != null ? String(body.miPassToken).trim() : null;
  if (tok === null) tok = String((cfg && cfg.speaker && cfg.speaker.passToken) || "").trim();
  if (tok) {
    writeMiJson(tok);
    msg += "；已写入 /app/.mi.json（mina + miiot），下次启动用 passToken 登录";
    if (isRunning()) msg += "（MiGPT 正在运行，需重启后生效）";
  } else if (body.miPassToken != null) {
    writeMiJson("");
    msg += "；已清除 .mi.json 中的 passToken，将改用账号密码登录";
  }
  return { ok: true, msg, mi: miJsonStatus() };
}

function tailLog(lines) {
  ensureDirs();
  let data = "";
  try {
    data = fs.readFileSync(LOG_FILE, "utf8");
  } catch {
    return "";
  }
  const arr = data.split("\n");
  return arr.slice(-Math.max(1, Math.min(lines, 1000))).join("\n");
}

// ---------- HTTP ----------
function authOk(req) {
  if (!AUTH_USER || !AUTH_PASS) return true;
  const h = req.headers.authorization || "";
  if (!h.startsWith("Basic ")) return false;
  let decoded = "";
  try {
    decoded = Buffer.from(h.slice(6), "base64").toString("utf8");
  } catch {
    return false;
  }
  const i = decoded.indexOf(":");
  return decoded.slice(0, i) === AUTH_USER && decoded.slice(i + 1) === AUTH_PASS;
}

function send(res, code, data, type = "application/json; charset=utf-8") {
  const buf = Buffer.from(typeof data === "string" ? data : JSON.stringify(data), "utf8");
  res.writeHead(code, {
    "Content-Type": type,
    "Content-Length": buf.length,
    "Cache-Control": "no-store",
  });
  res.end(buf);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > 2 * 1024 * 1024) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const INDEX_HTML = fileURLToPath(new URL("./index.html", import.meta.url));

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (!authOk(req)) {
      res.writeHead(401, { "WWW-Authenticate": 'Basic realm="MiGPT"' });
      return res.end("Unauthorized");
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      const html = fs.readFileSync(INDEX_HTML, "utf8");
      return send(res, 200, html, "text/html; charset=utf-8");
    }

    if (url.pathname === "/api/status") {
      const running = isRunning();
      return send(res, 200, {
        running,
        pid: running ? readPid() : 0,
        uptime: running ? parsePidStart(readPid()) : 0,
        authEnabled: !!(AUTH_USER && AUTH_PASS),
        port: PORT,
        mi: miJsonStatus(),
      });
    }

    if (url.pathname === "/api/config" && req.method === "GET") {
      return send(res, 200, readConfigState());
    }

    if (url.pathname === "/api/config" && req.method === "POST") {
      const text = await readBody(req);
      const body = text ? JSON.parse(text) : {};
      const r = writeConfig(body);
      return send(res, 200, r);
    }

    // 单独写入 / 清除 passToken（body: { passToken, userId }）
    if (url.pathname === "/api/mi-token" && req.method === "POST") {
      ensureDirs();
      const text = await readBody(req);
      const body = text ? JSON.parse(text) : {};
      const token = String(body.passToken ?? "").trim();
      writeMiJson(token);
      return send(res, 200, {
        ok: true,
        msg: token ? "已写入 /app/.mi.json" : "已清除 passToken，将改用账号密码登录",
        mi: miJsonStatus(),
      });
    }

    // 查看当前 .mi.json（脱敏）
    if (url.pathname === "/api/mi-token" && req.method === "GET") {
      return send(res, 200, miJsonStatus());
    }

    if (url.pathname === "/api/start" && req.method === "POST") {
      return send(res, 200, startMiGpt());
    }

    if (url.pathname === "/api/stop" && req.method === "POST") {
      return send(res, 200, stopMiGpt());
    }

    if (url.pathname === "/api/restart" && req.method === "POST") {
      stopMiGpt();
      await new Promise((r) => setTimeout(r, 1200));
      return send(res, 200, startMiGpt());
    }

    if (url.pathname === "/api/logs") {
      const n = Number(url.searchParams.get("lines") || 200);
      return send(res, 200, { log: tailLog(n) });
    }

    if (url.pathname === "/api/logs/clear" && req.method === "POST") {
      fs.writeFileSync(LOG_FILE, "");
      return send(res, 200, { ok: true, msg: "日志已清空" });
    }

    return send(res, 404, { error: "not found" });
  } catch (e) {
    return send(res, 500, { error: String(e && e.message ? e.message : e) });
  }
});

ensureDirs();
server.listen(PORT, "0.0.0.0", () => {
  console.log(`MiGPT Web 控制台已启动: http://0.0.0.0:${PORT}`);
  console.log(`认证: ${AUTH_USER && AUTH_PASS ? "已启用" : "未启用（设 WEB_AUTH_USER/WEB_AUTH_PASS 开启）"}`);
  const mi = miJsonStatus();
  console.log(`.mi.json: ${mi.exists ? (mi.hasToken ? "已存在（含 passToken " + mi.masked + "）" : "已存在（无 passToken）") : "不存在"}`);
});

process.on("uncaughtException", (e) => console.error("[uncaught]", e));
process.on("unhandledRejection", (e) => console.error("[unhandled]", e));
