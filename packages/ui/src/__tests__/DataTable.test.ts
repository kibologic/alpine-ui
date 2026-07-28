import { describe, it, expect, afterEach, vi } from 'vitest';
import { DataTable } from '../data/DataTable.uix';
import { mountComponent } from './mount';

// TEST-001 pilot #3: the loading -> loaded transition. Per the task's own
// framing this is "the exact shape of the platform's most persistent bug
// class" (the stuck-loading investigation, registry/fable/loading-state/) --
// a page whose fetch resolves but the DOM never leaves the skeleton state.
// This test exercises the same shape DataTable's own consumers hit: mount
// loading, flip loading off with real rows, and assert the skeleton is gone
// and real data is on screen -- not just that `loading` became false.

const COLUMNS = [{ key: 'name', label: 'Name' }];

let cleanup: (() => void) | null = null;
afterEach(() => {
  cleanup?.();
  cleanup = null;
});

describe('DataTable', () => {
  it('renders skeleton rows while loading, no data rows', () => {
    const { container, unmount } = mountComponent(DataTable, {
      columns: COLUMNS,
      rows: [],
      loading: true,
    });
    cleanup = unmount;

    expect(container.querySelectorAll('.alp-dt-skeleton').length).toBeGreaterThan(0);
    expect(container.querySelector('.alp-dt-empty')).toBeNull();
  });

  it('transitions from skeleton to real rows when loading resolves with data', () => {
    const { container, instance, unmount } = mountComponent(DataTable, {
      columns: COLUMNS,
      rows: [],
      loading: true,
    });
    cleanup = unmount;

    instance.props.loading = false;
    instance.props.rows = [{ name: 'Acme Supplies' }, { name: 'Verify Buyer Co' }];
    instance.performUpdate();

    expect(container.querySelectorAll('.alp-dt-skeleton').length).toBe(0);
    const cells = Array.from(container.querySelectorAll('.alp-dt-td')).map((el) => el.textContent);
    expect(cells).toContain('Acme Supplies');
    expect(cells).toContain('Verify Buyer Co');
  });

  it('shows the empty state, not skeletons, when loading resolves with zero rows', () => {
    const { container, instance, unmount } = mountComponent(DataTable, {
      columns: COLUMNS,
      rows: [],
      loading: true,
      emptyTitle: 'No suppliers yet',
    });
    cleanup = unmount;

    instance.props.loading = false;
    instance.performUpdate();

    expect(container.querySelectorAll('.alp-dt-skeleton').length).toBe(0);
    expect(container.querySelector('.alp-dt-empty-title')?.textContent).toBe('No suppliers yet');
  });

  it('calls onRowClick with the row data when a data row is clicked', () => {
    const onRowClick = vi.fn();
    const { container, unmount } = mountComponent(DataTable, {
      columns: COLUMNS,
      rows: [{ name: 'Acme Supplies' }],
      loading: false,
      onRowClick,
    });
    cleanup = unmount;

    const row = container.querySelector('.alp-dt-row--clickable') as HTMLElement;
    expect(row).not.toBeNull();
    row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onRowClick).toHaveBeenCalledWith({ name: 'Acme Supplies' });
  });

  it('renders a placeholder dash rather than the literal string "null" for a missing cell value', () => {
    const { container, unmount } = mountComponent(DataTable, {
      columns: COLUMNS,
      rows: [{ name: null }],
      loading: false,
    });
    cleanup = unmount;

    const cell = container.querySelector('.alp-dt-td:not(.alp-dt-td--check):not(.alp-dt-td--options)');
    expect(cell?.textContent).toBe('—');
  });
});
