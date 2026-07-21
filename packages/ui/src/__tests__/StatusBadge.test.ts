import { describe, it, expect, afterEach } from 'vitest';
import { StatusBadge } from '../display/StatusBadge.uix';
import { mountComponent } from './mount';

// TEST-001 pilot #1: proves the harness on the simplest possible case
// (no state, no async, pure props-in/DOM-out) before trusting it on the
// harder pilots (DataTable, Modal). Per Article 17, still covers the
// non-obvious edge (missing type prop) rather than only the labelled path.

let cleanup: (() => void) | null = null;
afterEach(() => {
  cleanup?.();
  cleanup = null;
});

describe('StatusBadge', () => {
  it('renders the label with the given type as a CSS class', () => {
    const { container, unmount } = mountComponent(StatusBadge, { label: 'Active', type: 'success' });
    cleanup = unmount;

    const badge = container.querySelector('.alp-badge');
    expect(badge).not.toBeNull();
    expect(badge?.textContent?.trim()).toBe('Active');
    expect(badge?.className).toContain('alp-badge--success');
  });

  it('falls back to the neutral type when type is omitted', () => {
    const { container, unmount } = mountComponent(StatusBadge, { label: 'Draft' });
    cleanup = unmount;

    const badge = container.querySelector('.alp-badge');
    expect(badge?.className).toContain('alp-badge--neutral');
  });

  it('renders an empty label rather than the literal string "undefined"', () => {
    const { container, unmount } = mountComponent(StatusBadge, { type: 'info' } as never);
    cleanup = unmount;

    const badge = container.querySelector('.alp-badge');
    expect(badge?.textContent?.trim()).toBe('');
  });
});
