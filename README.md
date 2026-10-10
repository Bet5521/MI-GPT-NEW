> [!WARNING]
> 本项目已停止维护，不再提供更新与支持，感谢大家的使用。

<div align="center">

# MiGPT：智能家居，从未如此贴心 ❤️

<a href="https://trendshift.io/repositories/10645" target="_blank"><img src="https://trendshift.io/api/badge/repositories/10645" alt="idootop%2Fmi-gpt | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>

👉 演示视频：[将小爱音箱接入 ChatGPT 和豆包，改造成你的专属语音助手～](https://www.bilibili.com/video/BV1N1421y7qn/?share_source=copy_web&vd_source=5d4e78ff2a0dc6a661baa65f479199c1)

[![Docker Pulls](https://img.shields.io/docker/pulls/idootop/mi-gpt)](https://hub.docker.com/r/idootop/mi-gpt)
[![npm version](https://badge.fury.io/js/mi-gpt.svg)](https://www.npmjs.com/package/mi-gpt) 
[![Docker Image Version](https://img.shields.io/docker/v/idootop/mi-gpt?color=%23086DCD&label=docker%20image)](https://hub.docker.com/r/idootop/mi-gpt) 
[![License](https://img.shields.io/github/license/idootop/mi-gpt)](https://github.com/idootop/mi-gpt/blob/main/LICENSE)
[![Featured｜HelloGitHub](https://abroad.hellogithub.com/v1/widgets/recommend.svg?rid=e02e62fbb9c746cdb61c6559c186ac44&claim_uid=LdwexZ8z7Ggu3lJ&theme=small)](https://hellogithub.com/repository/e02e62fbb9c746cdb61c6559c186ac44)


</div>

<video src='https://github.com/idootop/mi-gpt/assets/35302658/dc336916-9087-418b-bc1b-04d5534dce8f'></video>

> [!NOTE]
> **本仓库为修改版（V1.9.9 初始修改版）**：基于 [idootop/mi-gpt](https://github.com/idootop/mi-gpt) 二次修改，在原项目基础上新增 **Web 控制台（WebUI）** 与 **ARM32v7（玩客云 / armv7l）构建支持** 等能力。下文为本次更新新增与修复的内容。

## 🆕 V1.9.9 更新内容

### ✨ 新增功能

#### 1. Web 控制台（WebUI）
内置一个**零依赖**（仅使用 Node.js 内置模块）的 Web 管理界面，默认监听 `6060` 端口（可用环境变量 `MIGPT_UI_PORT` 覆盖）。容器启动后访问 `http://<设备IP>:6060` 即可打开控制台。主要能力：

- **进程管理**：在网页上一键 **启动 / 停止 / 重启** MiGPT 主进程，实时查看运行状态、PID 与运行时长；设置 `MIGPT_AUTOSTART=1` 可在控制台就绪后自动拉起 MiGPT。
- **配置管理**：
  - 结构化模式：通过表单 / JSON 编辑 `bot`、`master`、`speaker` 等配置；
  - 高级模式：直接编辑 `.migpt.js` 与 `.env`（支持 OpenAI、智谱 GLM、通义千问、MoonShot、DeepSeek 等兼容 OpenAI 的模型）。
- **米家登录态（passToken）管理**：可视化写入 / 清除 `.mi.json` 中的 `passToken`，实现**免密登录、跳过风控**；passToken 在界面中自动脱敏展示，并持久化到挂载卷（容器重建不丢失）。
- **日志查看**：网页内实时查看 / 清空 MiGPT 运行日志（最多 1000 行）。
- **可选 Basic Auth**：设置 `WEB_AUTH_USER` / `WEB_AUTH_PASS` 即可为控制台开启访问保护。

#### 2. ARM32v7（玩客云 / armv7l）构建支持
- 新增 `Dockerfile.arm`：基于 `debian:bookworm`，从内置的 `node-v20.14.0-linux-armv7l.tar.xz` 解包 Node 20，完成 pnpm 安装、Prisma 生成与 `tsup` 打包，并拷贝 `webui` 与 `entrypoint.sh`，容器入口即为 Web 控制台。
- 新增 `entrypoint.sh`：容器入口脚本，负责创建 `config` / `logs` 目录、兜底生成 `.migpt.js`、按 `MIGPT_AUTOSTART` 决定是否自启 MiGPT，最后启动 Web 控制台（`node /app/webui/server.js`）。
- `.dockerignore` 增加构建产物白名单、`Dockerfile` 增加 `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1` 以适配 ARM 环境。

### 🐛 修复与适配
- 修复 ARM 环境下 Prisma 引擎校验失败（checksum missing）导致无法启动的问题：跳过缺失引擎的校验和。
- 修复 ARM 设备（如玩客云）无官方 amd64/arm64 镜像、无法直接 `docker run idootop/mi-gpt` 的问题，提供专用 ARM 构建链路。
- 修复米家登录频繁触发异地风控、需反复验证码的问题：通过 WebUI 写入 `passToken` 实现免密登录。

### 📦 本次新增文件
```
webui/
  server.js        # 零依赖 Web 控制台服务端
  index.html       # 控制台前端页面
  autostart.js     # 可选：容器启动后自动拉起 MiGPT 主进程
Dockerfile.arm     # ARM32v7 构建文件
entrypoint.sh      # 容器入口（启动 Web 控制台 / 可选自启 MiGPT）
node-v20.14.0-linux-armv7l.tar.xz  # ARM 构建内置 Node 20 二进制
```

## 👋 项目简介

在这个数字化的世界里，家已不仅仅是一个居住的地方，而是我们数字生活的延伸。

`MiGPT` 通过将小爱音箱、米家智能设备，与 ChatGPT 的理解能力完美融合，让你的智能家居更懂你。

`MiGPT` 不仅仅是关于设备自动化，而是关于：**打造一个懂你、有温度、与你共同进化的家**。

未来，你的每个智能家居设备，从灯泡、插座，到扫地机器人、电视等，

都可以作为一个个独立的智能体 (Agent)，更智能、更贴心的响应你的指令。

这些独立的智能体，也可以彼此感知，彼此配合，构成一个更强大的协作网络。

而小爱音箱就像是你的智能家居专属管家，全心全意为你服务，释放智能家居的真正潜力。

## ✨ 功能亮点

- **🎓 AI 问答**。想象一下，当小爱音箱接入大模型后，上知天文，下知地理，从“人工智障”秒变学霸。
- **🎭 角色扮演**。一秒调教小爱，无论是成为你的完美伴侣，还是那个能听你倾诉心事的贴心闺蜜，都不在话下。
- **💬 流式响应**。爱情来得太快就像龙卷风，而你的小爱音箱也是，对你的爱意秒回，爱你不会让你等太久。
- **🧠 长短期记忆**。小爱音箱现在能记住你们之间的每一次对话，越聊越默契，就像是你身边的老朋友。
- **🔊 自定义 TTS**。厌倦了小爱同学的语音？帮你解锁[「豆包」](https://doubao.com)同款音色，就像真人在回你的消息。
- ~**🤖️ 智能家居 Agent**。心情不好？小爱立刻懂你，自动帮你播放喜欢的音乐，调节灯光，逗你开心。~

## 🦄 Sponsors

![302.AI](./assets/sponsors/302banner2.jpg)

> 302.AI 是一个按需付费的一站式 AI 应用平台，开放平台，开源生态。[官方网站](https://302.ai)｜[网站介绍](https://help.302.ai)

## ⚡️ 快速开始

> [!TIP]
> 如果你是小爱音箱 Pro 用户，推荐使用 [Open-XiaoAI](https://github.com/idootop/open-xiaoai) ✨
>
> 即刻解锁**自定义唤醒词、连续对话、接入小智 AI** 等全新玩法

### 视频教程

👉 [MiGPT 光速入门视频教程，手把手教你调教小爱音箱～](https://www.bilibili.com/video/BV1zb421H7cS)

### 设备要求

`MiGPT` 支持大部分的小爱音箱型号，推荐使用小爱音箱 Pro（完美运行）

👉 [查看更多兼容的小爱音箱型号和配置参数](https://github.com/idootop/mi-gpt/blob/main/docs/compatibility.md)

> 注意：本项目暂不支持小度音箱、天猫精灵、HomePod 等智能音箱设备，亦无相关适配计划。

### 使用方式

`MiGPT` 有两种启动方式: [Docker](#docker) 和 [Node.js](#nodejs)。

启动成功后，你可以通过以下方式来召唤 AI 回答问题：

- **小爱同学，请 xxx**。比如 `小爱同学，请问地球为什么是圆的？`
- **小爱同学，你 xxx**。比如 `小爱同学，你喜欢我吗？`
- **小爱同学，召唤 xxx**。比如 `小爱同学，召唤傻妞`

### Docker

[![Docker Image Version](https://img.shields.io/docker/v/idootop/mi-gpt?color=%23086DCD&label=docker%20image)](https://hub.docker.com/r/idootop/mi-gpt)

对于电脑小白或者不想自己配置代码运行环境（Node）的同学，可以使用 Docker 启动方式。

请先按照 [⚙️ 参数设置](https://github.com/idootop/mi-gpt/blob/main/docs/settings.md) 相关说明，配置好你的 `.env` 和 `.migpt.js` 文件，然后使用以下命令启动 docker：

```shell
docker run -d --env-file $(pwd)/.env -v $(pwd)/.migpt.js:/app/.migpt.js idootop/mi-gpt:latest
```

注意：在 Windows 终端下需要将配置文件路径 `$(pwd)` 替换为绝对路径。

### Node.js

[![npm version](https://badge.fury.io/js/mi-gpt.svg)](https://www.npmjs.com/package/mi-gpt)

如果你是一名前端 (Node) 开发者，也可以通过 NPM 安装 `mi-gpt` 启动 `MiGPT`。

```shell
npm install mi-gpt # 安装依赖
```

然后，创建并启动 `MiGPT` 实例。初始化参数的具体说明请到 [⚙️ 参数设置](https://github.com/idootop/mi-gpt/blob/main/docs/settings.md) 查看。

```typescript
import { MiGPT } from "mi-gpt";

async function main() {
  const client = MiGPT.create({
    speaker: {
      userId: "987654321", // 注意：不是手机号或邮箱，请在「个人信息」-「小米 ID」查看
      password: "123456", // 账号密码
      did: "小爱音箱Pro", // 小爱音箱 ID 或在米家中设置的名称
    },
  });
  await client.start();
}

main();
```

注意：此模式下并不会主动读取 `.env` 和 `.migpt.js` 中的配置信息，你需要手动初始化 Node 环境变量，并将 `.migpt.js` 中的参数作为 `MiGPT.create` 的初始化参数传入。👉 [示例代码](https://github.com/idootop/mi-gpt/blob/example/index.ts)

## 📖 使用文档

提示：大多数问题都可在 [💬 常见问题](https://github.com/idootop/mi-gpt/blob/main/docs/faq.md) 中找到答案。

- [🔥 官方视频教程](https://www.bilibili.com/video/BV1zb421H7cS)
- [⚙️ 参数设置](https://github.com/idootop/mi-gpt/blob/main/docs/settings.md)
- [💬 常见问题](https://github.com/idootop/mi-gpt/blob/main/docs/faq.md)
- [🔊 使用第三方 TTS](https://github.com/idootop/mi-gpt/blob/main/docs/tts.md)
- [🛠️ 本地开发](https://github.com/idootop/mi-gpt/blob/main/docs/development.md)
- [💎 工作原理](https://github.com/idootop/mi-gpt/blob/main/docs/how-it-works.md)
- [🦄 Sponsors](https://github.com/idootop/mi-gpt/blob/main/docs/sponsors.md)
- [✨ 更新日志](https://github.com/idootop/mi-gpt/blob/main/docs/changelog.md)
- [🚀 Roadmap](https://github.com/idootop/mi-gpt/blob/main/docs/roadmap.md)

## 🔗 相关项目与教程

| 项目链接                                                                                                                                                                                                                             | 简介                                                                                                                                                    | 来源                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **相关项目**                                                                                                                                                                                                                         |                                                                                                                                                         |                                                      |
| [MiGPT GUI](https://migptgui.com/)                                                                                                                                                                                                   | 通过图形化界面的方式创建并管理 MiGPT，支持运行多个账号                                                                                                  | [@lmk123](https://github.com/lmk123)                 |
| [MiGPT 配置中心](https://github.com/LipapaSma/mi-gpt-vue)                                                                                                                                                                            | 基于 Vue 的 MiGPT 可视化配置界面，提供直观的服务管理和参数配置能力                                                                                      | [@LipapaSma](https://github.com/LipapaSma)           |
| [@shinedlc/mi-gpt](https://github.com/shinedlc/mi-gpt)                                                                                                                                                                               | 支持摄像头模块的 MiGPT 分支，让小爱同学可以看到和理解现实世界                                                                                           | [@shinedlc](https://github.com/shinedlc)             |
| **使用教程**                                                                                                                                                                                                                         |                                                                                                                                                         |                                                      |
| [MiGPT 官方视频教程](https://www.bilibili.com/video/BV1zb421H7cS)                                                                                                                                                                    | 官方视频教程配套 PPT 文件 👉 [MiGPT 官方教程.pdf](https://github.com/idootop/mi-gpt/blob/main/assets/pdf/MiGPT%E5%AE%98%E6%96%B9%E6%95%99%E7%A8%8B.pdf) | [@idootop](https://github.com/idootop)               |
| [MiGPT 接入豆包等大模型教程](https://migptgui.com/docs/apply/)                                                                                                                                                                       | 豆包、Moonshot（Kimi）等常见大模型的详细接入教程                                                                                                        | [@lmk123](https://github.com/lmk123)                 |
| [通过 Docker 快速安装 MiGPT，手把手教你绕开异地登录风控](https://www.nodeseek.com/post-264959-1)                                                                                                                                     | 适合小白的使用教程，全程几乎都是图形化页界面                                                                                                            | [@Jasonzhu1207](https://github.com/Jasonzhu1207)     |
| [小爱音箱 PRO 的 AI 模式使用说明](https://github.com/idootop/mi-gpt/blob/bbdb80e9bc38b7c40865e52cbd6517980a68615a/assets/pdf/%E5%B0%8F%E7%88%B1%E9%9F%B3%E7%AE%B1PRO%20AI%E6%A8%A1%E5%BC%8F%E4%BD%BF%E7%94%A8%E8%AF%B4%E6%98%8E.pdf) | 这是一位老爸为家里的小朋友专门整理的贴心教程                                                                                                            | [@mxyblog](https://github.com/mxyblog)               |
| [使用 MiGPT 将你的小爱音箱接入 ChatGPT](https://www.iloli.love/archives/1719073913220)                                                                                                                                               | 作者详细介绍了如何在 1Panel 上，通过 [OneAPI](https://github.com/songquanpeng/one-api) 来转换腾讯混元大模型，和讯飞星火大模型的 API 并成功接入 MiGPT    | [@miaowmint](https://github.com/miaowmint)           |
| [Unraid 部署 MiGPT](https://github.com/idootop/mi-gpt/blob/adfdcc4ee51aef8d4f2d8996f18be716da19a0ad/assets/pdf/Unraid%E9%83%A8%E7%BD%B2MiGPT.pdf)                                                                                    | 在 Unraid 上使用 Docker 部署 MiGPT 的详细教程                                                                                                           | [@ilovesouthpark](https://github.com/ilovesouthpark) |

## ❤️ 鸣谢

特别感谢以下项目提供的实现参考：

- https://github.com/yihong0618/xiaogpt
- https://github.com/jialeicui/open-lx01
- https://github.com/inu1255/mi-service
- https://github.com/Yonsm/MiService

## 🚨 免责声明

本项目仅供学习和研究目的，不得用于任何商业活动。用户在使用本项目时应遵守所在地区的法律法规，对于违法使用所导致的后果，本项目及作者不承担任何责任。
本项目可能存在未知的缺陷和风险（包括但不限于设备损坏和账号封禁等），使用者应自行承担使用本项目所产生的所有风险及责任。
作者不保证本项目的准确性、完整性、及时性、可靠性，也不承担任何因使用本项目而产生的任何损失或损害责任。
使用本项目即表示您已阅读并同意本免责声明的全部内容。

## License

[MIT](https://github.com/idootop/mi-gpt/blob/main/LICENSE) License © 2024-PRESENT Del Wang
