# Motif

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

**Skill detail**（技能详情）：
一个 skill 的整块详情面：身份、示例、文件三段。它本身不是弹窗，是不是模态由宿主决定。
_Avoid_: skill modal、skill page、skill drawer

**Skill card**（技能卡）：
进入 skill detail 的入口，只有封面、标题、一行描述，卡内不放任何动作。
_Avoid_: cover card、preview card（那是不带正文的封面卡）

**Prompt card**（示例卡）：
skill detail 里的一张示例 prompt，整句写全，点一下就送进 composer。
_Avoid_: suggestion、chip、example row

**Voice input**（语音输入）：
composer 里的麦克风控件：按一下开始录音，整个 composer 变成录音条——左取消、中间电平、右结束。电平直写 DOM，不触发 React 重渲染。
_Avoid_: recorder、mic button、dictation

**Tool call**（工具调用）：
agent 做的一次调用，在对话里画成一行：状态、名称、入参摘要，入参和结果收在行后的展开里。它是一行，不是卡。
_Avoid_: tool card、tool block、action、function call

**Tool call status**（调用状态）：
一次 tool call 所处的位置，只有四个词：`queued` 没开始、`running` 在跑、`done` 回来了、`failed` 没回来。
_Avoid_: pending、success、error、loading

**Agent activity**（运行活动）：
一次运行的整块：头部一行，下面是它走过的步骤。运行中头部是等待态加计时，时间线展开；结束后头部收成一行"Worked for 42s"，时间线折起。读者按过头部之后，折叠归读者，运行结束不再动它。
_Avoid_: run log、trace、timeline card、steps panel

**Source**（来源）：
agent 引用的一个外部页面，画成一枚小标：标记加主机名，整枚是链接，页面标题收在悬停里。它有字那么大，能嵌在句子里，也能排成一行。
_Avoid_: citation、reference、result、link card、link preview、badge

**Loading state**（等待态）：
agent 在干活、还没有结果的那一行：点阵、一个词、一个计时。只有这一种，不按在想、调工具、出字分形状。
_Avoid_: agent indicator、spinner、loader、status badge

**Context window**（上下文窗口）：
模型一次能读进去的 token 上限。context usage 里的"整体"就是它，空着的轨道就是还剩的部分。
_Avoid_: context length、token limit、quota

**Context usage**（上下文用量）：
窗口被占了多少、被什么占的：一枚环给"多满"，一根条按系统提示、工具、文件、对话切开。它是 breakdown 以窗口为整体的用法，不是另一种图。
_Avoid_: token meter、usage bar、context gauge

**Context tone**（用量色调）：
环所处的位置，只有三个词：`ok` 有余地、`near` 快满了、`full` 没有余地。色调是角色（`warning`、`destructive`），不是色相。
_Avoid_: level、severity、threshold state

**Mention**（提及）：
草稿里用户从菜单挑出来的一个对象，画成一枚 chip。它是整体：光标进不去，退格整块删。消息把它当对象带走（`id`），不是拼出它的那几个字符。
_Avoid_: tag、token、pill、entity

**Trigger**（触发符）：
在编辑器里打开菜单的那个字符。`@` 指向东西，`/` 执行东西，二者是同一个部件。
_Avoid_: shortcut、hotkey、prefix

**Segment**（片段）：
草稿按消息的样子切开的一段，要么是文本，要么是一个 mention。`value` 是它们拼起来的字符串，片段保留字符串带不走的 `id`。
_Avoid_: token、part、chunk
