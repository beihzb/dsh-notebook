// Browser Client half of dsh-notebook. VS Code Jupyter-inspired layout.
window.__ModuleLoader__.load({
  id: "dsh-notebook",
  factory: function (require) {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    var react = require("react");

    var name = "dsh-notebook";
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
      ".dnb-errbanner{padding:6px 16px;color:var(--dnb-err);font-size:12px;}",
    ].join("");

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

      function httpCall(method, args) {
        return fetch("/nb/" + method, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args || {}),
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
                doc: propsRef.current.value || "",
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
                  cm.oneDark,
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
                    ".cm-content": { padding: "8px 10px", caretColor: "#e8eaed" },
                    ".cm-gutters": { background: "transparent", border: "none" },
                  }),
                ],
              }),
            });
            viewRef.current = view;
          }).catch(function () {
            if (!cancelled) setFallback(true);
          });
          return function () {
            cancelled = true;
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
          props.collapsed && lines > 5 ? h("div", { className: "dnb-cm-more" }, "已折叠 · " + lines + " 行") : null
        );
      }

      function useNotebook() {
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

        function applySnap(snap) {
          if (!snap) return;
          if (snap.current) setData(snap.current);
          else if (snap.cells) setData(snap);
          if (snap.notebooks) setFiles(snap.notebooks);
        }

        function refresh() {
          return httpCall("list", {}).then(function (d) {
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
          var silent = method === "get" || method === "kernelInterrupt" || method === "kernelRestart";
          if (!silent) setBusy(true);
          var pending = opts && opts.pending;
          if (pending) flash(pending, "busy", 0);
          return httpCall(method, args).then(function (d) {
            var snap = d && (d.current || (d.cells ? d : null));
            if (method === "new" || method === "open") lastSavedRef.current = 0;
            if (snap && snap.savedAt) {
              var sa = Number(snap.savedAt);
              if (sa !== lastSavedRef.current) {
                var wasSet = lastSavedRef.current !== 0;
                lastSavedRef.current = sa;
                if (wasSet && !(opts && opts.ok)) flash("已自动保存", "ok", 1400);
              }
            }
            applySnap(d);
            if (d.current) setData(d.current);
            setError(null);
            if (opts && opts.ok) flash(opts.ok, "ok");
            return d;
          }).catch(function (e) {
            setError(String(e && e.message ? e.message : e));
            flash((opts && opts.fail) || "操作失败: " + String(e && e.message ? e.message : e), "err");
            throw e;
          }).finally(function () {
            if (!silent) setBusy(false);
          });
        }

        function browse(dir) {
          return httpCall("listDir", { dir: dir || undefined }).then(function (d) {
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
          if (!pending && !dirty) return undefined;
          var t = setInterval(function () { call("get", {}); }, pending ? 400 : 1200);
          return function () { clearInterval(t); };
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
              h("span", { className: "dnb-tb-link", title: "跳到 cell（执行序号 " + execNo + "）", onClick: function (e) { e.stopPropagation(); if (props.onJumpTo) props.onJumpTo(execNo); } }, "↗ " + ln),
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
        if (!outs.length) return null;

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
          var el = wrapRef.current;
          if (!el) return;
          setNeedFold(el.scrollHeight > el.clientHeight + 8);
        }, [outs, collapsed]);

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
          needFold ? h("button", { className: "dnb-foldbtn", onClick: function () { setCollapsed(!collapsed); } }, collapsed ? "展开全部 (" + outs.length + " 块输出)" : "折叠") : null
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
          var t = text.trim();
          if (!t) return;
          props.call("applySuggestion", { cellId: props.cell.id, text: t }).then(function (d) {
            setText("");
            setMsg("已交给 AI 修改并重跑");
            if (props.inputActions && d && d.prompt) {
              try {
                props.inputActions.setDraft(d.prompt);
                props.inputActions.submit();
              } catch (e) {}
            }
          }).catch(function (e) {
            setMsg("失败: " + (e && e.message ? e.message : e));
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
              placeholder: "修改意见，交给 AI 改代码并重跑…",
              onChange: function (e) { setText(e.target.value); },
              onKeyDown: function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } },
            }),
            h("button", { className: "dnb-iconbtn run", onClick: submit, disabled: props.busy }, "交给AI")
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
          runCtrl = h("button", { className: "dnb-runctrl queued", title: "排队中（内核忙）", disabled: true, onClick: function (e) { e.stopPropagation(); } },
            h("span", { className: "dnb-spinring" })
          );
        } else if (st === "running") {
          runCtrl = h("button", { className: "dnb-runctrl running", title: "中断当前执行", onClick: function (e) { e.stopPropagation(); interrupt(); } },
            h("span", { className: "dnb-spinring" })
          );
        } else if (isCode) {
          runCtrl = h("button", { className: "dnb-runctrl", title: "运行 cell (Ctrl+Enter)", onClick: function (e) { e.stopPropagation(); run("stay"); } },
            h("span", null, "▶")
          );
        } else {
          runCtrl = null;
        }

        var execNo = null;
        if (isCode && cell.execution_count != null && st !== "running" && st !== "queued") {
          execNo = h("div", { className: "dnb-execn" + (st === "error" ? " err" : ""), title: "执行序号 " + cell.execution_count }, String(cell.execution_count));
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
          statusBar = h("div", { className: "dnb-statusbar" }, "未运行");
        }

        return h("div", { className: cls, "data-cell-id": cell.id, onClick: function () { props.onSelect(cell.id); } },
          h("div", { className: "dnb-gutter" },
            runCtrl,
            execNo,
            h("div", { className: "dnb-move" },
              h("button", {
                className: "dnb-movebtn",
                title: "上移 cell",
                onClick: function (e) { e.stopPropagation(); props.call("moveCell", { cellId: cell.id, dir: -1 }); },
              }, "↑"),
              h("button", {
                className: "dnb-movebtn",
                title: "下移 cell",
                onClick: function (e) { e.stopPropagation(); props.call("moveCell", { cellId: cell.id, dir: 1 }); },
              }, "↓")
            ),
            h("button", {
              className: "dnb-fold",
              title: collapsed ? "展开完整 cell" : "缩小 cell（约 5 行）",
              onClick: function (e) { e.stopPropagation(); setCollapsed(!collapsed); },
            }, collapsed ? "▸" : "▾")
          ),
          h("div", { className: "dnb-main" },
            isMd && !mdEdit ? h("div", {
              className: "dnb-md" + (String(local || "").trim() ? "" : " empty"),
              onClick: function (e) { e.stopPropagation(); props.onSelect(cell.id); },
              onDoubleClick: function (e) { e.stopPropagation(); setMdEdit(true); props.onSelect(cell.id); },
              dangerouslySetInnerHTML: { __html: String(local || "").trim() ? renderMarkdown(local) : "双击编辑 Markdown…" },
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
          h("span", { className: "dnb-dot " + cls, title: k.busy ? "内核忙" : (k.starting ? "启动中" : (k.alive ? "内核空闲" : "未连接")) }),
          h("select", {
            value: current,
            disabled: props.busy,
            title: k.interpreter || "选择内核",
            onChange: function (e) {
              var id = e.target.value;
              if (!id) return;
              props.call("kernelSelect", { id: id }, { pending: "正在启动内核…", fail: "内核切换失败" });
            },
          },
            kernels.length === 0 ? h("option", { value: "" }, k.name || "未发现内核") : null,
            kernels.map(function (item) {
              var label = item.name + (item.hasIpykernel ? "" : "  (无 ipykernel)");
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
          h("h4", null, props.mode === "open" ? "打开 Notebook" : props.mode === "save" ? "保存为" : "设置工作目录"),
          h("div", { className: "dnb-sug-row", style: { marginBottom: 6 } },
            h("input", {
              className: "dnb-input",
              value: path,
              placeholder: "粘贴目录或 .ipynb 绝对路径",
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
            }, "转到")
          ),
          h("div", { className: "dnb-muted", style: { marginBottom: 6 } }, listing.dir || "输入路径后点转到"),
          h("div", { className: "dnb-sug-row", style: { marginBottom: 6 } },
            listing.parent ? h("button", { className: "dnb-iconbtn", onClick: function () { props.onBrowse(listing.parent); } }, "← 上级") : null,
            h("button", { className: "dnb-iconbtn", onClick: function () { props.onBrowse(props.workspaceRoot); } }, "工作区"),
            props.mode === "cwd" ? h("button", { className: "dnb-iconbtn run", onClick: function () { props.onSetCwd(path.trim() || listing.dir); } }, "将此设为工作目录") : null,
            h("span", { style: { flex: 1 } }),
            h("button", { className: "dnb-iconbtn", onClick: props.onClose }, "关闭")
          ),
          props.mode === "save" ? h("div", { className: "dnb-sug-row", style: { marginBottom: 6 } },
            h("input", {
              className: "dnb-input",
              value: name,
              placeholder: "文件名，例如 analysis.ipynb",
              onChange: function (e) { setName(e.target.value); },
            }),
            h("button", {
              className: "dnb-iconbtn run",
              onClick: function () { props.onSave(listing.dir, name); },
            }, "保存到此目录")
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
              ? h("div", { className: "dnb-muted" }, "此目录没有 .ipynb")
              : null
          )
        );
      }

      function NotebookApp(props) {
        var nb = useNotebook();
        var lbState = react.useState(null);
        var lightbox = lbState[0], setLightbox = lbState[1];
        var data = nb.data || { cells: [], kernel: {}, path: null, dirty: false, kernels: [] };
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
            nb.flash("没有找到执行序号 " + execNo + " 的 cell（可能已被删除或重启过）", "err");
            return;
          }
          nb.setSelected(target.id);
          setTimeout(function () {
            var el = document.querySelector('[data-cell-id="' + target.id + '"]');
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 60);
        }

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

        return h("div", { className: "dnb" },
          lightbox ? h("div", { className: "dnb-lb", onClick: function () { setLightbox(null); } },
            h("img", { src: lightbox, alt: "preview", onClick: function (e) { e.stopPropagation(); } })
          ) : null,
          nb.toast ? h("div", { className: "dnb-toast " + nb.toast.kind },
            nb.toast.kind === "busy" ? h("span", { className: "dnb-spinring" }) : h("span", { className: "dnb-toast-ico" }, nb.toast.kind === "ok" ? "✓" : "✕"),
            h("span", null, nb.toast.text)
          ) : null,
          h("div", { className: "dnb-toolbar" },
            h("span", { className: "dnb-title" }, "Jupyter"),
            h("button", { className: "dnb-iconbtn", disabled: nb.busy, title: "新建", onClick: function () { nb.call("new", { title: "untitled" }); } }, "＋ 新建"),
            h("button", { className: "dnb-iconbtn", disabled: nb.busy, title: "打开任意目录下的 ipynb", onClick: function () { nb.openDialog("open"); } }, "打开"),
            h("button", { className: "dnb-iconbtn", disabled: nb.busy, title: "保存", onClick: function () { if (data.path) nb.call("save", { path: data.path }); else nb.openDialog("save"); } }, "保存"),
            h("button", { className: "dnb-iconbtn", disabled: nb.busy, title: "另存为（可改文件名和目录）", onClick: function () { nb.openDialog("save"); } }, "另存为"),
            h("button", { className: "dnb-iconbtn", disabled: nb.busy, title: "设置 Jupyter 工作目录", onClick: function () { nb.openDialog("cwd"); } }, "工作目录"),
            h("span", { className: "dnb-sep" }),
            h("button", { className: "dnb-iconbtn run", disabled: nb.busy, title: "运行全部（遇错停止，VS Code 行为）", onClick: function () { nb.call("runAll", {}, { pending: "正在运行全部…", ok: "全部运行完成" }); } }, "▶ 全部运行"),
            h("button", { className: "dnb-iconbtn", title: "重启内核（保留已完成输出，VS Code 行为）", onClick: function () { nb.call("kernelRestart", {}, { pending: "正在重启内核…", ok: "内核已重启", fail: "内核重启失败" }); } }, "↻ 重启"),
            h("button", { className: "dnb-iconbtn", title: "重启内核并清除全部输出", onClick: function () { nb.call("kernelRestartAndClear", {}, { pending: "正在重启并清空…", ok: "已重启并清空输出", fail: "重启失败" }); } }, "重启并清空"),
            h("button", { className: "dnb-iconbtn", title: "中断当前运行", onClick: function () { nb.call("kernelInterrupt", {}, { pending: "正在中断…", ok: "已发送中断", fail: "中断失败" }); } }, "■ 中断"),
            h("button", { className: "dnb-iconbtn", title: "清除所有 cell 输出和执行序号", onClick: function () { nb.call("clearOutputs", {}, { pending: "正在清空…", ok: "输出已清空" }); } }, "清空输出"),
            h("button", {
              className: "dnb-iconbtn",
              disabled: nb.busy || !selected,
              title: "在下方插入 cell",
              onClick: function () { nb.call("addCell", { after: selected, cell_type: "code" }); },
            }, "＋ cell"),
            h("button", {
              className: "dnb-iconbtn",
              disabled: nb.busy || !selected,
              title: "删除当前 cell",
              onClick: function () { nb.call("deleteCell", { cellId: selected }); },
            }, "删除"),
            h("span", { className: "dnb-sep" }),
            h("span", { className: "dnb-path", title: (data.path || "未保存") + "\ncwd: " + (data.cwd || "") }, (data.path ? data.path.split(/[\\/]/).pop() : "未保存") + (data.dirty ? " ●" : "") + (data.cwd ? "  ·  cwd " + String(data.cwd).split(/[\\/]/).slice(-2).join("/") : "")),
            h(KernelPicker, { data: data, busy: nb.busy, call: nb.call })
          ),
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
          function (props) { return h(NotebookApp, { inputActions: props && props.inputActions }); }
        );
      });
    }

    exports.name = name;
    exports.inject = inject;
    exports.apply = apply;
    return module.exports;
  },
});
