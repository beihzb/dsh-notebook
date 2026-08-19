---
name: notebook
description: DSH 原生 Jupyter notebook。当用户提到 notebook、ipynb、跑 cell、改某个 cell、交给 AI 修改、内核、保存 notebook 时使用。即使用户只说“在 notebook 里画图”“打开那个 ipynb”也应触发。
---

# dsh-notebook

DSH 里有一个真正的 Jupyter 内核 notebook（`ipykernel` + `jupyter_client`）。变量跨 cell 保持；图走 `display_data`；异常是 IPython traceback。浏览器有 **Notebook** 标签页，用户也可手动跑。

## 工具

| 工具 | 何时用 |
|---|---|
| `nb_get` | 先看当前 notebook（cells / 输出 / 内核状态） |
| `nb_list` | 列出 `notebooks/*.ipynb` |
| `nb_new` | 新建空白 notebook |
| `nb_open` | 打开一个 `.ipynb` |
| `nb_save` | 存成标准 `.ipynb`（意见历史在 `cell.metadata.dsh`） |
| `nb_add_cell` / `nb_delete_cell` | 增删 cell |
| `nb_edit_cell` | **整段替换**某个 cell 的源码（会记版本） |
| `nb_run_cell` | 对活内核执行一个 code cell |
| `nb_run_all` | 从上到下跑，遇错停止 |
| `nb_apply_suggestion` | 记录用户修改意见 |
| `nb_kernel_restart` / `nb_kernel_interrupt` | 重启 / 中断内核 |
| `nb_kernel_list` | 列出本机可发现的 conda Python 内核（以及有没有 ipykernel） |
| `nb_kernel_select` | 按 env 名 / id / python.exe 路径切换内核（会重启 sidecar） |

## 闭环：用户在 cell 下点「交给AI修改」

对话里会出现一条以 `[notebook]` 开头、带 cell id 和当前代码的用户消息。你必须：

1. `nb_edit_cell`：按意见改该 cell（`reason` 写成那条意见）
2. `nb_run_cell`：立刻重跑
3. 用一两句话说明改了什么、跑通没有；若报错，修完再跑一次

不要另起一个独立 `.py` 脚本去替代 notebook。

## 约定

- 先 `nb_get` 再改，避免改错 cell。
- 出图用 matplotlib + `plt.show()`（或 `display(fig)`），不要只 `savefig` 除非用户要求落盘。
- 内核状态跨 cell 保持：后面的 cell 可以依赖前面定义的变量。
- 用户要可复现的独立脚本时，才把 notebook 另存为 `.py`；默认留在 `.ipynb`。
