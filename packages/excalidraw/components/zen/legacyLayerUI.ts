/**
 * Whether `App` renders the upstream `LayerUI` (toolbar, menus, properties
 * panel) instead of `ZenLayerUI`. Only the upstream tests set it (see
 * `setupTests.ts`), because they drive the editor through that UI.
 */
let legacyLayerUI = false;

export const setLegacyLayerUI = (enabled: boolean) => {
  legacyLayerUI = enabled;
};

export const isLegacyLayerUI = () => legacyLayerUI;
