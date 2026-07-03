"use client";

import { useMemo, useState } from "react";

type ContentItem = {
  id: string;
  name: string;
  price: string;
  description: string;
  imageUrl: string;
};

type ContentBlock = {
  name: string;
  label: string;
  placeholder: string;
  initialLines: string;
};

function blankItem(): ContentItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    price: "",
    description: "",
    imageUrl: ""
  };
}

function parseLines(lines: string) {
  return String(lines || "")
    .split(/\r?\n/)
    .map((line) => {
      const [name, price, description, imageUrl] = line.split("|").map((part) => part.trim());
      if (!name) return null;

      return {
        id: crypto.randomUUID(),
        name,
        price: price || "",
        description: description || "",
        imageUrl: imageUrl || ""
      };
    })
    .filter(Boolean) as ContentItem[];
}

function serializeItems(items: ContentItem[]) {
  return items
    .map((item) =>
      [item.name, item.price, item.description, item.imageUrl]
        .map((value) => String(value || "").replace(/\s*\|\s*/g, " ").trim())
        .join(" | ")
    )
    .filter((line) => line.replace(/\s|\|/g, ""))
    .join("\n");
}

function ContentBlockEditor({ block }: { block: ContentBlock }) {
  const [items, setItems] = useState<ContentItem[]>(() => {
    const parsed = parseLines(block.initialLines);
    return parsed.length ? parsed : [blankItem()];
  });

  const serialized = useMemo(() => serializeItems(items), [items]);

  function updateItem(id: string, patch: Partial<ContentItem>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function removeItem(id: string) {
    setItems((current) => {
      const next = current.filter((item) => item.id !== id);
      return next.length ? next : [blankItem()];
    });
  }

  function moveItem(id: string, direction: -1 | 1) {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;

      const next = current.slice();
      const [picked] = next.splice(index, 1);
      next.splice(nextIndex, 0, picked);
      return next;
    });
  }

  return (
    <section className="content-editor-block">
      <input type="hidden" name={block.name} value={serialized} />

      <div className="content-editor-block-head">
        <h3>{block.label}</h3>
        <button type="button" onClick={() => setItems((current) => [...current, blankItem()])}>
          + Item
        </button>
      </div>

      <div className="content-editor-cards">
        {items.map((item, index) => (
          <article className="content-editor-card" key={item.id}>
            <div className="content-editor-card-head">
              <span>{index + 1}</span>
              <div className="content-editor-card-actions">
                <button
                  type="button"
                  aria-label="Mover para cima"
                  title="Mover para cima"
                  onClick={() => moveItem(item.id, -1)}
                  disabled={index === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Mover para baixo"
                  title="Mover para baixo"
                  onClick={() => moveItem(item.id, 1)}
                  disabled={index === items.length - 1}
                >
                  ↓
                </button>
                <button type="button" onClick={() => removeItem(item.id)}>
                  Remover
                </button>
              </div>
            </div>

            <div className="content-editor-grid">
              <label className="field">
                <span>Nome</span>
                <input
                  type="text"
                  value={item.name}
                  placeholder={block.placeholder}
                  onChange={(event) => updateItem(item.id, { name: event.target.value })}
                />
              </label>

              <label className="field">
                <span>Preco (€)</span>
                <input
                  type="text"
                  value={item.price}
                  placeholder="45 €"
                  onChange={(event) => updateItem(item.id, { price: event.target.value })}
                />
              </label>
            </div>

            <label className="field">
              <span>Descricao</span>
              <textarea
                className="field-textarea content-editor-description"
                value={item.description}
                placeholder="Descricao curta do item"
                rows={3}
                onChange={(event) => updateItem(item.id, { description: event.target.value })}
              />
            </label>

            <label className="field">
              <span>Imagem URL</span>
              <input
                type="url"
                value={item.imageUrl}
                placeholder="https://..."
                onChange={(event) => updateItem(item.id, { imageUrl: event.target.value })}
              />
            </label>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ProfileContentEditor({ blocks }: { blocks: ContentBlock[] }) {
  const [activeBlock, setActiveBlock] = useState(blocks[0]?.name || "");
  const selectedBlock = blocks.find((block) => block.name === activeBlock) || blocks[0];

  return (
    <div className="edit-section-card profile-editor-block">
      <div className="edit-section-header">
        <div>
          <h4 className="edit-section-title">Abas do perfil</h4>
          <p className="edit-section-caption muted">
            Edita os itens que aparecem na pagina publica.
          </p>
        </div>
      </div>

      <div className="chips edit-tabs-row">
        {blocks.map((block) => (
          <button
            key={block.name}
            className={selectedBlock?.name === block.name ? "active" : ""}
            type="button"
            onClick={() => setActiveBlock(block.name)}
          >
            {block.label}
          </button>
        ))}
      </div>

      {blocks.map((block) => (
        <div hidden={selectedBlock?.name !== block.name} key={block.name}>
          <ContentBlockEditor block={block} />
        </div>
      ))}
    </div>
  );
}
