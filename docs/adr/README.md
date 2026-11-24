# 架构决策记录 (ADR)

每条记录一个已经拍板、且不会从代码里一眼看出来的决定。代码里同一件事重复出现三次以上、或者第一次读的人一定会问"为什么不那样做"，就是一条 ADR。

格式：`NNNN-title.md`，编号不复用，作废的在正文顶部写 `Superseded by NNNN`。

| 编号                                              | 决定                                            |
| ------------------------------------------------- | ----------------------------------------------- |
| [0001](0001-comments-are-deleted-not-written.md)  | 注释即待办：删掉，或升级成 ADR                  |
| [0002](0002-server-client-render-parity.md)       | 服务端与客户端必须画出同一棵树                  |
| [0003](0003-registry-items-install-standalone.md) | registry item 自包含，不跨文件共享运行时代码    |
| [0004](0004-motion-tokens-local-to-component.md)  | motion token 定义在组件自己文件里，随 item 安装 |
| [0005](0005-color-from-theme-token.md)            | 组件画的每个颜色都是 shadcn token               |
| [0006](0006-vendored-code-stays-diffable.md)      | 上游 vendor 的代码保持可 diff                   |
