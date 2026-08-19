import { EditorView, keymap, lineNumbers, highlightActiveLine, placeholder, hoverTooltip } from "@codemirror/view"
import { EditorState, Compartment, Prec } from "@codemirror/state"
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands"
import { python } from "@codemirror/lang-python"
import { autocompletion, completionKeymap, startCompletion, acceptCompletion, closeCompletion } from "@codemirror/autocomplete"
import { oneDark } from "@codemirror/theme-one-dark"

window.dnbCM = {
  EditorView,
  EditorState,
  Compartment,
  Prec,
  keymap,
  lineNumbers,
  highlightActiveLine,
  placeholder,
  hoverTooltip,
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  python,
  autocompletion,
  completionKeymap,
  startCompletion,
  acceptCompletion,
  closeCompletion,
  oneDark,
}
