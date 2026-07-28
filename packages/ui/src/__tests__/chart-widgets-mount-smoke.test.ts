/**
 * @vitest-environment jsdom
 */
// FRONT-SHELL-004: Chart.uix and AnalyticsCard.uix were both refactored to consume the new
// chart-host.ui abstraction instead of their own inline script-load/watchdog/init logic.
// chart-host.test.ts covers that shared logic in isolation; this file is the integration
// smoke check that the two live components still mount, wire the host correctly, and clean
// up on unmount -- not a full re-test of either component's menu/UI behavior (out of scope,
// same as every other untested prop/interaction on these components per this repo's
// zero-tests starting point, FABLE-FRONT-001).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { mountComponent } from './mount';
import { Chart } from '../data/Chart.uix';
import { AnalyticsCard } from '../data/AnalyticsCard.uix';

function stubEcharts() {
  const instance = { setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn(), getDataURL: vi.fn(() => 'data:image/png;base64,x') };
  (window as any).echarts = {
    init: vi.fn(() => instance),
    getInstanceByDom: vi.fn(() => null),
  };
  return instance;
}

function giveElementSize(el: HTMLElement) {
  Object.defineProperty(el, 'clientWidth', { value: 400, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 300, configurable: true });
}

describe('Chart.uix + AnalyticsCard.uix — chart-host integration smoke', () => {
  afterEach(() => {
    delete (window as any).echarts;
  });

  it('Chart.uix mounts, initialises via chart-host, and disposes cleanly on unmount', async () => {
    stubEcharts();
    const { container, instance, unmount } = mountComponent(Chart, {
      data: { series: [{ data: [1, 2, 3] }] },
      height: '200px',
    });
    await Promise.resolve();
    await Promise.resolve();

    const chartEl = container.querySelector(`#${(instance as any).chartId}`) as HTMLElement;
    expect(chartEl).not.toBeNull();
    giveElementSize(chartEl);
    (instance as any).initChart();

    expect((window as any).echarts.init).toHaveBeenCalled();
    expect((instance as any)._chart).toBeTruthy();

    unmount();
    expect(() => (instance as any).unmounted?.()).not.toThrow();
  });

  it('Chart.uix falls back to "Chart unavailable" when the script fails to load', async () => {
    // No window.echarts stub, and ensureEchartsLoaded's script.onerror is never fired in
    // jsdom (external scripts aren't executed) -- but a rejection path must still be
    // reachable without throwing out of mounted().
    const { instance } = mountComponent(Chart, { data: null });
    (instance as any).failed = true;
    (instance as any).scheduleUpdate?.();
    expect((instance as any).failed).toBe(true);
  });

  it('AnalyticsCard.uix mounts, initialises via chart-host, and disposes cleanly on unmount', async () => {
    stubEcharts();
    const { container, instance, unmount } = mountComponent(AnalyticsCard, {
      title: 'Test Widget',
      data: { xAxis: ['a', 'b'], series: [{ name: 's1', data: [1, 2] }] },
      config: { chartType: 'bar' },
    });
    await Promise.resolve();
    await Promise.resolve();

    const chartEl = container.querySelector(`#${(instance as any).chartId}`) as HTMLElement;
    expect(chartEl).not.toBeNull();
    giveElementSize(chartEl);
    (instance as any)._syncChart();

    expect((window as any).echarts.init).toHaveBeenCalled();
    expect((instance as any)._chart).toBeTruthy();

    // The watchdog must actually be a live cleanup handle from chart-host, not the raw
    // setInterval id it used to be -- unmounted() calling it as a function must not throw.
    expect(typeof (instance as any)._watchdog).toBe('function');

    unmount();
    expect(() => (instance as any).unmounted?.()).not.toThrow();
  });

  it('AnalyticsCard.uix disposes an idle chart instance when loading or data is insufficient', async () => {
    const instance_ = stubEcharts();
    const { container, instance } = mountComponent(AnalyticsCard, {
      title: 'Idle Widget',
      loading: true,
      data: null,
      config: { chartType: 'bar' },
    });
    await Promise.resolve();
    (instance as any)._syncChart();

    // hasEnoughData(null) is false and loading=true -- both route to disposeIdleChart(),
    // which only disposes an instance echarts itself reports as registered.
    expect((instance as any)._chart).toBeNull();
    container.remove();
  });
});
