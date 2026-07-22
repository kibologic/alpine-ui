/**
 * @vitest-environment jsdom
 */
// FRONT-SHELL-004: chart-host.ui centralises the script-load/watchdog/instance-staleness
// logic that Chart.uix and AnalyticsCard.uix used to each duplicate independently (with
// Chart.uix lacking the watchdog AnalyticsCard.uix had). Tested directly against the
// exported functions rather than through full component mount/render -- these are the
// side-effectful primitives a chart *host* provides, independent of any one widget's UI.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ensureEchartsLoaded,
  startChartWatchdog,
  syncChartInstance,
  disposeIdleChart,
  disposeChart,
} from '../data/chart-host.ui';

describe('chart-host', () => {
  afterEach(() => {
    delete (window as any).echarts;
    // Reset the module-level load-promise memo between tests by re-importing isn't
    // available without vi.resetModules(); tests that rely on a clean load state call
    // vi.resetModules() + re-import themselves (see the dedup test below).
  });

  describe('ensureEchartsLoaded', () => {
    beforeEach(() => {
      document.head.querySelectorAll('script[src="/echarts.min.js"]').forEach((s) => s.remove());
    });

    it('resolves immediately without creating a script tag when window.echarts already exists', async () => {
      (window as any).echarts = {};
      await ensureEchartsLoaded();
      expect(document.head.querySelectorAll('script[src="/echarts.min.js"]').length).toBe(0);
    });

    it('creates exactly one script tag when called concurrently from two chart instances', async () => {
      vi.resetModules();
      const mod = await import('../data/chart-host.ui');
      const p1 = mod.ensureEchartsLoaded();
      const p2 = mod.ensureEchartsLoaded();
      // This is the exact duplication bug fixed here: before centralising, each component's
      // own inline `if (!window.echarts)` check had no way to see the other's in-flight load.
      expect(document.head.querySelectorAll('script[src="/echarts.min.js"]').length).toBe(1);

      const script = document.head.querySelector('script[src="/echarts.min.js"]') as HTMLScriptElement;
      script.onload?.(new Event('load'));
      await expect(p1).resolves.toBeUndefined();
      await expect(p2).resolves.toBeUndefined();
    });

    it('rejects and allows a later retry when the script fails to load', async () => {
      vi.resetModules();
      const mod = await import('../data/chart-host.ui');
      const p1 = mod.ensureEchartsLoaded();
      const script = document.head.querySelector('script[src="/echarts.min.js"]') as HTMLScriptElement;
      script.onerror?.(new Event('error'));
      await expect(p1).rejects.toThrow('ECharts CDN failed');

      // A permanently-cached failure would strand every chart on the page as "unavailable"
      // after one transient network blip -- the retry must create a fresh script tag.
      document.head.querySelectorAll('script[src="/echarts.min.js"]').forEach((s) => s.remove());
      const p2 = mod.ensureEchartsLoaded();
      expect(document.head.querySelectorAll('script[src="/echarts.min.js"]').length).toBe(1);
      const script2 = document.head.querySelector('script[src="/echarts.min.js"]') as HTMLScriptElement;
      script2.onload?.(new Event('load'));
      await expect(p2).resolves.toBeUndefined();
    });
  });

  describe('startChartWatchdog', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('repairs when the element is empty and shouldRepair() is true', () => {
      const el = document.createElement('div');
      el.id = 'wd-1';
      document.body.appendChild(el);
      const repair = vi.fn();

      const stop = startChartWatchdog('wd-1', () => true, repair, 100);
      vi.advanceTimersByTime(100);
      expect(repair).toHaveBeenCalledTimes(1);

      stop();
    });

    it('does not repair while the element still has children (chart is painted)', () => {
      const el = document.createElement('div');
      el.id = 'wd-2';
      el.appendChild(document.createElement('canvas'));
      document.body.appendChild(el);
      const repair = vi.fn();

      const stop = startChartWatchdog('wd-2', () => true, repair, 100);
      vi.advanceTimersByTime(300);
      expect(repair).not.toHaveBeenCalled();

      stop();
    });

    it('does not repair when shouldRepair() is false even if the element is empty', () => {
      const el = document.createElement('div');
      el.id = 'wd-3';
      document.body.appendChild(el);
      const repair = vi.fn();

      const stop = startChartWatchdog('wd-3', () => false, repair, 100);
      vi.advanceTimersByTime(300);
      expect(repair).not.toHaveBeenCalled();

      stop();
    });

    it('stops polling once the returned cleanup function is called', () => {
      const el = document.createElement('div');
      el.id = 'wd-4';
      document.body.appendChild(el);
      const repair = vi.fn();

      const stop = startChartWatchdog('wd-4', () => true, repair, 100);
      vi.advanceTimersByTime(100);
      expect(repair).toHaveBeenCalledTimes(1);

      stop();
      vi.advanceTimersByTime(500);
      // Still 1 -- the interval must actually be cleared, not just ignored once.
      expect(repair).toHaveBeenCalledTimes(1);
    });
  });

  describe('syncChartInstance', () => {
    it('returns null and applies nothing when echarts is not loaded', () => {
      const el = document.createElement('div');
      el.id = 'sc-1';
      document.body.appendChild(el);
      const applyOption = vi.fn();

      const result = syncChartInstance('sc-1', applyOption);
      expect(result).toBeNull();
      expect(applyOption).not.toHaveBeenCalled();
    });

    it('returns null and applies nothing when the element is not in the DOM', () => {
      (window as any).echarts = { getInstanceByDom: vi.fn(), init: vi.fn() };
      const applyOption = vi.fn();
      const result = syncChartInstance('does-not-exist', applyOption);
      expect(result).toBeNull();
      expect(applyOption).not.toHaveBeenCalled();
    });

    it('schedules a retry via requestAnimationFrame and does not init when the element has zero size', () => {
      const el = document.createElement('div');
      el.id = 'sc-2';
      document.body.appendChild(el);
      // jsdom never computes real layout -- clientWidth/clientHeight are 0 by default,
      // exercising the exact "container not laid out yet" path this retry exists for.
      const init = vi.fn();
      (window as any).echarts = { getInstanceByDom: vi.fn(() => null), init };
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);

      const result = syncChartInstance('sc-2', vi.fn());
      expect(result).toBeNull();
      expect(init).not.toHaveBeenCalled();
      expect(rafSpy).toHaveBeenCalledTimes(1);

      rafSpy.mockRestore();
    });

    it('initialises a new instance, applies the option, and returns it when the element has size', () => {
      const el = document.createElement('div');
      el.id = 'sc-3';
      document.body.appendChild(el);
      Object.defineProperty(el, 'clientWidth', { value: 400, configurable: true });
      Object.defineProperty(el, 'clientHeight', { value: 300, configurable: true });

      const fakeInstance = { setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn() };
      const init = vi.fn(() => fakeInstance);
      (window as any).echarts = { getInstanceByDom: vi.fn(() => null), init };

      const applyOption = vi.fn((instance) => instance.setOption({ foo: 'bar' }));
      const result = syncChartInstance('sc-3', applyOption, { theme: 'dark' });

      expect(init).toHaveBeenCalledWith(el, 'dark', undefined);
      expect(applyOption).toHaveBeenCalledWith(fakeInstance);
      expect(fakeInstance.setOption).toHaveBeenCalledWith({ foo: 'bar' });
      expect(result).toBe(fakeInstance);
    });

    it('disposes a stale instance whose canvas was wiped by an unrelated re-render, then creates a fresh one', () => {
      const el = document.createElement('div');
      el.id = 'sc-4';
      document.body.appendChild(el); // el.children.length === 0 -- the wiped-canvas case
      Object.defineProperty(el, 'clientWidth', { value: 400, configurable: true });
      Object.defineProperty(el, 'clientHeight', { value: 300, configurable: true });

      const staleInstance = { dispose: vi.fn() };
      const freshInstance = { setOption: vi.fn(), resize: vi.fn() };
      const init = vi.fn(() => freshInstance);
      (window as any).echarts = { getInstanceByDom: vi.fn(() => staleInstance), init };

      const result = syncChartInstance('sc-4', vi.fn());
      expect(staleInstance.dispose).toHaveBeenCalledTimes(1);
      expect(init).toHaveBeenCalledTimes(1);
      expect(result).toBe(freshInstance);
    });

    it('disposes the instance and returns null when applyOption throws, instead of leaving a broken instance live', () => {
      const el = document.createElement('div');
      el.id = 'sc-5';
      document.body.appendChild(el);
      Object.defineProperty(el, 'clientWidth', { value: 400, configurable: true });
      Object.defineProperty(el, 'clientHeight', { value: 300, configurable: true });

      const fakeInstance = { dispose: vi.fn() };
      (window as any).echarts = { getInstanceByDom: vi.fn(() => null), init: vi.fn(() => fakeInstance) };
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = syncChartInstance('sc-5', () => { throw new Error('bad option'); });
      expect(fakeInstance.dispose).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  describe('disposeIdleChart / disposeChart', () => {
    it('disposeIdleChart disposes an existing instance and is a no-op when there is none', () => {
      const el = document.createElement('div');
      el.id = 'di-1';
      document.body.appendChild(el);
      const instance = { dispose: vi.fn() };
      (window as any).echarts = { getInstanceByDom: vi.fn(() => instance) };

      disposeIdleChart('di-1');
      expect(instance.dispose).toHaveBeenCalledTimes(1);

      (window as any).echarts.getInstanceByDom = vi.fn(() => null);
      expect(() => disposeIdleChart('di-1')).not.toThrow();
    });

    it('disposeChart is a no-op when echarts is not loaded or the element is missing', () => {
      delete (window as any).echarts;
      expect(() => disposeChart('nope')).not.toThrow();
      (window as any).echarts = { getInstanceByDom: vi.fn() };
      expect(() => disposeChart('still-not-in-dom')).not.toThrow();
    });
  });
});
