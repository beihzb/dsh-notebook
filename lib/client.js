// Browser Client half of dsh-notebook. VS Code Jupyter-inspired layout.
window.__ModuleLoader__.load({
  id: "@beihaizb/dsh-notebook",
  factory: function (require) {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    var react = require("react");

    var name = "@beihaizb/dsh-notebook";
    var inject = ["slots"];
    var h = react.createElement;

    var FONT_UI = "var(--dsw-font-family,ui-sans-serif,system-ui,'Segoe UI','Microsoft YaHei','PingFang SC','Noto Sans CJK SC',sans-serif)";
    var FONT_MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Cascadia Mono','Microsoft YaHei Mono','Microsoft YaHei','PingFang SC',monospace";
    var CSS = [
      ".dnb{--dnb-accent:#3794ff;--dnb-run:#89d185;--dnb-err:#f14c4c;--dnb-busy:#cca700;font-family:" + FONT_UI + ";color:var(--dsw-alias-label-primary,#e8eaed);font-size:13px;height:100%;display:flex;flex-direction:column;min-height:0;background:var(--dsw-alias-bg-layer-1);}",
      ".dnb *{box-sizing:border-box;}",
      ".dnb-toolbar{display:flex;align-items:center;gap:4px;padding:4px 8px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);flex:none;min-height:36px;position:sticky;top:0;z-index:20;box-shadow:0 1px 0 color-mix(in srgb, var(--dsw-alias-border-l2) 60%, transparent);}",
      ".dnb-toast{position:fixed;top:48px;left:50%;transform:translateX(-50%);z-index:60;display:flex;align-items:center;gap:8px;padding:6px 14px;border-radius:6px;font-size:12px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);box-shadow:0 6px 24px rgba(0,0,0,.35);animation:dnb-toastin .18s ease-out;}",
      "@keyframes dnb-toastin{from{opacity:0;transform:translate(-50%,-6px)}to{opacity:1;transform:translate(-50%,0)}}",
      ".dnb-toast .dnb-spinring{width:12px;height:12px;border-width:2px;border-color:color-mix(in srgb, var(--dnb-accent) 35%, transparent);border-top-color:var(--dnb-accent);}",
      ".dnb-toast.ok{border-color:#3fa23a;}",
      ".dnb-toast.ok .dnb-toast-ico{color:#89d185;}",
      ".dnb-toast.err{border-color:var(--dnb-err);}",
      ".dnb-toast.err .dnb-toast-ico{color:#ff8a8a;}",
      ".dnb-toolbar .dnb-sep{width:1px;height:18px;background:var(--dsw-alias-border-l2);margin:0 6px;}",
      ".dnb-title{font-size:12px;font-weight:600;margin-right:6px;opacity:.85;}",
      ".dnb-path{font-family:" + FONT_MONO + ";font-size:11px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:280px;}",
      ".dnb-iconbtn{cursor:pointer;border:0;background:transparent;color:var(--dsw-alias-label-primary);border-radius:4px;padding:4px 8px;font-size:12px;line-height:1.2;}",
      ".dnb-iconbtn:hover{background:var(--dsw-alias-interactive-bg-hover);}",
      ".dnb-iconbtn:disabled{opacity:.4;cursor:not-allowed;}",
      ".dnb-iconbtn.run{color:var(--dnb-run);font-weight:600;}",
      ".dnb-kpick{margin-left:auto;display:flex;align-items:center;gap:6px;}",
      ".dnb-kpick select,.dnb-dialog select{max-width:320px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary,#e8eaed);border-radius:4px;padding:3px 6px;font-size:11px;}",
      ".dnb-dot{width:8px;height:8px;border-radius:50%;display:inline-block;background:#9ca3af;}",
      ".dnb-dot.ok{background:#3fa23a;}",
      ".dnb-dot.busy{background:var(--dnb-busy);box-shadow:0 0 0 3px color-mix(in srgb, var(--dnb-busy) 28%, transparent);}",
      ".dnb-dot.err{background:#f14c4c;}",
      ".dnb-body{flex:1;overflow:auto;padding:8px 0 48px;}",
      ".dnb-cell{display:flex;align-items:stretch;margin:0;padding:2px 8px 2px 0;border-left:3px solid transparent;position:relative;}",
      ".dnb-cell.selected{border-left-color:var(--dnb-accent);background:color-mix(in srgb, var(--dnb-accent) 6%, transparent);}",
      "@keyframes dnb-spin{to{transform:rotate(360deg);}}",
      "@keyframes dnb-pulse{0%,100%{opacity:.4}50%{opacity:1}}",
      ".dnb-gutter{width:46px;flex:none;display:flex;flex-direction:column;align-items:center;padding:10px 4px 0 6px;user-select:none;gap:4px;}",
      ".dnb-fold{cursor:pointer;border:0;background:transparent;color:var(--dsw-alias-label-secondary,#b0b4ba);font-size:11px;line-height:1;padding:2px;opacity:0;}",
      ".dnb-cell:hover .dnb-fold,.dnb-cell.selected .dnb-fold,.dnb-cell.collapsed .dnb-fold{opacity:1;}",
      ".dnb-fold:hover{color:var(--dnb-accent);}",
      ".dnb-runctrl{width:22px;height:22px;border-radius:50%;border:1px solid transparent;background:transparent;color:var(--dnb-run);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;opacity:0;position:relative;}",
      ".dnb-cell:hover .dnb-runctrl,.dnb-cell.selected .dnb-runctrl,.dnb-cell.queued .dnb-runctrl,.dnb-cell.running .dnb-runctrl{opacity:1;}",
      ".dnb-runctrl:hover{background:color-mix(in srgb, var(--dnb-run) 16%, transparent);}",
      ".dnb-runctrl.queued{opacity:1;color:#c4c4c4;border-color:#8b8b8b;animation:dnb-pulse 1.2s ease-in-out infinite;}",
      ".dnb-runctrl.running{opacity:1;color:var(--dnb-busy);border-color:var(--dnb-busy);}",
      ".dnb-runctrl .dnb-spinring{width:14px;height:14px;border:2px solid color-mix(in srgb, var(--dnb-busy) 35%, transparent);border-top-color:var(--dnb-busy);border-radius:50%;animation:dnb-spin .7s linear infinite;}",
      ".dnb-execn{font-family:" + FONT_MONO + ";font-size:10px;color:var(--dsw-alias-label-secondary,#8b8b8b);line-height:1;min-height:12px;}",
      ".dnb-move{display:flex;flex-direction:column;align-items:center;opacity:0;}",
      ".dnb-cell:hover .dnb-move,.dnb-cell.selected .dnb-move{opacity:1;}",
      ".dnb-movebtn{cursor:pointer;border:0;background:transparent;color:var(--dsw-alias-label-secondary,#b0b4ba);font-size:10px;line-height:1;padding:1px 3px;border-radius:3px;}",
      ".dnb-movebtn:hover{color:var(--dnb-accent);background:color-mix(in srgb, var(--dnb-accent) 14%, transparent);}",
      ".dnb-execn.err{color:var(--dnb-err);}",
      ".dnb-main{flex:1;min-width:0;padding:4px 12px 8px 0;}",
      ".dnb-editor{width:100%;min-height:64px;height:auto;overflow:hidden;resize:none;border:1px solid transparent;outline:none;padding:8px 10px;font-family:" + FONT_MONO + ";font-size:13px;line-height:1.5;background:var(--dsw-alias-bg-layer-1);color:inherit;border-radius:2px;}",
      ".dnb-cell.selected .dnb-editor{border-color:var(--dsw-alias-border-l2);}",
      ".dnb-cm{width:100%;min-height:48px;border:1px solid transparent;border-radius:2px;overflow:visible;background:var(--dsw-alias-bg-layer-1);position:relative;}",
      ".dnb-cell.selected .dnb-cm{border-color:var(--dsw-alias-border-l2);}",
      ".dnb-cm .cm-editor{height:auto!important;background:transparent;}",
      ".dnb-cm .cm-scroller{overflow:visible!important;font-family:" + FONT_MONO + ";}",
      ".dnb-cm .cm-focused{outline:none;}",
      ".dnb-cm.collapsed{max-height:8.2em;overflow:hidden;}",
      ".dnb-cm.collapsed .cm-editor{max-height:8.2em!important;height:8.2em!important;}",
      ".dnb-cm.collapsed .cm-scroller{overflow:auto!important;max-height:8.2em;}",
      ".dnb-cm-more{position:absolute;left:0;right:0;bottom:0;padding:14px 10px 4px;font-size:11px;color:var(--dsw-alias-label-secondary,#b0b4ba);background:linear-gradient(transparent, var(--dsw-alias-bg-layer-1) 55%);pointer-events:none;text-align:right;}",
      ".dnb-md{padding:8px 12px;min-height:32px;line-height:1.55;cursor:text;}",
      ".dnb-md h1,.dnb-md h2,.dnb-md h3{margin:0.4em 0 0.3em;line-height:1.25;}",
      ".dnb-md p{margin:0.4em 0;}",
      ".dnb-md code{font-family:" + FONT_MONO + ";font-size:12px;background:var(--dsw-alias-bg-layer-2);padding:0 4px;border-radius:3px;}",
      ".dnb-md pre{font-family:" + FONT_MONO + ";font-size:12px;background:var(--dsw-alias-bg-layer-2);padding:8px 10px;border-radius:4px;overflow:auto;}",
      ".dnb-md.empty{color:var(--dsw-alias-label-secondary,#b0b4ba);font-style:italic;}",
      ".dnb-tip{margin:0;max-width:520px;max-height:260px;overflow:auto;white-space:pre-wrap;font-family:" + FONT_MONO + ";font-size:11px;line-height:1.45;padding:8px 10px;}",
      ".cm-tooltip{background:var(--dsw-alias-bg-layer-2,#1e1e1e)!important;border:1px solid var(--dsw-alias-border-l2,#3c3c3c)!important;color:var(--dsw-alias-label-primary,#e8eaed)!important;border-radius:6px!important;}",
      ".cm-tooltip-autocomplete>ul{font-family:" + FONT_MONO + ";font-size:12px;}",
      ".cm-tooltip-autocomplete>ul>li[aria-selected]{background:color-mix(in srgb, var(--dnb-accent) 28%, transparent)!important;}",
      ".dnb-out{padding:2px 10px 6px;}",
      ".dnb-out-wrap.fold{max-height:300px;overflow:hidden;position:relative;}",
      ".dnb-out-wrap.fold::after{content:'';position:absolute;left:0;right:0;bottom:0;height:36px;background:linear-gradient(transparent, var(--dsw-alias-bg-layer-1) 70%);pointer-events:none;}",
      ".dnb-foldbtn{cursor:pointer;border:0;background:transparent;color:var(--dnb-accent);font-size:11px;padding:2px 4px;margin:2px 0;}",
      ".dnb-foldbtn:hover{text-decoration:underline;}",
      ".dnb-fig.grid{display:inline-block;max-width:46%;margin:4px;vertical-align:top;}",
      ".dnb-prog{margin:4px 0;}",
      ".dnb-prog-track{height:6px;border-radius:3px;background:var(--dsw-alias-bg-layer-2);overflow:hidden;max-width:480px;}",
      ".dnb-prog-fill{height:100%;background:var(--dnb-accent);transition:width .2s ease;}",
      ".dnb-prog-text{font-family:" + FONT_MONO + ";font-size:11px;color:var(--dsw-alias-label-secondary);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:720px;}",
      ".dnb-tb-link{cursor:pointer;color:var(--dnb-accent);text-decoration:underline;text-decoration-style:dotted;}",
      ".dnb-tb-link:hover{color:#7db9ff;}",
      ".dnb-stream{margin:0;white-space:pre-wrap;font-family:" + FONT_MONO + ";font-size:12.5px;color:var(--dsw-alias-label-primary,#e8eaed);}",
      ".dnb-err{margin:0;white-space:pre-wrap;font-family:" + FONT_MONO + ";font-size:12px;color:var(--dnb-err);}",
      ".dnb-fig{max-width:100%;max-height:520px;display:block;margin:6px 0;cursor:zoom-in;}",
      ".dnb-statusbar{display:flex;align-items:center;gap:8px;min-height:18px;padding:0 10px 2px;font-size:11px;color:var(--dsw-alias-label-secondary,#b0b4ba);}",
      ".dnb-statusbar.exec{color:var(--dnb-busy);}",
      ".dnb-statusbar.queued{color:#c4c4c4;}",
      ".dnb-statusbar.err{color:var(--dnb-err);}",
      ".dnb-statusbar .dnb-spinring{width:10px;height:10px;border-width:1.5px;}",
      ".dnb-sug{margin-top:4px;padding:6px 10px;border-top:1px dashed var(--dsw-alias-border-l2);}",
      ".dnb-sug-list{margin:0 0 4px;padding:0;list-style:none;}",
      ".dnb-sug-list li{font-size:11px;color:var(--dsw-alias-label-secondary);margin:1px 0;}",
      ".dnb-sug-row{display:flex;gap:6px;align-items:center;}",
      ".dnb-input{flex:1;min-width:0;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;padding:4px 8px;font-size:12px;background:var(--dsw-alias-bg-layer-1);color:inherit;}",
      ".dnb-muted{color:var(--dsw-alias-label-secondary,#b0b4ba);font-size:12px;}",
      ".dnb-dialog{margin:8px 16px 12px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-2);}",
      ".dnb-dialog h4{margin:0 0 8px;font-size:12px;}",
      ".dnb-files{max-height:240px;overflow:auto;margin-top:6px;}",
      ".dnb-file{display:flex;align-items:center;gap:8px;padding:4px 8px;border-radius:4px;cursor:pointer;font-family:" + FONT_MONO + ";font-size:12px;color:var(--dsw-alias-label-primary,#e8eaed);}",
      ".dnb-file:hover{background:var(--dsw-alias-interactive-bg-hover);}",
      ".dnb-file.dir{font-weight:600;}",
      ".dnb-lb{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:80;display:flex;align-items:center;justify-content:center;}",
      ".dnb-lb img{max-width:92vw;max-height:92vh;}",
      ".dnb-cpuhint{max-width:560px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:16px 20px;box-shadow:0 10px 40px rgba(0,0,0,.4);}",
      ".dnb-cpuhint h4{margin:0 0 10px;font-size:14px;}",
      ".dnb-cpuhint p{margin:0 0 8px;line-height:1.6;font-size:12.5px;}",
      ".dnb-cpuhint ul{margin:0 0 8px;padding-left:18px;line-height:1.7;font-size:12.5px;}",
      ".dnb-cpuhint pre{margin:6px 0 0;padding:8px 10px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;overflow:auto;font-size:12px;line-height:1.5;font-family:" + FONT_MONO + ";white-space:pre;}",
      ".dnb-cpuhint-codebox{position:relative;margin:6px 0 0;}",
      ".dnb-cpuhint-codebox .dnb-copybtn{position:absolute;top:6px;right:6px;font-size:11px;padding:2px 6px;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);cursor:pointer;}",
      ".dnb-cpuhint-codebox .dnb-copybtn:hover{color:var(--dnb-accent);}",
      ".dnb-cpuhint-codebox pre{margin-top:0;padding-top:30px;max-height:240px;overflow:auto;}",
      ".dnb-cpuhint .dnb-sug-row{justify-content:flex-end;}",
      ".dnb-errbanner{padding:6px 16px;color:var(--dnb-err);font-size:12px;}",
      ".dnb-kerhint{display:flex;align-items:center;gap:6px;padding:3px 12px;font-size:11.5px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border-bottom:1px solid var(--dsw-alias-border-l2);}",
      ".dnb-kerhint-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-label-tertiary);flex:none;}",
      ".dnb-kerhint-dot.on{background:#22c55e;box-shadow:0 0 4px rgba(34,197,94,.6);}",
      ".dnb-kerhint-warn{color:#f59e0b;}",
      ".dnb-km-back{position:fixed;inset:0;z-index:29;}",
      ".dnb-km{position:fixed;top:42px;right:12px;z-index:30;min-width:300px;max-width:380px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;box-shadow:0 8px 28px rgba(0,0,0,.35);padding:6px 0;max-height:60vh;overflow:auto;}",
      ".dnb-km-h{padding:6px 12px;font-size:11px;color:var(--dsw-alias-label-tertiary);border-bottom:1px solid var(--dsw-alias-border-l2);}",
      ".dnb-km-row{display:flex;align-items:center;gap:8px;padding:7px 12px;}",
      ".dnb-km-row:hover{background:var(--dsw-alias-bg-layer-1);}",
      ".dnb-km-info{flex:1;min-width:0;}",
      ".dnb-km-sid{font-family:" + FONT_MONO + ";font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
      ".dnb-km-name{font-size:11px;color:var(--dsw-alias-label-tertiary);margin-top:1px;}",
      ".dnb-km-close{font-size:11px;padding:3px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;background:transparent;color:var(--dnb-err,#e06c75);cursor:pointer;flex:none;}",
      ".dnb-km-close:hover{background:var(--dnb-err,#e06c75);color:#fff;border-color:var(--dnb-err,#e06c75);}",
      ".dnb-km-empty{padding:16px 12px;font-size:12px;color:var(--dsw-alias-label-tertiary);text-align:center;}",
    ].join("");

    // ---- i18n ----
    var LANG = "en";
    try {
      var _sl = localStorage.getItem("dsh-notebook-lang");
      if (_sl === "en" || _sl === "zh") LANG = _sl;
    } catch (e) {}
    var STR = {
      en: {
        tb_new:"+ New",tb_open:"Open",tb_save:"Save",tb_saveAs:"Save As",tb_workDir:"Work Dir",
        tb_runAll:"▶ Run All",tb_restart:"↻ Restart",tb_restartClear:"Restart & Clear",
        tb_interrupt:"■ Interrupt",tb_clearOutputs:"Clear Outputs",tb_addCell:"+ Cell",
        tb_delete:"Delete",tb_kernel:"Kernel",tb_lang:"Lang",
        tb_new_t:"New notebook",tb_open_t:"Open any .ipynb",tb_save_t:"Save",
        tb_saveAs_t:"Save As (rename/relocate)",tb_workDir_t:"Set Jupyter working directory",
        tb_runAll_t:"Run all (stop on error, VS Code behavior)",
        tb_restart_t:"Restart kernel (keep outputs, VS Code behavior)",
        tb_restartClear_t:"Restart kernel and clear all outputs",
        tb_interrupt_t:"Interrupt current run",
        tb_clearOutputs_t:"Clear all cell outputs and execution counts",
        tb_addCell_t:"Insert cell below",tb_delete_t:"Delete current cell",
        tb_kernel_t:"Kernel manager (view/close kernels per session)",
        tp_runAll:"Running all…",tp_runAllOk:"All cells run",
        tp_restart:"Restarting kernel…",tp_restartOk:"Kernel restarted",tp_restartFail:"Kernel restart failed",
        tp_restartClear:"Restarting and clearing…",tp_restartClearOk:"Restarted and cleared",tp_restartClearFail:"Restart failed",
        tp_interrupt:"Interrupting…",tp_interruptOk:"Interrupt sent",tp_interruptFail:"Interrupt failed",
        tp_clear:"Clearing…",tp_clearOk:"Outputs cleared",
        tp_autosave:"Auto-saved",tp_kernelStart:"Starting kernel…",tp_kernelSwitchFail:"Kernel switch failed",
        tp_kernelClosed:"Kernel closed",tp_kernelCloseFail:"Close failed",tp_opFail:"Operation failed",
        kh_alive:"This session kernel active",kh_dead:"This session kernel not started",
        kh_warn:" · {n} sessions with active kernels - watch memory/resources",
        km_title:"Active kernels · {n}",km_empty:"No running kernels",
        km_current:"  (current)",km_starting:" · starting",km_running:" · running",km_close:"Close",
        kp_busy:"Kernel busy",kp_starting:"Starting",kp_idle:"Kernel idle",kp_disconnected:"Not connected",
        kp_select:"Select kernel",kp_noneFound:"No kernels found",kp_noIpykernel:"  (no ipykernel)",
        c_queued:"Queued (kernel busy)",c_interrupt:"Interrupt current execution",
        c_run:"Run cell (Ctrl+Enter)",c_execNo:"Execution #{n}",c_notRun:"Not run",
        c_moveUp:"Move cell up",c_moveDown:"Move cell down",
        c_expandFull:"Expand full cell",c_collapse:"Collapse cell (~5 lines)",
        c_collapsed:"Collapsed · {n} lines",c_mdPlaceholder:"Double-click to edit Markdown…",
        c_expandAll:"Expand all ({n} outputs)",c_fold:"Fold",
        c_jumpTo:"Jump to cell (execution #{n})",
        c_noExecCell:"No cell with execution #{n} (may be deleted or kernel restarted)",
        sb_placeholder:"Suggestion, let AI fix & rerun…",sb_submit:"To AI",
        sb_submitted:"Sent to AI for fix & rerun",sb_fail:"Failed",
        bd_open:"Open Notebook",bd_save:"Save As",bd_cwd:"Set Working Directory",
        bd_pathPlaceholder:"Paste dir or .ipynb path",bd_go:"Go",
        bd_empty:"Enter path then Go",bd_parent:"← Up",bd_workspace:"Workspace",
        bd_setCwd:"Set as working directory",bd_close:"Close",
        bd_namePlaceholder:"Filename, e.g. analysis.ipynb",bd_saveHere:"Save here",
        bd_noNotebooks:"No .ipynb in this dir",bd_unsaved:"Unsaved",
        eb_reload:"Reload page",eb_error:"Notebook render error: ",
        ch_title:"Hybrid CPU detected (P+E cores)",
        ch_desc:"DSH Notebook's Python process may be scheduled to E-cores (efficiency cores), making it slower than VS Code Jupyter.",
        ch_win_1:"In Task Manager, right-click python.exe → Set priority → Above normal;",
        ch_win_2:"Or Task Manager → Details → right-click python.exe → Set affinity, check only P-cores;",
        ch_win_3:"Or in Power Options, set “Processor performance boost mode” to Enabled and disable power saving.",
        ch_win_4:"Or use psutil in a cell (if installed) to check/set:",
        ch_mac_1:"Open Activity Monitor → double-click python → check its core usage;",
        ch_mac_2:"macOS usually schedules heavy compute on P-cores; if still slow, check Low Power Mode;",
        ch_mac_3:"Check System Settings → Battery → Low Power Mode is off.",
        ch_linux_1:"Use htop/System Monitor to check python's CPU usage and cores;",
        ch_linux_2:"Use taskset to pin to P-cores, e.g.: taskset -pc 0-7,16-23 <pid>;",
        ch_linux_3:"Or check CPU governor, e.g.: cpupower frequency-set -g performance.",
        ch_gotIt:"Got it, don't show again",ch_close:"Close",ch_copy:"⧉ Copy",ch_copyTitle:"Copy code",
        m_cwdLabel:"  ·  cwd "
      },
      zh: {
        tb_new:"＋ 新建",tb_open:"打开",tb_save:"保存",tb_saveAs:"另存为",tb_workDir:"工作目录",
        tb_runAll:"▶ 全部运行",tb_restart:"↻ 重启",tb_restartClear:"重启并清空",
        tb_interrupt:"■ 中断",tb_clearOutputs:"清空输出",tb_addCell:"＋ cell",
        tb_delete:"删除",tb_kernel:"内核",tb_lang:"语言",
        tb_new_t:"新建",tb_open_t:"打开任意目录下的 ipynb",tb_save_t:"保存",
        tb_saveAs_t:"另存为（可改文件名和目录）",tb_workDir_t:"设置 Jupyter 工作目录",
        tb_runAll_t:"运行全部（遇错停止，VS Code 行为）",
        tb_restart_t:"重启内核（保留已完成输出，VS Code 行为）",
        tb_restartClear_t:"重启内核并清除全部输出",
        tb_interrupt_t:"中断当前运行",
        tb_clearOutputs_t:"清除所有 cell 输出和执行序号",
        tb_addCell_t:"在下方插入 cell",tb_delete_t:"删除当前 cell",
        tb_kernel_t:"内核管理器（查看 / 关闭各会话的内核）",
        tp_runAll:"正在运行全部…",tp_runAllOk:"全部运行完成",
        tp_restart:"正在重启内核…",tp_restartOk:"内核已重启",tp_restartFail:"内核重启失败",
        tp_restartClear:"正在重启并清空…",tp_restartClearOk:"已重启并清空输出",tp_restartClearFail:"重启失败",
        tp_interrupt:"正在中断…",tp_interruptOk:"已发送中断",tp_interruptFail:"中断失败",
        tp_clear:"正在清空…",tp_clearOk:"输出已清空",
        tp_autosave:"已自动保存",tp_kernelStart:"正在启动内核…",tp_kernelSwitchFail:"内核切换失败",
        tp_kernelClosed:"已关闭该会话内核",tp_kernelCloseFail:"关闭失败",tp_opFail:"操作失败",
        kh_alive:"本会话内核活跃",kh_dead:"本会话内核未启动",
        kh_warn:" · 共 {n} 个会话开着内核，注意内存/资源",
        km_title:"活跃内核 · {n}",km_empty:"当前没有运行中的内核",
        km_current:"  (当前会话)",km_starting:" · 启动中",km_running:" · 运行中",km_close:"关闭",
        kp_busy:"内核忙",kp_starting:"启动中",kp_idle:"内核空闲",kp_disconnected:"未连接",
        kp_select:"选择内核",kp_noneFound:"未发现内核",kp_noIpykernel:"  (无 ipykernel)",
        c_queued:"排队中（内核忙）",c_interrupt:"中断当前执行",
        c_run:"运行 cell (Ctrl+Enter)",c_execNo:"执行序号 {n}",c_notRun:"未运行",
        c_moveUp:"上移 cell",c_moveDown:"下移 cell",
        c_expandFull:"展开完整 cell",c_collapse:"缩小 cell（约 5 行）",
        c_collapsed:"已折叠 · {n} 行",c_mdPlaceholder:"双击编辑 Markdown…",
        c_expandAll:"展开全部 ({n} 块输出)",c_fold:"折叠",
        c_jumpTo:"跳到 cell（执行序号 {n}）",
        c_noExecCell:"没有找到执行序号 {n} 的 cell（可能已被删除或重启过）",
        sb_placeholder:"修改意见，交给 AI 改代码并重跑…",sb_submit:"交给AI",
        sb_submitted:"已交给 AI 修改并重跑",sb_fail:"失败",
        bd_open:"打开 Notebook",bd_save:"保存为",bd_cwd:"设置工作目录",
        bd_pathPlaceholder:"粘贴目录或 .ipynb 绝对路径",bd_go:"转到",
        bd_empty:"输入路径后点转到",bd_parent:"← 上级",bd_workspace:"工作区",
        bd_setCwd:"将此设为工作目录",bd_close:"关闭",
        bd_namePlaceholder:"文件名，例如 analysis.ipynb",bd_saveHere:"保存到此目录",
        bd_noNotebooks:"此目录没有 .ipynb",bd_unsaved:"未保存",
        eb_reload:"刷新页面",eb_error:"Notebook 前端渲染出错：",
        ch_title:"检测到大小核（混合架构）CPU",
        ch_desc:"DSH Notebook 的 Python 计算进程可能被系统调度到小核心（E-core / 效能核），导致比 VS Code Jupyter 慢。",
        ch_win_1:"在任务管理器里右键 python.exe -> 设置优先级 -> 高于标准；",
        ch_win_2:"或在任务管理器 -> 详细信息 -> 右键 python.exe -> 设置相关性，仅勾选大核（P-core / 性能核）；",
        ch_win_3:"也可在系统电源设置里把“处理器性能提升模式”设为“已启用”并关闭节能。",
        ch_win_4:"或在 cell 里用 psutil（若已安装）查看/设置：",
        ch_mac_1:"打开“活动监视器”（Activity Monitor）-> 双击 python 进程 -> 在“采样/信息”里查看其使用的核心；",
        ch_mac_2:"macOS 的调度通常会自动把重计算优先放性能核（P-core），若仍偏慢，可先确认有没有被“低功耗模式”限制；",
        ch_mac_3:"检查系统设置 -> 电池/电源 -> 低功耗模式是否开启，若开启请关闭。",
        ch_linux_1:"用系统监视器（System Monitor / htop）查看 python 进程的 CPU 占用和所在核心；",
        ch_linux_2:"可执行 taskset 将进程绑定到性能核（P-core），例如：taskset -pc 0-7,16-23 <pid>（按你 CPU 的实际编号调整）；",
        ch_linux_3:"也可检查 CPU 调频策略，例如 cpupower frequency-set -g performance。",
        ch_gotIt:"知道了，不再提示",ch_close:"关闭",ch_copy:"⧉ 复制",ch_copyTitle:"复制代码",
        m_cwdLabel:"  ·  cwd "
      }
    };
    function t(k) {
      var d = STR[LANG] || STR.en;
      return d[k] != null ? d[k] : (STR.en[k] != null ? STR.en[k] : k);
    }

    function apply(ctx) {
      var slots = ctx.slots;
      if (slots === undefined) return;

      if (typeof document !== "undefined") {
        var tag = document.querySelector("style[data-dnb-css]");
        if (tag === null) {
          tag = document.createElement("style");
          tag.setAttribute("data-dnb-css", "1");
          document.head.appendChild(tag);
        }
        tag.textContent = CSS;
      }

      function httpCall(method, args, sid) {
        var payload = args || {};
        if (sid) payload = Object.assign({}, args || {}, { _sid: sid });
        return fetch("/nb/" + method, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).then(function (r) {
          return r.json().then(function (j) {
            if (!r.ok || (j && j.error)) throw new Error((j && j.error) || ("HTTP " + r.status));
            return j;
          });
        });
      }

      function loadCM() {
        if (typeof window === "undefined") return Promise.reject(new Error("no window"));
        if (window.dnbCM) return Promise.resolve(window.dnbCM);
        if (window.__dnbCMPromise) return window.__dnbCMPromise;
        window.__dnbCMPromise = new Promise(function (resolve, reject) {
          var s = document.createElement("script");
          s.src = "/nb/cm.js";
          s.async = true;
          s.onload = function () {
            if (window.dnbCM) resolve(window.dnbCM);
            else reject(new Error("CodeMirror vendor missing window.dnbCM"));
          };
          s.onerror = function () { reject(new Error("failed to load /nb/cm.js")); };
          document.head.appendChild(s);
        });
        return window.__dnbCMPromise;
      }

      function mapCmType(t) {
        t = String(t || "").toLowerCase();
        if (t === "function" || t === "method") return "function";
        if (t === "class" || t === "type") return "class";
        if (t === "module") return "namespace";
        if (t === "keyword" || t === "statement" || t === "magic") return "keyword";
        if (t === "path") return "text";
        return "variable";
      }

      function CellEditor(props) {
        var hostRef = react.useRef(null);
        var viewRef = react.useRef(null);
        var propsRef = react.useRef(props);
        propsRef.current = props;
        var fbState = react.useState(false);
        var fallback = fbState[0], setFallback = fbState[1];

        react.useEffect(function () {
          var cancelled = false;
          var view = null;
          var observer = null;
          function isDark() {
            return document.body.hasAttribute("data-ds-dark-theme");
          }
          function themeExts(cm) {
            if (isDark()) return [cm.oneDark];
            return [
              cm.syntaxHighlighting(cm.defaultHighlightStyle),
              cm.EditorView.theme({
                "&": { color: "#1f2328" },
                ".cm-content": { caretColor: "#1f2328" },
                ".cm-gutterElement": { color: "var(--dsw-alias-label-tertiary,#9aa0a6)" },
              }, { dark: false }),
            ];
          }
          function mount(doc) {
            loadCM().then(function (cm) {
              if (cancelled || !hostRef.current) return;
              var completeGen = 0;
              function completeSource(context) {
                if (propsRef.current.cellType === "markdown") return null;
                var word = context.matchBefore(/[\w\.]*/);
                if (!context.explicit && (!word || word.from === word.to)) return null;
                var gen = ++completeGen;
                var code = context.state.doc.toString();
                return httpCall("complete", { code: code, cursor_pos: context.pos }).then(function (d) {
                  if (gen !== completeGen) return null;
                  var items = (d.items && d.items.length) ? d.items : (d.matches || []).map(function (m) { return { text: m }; });
                  if (!items.length) return null;
                  var from = d.cursor_start != null ? d.cursor_start : (word ? word.from : context.pos);
                  return {
                    from: from,
                    options: items.slice(0, 80).map(function (it) {
                      return { label: it.text, type: mapCmType(it.type), detail: it.signature || "" };
                    }),
                  };
                }).catch(function () { return null; });
              }
              var hover = cm.hoverTooltip(function (v, pos) {
                if (propsRef.current.cellType === "markdown") return null;
                var code = v.state.doc.toString();
                return httpCall("inspect", { code: code, cursor_pos: pos }).then(function (d) {
                  if (!d || !d.found) return null;
                  var text = (d.data && d.data["text/plain"]) || "";
                  if (!text) return null;
                  return {
                    pos: pos,
                    above: true,
                    create: function () {
                      var dom = document.createElement("pre");
                      dom.className = "dnb-tip";
                      dom.textContent = String(text).slice(0, 2500);
                      return { dom: dom };
                    },
                  };
                }).catch(function () { return null; });
              }, { hoverTime: 450 });
              view = new cm.EditorView({
                parent: hostRef.current,
                state: cm.EditorState.create({
                  doc: doc || propsRef.current.value || "",
                  extensions: [
                    cm.Prec.highest(cm.keymap.of([
                      { key: "Mod-Enter", run: function () { if (propsRef.current.onRun) propsRef.current.onRun("stay"); return true; } },
                      { key: "Shift-Enter", run: function () { if (propsRef.current.onRun) propsRef.current.onRun("next"); return true; } },
                      { key: "Alt-Enter", run: function () { if (propsRef.current.onRun) propsRef.current.onRun("insert"); return true; } },
                    ])),
                    cm.history(),
                    cm.keymap.of(cm.historyKeymap),
                    cm.keymap.of(cm.completionKeymap),
                    cm.keymap.of(cm.defaultKeymap),
                    cm.keymap.of([cm.indentWithTab]),
                    cm.lineNumbers(),
                    cm.highlightActiveLine(),
                    cm.python(),
                  ].concat(themeExts(cm), [
                    cm.autocompletion({ override: [completeSource], activateOnTyping: true, activateOnTypingDelay: 120, maxRenderedOptions: 40 }),
                    hover,
                    cm.EditorView.domEventHandlers({
                      focus: function () { if (propsRef.current.onFocus) propsRef.current.onFocus(); return false; },
                      blur: function () { if (propsRef.current.onBlur) propsRef.current.onBlur(); return false; },
                    }),
                    cm.EditorView.updateListener.of(function (u) {
                      if (u.docChanged) propsRef.current.onChange(u.state.doc.toString());
                    }),
                    cm.EditorView.theme({
                      "&": { fontSize: "13px", height: "auto" },
                      ".cm-scroller": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Cascadia Mono', 'Microsoft YaHei Mono', 'Microsoft YaHei', 'PingFang SC', monospace" },
                      ".cm-content": { padding: "8px 10px" },
                      ".cm-gutters": { background: "transparent", border: "none" },
                    }),
                  ]),
                }),
              });
              viewRef.current = view;
            }).catch(function () {
              if (!cancelled) setFallback(true);
            });
          }
          function remount() {
            var doc = view ? view.state.doc.toString() : (propsRef.current.value || "");
            if (view) {
              view.destroy();
              view = null;
              viewRef.current = null;
            }
            mount(doc);
          }
          mount();
          observer = new MutationObserver(function (muts) {
            for (var i = 0; i < muts.length; i++) {
              if (muts[i].attributeName === "data-ds-dark-theme") {
                remount();
                break;
              }
            }
          });
          observer.observe(document.body, { attributes: true, attributeFilter: ["data-ds-dark-theme"] });
          return function () {
            cancelled = true;
            if (observer) observer.disconnect();
            if (view) view.destroy();
            viewRef.current = null;
          };
        }, []);

        react.useEffect(function () {
          var view = viewRef.current;
          if (!view) return;
          var cur = view.state.doc.toString();
          if ((props.value || "") !== cur) {
            view.dispatch({ changes: { from: 0, to: cur.length, insert: props.value || "" } });
          }
        }, [props.value]);

        react.useEffect(function () {
          var view = viewRef.current;
          if (view && view.requestMeasure) view.requestMeasure();
        }, [props.collapsed]);

        var lines = String(props.value || "").split("\n").length;
        var cls = "dnb-cm" + (props.collapsed ? " collapsed" : "");
        if (fallback) {
          return h("textarea", {
            className: "dnb-editor" + (props.collapsed ? " collapsed" : ""),
            value: props.value,
            spellCheck: false,
            style: props.collapsed ? { maxHeight: "8.2em", overflow: "auto" } : null,
            onChange: function (e) { props.onChange(e.target.value); },
            onFocus: props.onFocus,
            onBlur: props.onBlur,
            onKeyDown: function (e) {
              if (e.key !== "Enter") return;
              if (e.altKey) { e.preventDefault(); props.onRun("insert"); }
              else if (e.shiftKey) { e.preventDefault(); props.onRun("next"); }
              else if (e.ctrlKey || e.metaKey) { e.preventDefault(); props.onRun("stay"); }
            },
          });
        }
        return h("div", { className: cls, ref: hostRef },
          props.collapsed && lines > 5 ? h("div", { className: "dnb-cm-more" }, t("c_collapsed").replace("{n}", lines)) : null
        );
      }

      function useNotebook(sid) {
        var dataState = react.useState(null);
        var data = dataState[0], setData = dataState[1];
        var filesState = react.useState([]);
        var files = filesState[0], setFiles = filesState[1];
        var errState = react.useState(null);
        var error = errState[0], setError = errState[1];
        var toastState = react.useState(null);
        var toast = toastState[0], setToast = toastState[1];
        var toastTimer = react.useRef(null);
        var busyState = react.useState(false);
        var busy = busyState[0], setBusy = busyState[1];
        var dialogState = react.useState(null);
        var dialog = dialogState[0], setDialog = dialogState[1];
        var listingState = react.useState(null);
        var listing = listingState[0], setListing = listingState[1];
        var selState = react.useState(null);
        var selected = selState[0], setSelected = selState[1];
        var lastSavedRef = react.useRef(0);
        // Set when Run All is requested; completion toast fires only when the
        // poll loop observes pending cells return to terminal state (ok/error).
        var runAllPendingRef = react.useRef(false);

        function applySnap(snap) {
          if (!snap) return;
          var next = snap.current || (snap.cells ? snap : null);
          if (next) {
            setData(function (prev) {
              if (prev && !next.kernels && prev.kernels) {
                return Object.assign({}, next, { kernels: prev.kernels });
              }
              return next;
            });
          }
          if (snap.notebooks) setFiles(snap.notebooks);
        }

        function refresh() {
          return httpCall("list", {}, sid).then(function (d) {
            applySnap(d);
            setError(null);
          }).catch(function (e) {
            setError(String(e && e.message ? e.message : e));
          });
        }

        function flash(text, kind, ms) {
          if (toastTimer.current) clearTimeout(toastTimer.current);
          setToast({ text: text, kind: kind || "info" });
          if (ms !== 0) {
            toastTimer.current = setTimeout(function () { setToast(null); }, ms || 2400);
          }
        }

        function call(method, args, opts) {
          var silent = method === "get" || method === "syncSessionCwd" || method === "kernelInterrupt" || method === "kernelRestart";
          if (method === "runAll") runAllPendingRef.current = true;
          if (!silent) setBusy(true);
          var pending = opts && opts.pending;
          if (pending) flash(pending, "busy", 0);
          return httpCall(method, args, sid).then(function (d) {
            var snap = d && (d.current || (d.cells ? d : null));
            if (method === "new" || method === "open") lastSavedRef.current = 0;
            if (snap && snap.savedAt) {
              var sa = Number(snap.savedAt);
              if (sa !== lastSavedRef.current) {
                var wasSet = lastSavedRef.current !== 0;
                lastSavedRef.current = sa;
                if (wasSet && !(opts && opts.ok)) flash(t("tp_autosave"), "ok", 1400);
              }
            }
            applySnap(d);
            setError(null);
            if (opts && opts.ok) flash(opts.ok, "ok");
            return d;
          }).catch(function (e) {
            if (method === "runAll") runAllPendingRef.current = false;
            setError(String(e && e.message ? e.message : e));
            flash((opts && opts.fail) || t("tp_opFail") + ": " + String(e && e.message ? e.message : e), "err");
            throw e;
          }).finally(function () {
            if (!silent) setBusy(false);
          });
        }

        function browse(dir) {
          return httpCall("listDir", { dir: dir || undefined }, sid).then(function (d) {
            setListing(d);
            setError(null);
            return d;
          }).catch(function (e) {
            setError(String(e && e.message ? e.message : e));
          });
        }

        function openDialog(mode) {
          setDialog(mode);
          var start = (data && (mode === "save" || mode === "open") && data.path)
            ? data.path.replace(/[\\/][^\\/]+$/, "")
            : (data && data.cwd) || undefined;
          browse(start);
        }

        react.useEffect(function () { refresh(); }, []);
        react.useEffect(function () {
          var cells = (data && data.cells) || [];
          var pending = cells.some(function (c) { return c.status === "queued" || c.status === "running"; });
          var dirty = !!(data && data.dirty);
          // Run All completion: only when a run-all was requested AND a pending
          // cell was observed AND everything has now reached a terminal state.
          if (runAllPendingRef.current) {
            if (!pending) {
              runAllPendingRef.current = false;
              flash(t("tp_runAllOk"), "ok", 1800);
            }
          }
          if (!pending && !dirty) return undefined;
          var pollTimer = setInterval(function () { call("get", {}); }, pending ? 1000 : 2500);
          return function () { clearInterval(pollTimer); };
        }, [data]);
        return {
          data: data, files: files, error: error, busy: busy,
          dialog: dialog, setDialog: setDialog, listing: listing, browse: browse, openDialog: openDialog,
          selected: selected, setSelected: setSelected,
          refresh: refresh, call: call, flash: flash, toast: toast,
        };
      }

      function stripAnsi(s) {
        return String(s || "").replace(/\u001b\[[0-9;]*m/g, "");
      }

      // Detect a tqdm-style progress line, return {pct, text} or null.
      function parseProgressLine(text) {
        var t = String(text || "").trim();
        var m = t.match(/(\d{1,3}(?:\.\d+)?)%\|/);
        if (!m) m = t.match(/(\d{1,3}(?:\.\d+)?)%/);
        if (!m) return null;
        var pct = parseFloat(m[1]);
        if (!(pct >= 0)) return null;
        return { pct: pct, text: t.replace(/\s+it\/s\]?$/, "").slice(0, 120) };
      }

      // Collapse repeated \r-updated progress segments into one live line.
      function renderStreamText(raw) {
        var s = stripAnsi(raw || "");
        var cr = s.indexOf("\r");
        if (cr < 0) return s;
        var segs = s.split(/\r+/);
        var last = segs[segs.length - 1];
        var prog = parseProgressLine(last);
        if (prog) {
          return {
            progress: prog,
            tail: segs.slice(-6).join(" ").slice(0, 400),
          };
        }
        return { tail: last.slice(0, 400) };
      }

      function TracebackView(props) {
        var err = props.error || {};
        var lines = (err.traceback || []).map(stripAnsi);
        // ipykernel 6: "Cell In[2], line 4" · ipykernel 5: "<ipython-input-2-abc>"
        var execRe = /(?:Cell\s+In\[(\d+)\]|ipython-input-(\d+))/;
        return h("pre", { className: "dnb-err" },
          h("span", null, (err.ename || "Error") + ": " + (err.evalue || "")),
          lines.map(function (ln, i) {
            var m = ln.match(execRe);
            if (!m) return h("span", { key: i }, "\n" + ln);
            var execNo = parseInt(m[1] || m[2], 10);
            return h("span", { key: i },
              h("span", { className: "dnb-tb-link", title: t("c_jumpTo").replace("{n}", execNo), onClick: function (e) { e.stopPropagation(); if (props.onJumpTo) props.onJumpTo(execNo); } }, "↗ " + ln),
              "\n"
            );
          })
        );
      }

      function OutputView(props) {
        var outs = props.outputs || [];
        var collapsedState = react.useState(true);
        var collapsed = collapsedState[0], setCollapsed = collapsedState[1];
        var wrapRef = react.useRef(null);
        var needFoldState = react.useState(false);
        var needFold = needFoldState[0], setNeedFold = needFoldState[1];

        var imgCount = 0;
        var anyProgress = false;
        outs.forEach(function (o) {
          var d = o.data || {};
          if (d["image/png"] || d["image/jpeg"]) imgCount++;
          if (o.type === "stream") {
            var r = renderStreamText(o.text);
            if (r && r.progress) anyProgress = true;
          }
        });

        react.useEffect(function () {
          if (!outs.length) {
            setNeedFold(false);
            return;
          }
          var el = wrapRef.current;
          if (!el) return;
          setNeedFold(el.scrollHeight > el.clientHeight + 8);
        }, [outs, collapsed]);

        if (!outs.length) return null;

        var body = outs.map(function (o, i) {
          if (o.type === "stream") {
            var r = renderStreamText(o.text);
            if (r && r.progress) {
              var pct = Math.max(0, Math.min(100, r.progress.pct));
              return h("div", { key: i, className: "dnb-prog" },
                h("div", { className: "dnb-prog-track" },
                  h("div", { className: "dnb-prog-fill", style: { width: pct + "%" } })
                ),
                h("div", { className: "dnb-prog-text" },
                  h("span", null, r.progress.text),
                  r.tail ? h("span", { className: "dnb-muted" }, "  " + r.tail) : null
                )
              );
            }
            return h("pre", { key: i, className: "dnb-stream" }, (r && r.tail) || o.text || "");
          }
          if (o.type === "error" || o.error) {
            return h(TracebackView, { key: i, error: o.error || o, onJumpTo: props.onJumpTo });
          }
          var data = o.data || {};
          var imgSrc = null;
          if (data["image/png"]) imgSrc = "data:image/png;base64," + data["image/png"];
          else if (data["image/jpeg"]) imgSrc = "data:image/jpeg;base64," + data["image/jpeg"];
          if (imgSrc) {
            return h("img", { key: i, className: "dnb-fig" + (imgCount > 1 ? " grid" : ""), src: imgSrc, alt: "figure", onClick: function () { props.onZoom(imgSrc); } });
          }
          if (data["image/svg+xml"]) return h("div", { key: i, dangerouslySetInnerHTML: { __html: data["image/svg+xml"] } });
          if (data["text/html"]) return h("div", { key: i, dangerouslySetInnerHTML: { __html: data["text/html"] } });
          if (data["text/plain"]) return h("pre", { key: i, className: "dnb-stream" }, data["text/plain"]);
          return h("pre", { key: i, className: "dnb-muted" }, JSON.stringify(o).slice(0, 400));
        });

        return h("div", { className: "dnb-out" },
          h("div", {
            className: "dnb-out-wrap" + (collapsed && needFold ? " fold" : ""),
            ref: wrapRef,
          }, body),
          needFold ? h("button", { className: "dnb-foldbtn", onClick: function () { setCollapsed(!collapsed); } }, collapsed ? t("c_expandAll").replace("{n}", outs.length) : t("c_fold")) : null
        );
      }

      function escapeHtml(s) {
        return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }

      function renderMarkdown(src) {
        var text = String(src || "");
        if (!text.trim()) return "";
        var html = escapeHtml(text);
        html = html.replace(/```([\s\S]*?)```/g, function (_, code) { return "<pre><code>" + code + "</code></pre>"; });
        html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
        html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
        html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
        html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
        html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href=\"$2\" target=\"_blank\" rel=\"noreferrer\">$1</a>");
        html = html.replace(/^(?:- |\* )(.+)$/gm, "<li>$1</li>");
        html = html.replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");
        html = html.replace(/\n{2,}/g, "</p><p>");
        return "<p>" + html + "</p>";
      }

      function SuggestionBox(props) {
        var textState = react.useState("");
        var text = textState[0], setText = textState[1];
        var msgState = react.useState("");
        var msg = msgState[0], setMsg = msgState[1];
        var dsh = (props.cell.metadata && props.cell.metadata.dsh) || {};
        var suggestions = dsh.suggestions || [];

        function submit() {
          var txt = text.trim();
          if (!txt) return;
          props.call("applySuggestion", { cellId: props.cell.id, text: txt }).then(function (d) {
            setText("");
            setMsg(t("sb_submitted"));
            if (props.inputActions && d && d.prompt) {
              try {
                props.inputActions.setDraft(d.prompt);
                props.inputActions.submit();
              } catch (e) {}
            }
          }).catch(function (e) {
            setMsg(t("sb_fail") + ": " + (e && e.message ? e.message : e));
          });
        }

        return h("div", { className: "dnb-sug" },
          suggestions.length ? h("ul", { className: "dnb-sug-list" },
            suggestions.slice(-4).map(function (s, i) {
              return h("li", { key: i }, "💬 ", s.text);
            })
          ) : null,
          h("div", { className: "dnb-sug-row" },
            h("input", {
              className: "dnb-input",
              value: text,
              placeholder: t("sb_placeholder"),
              onChange: function (e) { setText(e.target.value); },
              onKeyDown: function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } },
            }),
            h("button", { className: "dnb-iconbtn run", onClick: submit, disabled: props.busy }, t("sb_submit"))
          ),
          msg ? h("div", { className: "dnb-muted" }, msg) : null
        );
      }

      function fmtDur(ms) {
        if (ms == null || ms === "") return "";
        var nms = Number(ms);
        if (!(nms >= 0)) return "";
        if (nms < 1000) return nms + " ms";
        if (nms < 60000) return (nms / 1000).toFixed(nms < 10000 ? 2 : 1) + " s";
        var m = Math.floor(nms / 60000);
        var s = ((nms % 60000) / 1000).toFixed(1);
        return m + " m " + s + " s";
      }

      function CellView(props) {
        var cell = props.cell;
        var localState = react.useState(cell.source || "");
        var local = localState[0], setLocal = localState[1];
        var foldState = react.useState(false);
        var collapsed = foldState[0], setCollapsed = foldState[1];
        var localStartState = react.useState(null);
        var localStart = localStartState[0], setLocalStart = localStartState[1];
        var mdEditState = react.useState(cell.cell_type === "markdown" && !String(cell.source || "").trim());
        var mdEdit = mdEditState[0], setMdEdit = mdEditState[1];
        var tickState = react.useState(0);
        var tick = tickState[0], setTick = tickState[1];
        react.useEffect(function () { setLocal(cell.source || ""); }, [cell.source, cell.id]);
        react.useEffect(function () {
          if (cell.status !== "queued" && cell.status !== "running") setLocalStart(null);
        }, [cell.status]);
        react.useEffect(function () {
          if (cell.status !== "queued" && cell.status !== "running") return undefined;
          var t = setInterval(function () { setTick(function (n) { return n + 1; }); }, 250);
          return function () { clearInterval(t); };
        }, [cell.status, cell.startedAt, cell.queuedAt]);

        function flush() {
          if (local === cell.source) return Promise.resolve();
          return props.call("editCell", { cellId: cell.id, source: local, reason: "manual" });
        }
        function run(mode) {
          setLocalStart(Date.now());
          setMdEdit(false);
          flush().then(function () {
            return props.call("runCell", { cellId: cell.id }).then(function () {
              if (mode === "next") props.onRunNext();
              else if (mode === "insert") props.onRunInsert();
            });
          });
        }
        function interrupt() {
          props.call("kernelInterrupt", {}).then(function () { setLocalStart(null); });
        }
        function runMarkdown() {
          setMdEdit(false);
          flush();
        }

        var st = cell.status || "idle";
        var cls = "dnb-cell";
        if (props.selected) cls += " selected";
        if (collapsed) cls += " collapsed";
        var busyCell = st === "queued" || st === "running";
        var isCode = cell.cell_type === "code";
        var isMd = cell.cell_type === "markdown";
        var startAt = cell.startedAt || (st === "running" ? localStart : null);
        var queueAt = cell.queuedAt || (st === "queued" ? localStart : null);
        var liveMs = st === "running" && startAt ? (Date.now() - startAt) : (st === "queued" && queueAt ? (Date.now() - queueAt) : null);
        void tick;

        var runCtrl;
        if (st === "queued") {
          runCtrl = h("button", { className: "dnb-runctrl queued", title: t("c_queued"), disabled: true, onClick: function (e) { e.stopPropagation(); } },
            h("span", { className: "dnb-spinring" })
          );
        } else if (st === "running") {
          runCtrl = h("button", { className: "dnb-runctrl running", title: t("c_interrupt"), onClick: function (e) { e.stopPropagation(); interrupt(); } },
            h("span", { className: "dnb-spinring" })
          );
        } else if (isCode) {
          runCtrl = h("button", { className: "dnb-runctrl", title: t("c_run"), onClick: function (e) { e.stopPropagation(); run("stay"); } },
            h("span", null, "▶")
          );
        } else {
          runCtrl = null;
        }

        var execNo = null;
        if (isCode && cell.execution_count != null && st !== "running" && st !== "queued") {
          execNo = h("div", { className: "dnb-execn" + (st === "error" ? " err" : ""), title: t("c_execNo").replace("{n}", cell.execution_count) }, String(cell.execution_count));
        } else if (isCode && st === "idle" && !cell.execution_count) {
          execNo = h("div", { className: "dnb-execn" }, "");
        }

        var statusBar = null;
        if (busyCell) {
          statusBar = h("div", { className: "dnb-statusbar " + (st === "queued" ? "queued" : "exec") },
            h("span", { className: "dnb-spinring" }),
            h("span", null, st === "queued" ? "Queued" : "Executing"),
            liveMs != null ? h("span", null, " · " + fmtDur(liveMs)) : null
          );
        } else if (st === "error") {
          statusBar = h("div", { className: "dnb-statusbar err" }, "Error" + (cell.durationMs != null ? " · " + fmtDur(cell.durationMs) : ""));
        } else if (st === "ok" && cell.durationMs != null) {
          statusBar = h("div", { className: "dnb-statusbar" }, fmtDur(cell.durationMs));
        } else if (isMd) {
          statusBar = h("div", { className: "dnb-statusbar" }, "Markdown");
        } else if (isCode && cell.execution_count == null) {
          statusBar = h("div", { className: "dnb-statusbar" }, t("c_notRun"));
        }

        return h("div", { className: cls, "data-cell-id": cell.id, onClick: function () { props.onSelect(cell.id); } },
          h("div", { className: "dnb-gutter" },
            runCtrl,
            execNo,
            h("div", { className: "dnb-move" },
              h("button", {
                className: "dnb-movebtn",
                title: t("c_moveUp"),
                onClick: function (e) { e.stopPropagation(); props.call("moveCell", { cellId: cell.id, dir: -1 }); },
              }, "↑"),
              h("button", {
                className: "dnb-movebtn",
                title: t("c_moveDown"),
                onClick: function (e) { e.stopPropagation(); props.call("moveCell", { cellId: cell.id, dir: 1 }); },
              }, "↓")
            ),
            h("button", {
              className: "dnb-fold",
              title: collapsed ? t("c_expandFull") : t("c_collapse"),
              onClick: function (e) { e.stopPropagation(); setCollapsed(!collapsed); },
            }, collapsed ? "▸" : "▾")
          ),
          h("div", { className: "dnb-main" },
            isMd && !mdEdit ? h("div", {
              className: "dnb-md" + (String(local || "").trim() ? "" : " empty"),
              onClick: function (e) { e.stopPropagation(); props.onSelect(cell.id); },
              onDoubleClick: function (e) { e.stopPropagation(); setMdEdit(true); props.onSelect(cell.id); },
              dangerouslySetInnerHTML: { __html: String(local || "").trim() ? renderMarkdown(local) : t("c_mdPlaceholder") },
            }) : null,
            isMd && mdEdit ? h(CellEditor, {
              value: local,
              cellType: "markdown",
              collapsed: collapsed,
              onChange: function (v) { setLocal(v); },
              onFocus: function () { props.onSelect(cell.id); },
              onBlur: function () { runMarkdown(); },
              onRun: runMarkdown,
            }) : null,
            isCode ? h(CellEditor, {
              value: local,
              cellType: "code",
              collapsed: collapsed,
              onChange: function (v) { setLocal(v); },
              onFocus: function () { props.onSelect(cell.id); },
              onBlur: function () { flush(); },
              onRun: run,
            }) : null,
            h(OutputView, { outputs: cell.outputs, onZoom: props.onZoom, onJumpTo: props.onJumpTo }),
            statusBar,
            isCode && props.selected ? h(SuggestionBox, { cell: cell, call: props.call, busy: props.busy, inputActions: props.inputActions }) : null
          )
        );
      }

      function KernelPicker(props) {
        var k = (props.data && props.data.kernel) || {};
        var kernels = (props.data && props.data.kernels) || [];
        var cls = k.starting ? "busy" : (k.busy ? "busy" : (k.alive ? "ok" : "err"));
        var current = k.id || "";
        return h("div", { className: "dnb-kpick" },
          h("span", { className: "dnb-dot " + cls, title: k.busy ? t("kp_busy") : (k.starting ? t("kp_starting") : (k.alive ? t("kp_idle") : t("kp_disconnected"))) }),
          h("select", {
            value: current,
            disabled: props.busy,
            title: k.interpreter || t("kp_select"),
            onChange: function (e) {
              var id = e.target.value;
              if (!id) return;
              props.call("kernelSelect", { id: id }, { pending: t("tp_kernelStart"), fail: t("tp_kernelSwitchFail") });
            },
          },
            kernels.length === 0 ? h("option", { value: "" }, k.name || t("kp_noneFound")) : null,
            kernels.map(function (item) {
              var label = item.name + (item.hasIpykernel ? "" : t("kp_noIpykernel"));
              return h("option", { key: item.id, value: item.id, disabled: !item.hasIpykernel }, label);
            })
          )
        );
      }

      function BrowserDialog(props) {
        if (!props.mode) return null;
        var listing = props.listing || { dir: "", dirs: [], notebooks: [], parent: null };
        var nameState = react.useState(props.defaultName || "untitled");
        var name = nameState[0], setName = nameState[1];
        var pathState = react.useState(listing.dir || "");
        var path = pathState[0], setPath = pathState[1];
        react.useEffect(function () {
          if (props.defaultName) setName(props.defaultName);
        }, [props.defaultName, props.mode]);
        react.useEffect(function () {
          if (listing.dir) setPath(listing.dir);
        }, [listing.dir]);

        return h("div", { className: "dnb-dialog" },
          h("h4", null, props.mode === "open" ? t("bd_open") : props.mode === "save" ? t("bd_save") : t("bd_cwd")),
          h("div", { className: "dnb-sug-row", style: { marginBottom: 6 } },
            h("input", {
              className: "dnb-input",
              value: path,
              placeholder: t("bd_pathPlaceholder"),
              onChange: function (e) { setPath(e.target.value); },
              onKeyDown: function (e) {
                if (e.key !== "Enter") return;
                var v = path.trim();
                if (!v) return;
                if (/\.ipynb$/i.test(v) && props.mode === "open") props.onOpen(v);
                else if (props.mode === "cwd") props.onSetCwd(v);
                else props.onBrowse(v);
              },
            }),
            h("button", {
              className: "dnb-iconbtn",
              onClick: function () {
                var v = path.trim();
                if (!v) return;
                if (/\.ipynb$/i.test(v) && props.mode === "open") props.onOpen(v);
                else if (props.mode === "cwd") props.onSetCwd(v);
                else props.onBrowse(v);
              },
            }, t("bd_go"))
          ),
          h("div", { className: "dnb-muted", style: { marginBottom: 6 } }, listing.dir || t("bd_empty")),
          h("div", { className: "dnb-sug-row", style: { marginBottom: 6 } },
            listing.parent ? h("button", { className: "dnb-iconbtn", onClick: function () { props.onBrowse(listing.parent); } }, t("bd_parent")) : null,
            h("button", { className: "dnb-iconbtn", onClick: function () { props.onBrowse(props.workspaceRoot); } }, t("bd_workspace")),
            props.mode === "cwd" ? h("button", { className: "dnb-iconbtn run", onClick: function () { props.onSetCwd(path.trim() || listing.dir); } }, t("bd_setCwd")) : null,
            h("span", { style: { flex: 1 } }),
            h("button", { className: "dnb-iconbtn", onClick: props.onClose }, t("bd_close"))
          ),
          props.mode === "save" ? h("div", { className: "dnb-sug-row", style: { marginBottom: 6 } },
            h("input", {
              className: "dnb-input",
              value: name,
              placeholder: t("bd_namePlaceholder"),
              onChange: function (e) { setName(e.target.value); },
            }),
            h("button", {
              className: "dnb-iconbtn run",
              onClick: function () { props.onSave(listing.dir, name); },
            }, t("bd_saveHere"))
          ) : null,
          h("div", { className: "dnb-files" },
            (listing.dirs || []).map(function (d) {
              return h("div", {
                key: d.path,
                className: "dnb-file dir",
                onClick: function () { props.onBrowse(d.path); },
                onDoubleClick: function () { if (props.mode === "cwd") props.onSetCwd(d.path); },
              }, "📁 ", d.name);
            }),
            props.mode !== "cwd" ? (listing.notebooks || []).map(function (f) {
              return h("div", {
                key: f.path,
                className: "dnb-file",
                onClick: function () {
                  if (props.mode === "open") props.onOpen(f.path);
                  else setName(f.name);
                },
              },
                h("span", null, "📓 ", f.name),
                h("span", { className: "dnb-muted" }, f.mtime ? String(f.mtime).replace("T", " ").slice(0, 19) : "")
              );
            }) : null,
            props.mode !== "cwd" && (!listing.notebooks || listing.notebooks.length === 0)
              ? h("div", { className: "dnb-muted" }, t("bd_noNotebooks"))
              : null
          )
        );
      }

      class NotebookErrorBoundary extends react.Component {
        constructor(props) {
          super(props);
          this.state = { error: null };
        }
        static getDerivedStateFromError(error) {
          return { error: error };
        }
        componentDidCatch(error, info) {
          try { console.error("dsh-notebook render error", error, info); } catch (e) {}
        }
        render() {
          if (!this.state.error) return this.props.children;
          var msg = String((this.state.error && this.state.error.message) || this.state.error || "unknown render error");
          return h("div", { className: "dnb" },
            h("div", { className: "dnb-toolbar" },
              h("span", { className: "dnb-title" }, "Jupyter"),
              h("button", { className: "dnb-iconbtn run", onClick: function () { window.location.reload(); } }, t("eb_reload"))
            ),
            h("div", { className: "dnb-errbanner" }, t("eb_error") + msg),
            h("pre", { className: "dnb-err", style: { margin: 16 } }, msg)
          );
        }
      }

      function NotebookApp(props) {
        var nb = useNotebook(props.sessionId);
        var lbState = react.useState(null);
        var lightbox = lbState[0], setLightbox = lbState[1];
        var cpuHintState = react.useState(null);
        var cpuHint = cpuHintState[0], setCpuHint = cpuHintState[1];
        var showCpuHint = !!(cpuHint && cpuHint.hybrid);
        var akState = react.useState({ total: 0, kernels: [] });
        var activeKernels = akState[0], setActiveKernels = akState[1];
        var kmState = react.useState(false);
        var kmOpen = kmState[0], setKmOpen = kmState[1];
        var data = nb.data || { cells: [], kernel: {}, path: null, dirty: false, kernels: [] };
        var sessionCwd = props.useSessions ? props.useSessions(function (s) {
          var id = props.sessionId;
          return id && s && s.byId && s.byId[id] ? s.byId[id].cwd : undefined;
        }) : undefined;
        var cells = data.cells || [];
        var selected = nb.selected || (cells[0] && cells[0].id);

        function cellIndex(id) {
          for (var i = 0; i < cells.length; i++) if (cells[i].id === id) return i;
          return -1;
        }
        function runNext() {
          var idx = cellIndex(selected);
          var next = cells[idx + 1];
          if (next) nb.setSelected(next.id);
          else nb.call("addCell", { after: selected, cell_type: "code" });
        }
        function runInsert() {
          nb.call("addCell", { after: selected, cell_type: "code" }).then(function (d) {
            var cur = d && d.current;
            if (cur && cur.cells) nb.setSelected(cur.cells[cellIndex(selected) + 1].id);
          });
        }
        function jumpToCell(execNo) {
          var target = null;
          for (var i = 0; i < cells.length; i++) {
            if (cells[i].cell_type === "code" && cells[i].execution_count === execNo) {
              target = cells[i];
              break;
            }
          }
          if (!target) {
            nb.flash(t("c_noExecCell").replace("{n}", execNo), "err");
            return;
          }
          nb.setSelected(target.id);
          setTimeout(function () {
            var el = document.querySelector('[data-cell-id="' + target.id + '"]');
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 60);
        }

        react.useEffect(function () {
          if (!sessionCwd) return undefined;
          nb.call("syncSessionCwd", { cwd: sessionCwd }).catch(function () {});
          return undefined;
        }, [sessionCwd]);

        // One-time hybrid-CPU hint (dismissable per browser session).
        react.useEffect(function () {
          var KEY = "dsh.notebook.hybridCpuHintDismissed.v1";
          var dismissed = false;
          try { dismissed = sessionStorage.getItem(KEY) === "1"; } catch (e) {}
          // Reset any legacy persistent dismissal: hint is now session-scoped.
          try { localStorage.removeItem(KEY); } catch (e) {}
          if (dismissed) return undefined;
          var cancelled = false;
          httpCall("cpuInfo", {}).then(function (d) {
            if (cancelled) return;
            if (d && d.hybrid) setCpuHint(d);
          }).catch(function () {});
          return function () { cancelled = true; };
        }, []);

        // Per-session kernel activity: poll global active kernels for the
        // resource reminder (session-scoped NotebookApp, one kernel per session).
        react.useEffect(function () {
          var cancelled2 = false;
          function pollAk() {
            httpCall("activeKernels", {}, props.sessionId).then(function (d) {
              if (!cancelled2 && d) setActiveKernels(d);
            }).catch(function () {});
          }
          pollAk();
          var akTimer = setInterval(pollAk, 6000);
          return function () { cancelled2 = true; clearInterval(akTimer); };
        }, [props.sessionId]);

        // 未保存提醒：关闭/刷新页面时提醒（自动保存 2.5s 后会兜底，但提示更稳）
        react.useEffect(function () {
          function onBeforeUnload(e) {
            if (!nb.data || !nb.data.dirty) return undefined;
            e.preventDefault();
            e.returnValue = "";
            return "";
          }
          window.addEventListener("beforeunload", onBeforeUnload);
          return function () { window.removeEventListener("beforeunload", onBeforeUnload); };
        }, [nb.data]);

        function dismissCpuHint(never) {
          if (never) {
            try { sessionStorage.setItem("dsh.notebook.hybridCpuHintDismissed.v1", "1"); } catch (e) {}
          }
          setCpuHint(null);
        }

        function copyCode(text) {
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(text).catch(function () { fallbackCopy(text); });
            } else {
              fallbackCopy(text);
            }
          } catch (e) {
            fallbackCopy(text);
          }
        }
        function fallbackCopy(text) {
          try {
            var ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
          } catch (e) {}
        }
        var COPY_CODE_ZH = `import os
import ctypes
import struct
import psutil
from ctypes import wintypes

p = psutil.Process(os.getpid())

# ============ 1. 枚举物理核 EfficiencyClass，区分 P 核 / E 核 ============
# Windows 10+ 通过 GetLogicalProcessorInformationEx 上报每个物理核的
# EfficiencyClass：值越大越偏性能核（Intel 混合架构：1=P核 0=E核）。
k32 = ctypes.windll.kernel32
RELATION_PROCESSOR_CORE = 0

def get_processor_cores():
    """返回 [(EfficiencyClass, [逻辑CPU编号])]，按物理核枚举（含超线程）。"""
    size = wintypes.DWORD(0)
    k32.GetLogicalProcessorInformationEx(RELATION_PROCESSOR_CORE, None, ctypes.byref(size))
    buf = ctypes.create_string_buffer(size.value)
    if not k32.GetLogicalProcessorInformationEx(RELATION_PROCESSOR_CORE, buf, ctypes.byref(size)):
        raise ctypes.WinError()
    data = buf.raw  # bytes, 只读 -> 用 struct.unpack_from 解析
    cores, offset, n = [], 0, len(data)
    while offset + 8 <= n:
        rel, rec_size = struct.unpack_from("<iI", data, offset)
        if rel == RELATION_PROCESSOR_CORE and offset + 8 + 32 <= n:
            eff = data[offset + 9]                                   # EfficiencyClass
            mask = struct.unpack_from("<Q", data, offset + 8 + 24)[0]  # GroupMask[0].Mask
            cores.append((eff, [i for i in range(64) if (mask >> i) & 1]))
        offset += rec_size
    return cores

topology = get_processor_cores()
max_eff = max(e for e, _ in topology)
p_cores = sorted(c for e, lst in topology for c in lst if e == max_eff)
e_cores = sorted(c for e, lst in topology for c in lst if e != max_eff)

print(f"物理核数={psutil.cpu_count(logical=False)}  逻辑CPU数={psutil.cpu_count()}")
print(f"EfficiencyClass 取值分布: {sorted({e for e, _ in topology})}")

# ============ 2. 设置亲和性到 P 核，并回读验证 ============
before = p.cpu_affinity()
print("设置前亲和性:", before)

if e_cores:
    print(f"检测到混合架构 -> P核(性能)逻辑CPU: {p_cores}")
    print(f"                     E核(能效)逻辑CPU: {e_cores}")
    try:
        p.cpu_affinity(p_cores)
    except Exception as ex:
        print("!! 设置亲和性失败:", type(ex).__name__, ex)
    after = p.cpu_affinity()
    print("设置后亲和性:", after)
    print("亲和性设置成功?", after == p_cores)
else:
    print("! 未检测到大小核架构（所有核 EfficiencyClass 相同），无需设置亲和性")
    print("亲和性设置成功? N/A（非混合架构）")

# ============ 3. 提升进程优先级（保留原 cell 行为）============
try:
    p.nice(psutil.ABOVE_NORMAL_PRIORITY_CLASS)
    print("优先级已设为 ABOVE_NORMAL_PRIORITY_CLASS, nice 值:", p.nice())
except Exception as ex:
    print("!! 设置优先级失败:", type(ex).__name__, ex)
`;
        var COPY_CODE_EN = `import os
import ctypes
import struct
import psutil
from ctypes import wintypes

p = psutil.Process(os.getpid())

# ============ 1. Enumerate physical cores' EfficiencyClass to tell P/E cores ============
# Windows 10+ reports each physical core's EfficiencyClass through
# GetLogicalProcessorInformationEx; a higher value means a more
# performance-oriented core (Intel hybrid: 1=P-core 0=E-core).
k32 = ctypes.windll.kernel32
RELATION_PROCESSOR_CORE = 0

def get_processor_cores():
    """Return [(EfficiencyClass, [logical CPU ids])] per physical core (incl. hyperthreads)."""
    size = wintypes.DWORD(0)
    k32.GetLogicalProcessorInformationEx(RELATION_PROCESSOR_CORE, None, ctypes.byref(size))
    buf = ctypes.create_string_buffer(size.value)
    if not k32.GetLogicalProcessorInformationEx(RELATION_PROCESSOR_CORE, buf, ctypes.byref(size)):
        raise ctypes.WinError()
    data = buf.raw  # bytes, read-only -> parse with struct.unpack_from
    cores, offset, n = [], 0, len(data)
    while offset + 8 <= n:
        rel, rec_size = struct.unpack_from("<iI", data, offset)
        if rel == RELATION_PROCESSOR_CORE and offset + 8 + 32 <= n:
            eff = data[offset + 9]                                   # EfficiencyClass
            mask = struct.unpack_from("<Q", data, offset + 8 + 24)[0]  # GroupMask[0].Mask
            cores.append((eff, [i for i in range(64) if (mask >> i) & 1]))
        offset += rec_size
    return cores

topology = get_processor_cores()
max_eff = max(e for e, _ in topology)
p_cores = sorted(c for e, lst in topology for c in lst if e == max_eff)
e_cores = sorted(c for e, lst in topology for c in lst if e != max_eff)

print(f"physical cores={psutil.cpu_count(logical=False)}   logical CPUs={psutil.cpu_count()}")
print(f"EfficiencyClass distribution: {sorted({e for e, _ in topology})}")

# ============ 2. Pin affinity to P cores, then read back to verify ============
before = p.cpu_affinity()
print("affinity before:", before)

if e_cores:
    print(f"hybrid detected -> P-core(performance) logical CPUs: {p_cores}")
    print(f"                     E-core(efficiency) logical CPUs: {e_cores}")
    try:
        p.cpu_affinity(p_cores)
    except Exception as ex:
        print("!! failed to set affinity:", type(ex).__name__, ex)
    after = p.cpu_affinity()
    print("affinity after:", after)
    print("affinity set OK?", after == p_cores)
else:
    print("! no hybrid architecture detected (all cores share EfficiencyClass), no affinity change needed")
    print("affinity set OK? N/A (non-hybrid)")

# ============ 3. Raise process priority (keeps original cell behavior) ============
try:
    p.nice(psutil.ABOVE_NORMAL_PRIORITY_CLASS)
    print("priority set to ABOVE_NORMAL_PRIORITY_CLASS, nice value:", p.nice())
except Exception as ex:
    print("!! failed to set priority:", type(ex).__name__, ex)
`;
        var COPY_CODE = LANG === "zh" ? COPY_CODE_ZH : COPY_CODE_EN;

        return h("div", { className: "dnb" },
          lightbox ? h("div", { className: "dnb-lb", onClick: function () { setLightbox(null); } },
            h("img", { src: lightbox, alt: "preview", onClick: function (e) { e.stopPropagation(); } })
          ) : null,
          showCpuHint ? h("div", { className: "dnb-lb", onClick: function () { dismissCpuHint(false); } },
            h("div", { className: "dnb-cpuhint", onClick: function (e) { e.stopPropagation(); } },
              h("h4", null, t("ch_title")),
              h("p", null, t("ch_desc")),
              cpuHint.platform === "win32" ? h("ul", null,
                h("li", null, t("ch_win_1")),
                h("li", null, t("ch_win_2")),
                h("li", null, t("ch_win_3")),
                h("li", null, t("ch_win_4")),
                h("div", { className: "dnb-cpuhint-codebox" },
                  h("button", { className: "dnb-iconbtn dnb-copybtn", title: t("ch_copyTitle"), onClick: function () { copyCode(COPY_CODE); } }, t("ch_copy")),
                  h("pre", { className: "dnb-cpuhint-code" }, COPY_CODE)
                )
              ) : cpuHint.platform === "darwin" ? h("ul", null,
                h("li", null, t("ch_mac_1")),
                h("li", null, t("ch_mac_2")),
                h("li", null, t("ch_mac_3"))
              ) : h("ul", null,
                h("li", null, t("ch_linux_1")),
                h("li", null, t("ch_linux_2")),
                h("li", null, t("ch_linux_3"))
              ),
              h("div", { className: "dnb-sug-row", style: { marginTop: 8 } },
                h("button", { className: "dnb-iconbtn run", onClick: function () { dismissCpuHint(true); } }, t("ch_gotIt")),
                h("button", { className: "dnb-iconbtn", onClick: function () { dismissCpuHint(false); } }, t("ch_close"))
              )
            )
          ) : null,
          nb.toast ? h("div", { className: "dnb-toast " + nb.toast.kind },
            nb.toast.kind === "busy" ? h("span", { className: "dnb-spinring" }) : h("span", { className: "dnb-toast-ico" }, nb.toast.kind === "ok" ? "✓" : "✕"),
            h("span", null, nb.toast.text)
          ) : null,
          h("div", { className: "dnb-toolbar" },
            h("span", { className: "dnb-title" }, "Jupyter"),
            h("button", { className: "dnb-iconbtn", disabled: nb.busy, title: t("tb_new_t"), onClick: function () { nb.call("new", { title: "untitled" }); } }, t("tb_new")),
            h("button", { className: "dnb-iconbtn", disabled: nb.busy, title: t("tb_open_t"), onClick: function () { nb.openDialog("open"); } }, t("tb_open")),
            h("button", { className: "dnb-iconbtn", disabled: nb.busy, title: t("tb_save_t"), onClick: function () { if (data.path) nb.call("save", { path: data.path }); else nb.openDialog("save"); } }, t("tb_save")),
            h("button", { className: "dnb-iconbtn", disabled: nb.busy, title: t("tb_saveAs_t"), onClick: function () { nb.openDialog("save"); } }, t("tb_saveAs")),
            h("button", { className: "dnb-iconbtn", disabled: nb.busy, title: t("tb_workDir_t"), onClick: function () { nb.openDialog("cwd"); } }, t("tb_workDir")),
            h("span", { className: "dnb-sep" }),
            h("button", { className: "dnb-iconbtn run", disabled: nb.busy, title: t("tb_runAll_t"), onClick: function () { nb.call("runAll", {}, { pending: t("tp_runAll") }); } }, t("tb_runAll")),
            h("button", { className: "dnb-iconbtn", title: t("tb_restart_t"), onClick: function () { nb.call("kernelRestart", {}, { pending: t("tp_restart"), ok: t("tp_restartOk"), fail: t("tp_restartFail") }); } }, t("tb_restart")),
            h("button", { className: "dnb-iconbtn", title: t("tb_restartClear_t"), onClick: function () { nb.call("kernelRestartAndClear", {}, { pending: t("tp_restartClear"), ok: t("tp_restartClearOk"), fail: t("tp_restartClearFail") }); } }, t("tb_restartClear")),
            h("button", { className: "dnb-iconbtn", title: t("tb_interrupt_t"), onClick: function () { nb.call("kernelInterrupt", {}, { pending: t("tp_interrupt"), ok: t("tp_interruptOk"), fail: t("tp_interruptFail") }); } }, t("tb_interrupt")),
            h("button", { className: "dnb-iconbtn", title: t("tb_clearOutputs_t"), onClick: function () { nb.call("clearOutputs", {}, { pending: t("tp_clear"), ok: t("tp_clearOk") }); } }, t("tb_clearOutputs")),
            h("button", {
              className: "dnb-iconbtn",
              disabled: nb.busy || !selected,
              title: t("tb_addCell_t"),
              onClick: function () { nb.call("addCell", { after: selected, cell_type: "code" }); },
            }, t("tb_addCell")),
            h("button", {
              className: "dnb-iconbtn",
              disabled: nb.busy || !selected,
              title: t("tb_delete_t"),
              onClick: function () { nb.call("deleteCell", { cellId: selected }); },
            }, t("tb_delete")),
            h("span", { className: "dnb-sep" }),
            h("span", { className: "dnb-path", title: (data.path || t("bd_unsaved")) + "\ncwd: " + (data.cwd || "") }, (data.path ? data.path.split(/[\\/]/).pop() : t("bd_unsaved")) + (data.dirty ? " ●" : "") + (data.cwd ? t("m_cwdLabel") + String(data.cwd).split(/[\\/]/).slice(-2).join("/") : "")),
            h("button", { className: "dnb-iconbtn", title: LANG === "en" ? "切换中文" : "Switch to English", onClick: function (e) { e.stopPropagation(); var nl = LANG === "en" ? "zh" : "en"; try { localStorage.setItem("dsh-notebook-lang", nl); } catch (e2) {} window.location.reload(); } }, LANG === "en" ? "中" : "EN"),
            h("button", { className: "dnb-iconbtn", title: t("tb_kernel_t"), onClick: function (e) { e.stopPropagation(); setKmOpen(!kmOpen); } }, t("tb_kernel")),
            h(KernelPicker, { data: data, busy: nb.busy, call: nb.call })
          ),
          activeKernels.total > 0 ? h("div", { className: "dnb-kerhint" },
            h("span", { className: "dnb-kerhint-dot" + ((data.kernel && data.kernel.alive) ? " on" : "") }),
            h("span", null, (data.kernel && data.kernel.alive) ? t("kh_alive") + (data.kernel.name ? " · " + data.kernel.name : "") : t("kh_dead")),
            activeKernels.total > 1 ? h("span", { className: "dnb-kerhint-warn" }, t("kh_warn").replace("{n}", activeKernels.total)) : null
          ) : null,
          kmOpen ? h("div", { className: "dnb-km-back", onClick: function () { setKmOpen(false); } },
            h("div", { className: "dnb-km", onClick: function (e) { e.stopPropagation(); } },
              h("div", { className: "dnb-km-h" }, t("km_title").replace("{n}", activeKernels.total)),
              (activeKernels.kernels || []).length === 0
                ? h("div", { className: "dnb-km-empty" }, t("km_empty"))
                : (activeKernels.kernels || []).map(function (k) {
                    return h("div", { className: "dnb-km-row", key: k.sessionId },
                      h("span", { className: "dnb-kerhint-dot on" }),
                      h("div", { className: "dnb-km-info" },
                        h("div", { className: "dnb-km-sid", title: k.sessionId }, String(k.sessionId).slice(0, 8) + (k.sessionId === props.sessionId ? t("km_current") : "")),
                        h("div", { className: "dnb-km-name" }, (k.name || "kernel") + (k.starting && !k.alive ? t("km_starting") : t("km_running")))
                      ),
                      h("button", { className: "dnb-km-close", onClick: function () { httpCall("shutdownKernel", { sessionId: k.sessionId }, props.sessionId).then(function (d) { setActiveKernels(d || { total: 0, kernels: [] }); nb.flash(t("tp_kernelClosed"), "ok", 1400); }).catch(function (e2) { nb.flash(t("tp_kernelCloseFail") + ": " + String(e2 && e2.message ? e2.message : e2), "err"); }); } }, t("km_close"))
                    );
                  })
            )
          ) : null,
          nb.error ? h("div", { className: "dnb-errbanner" }, nb.error) : null,
          h("div", { className: "dnb-body" },
            h(BrowserDialog, {
              mode: nb.dialog,
              listing: nb.listing,
              workspaceRoot: data.workspaceRoot,
              defaultName: data.path ? String(data.path).split(/[\\/]/).pop() : "untitled.ipynb",
              onBrowse: nb.browse,
              onClose: function () { nb.setDialog(null); },
              onOpen: function (p) { nb.setDialog(null); nb.call("open", { path: p }); },
              onSave: function (dir, name) { nb.setDialog(null); nb.call("save", { dir: dir, name: name }); },
              onSetCwd: function (dir) { nb.setDialog(null); nb.call("setCwd", { dir: dir }); },
            }),
            cells.map(function (c) {
              return h(CellView, {
                key: c.id,
                cell: c,
                selected: c.id === selected,
                call: nb.call,
                busy: nb.busy,
                inputActions: props.inputActions,
                onZoom: setLightbox,
                onSelect: nb.setSelected,
                onRunNext: runNext,
                onRunInsert: runInsert,
                onJumpTo: jumpToCell,
              });
            })
          )
        );
      }

      slots.inject("conversation.view", function () {
        slots.register(
          { name: "conversation.view", id: "dsh-notebook", order: 15, label: "Notebook" },
          function (props) { return h(NotebookErrorBoundary, null, h(NotebookApp, Object.assign({}, props || {}, { inputActions: props && props.inputActions }))); }
        );
      });
    }

    exports.name = name;
    exports.inject = inject;
    exports.apply = apply;
    return module.exports;
  },
});
