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

## 功能特性

- **自定义投票项目** -- 创建含多个投票项和选项的投票项目，支持自定义投票名称和选项内容
- **富媒体支持** -- 选项支持图片和视频，通过七牛云对象存储上传，CDN 加速分发
- **免登录投票** -- 投票者无需注册，通过设备指纹验证防止重复投票
- **IP 限频** -- 服务端基于 IP 的限频机制，防止短时间内刷票
- **隐私政策与同意确认** -- 内置隐私政策页面，首次投票需同意后方可进入
- **核对码机制** -- 每次投票生成唯一核对码，投票者可据此独立核对投票结果
- **XLSX 导出** -- 管理员可导出含投票者编号、核对码、投票结果及统计汇总的 Excel 表格
- **简约设计风格** -- 简洁现代的界面，支持暗色模式，响应式布局适配桌面与移动端

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19, TypeScript, Vite |
| 路由 | React Router v7 |
| 样式 | CSS 变量（暗色模式、响应式） |
| 后端 | Node.js, Express, TypeScript |
| 数据库 | better-sqlite3 |
| 认证 | JWT（管理员）、设备指纹（投票者） |
| 存储 | 七牛云 Kodo（对象存储） |
| 导出 | ExcelJS |
| 安全 | FingerprintJS, IP 限频 |

## 快速开始

### 环境要求

- Node.js 18+
- npm 9+
- 七牛云账号（用于媒体上传）

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

## 部署

### 服务器信息

- **主机**: 115.190.153.44
- **端口**: 3070
- **域名**: [tp.xuanjian.top](https://tp.xuanjian.top)
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
├── client/                 # React 前端（Vite）
│   ├── public/             # 静态资源
│   └── src/
│       ├── components/     # 可复用 UI 组件
│       ├── pages/          # 页面组件
│       │   └── admin/      # 管理后台页面
│       ├── styles/         # 全局 CSS
│       ├── api.ts          # API 客户端
│       └── App.tsx         # 根组件与路由
├── server/                 # Express 后端
│   └── src/
│       ├── db/             # 数据库初始化与查询
│       ├── middleware/     # 认证与限频中间件
│       └── routes/         # API 路由
├── .env.template           # 环境变量模板
├── deploy.js               # 自动化部署脚本
└── package.json            # 根工作区脚本
```

## 许可证

MIT License. 详见 [LICENSE](LICENSE) 文件。
