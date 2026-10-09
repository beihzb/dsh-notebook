# v0.3.0

Long-output folding that actually works, oversized output rendered head+tail, Notebook reachable in a brand-new session, scroll position that survives View switches — plus DSH 0.2.0 compatibility.

## Compatibility (important)

**DSH refuses to boot a plugin whose `@deepseek-ai/dsh*` peer ranges exclude the running runtime.** The gate lives in `@deepseek-ai/dsh-app-boot` (`evaluatePluginCompatibility`, which throws at boot) and `@deepseek-ai/dsh-plugin-manager` (`incompatible-version`), and it only inspects `@deepseek-ai/dsh` / `@deepseek-ai/dsh-*` peers.

v0.2.4 declared `@deepseek-ai/dsh-tools: ^0.1.0-rc.6`, whose upper bound is `<0.2.0` — so on a 0.2.x runtime the whole bundle was skipped at boot (`the plugin stays installed but profile startup denies it`). It now declares:

```json
"@deepseek-ai/dsh-tools": "^0.1.0-rc.6 || ^0.2.0-rc.1"
```

which satisfies `0.1.7-rc.2`, `0.2.0-rc.1`, `0.2.0-rc.2` and `0.2.1-alpha.2`. Everything else in this plugin's contract was verified unchanged between `0.1.7-rc.2` and `0.2.0-rc.2`: `dsh-tools`, `dsh-host-webserver`, `dsh-sandbox-policy`, `dsh-client-ui-slots`, `dsh-client-modules`, `dsh-plugin-manager`, `dsh-web-app` and `dsh-agent` are byte-identical, and the `conversation.view` slot, `ctx.slots.inject/register`, `dsh.bundle.patch`, `defineTool`/`ctx.tools.register`, `webServer.register({kind:"prefix"})` and `session/disposed` are all unchanged. No manifest/API version gate exists — the peer range is the only one.

The client manifest also stopped naming `@deepseek-ai/dsh-client-runtime` (absent from npm at 0.2.x) and `@deepseek-ai/dsh-client-ui-slots` (no `dsh.client` row), pointing instead at `@deepseek-ai/dsh-client-ui-renderer` — the client row that actually provides the `slots` service. That key is advisory load ordering only (the loader silently skips unknown rows), so this is cleanup, not a fix.

## Fixes

- **Folding never triggered (the v0.2.2 feature was dead code)**: `OutputView` gated the `fold` class on `scrollHeight > clientHeight + 8` measured on the very element that the `fold` class clamps. Without the clamp the two values are equal, so overflow was never detected: the button never rendered and no output was ever folded. The measurement now runs against an inner, unclamped element and compares against a single `FOLD_PX` constant shared with the CSS clamp.
- **Scroll position reset when switching Views**: the shell renders one View at a time, so switching to 对话 unmounted the notebook and destroyed its scroll container, resetting the position to the top. The offset is now remembered per session (and restored once the cell list is tall enough to hold it, with a bounded retry while the state loads).
- **Folded/expanded choices survived nothing**: an expanded cell re-folded on every View switch. Each cell's choice is now remembered too.

## Features

- **Long-output folding with a real affordance**: the button reports the hidden size ("Expand all (3,000 lines)"), and the collapsed box keeps its gradient cue.
- **Oversized output renders head+tail**: one text block above 4,000 lines or 200 KB renders its first 300 and last 100 lines with an explicit "… N lines omitted" marker plus a one-click "Show all N lines". A 500 KB stream no longer has to live in the DOM just to be folded.
- **Notebook reachable in a blank session**: DSH omits the `conversation.view` slot while a Session is blank (the view area returns `null` and the View tabs are hidden), so the Notebook tab used to require sending a message first. The plugin now also registers a `uiConversation` View definition (so its target can count as conversation activity) and offers a "📓 Open Notebook in this session" entry above the composer while the session is blank; activating the target makes the shell treat the session as started, which reveals the normal View tabs. The entry renders only while the session is blank, and the whole path is guarded — on a runtime without `uiConversation` the plugin behaves exactly as before.

## Install

```bash
dsh plugin --profile web add @beihaizb/dsh-notebook@0.3.0
```

Then restart `dsh web`. A **Notebook** tab appears at the top of the session.

> **Version pinning**: if you install shortly after this release, pnpm's supply-chain policy (`minimumReleaseAge`) may skip the just-published version and install an older one. Pin the version explicitly (`@beihaizb/dsh-notebook@0.3.0`), or use `@latest` once the release is older than the policy window.
