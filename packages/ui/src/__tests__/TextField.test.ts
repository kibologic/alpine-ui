import { describe, it, expect, vi, afterEach } from 'vitest';
import { TextField } from '../form/TextField.uix';
import { mountComponent } from './mount';

// FRONT-001. Two things touched here, only one is a real fix:
// - TextField.uix's own `mount()` (renamed to `mounted()`) LOOKED like dead code from reading
//   swiss-lib's component.ts alone (it only checks for `mounted`/`onMount` by name) -- but
//   reproducing it live (below) disproved that: the initial `value` prop was already correctly
//   applied under the original spelling. Renamed for naming consistency only; NOT a bug fix
//   (Article 16 -- do not claim a root cause reproduction disproves).
// - Neither TextField.uix nor SelectField.uix had id/name on their input/select at all --
//   this repo's own form-field directive requires both. That gap is real and is the actual fix
//   verified fail-before/pass-after here.

let cleanup: (() => void) | null = null;
afterEach(() => {
  cleanup?.();
  cleanup = null;
});

describe('TextField', () => {
  it('renders the initial value prop in the input on mount', async () => {
    const { container, unmount } = mountComponent(TextField, { value: 'hello world' });
    cleanup = unmount;
    // mounted() runs via executeHookPhase(), which is invoked fire-and-forget (`void
    // ci.executeHookPhase(...)`, dom-creation.ts) and is itself an async function -- `await
    // hook.callback.call(...)` defers even a plain synchronous callback to the next microtask
    // tick. A synchronous assertion right after mount() would race it.
    await Promise.resolve();

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe('hello world');
  });

  it('calls onchange with the new value as the user types, without losing the initial value first', async () => {
    const onchange = vi.fn();
    const { container, unmount } = mountComponent(TextField, { value: 'abc', onchange });
    cleanup = unmount;
    await Promise.resolve();

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('abc');

    input.value = 'abcd';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(onchange).toHaveBeenCalledWith('abcd');
    expect(input.value).toBe('abcd');
  });

  it('shows the error message and applies the error class when error is set', () => {
    const { container, unmount } = mountComponent(TextField, { value: '', error: 'Required' });
    cleanup = unmount;

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.className).toContain('alp-input--error');
    expect(container.querySelector('.alp-field-error')?.textContent).toBe('Required');
  });

  it('renders no error element when error is absent', () => {
    const { container, unmount } = mountComponent(TextField, { value: '' });
    cleanup = unmount;

    expect(container.querySelector('.alp-field-error')).toBeNull();
  });

  it('gives the input a stable id and name even when neither prop is supplied', () => {
    const { container, unmount } = mountComponent(TextField, { value: '' });
    cleanup = unmount;

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.id).toBeTruthy();
    expect(input.name).toBeTruthy();
  });

  it('uses the caller-supplied id and name when provided', () => {
    const { container, unmount } = mountComponent(TextField, { value: '', id: 'email', name: 'email' });
    cleanup = unmount;

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.id).toBe('email');
    expect(input.name).toBe('email');
  });
});
