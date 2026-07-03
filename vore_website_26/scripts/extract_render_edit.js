const fs = require("fs");
const path = require("path");

const root = "C:/xampp/htdocs/vore/vore_website_26";
const appPath = path.join(root, "js", "app.js");
const modulePath = path.join(root, "js", "ui", "editScreen.js");

let app = fs.readFileSync(appPath, "utf8");

const startMarker = "function renderEdit() {";
const endMarker = "\nfunction renderAll() {";
const start = app.indexOf(startMarker);
const end = app.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error("renderEdit block not found");

const fnBlock = app.slice(start, end);
const bodyStart = fnBlock.indexOf("{");
const bodyEnd = fnBlock.lastIndexOf("}");
if (bodyStart < 0 || bodyEnd < 0 || bodyEnd <= bodyStart) throw new Error("invalid renderEdit block");
const fnBody = fnBlock.slice(bodyStart + 1, bodyEnd);

const moduleSrc = `export function renderEditScreen(ctx) {
  const {
    state,
    setState,
    el,
    editor,
    selectedProfile,
    renderProfile,
    getTabsForProfile,
    isSimpleEditTab,
    getDraftSections,
    setDraftSections,
    PROFILE_CATEGORY_OPTIONS,
    PROFILE_TYPE_OPTIONS,
    PROFILE_TYPE_LABEL,
    esc,
    sanitizeRichHtml,
    renderSimpleEditTab,
    renderEditItemCard,
    bindEditTopEvents,
    bindSimpleEditTabEvents,
    slugify,
    blankItem,
    isEditItemCollapsed,
    setEditItemCollapsed,
    isEnabledFlag,
    openItemModal,
    deepClone,
    getMergedItemImages,
    applyMergedItemImages,
    readFileAsDataUrl,
    toArrayList,
    saveEditDraft,
  } = ctx || {};
${fnBody}
}
`;

fs.writeFileSync(modulePath, moduleSrc, "utf8");

if (!app.includes('from "./ui/editScreen.js"')) {
  const anchor = 'import { bindSimpleEditTabEventsUi } from "./ui/editSimpleTab.js";';
  if (!app.includes(anchor)) throw new Error("editSimpleTab import anchor not found");
  app = app.replace(anchor, anchor + '\nimport { renderEditScreen } from "./ui/editScreen.js";');
}

const wrapper = `function renderEdit() {
  return renderEditScreen({
    state,
    setState,
    el,
    editor,
    selectedProfile,
    renderProfile,
    getTabsForProfile,
    isSimpleEditTab,
    getDraftSections,
    setDraftSections,
    PROFILE_CATEGORY_OPTIONS,
    PROFILE_TYPE_OPTIONS,
    PROFILE_TYPE_LABEL,
    esc,
    sanitizeRichHtml,
    renderSimpleEditTab,
    renderEditItemCard,
    bindEditTopEvents,
    bindSimpleEditTabEvents,
    slugify,
    blankItem,
    isEditItemCollapsed,
    setEditItemCollapsed,
    isEnabledFlag,
    openItemModal,
    deepClone,
    getMergedItemImages,
    applyMergedItemImages,
    readFileAsDataUrl,
    toArrayList,
    saveEditDraft,
  });
}`;

app = app.slice(0, start) + wrapper + app.slice(end);
fs.writeFileSync(appPath, app, "utf8");
console.log("ok");
