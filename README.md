<div align="center">

# Netflix Pricing

**Netflix 全球订阅价格查询 · 货币换算 · 历史调价记录**

原版项目的独立复活版本，保留简洁的查询界面，不再依赖原作者已停用的 API。

[![在线访问](https://img.shields.io/badge/🌐_在线访问-nf.19960422.xyz-2563eb?style=for-the-badge)](https://nf.19960422.xyz/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/Code_License-MIT-green?style=flat-square)](LICENSE)

**[打开网站](https://nf.19960422.xyz/)** · **[查看历史变价](https://nf.19960422.xyz/changelog)** · **[原版项目](https://github.com/DyAxy/Netflix-Pricing)**

</div>

---

## ✨ 功能

| 功能 | 说明 |
| --- | --- |
| 🌏 全球价格 | 查询不同国家和地区的 Netflix 套餐本币价格，包括 Mobile、Basic、Standard、Standard with ads、Premium（以数据源实际提供为准） |
| 💱 货币换算 | **默认人民币 CNY**，也可切换为 USD、TRY 等其他币种 |
| 📈 价格排序 | **默认按 Premium 换算后价格从低到高**；点击套餐列可以切换升序、降序；没有该套餐的地区排在最后 |
| 🔍 地区筛选 | 按两位国家或地区代码检索 |
| 🕒 历史变价 | 根据历史数据快照比较套餐价格变化 |
| 🌗 外观 | 延续原版的明暗主题切换 |

> **数据说明：** 本站不是 Netflix 官方服务，价格由第三方公开数据提供；不保证实时、完整或与最终账单一致。历史变价页显示的是**价格变化被快照记录的日期**，不一定是 Netflix 的正式生效日期。汇率也仅供参考。

## 🔗 网站与数据接口

- **正式网站：** https://nf.19960422.xyz/
- **变价记录：** https://nf.19960422.xyz/changelog

保留与原站前端兼容的接口格式：

| 路径 | 用途 |
| --- | --- |
| `/api/finance/netflix` | 全球套餐本币价格 |
| `/api/finance/rateall` | 汇率（USD 为基准） |
| `/api/finance/netflixchange?per_page=10&page=1` | 按页查询历史价格变化 |

服务端通过 Next.js 缓存上游数据，缓存周期约 **12 小时**；缓存刷新不等于数据提供者每 12 小时都会更新价格。

## 🧰 技术栈

- **前端：** Next.js 14、React 18、NextUI、Tailwind CSS
- **运行环境：** Node.js 22
- **价格数据：** [tompec/netflix-prices](https://github.com/tompec/netflix-prices)
- **汇率数据：** [ExchangeRate-API](https://www.exchangerate-api.com/docs/free)
- **当前部署：** Debian 12 VPS + systemd + Cloudflare Tunnel（HTTPS）

本项目不需要数据库或自行申请 Netflix API 密钥。网络连接必须能够访问上述上游数据服务。

## 🚀 本地启动

需要 Node.js 22 和 npm：

```bash
git clone https://github.com/xtch123/Netflix-Pricing.git
cd Netflix-Pricing
npm install
npm run dev
```

浏览器打开 http://localhost:3000 。

生产构建：

```bash
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

> 仓库采用 `bun.lock`；也可以使用兼容版本的 Bun 安装依赖。本地使用 npm 安装时，可能会生成未跟踪的 `package-lock.json`。

## 🖥️ VPS 部署（Debian 12 示例）

本站目前运行在自己的 VPS 上，**不依赖 Vercel**。基本步骤：

1. 安装 Node.js 22、npm、Git。
2. 将代码克隆到 `/opt/netflix-pricing` 并执行 `npm install`、`npm run build`。
3. 使用非 root 专用用户，通过 systemd 运行 `npm run start -- --hostname 127.0.0.1 --port 3000`。
4. 在已有的 **本地管理 Cloudflare Tunnel** 的 `ingress` 中，添加以下路由，注意放在最后的兜底规则**之前**：

```yaml
ingress:
  # ……保留你原有的 ingress 路由……
  - hostname: nf.19960422.xyz
    service: http://127.0.0.1:3000
  - service: http_status:404
```

5. 执行 `cloudflared tunnel ingress validate` 检查配置；确认正确后重启 cloudflared，并为子域名创建指向对应 Tunnel 的 CNAME。
6. 访问网站，检查首页、价格接口及历史变价接口。

上述路由仅作**配置示意**，不要覆盖已有 Tunnel 配置；如使用其他域名，修改 `hostname` 与 DNS 记录即可。网站仅监听本机地址，不需要在 VPS 上开放 3000 公网端口。

更新现有部署：

```bash
# 在 VPS 上执行；注意构建期间需要一定磁盘空间
systemctl stop nfprice
runuser -u nfprice -- sh -c 'cd /opt/netflix-pricing && git pull --ff-only origin master && npm run build'
systemctl start nfprice
systemctl is-active nfprice
```

> 如果构建失败，请先检查日志和版本，不要把失败版本直接视为部署成功。磁盘较小的 VPS 应预留构建空间。

## 🙏 致谢与授权

- **原网站与前端代码：** [DyAxy/Netflix-Pricing](https://github.com/DyAxy/Netflix-Pricing)。感谢原作者 Dy Haruka；原代码按照仓库保留的 **MIT License** 授权。本 Fork 保留原作者署名。
- **Netflix 价格数据：** [Thomas Petracco / tompec/netflix-prices](https://github.com/tompec/netflix-prices)，[thomas.io](https://www.thomas.io)，采用 **[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)**，在此表示署名与感谢。
- **汇率：** [ExchangeRate-API](https://www.exchangerate-api.com/)，遵循服务提供方的使用条款。

原版服务已停止运行，因此本 Fork 改为使用独立数据源，并增加人民币默认换算及全球价格排序。代码许可证与第三方数据许可证分别适用。

---

<sub>English: An independent revival of the original Netflix Pricing site. Browse regional Netflix subscription prices, convert currencies (CNY by default), sort by converted plan prices, and review price changes inferred from historical snapshots. Live site: https://nf.19960422.xyz/ . Not affiliated with Netflix.</sub>
