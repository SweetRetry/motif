# 0005 组件画的每个颜色都是 shadcn token

状态：已采用

## 背景

组件要同时被浅色、深色和任意主题消费。任何写死的色相都会在换主题时露出原形，其中最难发现的错是"只在深色下错"：`text-rose-600 dark:text-rose-400` 这种自带 dark 值的字面量，就是把一个 token 手写了两遍。

## 决定

**颜色来自 token，命名角色不命名色相。** `bg-card`、`text-muted-foreground`、`border-ring/50`、`bg-primary`、`text-success`。状态也是 token：失败/拒绝是 `destructive`，成功是 `success`，走过的步骤是 `warning`。

**主题缺哪个状态，就给主题加哪个 token。** 写进 `:root`、`.dark`、`@theme`，也写进 registry item 的 `cssVars`，这样 `shadcn add` 一起带走，组件针对新 token 写。判断信号：出现带自己 dark 值的字面量，说明缺 token。

**表面层级三档，按嵌套位置选，不按明暗选。** 页面是 `background`，就地容器是 `card` 加 `border-border`，浮层是 `popover`。`muted` / `accent` 不是层级，它们只在一个容器内部当"后退"或"响应指针"的填充；自带表面的容器借 `muted` 会在浅色里显凹陷、深色里显浮起。"越近越亮"是层级的后果，不是选层级的规则——浅色三档全白，只靠 border 分开。

**字面量颜色的唯一正当理由：它测的东西不是主题。** 压在用户画作上的 scrim、SVG mask 里不透明的那个停靠点、落在照片上的投影。这类与内容无关，不是绕过调色板。`gradient-cover` 标题的白色压在图片上，是这一类，所以是全仓唯一一处字面量颜色。

## 后果

换主题、切深浅色，组件自动跟着变，不需要条件类。代价是新增状态要先动主题和 `cssVars`，比写死一个色号多几步。
