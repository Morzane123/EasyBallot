# EasyBallot

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-brightgreen.svg?style=flat-square)](package.json)
[![React](https://img.shields.io/badge/react-19-61dafb.svg?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/typescript-6-3178c6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node.js](https://img.shields.io/badge/node.js-express-339933.svg?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![SQLite](https://img.shields.io/badge/database-better--sqlite3-003b57.svg?style=flat-square&logo=sqlite&logoColor=white)](https://github.com/WiseLibs/better-sqlite3)

**发布者: Northland Studio**

<img src="client/public/icon.png" alt="EasyBallot" width="64" height="64" />

面向班级歌唱比赛等场景的简约投票发布平台。创建富媒体投票项目、安全收集投票、导出结果，全部无需投票者注册。

## 项目综述

EasyBallot 是一套完整的投票全栈解决方案，覆盖从投票创建、公开投票、数据采集到结果导出的完整闭环。

**管理端**以 `/admin` 路由为核心，管理员登录后创建投票项目，定义投票项和选项，为选项附加图片或视频。图片和视频通过七牛云对象存储上传并由 CDN 分发，视频默认采用 HLS 流媒体协议以降低带宽压力。配套 `convert_video.py` 工具脚本支持 GPU 硬件加速编码、720p 自动缩放和 HLS 封装，在本地一键处理后直接上传七牛。

**投票端**以 `/[ID]` 路由承载，无需登录即可参与。系统通过 FingerprintJS 采集设备指纹实现一人一票去重，配合服务端 IP 60 秒冷却机制防止刷票。首次访问自动跳转隐私政策页面，明确告知信息采集范围及开发维护单位（北域工作室、张津瑞），用户同意后方可进入投票。

**数据侧**在投票完成后生成 6 位核对码和投票者编号，提示用户截图保存用于后续公示核对。管理员可在后台一键导出投票结果为 XLSX 表格，含编号、核对码、各投票项选项及统计汇总。

**技术架构**前端基于 React 19 + TypeScript + Vite 构建，遵循 Apple Design 简约风格（按钮按下反馈、暗色模式、无动画模式支持）。后端采用 Node.js + Express + TypeScript，数据存储使用 better-sqlite3 本地数据库。部署至 115.190.153.44:3070，通过 Nginx 反向代理和 PM2 进程管理，以 tp.xuanjian.top 域名对外提供服务。

## 功能特性

- **自定义投票项目** -- 创建含多个投票项和选项的投票项目，支持自定义投票名称和选项内容
- **富媒体支持** -- 选项支持图片和视频（含 HLS 流媒体），通过七牛云对象存储上传，CDN 加速分发
- **视频处理工具** -- Python 脚本一键处理：720p 压缩、GPU 硬件加速编码、HLS 封装、自动上传七牛
- **免登录投票** -- 投票者无需注册，通过 FingerprintJS 设备指纹验证防止重复投票
- **IP 限频** -- 服务端 60 秒 IP 冷却机制，防止短时间内刷票
- **隐私政策与同意确认** -- 内置隐私政策页面，首次投票需同意后方可进入
- **核对码机制** -- 每次投票生成 6 位唯一核对码 + 投票者编号，供公示表格核对
- **XLSX 导出** -- 管理员可导出含投票者编号、核对码、投票结果及统计汇总的 Excel 表格
- **简约设计风格** -- Apple Design 理念，SVG 图标，暗色模式，按下反馈动画，响应式布局

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19, TypeScript, Vite |
| 路由 | React Router v7 |
| 样式 | CSS 变量，prefers-reduced-motion，暗色模式 |
| 视频播放 | hls.js（支持 HLS / m3u8 流媒体） |
| 后端 | Node.js, Express, TypeScript |
| 数据库 | better-sqlite3 |
| 认证 | JWT（管理员）、FingerprintJS 设备指纹（投票者） |
| 存储 | 七牛云 Kodo，CDN 域名 cdn.tp.xuanjian.top |
| 导出 | ExcelJS |
| 视频处理 | Python + ffmpeg（GPU 加速：NVENC / AMF / QSV） |

## 快速开始

### 环境要求

- Node.js 18+
- npm 9+
- 七牛云账号（用于媒体上传）
- （可选）Python 3 + ffmpeg（用于视频处理）

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/Morzane123/EasyBallot.git
cd EasyBallot

# 配置环境变量
cp .env.template .env
# 编辑 .env 填入七牛凭证、管理员密码和 JWT 密钥

# 安装依赖
cd client && npm install
cd ../server && npm install
cd ..

# 启动开发服务器
npm run dev:server   # 启动后端，监听 3070 端口
npm run dev:client   # 启动前端开发服务器（热更新）
```

前端开发服务器会自动代理 API 请求到后端。浏览器访问 `http://localhost:5173`。

### 管理后台

1. 访问 `/admin/login`
2. 使用 `.env` 中配置的账号密码登录（`ADMIN_USERNAME` / `ADMIN_PASSWORD`）
3. 在管理面板中创建新的投票项目
4. 为选项上传图片或视频（选项支持图片链接 / 视频链接 / HLS m3u8 地址）

## 视频处理

项目包含 `convert_video.py` 脚本，一键完成视频压缩、HLS 封装、上传七牛：

```bash
# 安装 Python 依赖
pip install python-dotenv qiniu

# 处理视频（自动检测 GPU 加速）
python convert_video.py "D:/videos/song.mp4"
```

### 处理流程

1. **分辨率压缩** -- 等比缩放至 720p
2. **GPU 硬件编码** -- 自动检测 NVIDIA NVENC > AMD AMF > Intel QSV > CPU 回退
3. **HLS 封装** -- 6 秒分片，VOD 模式，AAC 128kbps 音频
4. **上传七牛** -- 断点续传、分片上传、3 次自动重试
5. **输出 CDN 地址** -- 终端打印 m3u8 HTTPS 路径，直接填入管理后台

### 编码器优先级

| 编码器 | 适用显卡 | 加速效果 |
|--------|---------|---------|
| `h264_nvenc` | NVIDIA GTX/RTX | 含 `-hwaccel cuda` 硬解码 |
| `h264_amf` | AMD Radeon | CQP 常量质量模式 |
| `h264_qsv` | Intel 核显 | VBR 码率控制 |
| `libx264` | CPU 回退 | CRF=23，兼容所有平台 |

## 部署

### 服务器信息

- **主机**: 115.190.153.44
- **端口**: 3070
- **域名**: [tp.xuanjian.top](https://tp.xuanjian.top)
- **CDN 域名**: cdn.tp.xuanjian.top（七牛）
- **进程管理**: PM2

### 一键部署

```bash
npm run deploy
```

执行 `deploy.js` 脚本，自动完成以下步骤：

1. 构建前端和后端
2. 打包所有必需文件
3. 通过 SCP 上传至 `/opt/easyballot`
4. 在服务器安装生产依赖
5. 通过 PM2 重启应用

### 部署环境变量

可通过环境变量覆盖默认值：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DEPLOY_HOST` | `115.190.153.44` | 服务器 IP |
| `DEPLOY_PORT` | `3070` | 应用端口 |
| `DEPLOY_DOMAIN` | `tp.xuanjian.top` | 公开域名 |
| `DEPLOY_PATH` | `/opt/easyballot` | 服务器部署路径 |
| `DEPLOY_USER` | `root` | SSH 用户名 |

或通过命令行参数指定：

```bash
npm run deploy -- --user=deployer
```

## 项目结构

```
EasyBallot/
├── client/                  # React 前端（Vite）
│   ├── public/              # 静态资源（icon.png 等）
│   └── src/
│       ├── components/      # 可复用组件（VideoPlayer, SvgIcons）
│       ├── pages/           # 页面组件
│       │   ├── admin/       # 管理后台（登录/仪表盘/创建/详情）
│       │   ├── Home.tsx     # 首页
│       │   ├── VotePage.tsx # 公开投票页 /:id
│       │   └── PrivacyPolicy.tsx  # 隐私政策 /doc
│       ├── styles/          # 全局 CSS（暗色模式、Apple Design）
│       ├── api.ts           # Axios 实例（JWT 拦截）
│       └── App.tsx          # 路由配置
├── server/                  # Express 后端
│   └── src/
│       ├── db/              # better-sqlite3 初始化与表结构
│       ├── middleware/       # JWT 认证、IP 限频
│       └── routes/          # admin（投票管理/导出）、votes（公开投票）、upload（七牛 token）
├── convert_video.py         # 视频处理上传脚本（GPU 加速 + HLS）
├── deploy.js                # 一键部署脚本（SCP + PM2）
├── nginx.conf               # Nginx 反向代理参考配置
├── .env.template            # 环境变量模板
└── package.json             # 根工作区脚本
```

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `PORT` | 否 | 服务端口（默认 3070） |
| `ADMIN_USERNAME` | 否 | 管理员用户名（默认 admin） |
| `ADMIN_PASSWORD` | **是** | 管理员密码 |
| `JWT_SECRET` | **是** | JWT 签名密钥 |
| `DB_PATH` | 否 | SQLite 数据库路径（默认 ./data/easyballot.db） |
| `QINIU_ACCESS_KEY` | **是** | 七牛 AccessKey |
| `QINIU_SECRET_KEY` | **是** | 七牛 SecretKey |
| `QINIU_BUCKET` | **是** | 七牛存储空间名 |
| `QINIU_DOMAIN` | **是** | 七牛 CDN 域名 |
| `QINIU_REGION` | 否 | 七牛区域代码（z0/z1/z2/na0/as0，默认 as0） |

## 许可证

MIT License. 详见 [LICENSE](LICENSE) 文件。
