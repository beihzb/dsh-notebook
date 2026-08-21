# @beihaizb/dsh-notebook

[![npm version](https://img.shields.io/npm/v/@beihaizb/dsh-notebook.svg)](https://www.npmjs.com/package/@beihaizb/dsh-notebook)
[![npm downloads](https://img.shields.io/npm/dm/@beihaizb/dsh-notebook.svg)](https://www.npmjs.com/package/@beihaizb/dsh-notebook)
[![license](https://img.shields.io/npm/l/@beihaizb/dsh-notebook.svg)](https://github.com/beihzb/dsh-notebook/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/beihzb/dsh-notebook.svg?style=social)](https://github.com/beihzb/dsh-notebook)

[English](README.md) | [中文](README.zh-CN.md)

**面向 DeepSeek Harness 的、由 Agent 操控的持久化 Jupyter 计算工作空间。** 一个真正的 `ipykernel` runtime，DSH Agent 可以读取、编辑、执行并检查它的状态——把 notebook 从静态产物变成 Agent 可以操作的对象。

这不是又一个 Notebook 前端。内核是**真正持久的**（变量跨 cell 保持）、notebook 可**保存/重新加载**，而且 Agent 拥有读取、修改、运行、推理 cell 及其输出的**工具**。这给了 Agent 一个真实的 **Agent ↔ 内核 ↔ 产物** 闭环。

## Agent 工作流

这个插件的意义在于：DSH Agent 不在运行一次性脚本，而是在驱动一个活跃的计算会话：

> 用户：*"把 Harmony 换成 scVI。"*
> → Agent 找到相关 cell → 读取源码和上下文 → 修改 cell → 执行 → 检查 stdout / traceback → 必要时继续迭代。

因为内核是持久的，Agent 操作的是有状态 runtime（一个 `Anndata`、一个 GPU 模型、已加载的数据），而不只是拼接代码字符串。

<!-- *演示动图即将补充。* 把上面这行换成: ![demo](demo.gif) —— 30–60 秒：用户给任务 → Agent 改 cell → 运行 → 出结果 → 调整 → 最终出图。 -->

## 演示 / 截图

- 实时 **tqdm 进度条**、内联图可点击放大。
- **可点击 traceback**（`Cell In[N]`）跳转到对应 cell。
- 逐 cell **「交给 AI」** 修改意见：输入需求，Agent 修改并重跑该 cell。
- VS Code 对齐的 cell 行为（排队 / 运行中 / 执行语义）。

## 功能（已实现）

- **真正的持久内核**：`ipykernel` + `jupyter_client` sidecar，变量跨 cell 保持。
- **Agent 工具**：读取、编辑、运行、检查 cell（`nb_get` / `nb_edit_cell` / `nb_run_cell` …），结构化访问输出与 traceback。
- **Agent 运行时自省**：`nb_context`、`nb_list_vars`、`nb_inspect_object` 暴露活内核变量和压缩后的 notebook 状态；pandas `DataFrame` 会返回 shape / dtype / 缺失值 / head / summary 等元信息。
- **安全 AI 修改闭环**：更完整的逐 cell 版本快照，配合 `nb_cell_history`、`nb_revert_cell`、`nb_error_context`、`nb_edit_and_run_cell` 支持可审计的修错并重跑流程。
- **VS Code 对齐的 cell UI**：圆形运行控件、`Queued` / `Executing` 状态栏、执行序号。
- **VS Code 对齐的执行语义**：重启保留已完成输出、中断只停当前 cell、Run All 遇错停止、Clear Outputs / Restart & Clear。
- **tqdm 进度条**、**长输出折叠**、**多图网格**。
- **错误定位**（点击 traceback 跳到对应 cell）。
- **更稳的前端**：加了 React 错误边界，输出渲染异常时不再整块空白；修复了一个 hooks 顺序 bug 导致的界面偶发消失。
- **更快的实时更新**：运行中进度节流并只发尾部输出、状态轮询降频、高频更新不再重复带完整内核列表。
- **跟随会话的工作目录**：notebook 默认 cwd / workspace 跟随当前 DSH 会话；手动“设置工作目录”与打开 notebook 保存的 cwd 优先级更高。
- **会话隔离**：每个 DSH 会话拥有独立的 notebook、内核和工作目录，无跨会话状态泄漏。多会话可同时运行内核。
- **内核管理器**：工具栏弹窗列出所有会话的活跃内核（会话 ID、内核名、状态），可直接关闭任一会话的内核。
- **内核活跃指示**：状态栏显示当前会话内核是否活跃，多会话同时开内核时提醒注意内存/资源。
- **孤儿进程自动清理**：dsh web 被强杀时，Python sidecar 检测到父进程死亡后自动关闭 ipykernel，不留孤儿进程（跨平台：POSIX 用 getppid，Windows 用 OpenProcess）。
- **中英双语界面**：整个界面默认英文，工具栏一键切换中文，选择持久化保存。
- **大小核 CPU 提示**：在混合架构（P+E 核）机器上，一次性（会话级）提示如何把 Python 进程固定到性能核（Windows 任务管理器 / 活动监视器 / `taskset`），并附一键复制的 `psutil` 片段；可关闭不再提示。
- **Jedi 内核补全**（`df.` / `plt.` / 变量名；Tab 接受；悬停看 docstring）。
- **每 cell AI 修改意见**（版本栈在 `cell.metadata.dsh`）。
- **标准 `.ipynb`** 保存 / 读取，自动保存 + 未保存提醒。
- **内核选择**：从 conda 环境列表选内核；缺 ipykernel 时给友好安装提示。
- **兼容 scoped 安装**：bundle 现在在 host 补丁（`cordis.patch.yml`）和 client 加载器里都注册为 `@beihaizb/dsh-notebook`，`dsh plugin add @beihaizb/dsh-notebook` 可直接加载（此前补丁名不带 scope，无法对上 npm 的 scoped 包名）。
- **「交给 AI」更可靠**：修复了一个回归（局部变量遮蔽 i18n 翻译函数），此前提交的意见会在发送前被静默丢弃——现在 cell 代码和你的请求一定能送达 agent。
- **编辑器跟随主题**：CodeMirror 编辑器跟随 DSH 深浅主题——深色用 oneDark，浅色用清爽的浅色方案（行号柔和灰），切换主题时实时重绘。
- **CPU 提示片段本地化**：一键复制的 `psutil` 片段注释跟随界面语言（中 / EN）。

## Roadmap

方向是完整的 **Agent 计算工作空间**，而不是堆更多 Notebook UI：

- **AnnData / 科学对象自省** —— 扩展 `nb_inspect_object("adata")`，返回 `n_obs`、layers、`obsm`、`obs` / `var` 列摘要。
- **结构化执行结果** —— 给 Agent 返回 `cell_id`、`execution_count`、`stdout`、`stderr`、`display_data`、`error`、`duration`、`kernel_state`，建立可靠执行循环。
- **执行历史 / diff UI** —— 不只在工具里记录，也在界面里展示可审计的 cell 版本。
- **上下文相关的 cell 选择** —— 分层 / 查询"哪个 cell 定义了某变量、哪些依赖它"，而不是把整个 notebook 塞进上下文。
- **执行安全** —— 把操作分类为 只读 / 轻量 / 修改型 / 重 / 破坏性；破坏性或超长运行前要求确认。
- **Checkpoint / 回滚** —— 不只恢复代码，还能恢复 runtime 状态。
- **远程 / SLURM 内核** —— 内核跑在服务器 / 作业节点上，Agent 通过同一接口驱动它。

## 安装

```bash
dsh plugin --profile web add @beihaizb/dsh-notebook@0.2.1
```

然后重启 `dsh web`。会话顶部会出现 **Notebook** 标签。

> **版本锁定说明**：如果刚发布不久就安装，pnpm 的供应链策略（`minimumReleaseAge`）可能跳过刚发布的版本、自动装到旧版。遇到这种情况请像上面那样显式指定版本号（`@beihaizb/dsh-notebook@0.2.1`），或等发布超过策略窗口后用 `@beihaizb/dsh-notebook@latest`。

### 内核选择

- **`dsh-envsel` 是可选依赖。** 装了环境选择器时，插件读取它的选择（`~/.dsh/envsel-state.json`），用你在会话里选的 conda 环境作为默认内核。

  ```bash
  dsh plugin --profile web add @beihaizb/dsh-envsel
  ```

  （源码：[github.com/beihzb/dsh-envsel](https://github.com/beihzb/dsh-envsel)）

- **没装 `dsh-envsel`** 时，回退到第一个发现的有 `ipykernel` 的 conda 环境。
- **随时可切换。** 用工具栏下拉框切换任意其他 conda 环境。

所选环境需要 `ipykernel`、`jupyter_client`、`nbformat`。缺任何一个时，插件会给出友好的精确安装命令，而不是静默失败。

## 工具

`nb_new` / `nb_open` / `nb_save` / `nb_get` / `nb_context` / `nb_list` /
`nb_list_vars` / `nb_inspect_object` /
`nb_add_cell` / `nb_delete_cell` / `nb_move_cell` / `nb_edit_cell` / `nb_edit_and_run_cell` /
`nb_cell_history` / `nb_revert_cell` / `nb_error_context` /
`nb_run_cell` / `nb_run_all` / `nb_apply_suggestion` /
`nb_kernel_restart` / `nb_kernel_restart_and_clear` / `nb_kernel_interrupt` /
`nb_kernel_list` / `nb_kernel_select` / `nb_clear_outputs` / `nb_set_cwd`

## License

MIT
