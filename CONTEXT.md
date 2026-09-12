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
