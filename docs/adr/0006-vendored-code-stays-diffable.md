# 0006 上游 vendor 的代码保持可 diff

状态：已采用

## 背景

`components/motion/**`、`components/ui/motif/agent-disclosure.tsx`、`hooks/use-hover-capable.ts`、`registry/new-york/agents/**`、`registry/new-york/scroll-rail/**` 里的代码来自上游，我们只做同步，不改风格。这些代码会触发仓库的若干风格规则（`complexity`、`no-plusplus`、`react-hooks/exhaustive-deps` 等）。

用力把它们改成符合本仓风格，会让下一次从上游拉更新变成一次人工合并——因为 diff 里混进了我们的格式改动，认不出哪行是上游的、哪行是我们的。

## 决定

对 vendor 的路径，在 `oxlint.config.ts` 里只关掉它触发的**风格**规则，其余（正确性、类型、格式）照旧执行。oxfmt 仍然格式化，typecheck 仍然检查。本仓自有代码（`examples/`、`registry/new-york/` 的其它部分、`app/`）不享受豁免。

豁免是逐路径白名单，不是按目录批量放行。新增一个上游来源时，把它的路径加进 override 列表，并只关它实际触发的规则。

## 后果

上游更新可以逐个文件 diff、逐行判断。代价是同一份仓库里有两套风格标准，读代码的人要知道某条规则没生效是因为那个文件是 vendor 的。这也是它必须被记下来的原因——文件路径本身不说明为什么。
