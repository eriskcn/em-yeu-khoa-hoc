// Small fixed-position context menu. items: [{id, label, disabled?}].
const CSS = `.cm-menu{position:fixed;z-index:1000;min-width:160px;background:#232323;color:#e2e8f0;border:1px solid #444;border-radius:6px;padding:4px 0;font:14px system-ui,sans-serif;box-shadow:0 4px 12px #0008}
.cm-item{display:flex;align-items:center;width:100%;min-height:44px;padding:0 12px;background:none;border:0;color:inherit;font:inherit;text-align:left;cursor:pointer}
.cm-item:hover:not(:disabled),.cm-item:focus-visible{background:#2563eb;outline:none}
.cm-item:disabled{opacity:.4;cursor:default}`;

export function createContextMenu(root, {onPick}) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  const menu = document.createElement('div');
  menu.className = 'cm-menu';
  menu.setAttribute('role', 'menu');
  menu.hidden = true;
  root.append(menu);

  const enabled = () => [...menu.querySelectorAll('.cm-item:not(:disabled)')];
  const focusStep = d => {
    const els = enabled();
    if (!els.length) return;
    const i = els.indexOf(document.activeElement);
    els[(i + d + els.length) % els.length].focus();
  };

  function hide() {
    if (menu.hidden) return;
    menu.hidden = true;
    menu.replaceChildren();
    document.removeEventListener('pointerdown', onOutside, true);
  }
  function onOutside(e) { if (!menu.contains(e.target)) hide(); }

  menu.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); hide(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); focusStep(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusStep(-1); }
    // Enter/Space activate the focused <button> natively via click.
  });
  // Dismiss when focus leaves the menu entirely.
  menu.addEventListener('focusout', e => { if (!menu.contains(e.relatedTarget)) hide(); });

  function show(x, y, items) {
    hide();
    for (const it of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cm-item';
      b.setAttribute('role', 'menuitem');
      b.textContent = it.label;
      b.disabled = !!it.disabled;
      b.addEventListener('click', () => { hide(); onPick(it.id); });
      menu.append(b);
    }
    menu.hidden = false;
    // Keep inside the viewport.
    menu.style.left = menu.style.top = '0px';
    const r = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(0, Math.min(x, innerWidth - r.width))}px`;
    menu.style.top = `${Math.max(0, Math.min(y, innerHeight - r.height))}px`;
    document.addEventListener('pointerdown', onOutside, true);
    focusStep(1);
  }

  return {show, hide};
}
