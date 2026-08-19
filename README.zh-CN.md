# @beihaizb/dsh-notebook

[![npm version](https://img.shields.io/npm/v/@beihaizb/dsh-notebook.svg)](https://www.npmjs.com/package/@beihaizb/dsh-notebook)
[![npm downloads](https://img.shields.io/npm/dm/@beihaizb/dsh-notebook.svg)](https://www.npmjs.com/package/@beihaizb/dsh-notebook)
[![license](https://img.shields.io/npm/l/@beihaizb/dsh-notebook.svg)](https://github.com/beihzb/dsh-notebook/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/beihzb/dsh-notebook.svg?style=social)](https://github.com/beihzb/dsh-notebook)

[English](README.md) | [中文](README.zh-CN.md)

DeepSeek Harness 的原生 Jupyter 风格 notebook 插件：真 `ipykernel` sidecar + 浏览器 cell 编辑器，运行行为对齐 VS Code Jupyter。

## 演示

实际效果亮点：实时 **tqdm 进度条**、**可点击 traceback** 跳转到对应 cell、逐 cell **「交给 AI」** 修改意见、**内联出图**可点击放大。

<!-- 在本目录放一个 demo.gif，然后把下面这行换成: ![demo](demo.gif) -->
> 🎬 *演示动图即将补充。*

## 功能

- **真内核**：`ipykernel` + `jupyter_client` sidecar，cell 间变量状态保持
- **VS Code 对齐的 cell UI**：圆形运行控件（排队灰圈 / 运行中金色转圈）、Queued / Executing 状态栏、小号执行序号，无 `In [ ]` / `Out [ ]` 噪音
- **运行语义对齐 VS Code**：重启保留已完成输出、中断只停当前 cell、Run All 遇错停止、Clear Outputs / Restart & Clear
- **tqdm 进度条**：`\r` 刷新的进度流渲染成实时进度条
- **长输出折叠 + 多图网格**：超长输出自动折叠，多张图横向排列
- **错误定位**：traceback 里的 `Cell In[N]` 可点击跳转到对应 cell
- **内核补全**：`df.` / `plt.` / 变量名弹出 Jedi 补全，Tab 接受；悬停看 docstring
- **每 cell AI 修改意见**：一键交给 AI 改代码并重跑（版本栈在 `cell.metadata.dsh`）
- **标准 `.ipynb`** 保存 / 读取，自动保存 + 未保存提醒
- **内核选择**：从 conda 环境列表选内核；缺 ipykernel 时给友好安装提示
- **完整 UTF-8**：中文 / emoji 输出和 matplotlib 图在 Windows 上无损显示

## 安装

```bash
dsh plugin --profile web add @beihaizb/dsh-notebook
```

然后重启 `dsh web`。会话顶部会出现 **Notebook** 标签。

### 内核选择

内核选择规则：

- **`dsh-envsel` 是可选依赖。** 如果装了环境选择器，notebook 插件会读取它的选择（`~/.dsh/envsel-state.json`），用你在 DSH 会话里选的 conda 环境作为默认内核，保持与全局选的环境一致。安装它：

  ```bash
  dsh plugin --profile web add @beihaizb/dsh-envsel
  ```

  （源码：[github.com/beihzb/dsh-envsel](https://github.com/beihzb/dsh-envsel)）

- **没装 `dsh-envsel`**（或没有选择记录）时，插件回退到第一个发现的有 `ipykernel` 的 conda 环境。
- **随时可切换。** 用 notebook 工具栏右侧的内核下拉框切换到任意其他 conda 环境。

所选环境需要 `ipykernel`、`jupyter_client`、`nbformat`。缺任何一个时，插件会显示友好错误并给出精确安装命令，而不是静默失败。

## 工具

`nb_new` / `nb_open` / `nb_save` / `nb_get` / `nb_list` /
`nb_add_cell` / `nb_delete_cell` / `nb_move_cell` / `nb_edit_cell` /
`nb_run_cell` / `nb_run_all` / `nb_apply_suggestion` /
`nb_kernel_restart` / `nb_kernel_restart_and_clear` / `nb_kernel_interrupt` /
`nb_kernel_list` / `nb_kernel_select` / `nb_clear_outputs` / `nb_set_cwd`

## License

MIT
