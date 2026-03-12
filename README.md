# Yorushika Ticket Assist

一个面向日本演唱会场景的合规票务协同项目，当前版本已经整理成单机可公网部署的 MVP。

## 当前能力

- 用户注册 / 登录本站账号
- Yorushika 场次选择与官方规则展示
- 夜鹿会员注册引导
- 资料提交与票务协同申请
- 人民币支付协助单占位
- 个人中心查看申请与中签状态
- 运营侧任务池与申请列表

## 目录

- `docs/product-plan.md`: 产品规划文档
- `apps/web`: React 前端
- `apps/api`: Node.js / Express 后端
- `apps/api/src/db.js`: SQLite 持久化

## 本地开发

```bash
npm install
npm run dev:api
npm run dev:web
```

- 前端开发地址：`http://localhost:5173`
- 后端开发地址：`http://localhost:8787`

Vite 已代理 `/api` 到本地后端，所以前端开发时不需要改接口地址。

## 生产运行

```bash
npm install
npm run build:web
set NODE_ENV=production
npm run start
```

生产模式下，Express 会直接托管 `apps/web/dist`，只需要一个 Node 服务：

- 网站入口：`http://localhost:8787`
- 健康检查：`http://localhost:8787/health`

## 环境变量

参考 `.env.example`：

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT=8787`
- `ALLOWED_ORIGINS=https://your-domain.com`
- `DATA_DIR=` 可选，自定义 SQLite 数据目录

## 数据存储

当前使用 SQLite，数据库文件默认位于：

- `apps/api/data/app.db`

这意味着：

- 重启服务后数据仍会保留
- 适合单机 MVP
- 如果以后做多实例部署，建议切到 PostgreSQL

## Docker 部署

构建镜像：

```bash
docker build -t yorushika-ticket-assist .
```

运行容器：

```bash
docker run -d ^
  -p 8787:8787 ^
  -e NODE_ENV=production ^
  -e PORT=8787 ^
  -e ALLOWED_ORIGINS=https://your-domain.com ^
  -v %cd%\\apps\\api\\data:/app/apps/api/data ^
  --name yorushika-ticket-assist ^
  yorushika-ticket-assist
```

如果你在 Linux 服务器上部署，把卷挂载语法改成 Linux 风格路径即可。

## 一键更新

服务器上可使用脚本：

- `scripts/update-ticket-rolling.sh`

典型用法：

```bash
cd /home/ritel/apps/ticket-rolling
bash scripts/update-ticket-rolling.sh
```

它会自动执行：

- `git pull --ff-only`
- `docker build`
- 替换旧容器
- 启动新容器
- 本机健康检查

如果你的域名或端口不同，也可以临时覆盖：

```bash
ALLOWED_ORIGIN=https://ritelt.com HOST_PORT=8790 bash scripts/update-ticket-rolling.sh
```

## Nginx 反代建议

可将域名反代到 Node 服务：

- 域名：`https://your-domain.com`
- 反代目标：`http://127.0.0.1:8787`

建议同时启用：

- HTTPS
- 访问日志
- 基础限流
- 进程守护（PM2 / systemd / Docker restart policy）

## 当前合规边界

当前版本不会实现：

- 虚拟日本手机号分配
- 随机地址生成
- 自动提交抽选
- 绕过实名或官方 App 规则

夜鹿会员注册入口为：

- [https://secure.plusmember.jp/yorushika/1/regist/](https://secure.plusmember.jp/yorushika/1/regist/)

注册应优先在手机浏览器完成，电子票最终显示在 Yorushika 官方 App 中。
