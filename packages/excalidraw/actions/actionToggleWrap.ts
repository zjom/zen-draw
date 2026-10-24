import { register } from "./register";

export const actionToggleWrap = register({
  name: "toggleWrap",
  label: "labels.toggleWrap",
  trackEvent: { category: "element" },
  predicate: (elements, appState, _, app) =>
    app.scene.getSelectedElements(appState).length > 0,
  perform: (elements, appState, _, app) => app.wrap.toggle(elements, appState),
  keyCondition: (appState, elements, app) =>
    app.scene.getSelectedElements(appState).length > 0,
});
