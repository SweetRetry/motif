# 0004 motion token 定义在组件自己的文件里

状态：已采用

## 背景

`scroll-rail`、`thinking-block`、`question-card`、`skill-detail`、`settings-dialog` 等组件各自用 `framer-motion` / `motion` 的 transition token（`EASE_OUT`、时长、spring 配置）。按常理这些该收进一个共享的 `lib/motion.ts`。

## 决定

不收。每个组件在自己的文件顶层定义它用到的 motion token，即使别的组件也定义了同名同值的常量。

理由是 ADR 0003：`lib/motion.ts` 不在任何一个 item 的文件清单里，用户 `shadcn add` 一个组件不会带上它，装出来的源码会 import 一个不存在的模块。把 token 复制进组件文件，item 才是自包含的。

## 后果

同名常量在源码树里出现多份，搜索 `EASE_OUT` 会命中多个定义。这是为安装完整性付的代价，且被接受。若哪天 shadcn 的依赖机制能表达"共享的运行时工具模块"，这条可以重新评估——那时应把它升级成一条真正的基座 item，而不是往 `lib/` 里塞。
