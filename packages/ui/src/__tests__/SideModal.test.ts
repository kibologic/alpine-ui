import { describe, it, expect, afterEach, vi } from 'vitest';
import { SideModal } from '../feedback/SideModal.uix';
import { mountComponent } from './mount';

// UI-MODAL-001: SideModal was the platform's mandated data-form primitive (a standing directive
// says data forms use the right-side drawer, not a centre modal) and the least hardened of the
// three overlays -- no focus capture/restore, no ids, no ARIA, and a window-level Escape handler
// guarded only by `this.props.open`, so on pages that mount 2-3 drawers at once
// (StockTransfersPage, InventoryCategoriesPage, OutletsPage) one Escape press closed every open
// instance simultaneously. Brought to parity with Modal.uix (focus capture/restore, generated
// stable ids, role="dialog"/aria-modal) plus a fix Modal.uix doesn't need: per-instance Escape
// scoping via a shared open-stack, so Escape closes only the topmost drawer.

let cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups = [];
});

describe('SideModal', () => {
  it('never returns null when closed -- the drawer node persists, hidden via CSS only', () => {
    const { container, instance, unmount } = mountComponent(SideModal, { open: true, title: 'X' });
    cleanups.push(unmount);

    instance.props.open = false;
    instance.performUpdate();

    const drawer = container.querySelector('.alp-side-modal') as HTMLElement;
    expect(drawer, 'the drawer element must still be in the DOM when closed').not.toBeNull();
    expect(drawer.className).not.toContain('alp-side-modal--open');
  });

  it('renders ARIA dialog semantics with a generated id, unique per instance', () => {
    const a = mountComponent(SideModal, { open: true, title: 'Drawer A' });
    const b = mountComponent(SideModal, { open: true, title: 'Drawer B' });
    cleanups.push(a.unmount, b.unmount);

    const drawerA = a.container.querySelector('.alp-side-modal') as HTMLElement;
    const drawerB = b.container.querySelector('.alp-side-modal') as HTMLElement;

    expect(drawerA.getAttribute('role')).toBe('dialog');
    expect(drawerA.getAttribute('aria-modal')).toBe('true');
    const labelledBy = drawerA.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(a.container.querySelector(`#${labelledBy}`)?.textContent).toBe('Drawer A');

    // Two mounted instances must not collide on the same generated id (a hardcoded id here
    // would duplicate across every mounted SideModal and break aria-labelledby for all but one).
    expect(drawerB.getAttribute('aria-labelledby')).not.toBe(labelledBy);
  });

  it('restores focus to the previously-focused element on close', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { instance, unmount } = mountComponent(SideModal, { open: true, title: 'X' });
    cleanups.push(unmount);

    // Simulate focus having moved into the drawer while open.
    const inside = document.createElement('input');
    document.body.appendChild(inside);
    inside.focus();

    instance.props.open = false;
    instance.performUpdate();

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
    inside.remove();
  });

  it('calls onclose on Escape when open', () => {
    const onclose = vi.fn();
    const { unmount } = mountComponent(SideModal, { open: true, title: 'X', onclose });
    cleanups.push(unmount);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onclose).toHaveBeenCalledTimes(1);
  });

  it('does not call onclose on Escape when closed', () => {
    const onclose = vi.fn();
    const { unmount } = mountComponent(SideModal, { open: false, title: 'X', onclose });
    cleanups.push(unmount);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onclose).not.toHaveBeenCalled();
  });

  it('THE REPRODUCTION: with two stacked drawers open, Escape closes only the topmost one', () => {
    const oncloseFirst = vi.fn();
    const oncloseSecond = vi.fn();

    // First drawer opens (e.g. "Edit outlet"), then a second opens on top of it
    // (e.g. "Add category" launched from within the first) -- both legitimately open at once,
    // exactly the StockTransfersPage/InventoryCategoriesPage/OutletsPage shape the finding cites.
    const first = mountComponent(SideModal, { open: true, title: 'First', onclose: oncloseFirst });
    cleanups.push(first.unmount);
    const second = mountComponent(SideModal, { open: true, title: 'Second', onclose: oncloseSecond });
    cleanups.push(second.unmount);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(oncloseSecond, 'the topmost (most recently opened) drawer should close').toHaveBeenCalledTimes(1);
    expect(oncloseFirst, 'the drawer underneath must NOT also close on the same Escape press').not.toHaveBeenCalled();
  });

  it('after the topmost drawer closes, a second Escape press closes the next one down', () => {
    const oncloseFirst = vi.fn();
    const oncloseSecond = vi.fn();

    const first = mountComponent(SideModal, { open: true, title: 'First', onclose: oncloseFirst });
    cleanups.push(first.unmount);
    const second = mountComponent(SideModal, { open: true, title: 'Second', onclose: oncloseSecond });
    cleanups.push(second.unmount);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(oncloseSecond).toHaveBeenCalledTimes(1);

    // Caller reacts to onclose by setting open=false on the second drawer.
    second.instance.props.open = false;
    second.instance.performUpdate();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(oncloseFirst, 'now that the topmost drawer is closed, the next Escape reaches the one underneath').toHaveBeenCalledTimes(1);
  });
});
