# 0003 registry item 自包含，不跨文件共享运行时代码

状态：已采用

## 背景

`npx shadcn add <item>` 把 registry item 的文件按 `registryDependencies` 拉齐后原样写进用户的仓库。用户拿到的是源码，不是包。因此任何"两个组件共享一份运行时模块"的安排，都必须显式变成一条依赖边，否则装出来的东西直接缺文件。

## 决定

**item 内部的私有模块不出现在文件清单之外。** 一个组件的 context、types、parts、helpers 都是它自己 item 的文件。`prompt-input` 的 `context.ts` / `segments.ts` / `trigger.tsx`、`model-select` 的 `context.ts` / `parts.tsx`，都随各自 item 一起安装。

**跨 item 依赖走 `registryDependencies`，import 用安装后的公开路径。** `@/components/ui/waiting-row`、`@/components/ui/button`、`@/components/ui/dropdown-menu`——高阶组件 import 基座组件的路径就是安装路径，注册表负责把它们一起带来。基座组件先单独成 item（源码、文档页、registry 条目齐全），高阶组件再针对它写。

**不为了共享而在源码树里 import 兄弟组件的私有模块。** 需要同一段逻辑就提升成它自己的基座 item，而不是 `../other/file`。

## 后果

用户装任何单个 item 都能编译。代价是某些小工具（如 32 位 hash）允许在多个 item 里各存一份，因为跨 item 抽公共模块会把两个本不相干的组件绑进同一次安装。这条与 ADR 0004 是同一条原则在两处的落地。
