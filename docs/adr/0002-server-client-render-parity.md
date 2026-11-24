# 0002 服务端与客户端必须画出同一棵树

状态：已采用

## 背景

这些组件都标了 `"use client"`，但 Next 仍会在服务端预渲染它们的首屏。任何在服务端和浏览器里算出不同结果的东西，都会让 React 把首屏水合当成不匹配：轻则该子树重渲染，重则整页闪一下并丢掉用户已输入的状态。

这类分歧在别处只是脏，在这里是 bug。它们分散在好几个看似无关的地方，每个都值得单独讲清。

## 决定

一切进入渲染输出的值，必须与运行环境无关。

**格式化固定 `en-US`。** `activity-heatmap`、`breakdown`、`context-usage`、`strength-slider` 的数字与日期格式化都是 `Intl.NumberFormat("en-US")` / `Intl.DateTimeFormat("en-US")`，不取浏览器 locale。服务端 Node 与用户浏览器 locale 不同，取浏览器 locale 会各写各的字符串。

**随机数取自索引，不取自 `Math.random`，也不取自 `Math.sin`。** `Math.sin` 未被规范到最低位，不同引擎差几个 ulp；用它做 hash 会把差异写进 `style` 属性——服务端 `animation:strength-mote 3.491549070959445s` 对浏览器 `3.4915490709710864s`——React 把 `style` 当文本比较，于是判定水合不匹配。改为整数运算：`Math.imul` 精确，配合手工的 32 位回绕（`(v + 2^32) % 2^32` 等价于 `>>> 0`，因为项目 lint 禁用位运算）。`gradient-cover` 的种子随机数同此。

**布局测量推迟到 effect。** `thinking-block` 的流高度、`video-preview` 的时长、`conversation` 的滚动位置初值，都先取一个"未知"的哨兵值渲染，挂载后在 effect 里测量再更新。服务端没有 DOM 可测。

**时间初值不写进首屏。** `loading-state` 的计时、`agent-activity` 的起始时刻走 `startedAt` prop 或 `useState(() => Date.now())` 之外的方式注入，避免服务端时刻与客户端时刻写进同一属性。

## 后果

删除"渲染期取环境"的写法后，这些组件可以在任意引擎、任意 locale 下 SSR 并通过水合。代价是入库的 hash 与 PRNG 要手写整数版本，且"为什么不用 `Math.random`"这件事必须在别处被记住——就是这里。
