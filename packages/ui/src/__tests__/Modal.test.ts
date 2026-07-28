import { describe, it, expect, afterEach, vi } from 'vitest';
import { Modal } from '../feedback/Modal.uix';
import { mountComponent } from './mount';

// TEST-001 pilot #2: conditional visibility without conditional mount/unmount.
// Modal.uix's render() deliberately never `return null`s when closed -- its
// own comment documents this as a workaround for a real, reproduced
// framework defect (repeated null-return placeholder-swap corrupting a
// sibling's DOM commits). The single most valuable thing to test here is
// that invariant itself: the dialog node must persist across open/close,
// visibility toggled by CSS only. If a future edit "simplifies" this back to
// `if (!open) return null`, this test is what catches it.

let cleanup: (() => void) | null = null;
afterEach(() => {
  cleanup?.();
  cleanup = null;
});

describe('Modal', () => {
  it('renders the backdrop visible with title and body when open', () => {
    const { container, unmount } = mountComponent(Modal, {
      open: true,
      title: 'Confirm',
      renderBody: () => 'Are you sure?',
    });
    cleanup = unmount;

    const backdrop = container.querySelector('.alp-modal-backdrop') as HTMLElement;
    expect(backdrop).not.toBeNull();
    expect(backdrop.style.display).toBe('flex');
    expect(container.querySelector('.alp-modal-title')?.textContent).toBe('Confirm');
  });

  it('keeps the backdrop node in the DOM when closed, only hidden via CSS', () => {
    const { container, instance, unmount } = mountComponent(Modal, { open: true, title: 'X' });
    cleanup = unmount;

    instance.props.open = false;
    instance.performUpdate();

    // Never removed -- this is the actual contract under test, not just "is it invisible".
    const backdrop = container.querySelector('.alp-modal-backdrop') as HTMLElement;
    expect(backdrop).not.toBeNull();
    expect(backdrop.style.display).toBe('none');
  });

  it('calls onclose on Escape when open and not hideClose', () => {
    const onclose = vi.fn();
    const { unmount } = mountComponent(Modal, { open: true, title: 'X', onclose });
    cleanup = unmount;

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onclose).toHaveBeenCalledTimes(1);
  });

  it('does not call onclose on Escape when hideClose is true', () => {
    const onclose = vi.fn();
    const { unmount } = mountComponent(Modal, { open: true, title: 'X', onclose, hideClose: true });
    cleanup = unmount;

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onclose).not.toHaveBeenCalled();
  });

  it('closes on backdrop click but not on dialog click, and never when hideClose', () => {
    const onclose = vi.fn();
    const { container, unmount } = mountComponent(Modal, { open: true, title: 'X', onclose });
    cleanup = unmount;

    const dialog = container.querySelector('.alp-modal') as HTMLElement;
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onclose).not.toHaveBeenCalled();

    const backdrop = container.querySelector('.alp-modal-backdrop') as HTMLElement;
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onclose).toHaveBeenCalledTimes(1);
  });
});
