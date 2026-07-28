import { describe, it, expect, vi, afterEach } from 'vitest';
import { SelectField } from '../form/SelectField.uix';
import { mountComponent } from './mount';

// FRONT-001: SelectField.uix reads `value` directly from props each render (no internal-state
// lifecycle bug like TextField.uix's), but had no id/name either -- added per this repo's form
// field directive.

let cleanup: (() => void) | null = null;
afterEach(() => {
  cleanup?.();
  cleanup = null;
});

const OPTIONS = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C', disabled: true },
];

describe('SelectField', () => {
  it('renders every option and marks the one matching value as selected', () => {
    const { container, unmount } = mountComponent(SelectField, { options: OPTIONS, value: 'b' });
    cleanup = unmount;

    const select = container.querySelector('select') as HTMLSelectElement;
    const opts = Array.from(select.querySelectorAll('option'));
    expect(opts).toHaveLength(3);
    expect(select.value).toBe('b');
  });

  it('disables an option flagged disabled without disabling the others', () => {
    const { container, unmount } = mountComponent(SelectField, { options: OPTIONS, value: 'a' });
    cleanup = unmount;

    const opts = Array.from(container.querySelectorAll('option'));
    const disabledOpt = opts.find((o) => (o as HTMLOptionElement).value === 'c') as HTMLOptionElement;
    const enabledOpt = opts.find((o) => (o as HTMLOptionElement).value === 'a') as HTMLOptionElement;
    expect(disabledOpt.disabled).toBe(true);
    expect(enabledOpt.disabled).toBe(false);
  });

  it('calls onchange with the newly selected value', () => {
    const onchange = vi.fn();
    const { container, unmount } = mountComponent(SelectField, { options: OPTIONS, value: 'a', onchange });
    cleanup = unmount;

    const select = container.querySelector('select') as HTMLSelectElement;
    select.value = 'b';
    select.dispatchEvent(new Event('change', { bubbles: true }));

    expect(onchange).toHaveBeenCalledWith('b');
  });

  it('renders a disabled placeholder option only when placeholder is supplied, selected when value is empty', () => {
    const { container, unmount } = mountComponent(SelectField, { options: OPTIONS, placeholder: 'Choose…', value: '' });
    cleanup = unmount;

    const placeholderOpt = container.querySelector('option[value=""]') as HTMLOptionElement;
    expect(placeholderOpt).not.toBeNull();
    expect(placeholderOpt.disabled).toBe(true);
    expect(placeholderOpt.textContent).toBe('Choose…');
  });

  it('gives the select a stable id and name even when neither prop is supplied', () => {
    const { container, unmount } = mountComponent(SelectField, { options: OPTIONS, value: 'a' });
    cleanup = unmount;

    const select = container.querySelector('select') as HTMLSelectElement;
    expect(select.id).toBeTruthy();
    expect(select.name).toBeTruthy();
  });
});
