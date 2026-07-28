import { SwissApp } from '@swissjs/core';
import type { SwissComponent } from '@swissjs/core';

/**
 * Mounts a class .uix component into a fresh, attached jsdom container using
 * the same SwissApp.mount() entry point every real Alpine app's main.ui uses
 * (see e.g. asg-storefront/apps/server/app/src/main.ui) -- not a bespoke
 * test-only mount path. Attaching to document.body matters: components that
 * check element.isConnected or measure layout behave differently on a
 * detached node.
 */
export function mountComponent<P extends Record<string, unknown>, C extends SwissComponent = SwissComponent>(
  ComponentClass: new (props: P) => C,
  props: P,
): { container: HTMLElement; instance: C; unmount: () => void } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const instance = new ComponentClass(props);
  instance.mount(container);
  return {
    container,
    instance,
    unmount: () => {
      container.remove();
    },
  };
}

// Uses SwissApp.mount() itself where a test doesn't need the instance back --
// exercises the exact entry point every real app's main.ui calls.
export function mountViaSwissApp<P extends Record<string, unknown>>(
  ComponentClass: new (props: P) => SwissComponent,
  props: P,
): { container: HTMLElement; unmount: () => void } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  SwissApp.mount(ComponentClass as unknown as new (props: Record<string, unknown>) => SwissComponent, container, props);
  return {
    container,
    unmount: () => {
      container.remove();
    },
  };
}
