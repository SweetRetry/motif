# 品牌

`Motif` 的单一事实来源，以及换名时该动的位置。品牌值集中在 `constants/site.ts` 和
`constants/links.ts`，其余位置从这里派生。

## 当前值

| 项              | 值                                              | 唯一来源                         |
| --------------- | ----------------------------------------------- | -------------------------------- |
| 名称            | `Motif`                                         | `SITE.NAME`                      |
| 发行标识 scope  | `@motif`                                        | `registry.json:name`             |
| 包名            | `motif`                                         | `package.json:name`              |
| 站点 / registry | `https://motif-sweetretrys-projects.vercel.app` | `constants/site.ts` fallback     |
| 仓库            | `https://github.com/SweetRetry/motif`           | `constants/links.ts` `GITHUB`    |
| 作者            | `SweetRetry`（GitHub handle，不用真名）         | `SITE.AUTHOR.NAME`               |
| X               | `@SweetRetry`                                   | `SITE.AUTHOR.TWITTER` / `LINK.X` |
| 版权            | `Copyright (c) 2026 Motif`                      | `LICENSE`                        |

短描述：en `Interface parts for AI agents`；长描述见 `SITE.DESCRIPTION`。关键词见
`SITE.KEYWORDS`（面向 agent UI / chat UI / 生成式媒体，而非"模板"）。

## 派生位置（改上面两文件即全站生效）

`seo/metadata.ts`、`seo/json-ld.tsx`、`app/manifest.ts`、`app/og/*`、`app/llms*`、
`app/sitemap.ts`、`app/robots.txt`、`app/rss.xml` 全部读 `SITE` / `LINK`。

生产环境可用环境变量覆盖域名：`SITE_URL`（自定义域）或
`VERCEL_PROJECT_PRODUCTION_URL`（Vercel 自动注入）。

## 硬编码位置（不随上面派生，换名时逐个改）

| 位置                         | 内容                                                    |
| ---------------------------- | ------------------------------------------------------- |
| `registry.json`              | `name`、`homepage`、`registryDependencies` 里的绝对 URL |
| `content/docs/**/*.mdx`      | 每个安装命令的 `https://…/r/<name>.json`                |
| `README.md`                  | banner、标题、徽章、正文                                |
| `app/(app)/(root)/page.tsx`  | `<h1>` 与描述句                                         |
| `app/(app)/sponsor/page.tsx` | 文案与 metadata description                             |
| `examples/toolbar.tsx`       | demo 里指向源码仓库的链接                               |
| `.github/FUNDING.yml`        | funding 账号                                            |
| `LICENSE`                    | 版权行                                                  |

## 生成物（不要手改，重新构建即覆盖）

`public/r/registry.json`、`public/r/*.json` 由 `pnpm registry:build` 生成；
`.source/*` 由 `fumadocs-mdx` 在 `postinstall` 生成。

## 部署（Vercel）

| 项                    | 值                                                                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Project               | `motif`（原 `startercn`，已改名）                                                                                                        |
| 生产域                | `https://motif-sweetretrys-projects.vercel.app`                                                                                          |
| Deployment Protection | 已关闭（`ssoProtection: null`）——registry 必须公开可取；preview 也一并公开了，只想护 preview 就到 dashboard 设成 preview-only            |
| 旧域                  | `startercn-livid.vercel.app` 已从 project domains 删除（`DELETE /v10/projects/{id}/domains/...`），否则每次 deploy 会把它重新 alias 出来 |

生产域名由 `VERCEL_PROJECT_PRODUCTION_URL` 自动注入，代码里的
`FALLBACK_SITE_ORIGIN` 只在非 Vercel 环境兜底，两者现在一致。

`motif.vercel.app` 和 `usemotif.vercel.app` 已被他人占用，拿不到干净子域；想要干净
URL 就要自定义域。

## 待办

- **自定义域**（可选）：注册后加到 Vercel project，设 `SITE_URL`，并把
  `registry.json` 与 `content/docs/` 里的绝对 URL `sed` 一次替换过去。
- **X**：`@SweetRetry` 需确认；没有 X 账号则删 `SITE.AUTHOR.TWITTER` 并把
  `LINK.X` 与 `seo/metadata.ts`、`seo/json-ld.tsx`、`components/docs-toc-footer.tsx`
  里的引用一并去掉。
- **FUNDING.yml**：仅在已开通 GitHub Sponsors 时生效。

## 关于上游

`git cat-file -e 5e5c379:<path>` 为 0 的文件来自上游 scaffold，非品牌原因不改（见根目录
`AGENTS.md`）。`.agents/skills/launch-shadcn-registry/` 整套保留，其示例 profile 已换成
本仓库的值。
