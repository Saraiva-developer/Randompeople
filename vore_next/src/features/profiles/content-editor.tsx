"use client";

import { useMemo, useState } from "react";
import {
  FIELDS_BY_KIND,
  KIND_LABELS,
  blankItem,
  blankSection
} from "@/features/profiles/editor-model";
import type {
  ContentKind,
  EditorItem,
  EditorSection,
  EditorState,
  EditorTab,
  FieldDef
} from "@/features/profiles/editor-model";

function ItemFields({
  kind,
  item,
  onChange
}: {
  kind: ContentKind;
  item: EditorItem;
  onChange: (patch: EditorItem) => void;
}) {
  function renderField(field: FieldDef) {
    const value = item[field.key];

    if (field.type === "toggle") {
      return (
        <label className="ced-toggle" key={field.key}>
          <input
            type="checkbox"
            checked={!!value}
            onChange={(event) => onChange({ [field.key]: event.target.checked })}
          />
          <span>{field.label}</span>
        </label>
      );
    }

    if (field.type === "select") {
      return (
        <label className="field ced-field" key={field.key}>
          <span>{field.label}</span>
          <select
            className="input"
            value={String(value || "")}
            onChange={(event) => onChange({ [field.key]: event.target.value })}
          >
            {(field.options || []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      );
    }

    if (field.type === "list") {
      const lines = Array.isArray(value) ? value : [];
      return (
        <label className="field ced-field ced-field-full" key={field.key}>
          <span>{field.label}</span>
          <textarea
            className="input field-textarea"
            rows={3}
            value={lines.join("\n")}
            onChange={(event) =>
              onChange({
                [field.key]: event.target.value
                  .split(/\r?\n/)
                  .map((entry) => entry.trim())
                  .filter(Boolean)
              })
            }
          />
        </label>
      );
    }

    if (field.type === "textarea") {
      return (
        <label className="field ced-field ced-field-full" key={field.key}>
          <span>{field.label}</span>
          <textarea
            className="input field-textarea"
            rows={3}
            value={String(value || "")}
            placeholder={field.placeholder}
            onChange={(event) => onChange({ [field.key]: event.target.value })}
          />
        </label>
      );
    }

    return (
      <label
        className={`field ced-field${field.full ? " ced-field-full" : ""}`}
        key={field.key}
      >
        <span>
          {field.label}
          {field.type === "price" ? " (€)" : ""}
        </span>
        <input
          className="input"
          type="text"
          value={String(value || "")}
          placeholder={field.placeholder}
          onChange={(event) => onChange({ [field.key]: event.target.value })}
        />
      </label>
    );
  }

  const promoOn = !!item.promoEnabled;
  const fields = FIELDS_BY_KIND[kind].filter((field) => {
    // Promo prices only matter when the promo toggle is on.
    if ((field.key === "promoOldPrice" || field.key === "promoNowPrice") && !promoOn) return false;
    // A budget-priced service has no fixed price.
    if (field.key === "price" && kind === "servicos" && item.priceMode === "budget") return false;
    return true;
  });

  return <div className="ced-fields">{fields.map(renderField)}</div>;
}

function SectionEditor({
  kind,
  section,
  index,
  total,
  onChange,
  onRemove,
  onMove
}: {
  kind: ContentKind;
  section: EditorSection;
  index: number;
  total: number;
  onChange: (next: EditorSection) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const [openItem, setOpenItem] = useState<number | null>(0);

  function updateItem(itemIndex: number, patch: EditorItem) {
    onChange({
      ...section,
      items: section.items.map((item, idx) => (idx === itemIndex ? { ...item, ...patch } : item))
    });
  }

  function removeItem(itemIndex: number) {
    const next = section.items.filter((_, idx) => idx !== itemIndex);
    onChange({ ...section, items: next.length ? next : [blankItem(kind)] });
    setOpenItem(null);
  }

  function moveItem(itemIndex: number, direction: -1 | 1) {
    const target = itemIndex + direction;
    if (target < 0 || target >= section.items.length) return;
    const next = section.items.slice();
    const [picked] = next.splice(itemIndex, 1);
    next.splice(target, 0, picked);
    onChange({ ...section, items: next });
    setOpenItem(target);
  }

  function itemTitle(item: EditorItem, itemIndex: number) {
    const label =
      String(item.name || item.description || item.title || "").trim() ||
      `Item ${itemIndex + 1}`;
    return label;
  }

  return (
    <section className={`ced-section${section.enabled ? "" : " is-off"}`}>
      <header className="ced-section-head">
        <input
          className="input ced-section-name"
          value={section.label}
          aria-label="Nome da secção"
          onChange={(event) => onChange({ ...section, label: event.target.value })}
        />
        <div className="ced-section-actions">
          <label className="ced-toggle">
            <input
              type="checkbox"
              checked={section.enabled}
              onChange={(event) => onChange({ ...section, enabled: event.target.checked })}
            />
            <span>Visível</span>
          </label>
          <button type="button" aria-label="Mover para cima" disabled={index === 0} onClick={() => onMove(-1)}>
            ↑
          </button>
          <button
            type="button"
            aria-label="Mover para baixo"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            ↓
          </button>
          <button type="button" className="ced-danger" onClick={onRemove}>
            Remover
          </button>
        </div>
      </header>

      <div className="ced-items">
        {section.items.map((item, itemIndex) => {
          const open = openItem === itemIndex;
          return (
            <article className={`ced-item${item.enabled === false ? " is-off" : ""}`} key={itemIndex}>
              <header className="ced-item-head">
                <button
                  type="button"
                  className="ced-item-toggle"
                  aria-expanded={open}
                  onClick={() => setOpenItem(open ? null : itemIndex)}
                >
                  <span className="ced-item-caret">{open ? "▾" : "▸"}</span>
                  <span className="ced-item-title">{itemTitle(item, itemIndex)}</span>
                  {item.promoEnabled ? <span className="pnt-promo-badge">PROMO</span> : null}
                </button>
                <div className="ced-item-actions">
                  <label className="ced-toggle">
                    <input
                      type="checkbox"
                      checked={item.enabled !== false}
                      onChange={(event) => updateItem(itemIndex, { enabled: event.target.checked })}
                    />
                    <span>Visível</span>
                  </label>
                  <button
                    type="button"
                    aria-label="Mover item para cima"
                    disabled={itemIndex === 0}
                    onClick={() => moveItem(itemIndex, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Mover item para baixo"
                    disabled={itemIndex === section.items.length - 1}
                    onClick={() => moveItem(itemIndex, 1)}
                  >
                    ↓
                  </button>
                  <button type="button" className="ced-danger" onClick={() => removeItem(itemIndex)}>
                    Remover
                  </button>
                </div>
              </header>

              {open ? (
                <ItemFields kind={kind} item={item} onChange={(patch) => updateItem(itemIndex, patch)} />
              ) : null}
            </article>
          );
        })}
      </div>

      <button
        type="button"
        className="ced-add-btn"
        onClick={() => {
          onChange({ ...section, items: [...section.items, blankItem(kind)] });
          setOpenItem(section.items.length);
        }}
      >
        + Adicionar item
      </button>
    </section>
  );
}

export function ProfileContentEditor({
  kinds,
  initialState
}: {
  kinds: ContentKind[];
  initialState: EditorState;
}) {
  const [tabs, setTabs] = useState<EditorTab[]>(initialState.tabs);
  const [content, setContent] = useState(initialState.content);
  const [activeKind, setActiveKind] = useState<ContentKind | "tabs">(kinds[0] || "tabs");

  const serialized = useMemo(() => JSON.stringify({ tabs, content }), [tabs, content]);

  function updateSections(kind: ContentKind, next: EditorSection[]) {
    setContent((current) => ({ ...current, [kind]: next }));
  }

  function moveTab(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= tabs.length) return;
    setTabs((current) => {
      const next = current.slice();
      const [picked] = next.splice(index, 1);
      next.splice(target, 0, picked);
      return next;
    });
  }

  const sections = activeKind === "tabs" ? [] : content[activeKind] || [];

  return (
    <div className="edit-section-card profile-editor-block">
      <input type="hidden" name="editorState" value={serialized} />

      <div className="edit-section-header">
        <div>
          <h4 className="edit-section-title">Conteúdo do perfil</h4>
          <p className="edit-section-caption muted">
            Organiza as abas, as secções e os itens que aparecem na página pública.
          </p>
        </div>
      </div>

      <div className="chips edit-tabs-row">
        <button
          type="button"
          className={activeKind === "tabs" ? "active" : ""}
          onClick={() => setActiveKind("tabs")}
        >
          Abas
        </button>
        {kinds.map((kind) => (
          <button
            key={kind}
            type="button"
            className={activeKind === kind ? "active" : ""}
            onClick={() => setActiveKind(kind)}
          >
            {KIND_LABELS[kind]}
          </button>
        ))}
      </div>

      {activeKind === "tabs" ? (
        <div className="ced-tabs-list">
          <p className="edit-section-caption muted">
            Desliga as abas que não queres mostrar e ordena-as como preferires.
          </p>
          {tabs.map((tab, index) => (
            <div className={`ced-tab-row${tab.enabled ? "" : " is-off"}`} key={tab.id}>
              <input
                className="input ced-tab-label"
                value={tab.label}
                aria-label={`Nome da aba ${tab.label}`}
                onChange={(event) =>
                  setTabs((current) =>
                    current.map((entry, idx) =>
                      idx === index ? { ...entry, label: event.target.value } : entry
                    )
                  )
                }
              />
              <div className="ced-section-actions">
                <label className="ced-toggle">
                  <input
                    type="checkbox"
                    checked={tab.enabled}
                    onChange={(event) =>
                      setTabs((current) =>
                        current.map((entry, idx) =>
                          idx === index ? { ...entry, enabled: event.target.checked } : entry
                        )
                      )
                    }
                  />
                  <span>Visível</span>
                </label>
                <button
                  type="button"
                  aria-label="Mover aba para cima"
                  disabled={index === 0}
                  onClick={() => moveTab(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Mover aba para baixo"
                  disabled={index === tabs.length - 1}
                  onClick={() => moveTab(index, 1)}
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {sections.map((section, index) => (
            <SectionEditor
              key={section.id}
              kind={activeKind}
              section={section}
              index={index}
              total={sections.length}
              onChange={(next) =>
                updateSections(
                  activeKind,
                  sections.map((entry, idx) => (idx === index ? next : entry))
                )
              }
              onRemove={() =>
                updateSections(
                  activeKind,
                  sections.filter((_, idx) => idx !== index)
                )
              }
              onMove={(direction) => {
                const target = index + direction;
                if (target < 0 || target >= sections.length) return;
                const next = sections.slice();
                const [picked] = next.splice(index, 1);
                next.splice(target, 0, picked);
                updateSections(activeKind, next);
              }}
            />
          ))}

          <button
            type="button"
            className="ced-add-btn ced-add-section"
            onClick={() =>
              updateSections(activeKind, [...sections, blankSection(activeKind, sections.length)])
            }
          >
            + Adicionar secção
          </button>
        </>
      )}
    </div>
  );
}
