# 缺口：待做的组件

2026-10-20 对 27 个 registry 项做的缺口盘点。这里只记"还没有什么、为什么要有、依赖什么"，不是承诺。
动手前先到 `CONTEXT.md` 把词定下来，再按"基础件先于组合件"的顺序做（见根目录 `AGENTS.md`）。

对照的竞品清单来自对 Vercel AI Elements 的记忆，没有联网核对它现在的状态。

## 现状的盲区

Agents 覆盖了"人说话"（输入框、语音、附件）和"agent 想"（思考块、状态灯），没有覆盖"agent 做了什么"。
`agent-indicator` 有 `tool-call` 状态，但没有任何组件把一次工具调用画出来。

## Agents

按优先级排。

| 组件               | 是什么                                                                                         | 依赖 / 备注                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Tool Call          | 一次调用一行：名称、参数摘要、状态（排队、运行、完成、失败）、可展开入参和结果                 | 基础件。`message` 与 `thinking-block` 都按 part 组装，它是下一个 part |
| Task List          | agent 自己维护的待办。三种状态，同一时刻只有一项在进行                                         | 基础件                                                                |
| Agent Activity     | 一次运行的实时时间线。头部"Working for 42s"，步骤是 Tool Call 或思考摘要，完成后折叠成一行总结 | 组合件，依赖 Tool Call、Thinking Block、Task List。先有基础件再写     |
| Sources / Citation | 行内引用小标，悬停出来源卡，底部来源列表                                                       | 检索和研究类 agent 必需                                               |
| Context Usage      | 上下文用量条，分系统提示、工具、对话、剩余                                                     | 底座是 `breakdown`，成本低                                            |
| Queue              | agent 运行时用户排队发的消息，可撤回                                                           |                                                                       |
| Changes            | 改了哪些文件、加减几行、可恢复的检查点                                                         | 面向编码 agent                                                        |
| Artifact           | agent 产出的文档或代码的侧栏容器：标题栏、版本、复制、下载                                     |                                                                       |
| Mention / Slash    | prompt-input 上的 @ 提及和 / 命令菜单                                                          | 改已有组件，不是新件                                                  |

建议再加一个 **Agent Run** block，把消息、活动、审批和输入框装在一起。它给 Agents 一个像 `chat-app` 之外的整体证明。

## Media

| 组件             | 是什么                             | 依赖 / 备注                                         |
| ---------------- | ---------------------------------- | --------------------------------------------------- |
| Generation Queue | 任务列表：进度、取消、重试         | 优先。`generation-canvas` 多节点同时跑时需要总览    |
| Reference Slot   | 图生图、图生视频的参考图位，带强度 | `attachment` 是聊天里的小方块，不是参数面板里的槽位 |
| Cost Chip        | 生成按钮旁的"约 12 积分"           | 小件，但几乎每个产品都要                            |
| Video Preview    | 视频的时间线预览                   | `audio-preview` 已有同样思路的波形版                |

## 不做

- Suggestions。提示词小标签，`skill-detail` 里已有示例卡的概念。
- Code Block。`streamdown` 已经渲染代码。
- Loader。`agent-indicator` 够用。
- 折线图、统计卡。shadcn 自己的 charts 能覆盖，Data 区不自己造。

## 动手前

- `CONTEXT.md` 现在只收了封面扇那一套词。Activity、Step、Tool Call 这几个词最容易在代码、文档和对话里漂，先写进去。
- 每个新件都按安装足迹的约定走：落在 `components/ui/motif/`，不写页面和路由，不引入共享工具文件，hooks 走 `hooks/`。
