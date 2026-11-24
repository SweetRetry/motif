# 0001 注释即待办：删掉，或升级成 ADR

状态：已采用

## 背景

`registry/new-york/` 里的注释曾经是这套代码最有分量的东西：每个组件顶上两块十几行的散文，讲这个表面为什么长这样、某个属性为什么是它而不是别的、某个 bug 曾经怎么发生。它们承载的是决定，不是描述。

代价同样真实。同一份源码同时供给文档站和 `npx shadcn add`，读者在 IDE 里、在 registry 源码里、在文档页上各读一遍。注释没有单一事实来源，改动一处决定要改五处注释——`en-US` 固定在 heatmap、breakdown、context-usage、strength-slider 四处各讲一遍。散文注释还会被后来的人当成模板抄，一种写法从一个文件扩散到三十个。

## 决定

源码里不写注释。一条注释只有两种出路：

- 它只是把代码已经说的事复述一遍，或者引用的是已经变了的实现——删。
- 它记的是一个重要的、非显然的决定——从源码删掉，在 `docs/adr/` 写一条记录。

JSDoc 的 prop 说明按同一条规则：`/** Seconds into the clip. */` 若和 prop 名重复，删；若讲清了边界、默认值背后的理由或一个陷阱，进 ADR 或进那个 prop 的类型。

## 后果

`docs/adr/` 成为决定的唯一住处，改动决定只改一处。删除让位给具名函数和类型——决定该由结构承载，不该由注释承载。

强制手段分两层。`tools/comment-lint/plugin.mjs` 是 oxlint 的 JS 插件，报告 `registry/new-york/**`、`app/**`、`components/**`、`hooks/**`、`lib/**` 下的每条注释（继承来的模板文件同样在列）；`tools/comment-lint/baseline.json` 是棘轮，记录每个文件当前允许的条数，只降不升。存量靠 ratchet 逐步消化，新增一道道挡住。

插件只豁免两类：空注释（只为占位的换行）和 `oxlint-disable` / `oxlint-enable` 指令。后者是工具指令不是散文，且它本身不是逃避的借口——一条指引 `docs/adr/` 的记录仍要写。清理流程固化在 `delete-comment` 技能里。
