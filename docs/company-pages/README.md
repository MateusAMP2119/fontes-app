# Company pages, first version

Route: `/pages`. Development preview: `/dashboard-preview/pages`.

The existing dashboard shell is preserved. The new editor supports page creation, grouping, ordering within groups, duplication, removal with undo, editable titles and descriptions, topic filters, and a reading preview. Feeds use the existing stories API and match any configured topic. Save stores all pages in browser storage, keyed by user and project. This is a local prototype: there is no shared company persistence, access-control model for pages, or public publishing.

## Reference inspection

Inspected the authenticated Scalar navigation editor in Safari at `https://dashboard.scalar.com/docs/fdCJW058tpEdg4WkMXPHz/nav`. Retrieved the public HTML, entry JavaScript and CSS, then followed the entry bundle's `DocsEditorLayout-dUyK-BcX.js` dependency and inspected the minified layout definitions. No credentials or authenticated response payloads were copied.

The delivered `DocsEditorLayout` defines 48px header constants and a 56px activity rail. `SidebarPanel` defines a 320px inspector with a left border, vertical scrolling, and compact typography. The implementation uses those dimensions and the app's existing ScalarInter font and theme tokens, with a page tree, central document/feed, and right inspector. The Fontes controls replace documentation-specific code, Git and publishing features. This is a functional adaptation, not a verified pixel-identical replica of the entire Scalar editor.

## Validation

Production build passes. Lint completes with existing warnings outside the new component. Browser checks covered creation, title/description editing, topic selection, saving and reloading, duplicate/remove/undo, live filtered news, and a 390px mobile viewport.
