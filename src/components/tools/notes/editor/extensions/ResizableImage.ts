import Image from "@tiptap/extension-image";

/**
 * Image node enrichi : conserve un attribut `width` (px) et fournit une
 * NodeView avec une poignée de redimensionnement bottom-right (style Notion).
 * Tant qu'aucune `width` explicite n'est fixée, l'image rend en taille
 * naturelle bornée par la CSS (`.tyrolabs-rte-content img` — `max-width: 100%`,
 * `max-height: 360px`). Une fois redimensionnée, la valeur est persistée
 * dans le JSON TipTap via `setNodeAttribute`.
 *
 * Surcharge le node `image` du package officiel — toute insertion existante
 * (paste, "Ajouter à une note", commande TipTap) bénéficie automatiquement
 * de la NodeView : pas besoin de toucher aux flots d'insertion.
 */
export const ResizableImage = Image.extend({
  name: "image",

  addAttributes() {
    const parent = this.parent?.() ?? {};
    return {
      ...parent,
      width: {
        default: null as number | null,
        parseHTML: (el) => {
          const attr = el.getAttribute("width");
          if (attr) {
            const n = parseInt(attr, 10);
            return Number.isFinite(n) && n > 0 ? n : null;
          }
          // Fallback : style inline `width: NNNpx`.
          const inline = (el as HTMLElement).style?.width;
          if (inline && inline.endsWith("px")) {
            const n = parseInt(inline, 10);
            return Number.isFinite(n) && n > 0 ? n : null;
          }
          return null;
        },
        renderHTML: (attrs) => {
          if (!attrs.width) return {};
          return { width: String(attrs.width) };
        },
      },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const wrapper = document.createElement("span");
      wrapper.className = "tyrolabs-resizable-image";

      const img = document.createElement("img");
      img.src = node.attrs.src ?? "";
      if (node.attrs.alt) img.alt = node.attrs.alt;
      if (node.attrs.title) img.title = node.attrs.title;
      if (node.attrs.width) img.style.width = `${node.attrs.width}px`;

      const handle = document.createElement("span");
      handle.className = "tyrolabs-resize-handle";
      handle.setAttribute("contenteditable", "false");

      wrapper.appendChild(img);
      wrapper.appendChild(handle);

      // ── Resize gesture ───────────────────────────────────────────────
      let startX = 0;
      let startWidth = 0;
      let activePointerId: number | null = null;

      const onPointerMove = (e: PointerEvent) => {
        if (e.pointerId !== activePointerId) return;
        const dx = e.clientX - startX;
        const next = Math.max(60, Math.round(startWidth + dx));
        img.style.width = `${next}px`;
      };

      const onPointerUp = (e: PointerEvent) => {
        if (e.pointerId !== activePointerId) return;
        wrapper.classList.remove("is-resizing");
        try {
          handle.releasePointerCapture(e.pointerId);
        } catch {
          /* already released */
        }
        handle.removeEventListener("pointermove", onPointerMove);
        handle.removeEventListener("pointerup", onPointerUp);
        handle.removeEventListener("pointercancel", onPointerUp);
        activePointerId = null;

        // Persist final width into the document so it survives reloads.
        const pos = typeof getPos === "function" ? getPos() : null;
        if (pos == null) return;
        const finalWidth = img.offsetWidth;
        editor
          .chain()
          .command(({ tr }) => {
            tr.setNodeAttribute(pos, "width", finalWidth);
            return true;
          })
          .run();
      };

      handle.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        activePointerId = e.pointerId;
        startX = e.clientX;
        startWidth = img.offsetWidth;
        wrapper.classList.add("is-resizing");
        try {
          handle.setPointerCapture(e.pointerId);
        } catch {
          /* unsupported — fallback to global listeners */
        }
        handle.addEventListener("pointermove", onPointerMove);
        handle.addEventListener("pointerup", onPointerUp);
        handle.addEventListener("pointercancel", onPointerUp);
      });

      return {
        dom: wrapper,
        update(updated) {
          if (updated.type.name !== "image") return false;
          if (updated.attrs.src !== img.src) {
            img.src = updated.attrs.src ?? "";
          }
          img.alt = updated.attrs.alt ?? "";
          if (updated.attrs.title) img.title = updated.attrs.title;
          else img.removeAttribute("title");
          if (updated.attrs.width) {
            img.style.width = `${updated.attrs.width}px`;
          } else {
            img.style.width = "";
          }
          return true;
        },
        destroy() {
          handle.removeEventListener("pointermove", onPointerMove);
          handle.removeEventListener("pointerup", onPointerUp);
          handle.removeEventListener("pointercancel", onPointerUp);
        },
      };
    };
  },
});
