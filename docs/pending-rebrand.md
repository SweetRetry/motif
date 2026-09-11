# 品牌替换待办（暂不执行）

当前仓库是 `shadcn-labs/startercn` 的原样副本。下面是**已确认要替换、但现在不动**的位置清单，动的时候按本表一次做完，避免遗漏。

状态：**未执行**。本文档只做记录。

---

## 0. 已做的改动（与品牌无关）

初始 commit `5e5c379` 只修了上游模板自身的三个问题，目的是不跟后续品牌替换混在一起：

| 位置              | 改动                                                                                                                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components.json` | `tailwind.css` 从 `app/globals.css` 改为实际的 `styles/globals.css`（原值错误，会导致 `npx shadcn add` 写错文件）                                                                                  |
| `package.json`    | `typecheck` 改为 `next typegen && tsc --noEmit`（模板依赖 Next 16 全局 `RouteContext` 类型，不先生成路由类型必失败）                                                                               |
| `package.json`    | 新增 `pnpm.onlyBuiltDependencies: [esbuild, lefthook, msw]`，消除 pnpm 10 的 ignored build scripts 警告。**不要加 `sharp`**：它会退回源码编译并失败，prebuilt 二进制已由 optionalDependencies 就位 |

---

## 1. 单一事实来源（优先改这两个文件）

大多数派生位置（SEO metadata、OG 图、sitemap、robots、llms.txt、结构化数据）都从这两个文件读取，改完即全站生效。

### `constants/site.ts`

| 行    | 当前值                                                  | 需要替换为     |
| ----- | ------------------------------------------------------- | -------------- |
| 1     | `FALLBACK_SITE_ORIGIN = "https://startercn.vercel.app"` | 自己的线上域名 |
| 19    | `AUTHOR.NAME = "Aniket Pawar"`                          | 作者名         |
| 20    | `AUTHOR.TWITTER = "@alaymanguy"`                        | 自己的 X 账号  |
| 23    | `DESCRIPTION.LONG`                                      | 自己的长描述   |
| 24    | `DESCRIPTION.SHORT`                                     | 自己的短描述   |
| 27–33 | `KEYWORDS` 七项                                         | 自己的关键词   |
| 35    | `NAME = "startercn"`                                    | 组件库名       |

派生关系：`SITE.URL`、`SITE.REGISTRY`、`SITE.OG_IMAGE`、`UTM_PARAMS` 全部由 `baseUrl` 计算。生产环境还可用环境变量覆盖：`SITE_URL`、`VERCEL_PROJECT_PRODUCTION_URL`。

### `constants/links.ts`

| 行  | 当前值                                    | 需要替换为                |
| --- | ----------------------------------------- | ------------------------- |
| 3   | `GITHUB.org = "shadcn-labs"`              | 自己的 GitHub 组织/用户名 |
| 4   | `GITHUB.repo = "shadcn-registry-starter"` | 自己的仓库名              |
| 5   | `GITHUB.user = "Aniket-508"`              | 自己的用户名              |
| 11  | `LINK.DISCORD`                            | 删或换                    |
| 14  | `LINK.PORTFOLIO`                          | 删或换                    |
| 17  | `LINK.X`                                  | 换                        |
| 18  | `LINK.X_SHADCN_LABS`                      | 上游组织，删              |

派生关系：`LINK.GITHUB`、`LINK.LICENSE`、`LINK.SPONSOR` 由 `GITHUB` 计算。`LINK.SHADCN_MCP_DOCS` 指向 shadcn 官方文档，保留。

---

## 2. 硬编码文案（不随上面两文件变化，需逐个改）

| 位置                                                                                  | 当前内容                                                     | 处理                             |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------- |
| `package.json:2`                                                                      | `"name": "startercn"`                                        | 换                               |
| `registry.json:2`                                                                     | `"name": "startercn"`                                        | 换。**这是用户端可见的发行标识** |
| `registry.json:3`                                                                     | `homepage` 指向上游仓库                                      | 换                               |
| `LICENSE:3`                                                                           | `Copyright (c) 2026 Shadcn Labs`                             | 换成自己的版权声明               |
| `.github/FUNDING.yml:3-4`                                                             | 上游作者的 GitHub sponsors / BuyMeACoffee                    | 删或换                           |
| `app/(app)/(root)/page.tsx:19`                                                        | `<h1>` 里的 `startercn`（同段 22–25 行描述句）               | 换                               |
| `app/(app)/sponsor/page.tsx:16,32,37`                                                 | 上游作者口吻的文案                                           | 整页决定去留，见第 4 节          |
| `README.md:2,5,11-14,22`                                                              | banner 图、标题、shadcn-labs 徽章、mintlify score 链接       | 重写，见第 4 节                  |
| `content/docs/(root)/index.mdx:13`                                                    | `mintlify.com/score/startercn` 链接                          | 删或换                           |
| `content/docs/(root)/installation.mdx:10`                                             | `github.com/shadcn-labs/startercn` 的 Use this template 链接 | 换                               |
| `.agents/skills/launch-shadcn-registry/templates/registry-profile.example.json:10-11` | 上游作者的示例 profile                                       | 换                               |
| `.agents/skills/launch-shadcn-registry/references/shadcntemplates.md:14`              | 示例文件名 `aniket-508-ogimagecn.md`                         | 换                               |

---

## 3. 生成物（不要手改）

改完第 1、2 节后重新构建即可覆盖：

| 路径                                        | 生成方式                                     |
| ------------------------------------------- | -------------------------------------------- |
| `public/r/registry.json`、`public/r/*.json` | `pnpm registry:build`（`pnpm build` 已串联） |
| `.source/*`                                 | `fumadocs-mdx`（`postinstall`）              |

---

## 4. 内容层面待重写（不是替换关键词）

这些地方换词不够，需要改叙述对象：从“如何使用这个模板”改为“如何使用这个组件库”。

- `content/docs/(root)/index.mdx`：现在通篇讲模板特性（web audio、haptics、view transitions 等），上线应改为讲自己的库解决什么问题
- `content/docs/(root)/installation.mdx`：现在讲“Fork 这个模板”，应改为讲述消费者如何 `npx shadcn@latest add ...`
- `README.md`：现在是模板使用说明
- `app/(app)/sponsor/` + `lib/sponsors.ts` + `lib/github.ts`（`getStargazers`）：上游作者的赞助页，需决定删掉还是改成自己的

---

## 5. 明确保留不动

| 位置                                              | 原因                                                                                                                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.agents/skills/launch-shadcn-registry/` 整套     | 自带的上线流程（preflight 校验 → 官方 directory PR → registry.directory / shadcntemplates / awesome 列表 → Reddit / X / Dev.to / HN 文案），自己上线时直接能用；只需替换示例 profile |
| `constants/routes.ts`                             | 与品牌无关                                                                                                                                                                           |
| `skills-lock.json:5` `source: shadcn-labs/skills` | 技能来源声明，只有删除该技能时才需要一起改                                                                                                                                           |

---

## 6. 执行时的顺序与验证

1. 先定 6 个输入：组件库名、线上域名、GitHub org/repo/user、一句话描述、作者名 + X 账号、`@scope` 命名空间
2. 改 `constants/site.ts` + `constants/links.ts`
3. 改 `registry.json` + `package.json`
4. 清 `LICENSE` / `.github/FUNDING.yml` / README / sponsor 页
5. 重写 `content/docs/` 两篇
6. 验证：

```bash
pnpm registry:build && pnpm check && pnpm typecheck && pnpm build
```

7. 复查是否还有遗漏（期望输出为空，`.source/`、`public/r/`、`node_modules/` 除外）：

```bash
grep -rn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next \
  --exclude-dir=.source --exclude-dir=public \
  -i "startercn\|shadcn-labs\|aniket\|alaymanguy" .
```

---

## 7. 相关的两个非品牌遗留（同批处理）

- `pnpm dev` 不会重建 registry，文档里的安装命令会指向过期的 `public/r/*.json`。建议改为 `"dev": "pnpm registry:build && next dev"`。
- 仓库尚无 `AGENTS.md`。按本项目采用的仓库知识路由约定（`adr/` 架构取舍、`rules/` 强制约束、`docs/` 系统知识），需要补一份，至少写清三条硬约束：组件加在 `registry/new-york/`、清单同步 `registry.json`、提交前跑 `pnpm registry:build`。
