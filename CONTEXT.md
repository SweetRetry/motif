# startercn

一个 shadcn registry：收录 agent 界面用的组件。同一份源码同时供给文档站和 `npx shadcn add`。这份文件只放词汇——同一个概念在代码、文档和对话里用哪个词说。

## Language

**Cover card**（封面卡）：
整张卡就是封面图，标题压在图上的一角；没有正文区、没有卡内按钮。
_Avoid_: preview card、thumbnail、media card

**Fan**（扇开）：
一组卡片互相压叠、每张都还露出一条，角度从中间向两侧递增的排列。
_Avoid_: stack、deck、carousel、row、gallery

**Cover fan**（封面扇）：
一组 cover card 按 fan 排开，用来从若干起点里挑一个。空状态的快速开始是它的主场。
_Avoid_: stack card、card stack、cover deck、cover carousel

**Lift**（抬起）：
一张卡离开 fan、摆正并压到最前的状态，由悬停或键盘聚焦触发。
_Avoid_: hover state、active、selected
