/**
 * Minimal floating popup helper (replaces tippy.js).
 *
 * Renders a fixed-position element near a reference rect, with viewport-aware
 * placement. Sufficient for slash menu and bubble menus — not a full
 * positioning engine, no flip/shift logic beyond simple bottom/top fallback.
 */

interface CreateOptions {
  getReferenceClientRect: () => DOMRect;
  content: HTMLElement;
  offset?: number;
}

interface FloatingPopup {
  update: (options: Partial<CreateOptions>) => void;
  destroy: () => void;
}

function position(el: HTMLElement, rect: DOMRect, offset: number) {
  const margin = 8;
  const elRect = el.getBoundingClientRect();
  let top = rect.bottom + offset;
  if (top + elRect.height > window.innerHeight - margin) {
    top = rect.top - elRect.height - offset;
  }
  let left = rect.left;
  if (left + elRect.width > window.innerWidth - margin) {
    left = window.innerWidth - margin - elRect.width;
  }
  if (left < margin) left = margin;
  el.style.top = `${Math.max(margin, top)}px`;
  el.style.left = `${left}px`;
}

function create(options: CreateOptions): FloatingPopup {
  const { content } = options;
  const offset = options.offset ?? 6;
  let getRect = options.getReferenceClientRect;
  let destroyed = false;

  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.zIndex = "9999";
  wrapper.style.top = "0";
  wrapper.style.left = "0";
  wrapper.appendChild(content);
  document.body.appendChild(wrapper);

  // Positionnement après attachement DOM (mesure correcte de elRect).
  const apply = () => {
    if (destroyed) return;
    position(wrapper, getRect(), offset);
  };
  requestAnimationFrame(apply);

  const onScroll = () => apply();
  window.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", onScroll);

  return {
    update(next) {
      if (next.getReferenceClientRect) getRect = next.getReferenceClientRect;
      apply();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      wrapper.remove();
    },
  };
}

export default { create };
