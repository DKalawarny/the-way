// ── Feature visibility flags ─────────────────────────────────────────────────
// Streamlining pass (Daniel, 2026-07-31): the product does a lot — these hide
// surfaces that need user density or duplicate a core loop, so what a new
// user SEES is the wedge: Ask + Bible + the church loop. Nothing is deleted;
// every gate is an entry point only, data stays intact, flip to true to bring
// a feature back exactly as it was.
export const SHOW_WALKS          = false; // guided multi-day journeys — reading plans + daily questions cover it
export const SHOW_CONNECT        = false; // mentor/connect matching — needs density, empty room until then
export const SHOW_MILESTONES_TAB = false; // feed tab — milestone posts still render inside Posts
export const SHOW_FOLLOWS        = false; // follow graph — friends + church membership are the two that matter
