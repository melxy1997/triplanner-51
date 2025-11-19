import React from 'react';
import ReactDOM from 'react-dom/client';
import { PerfLabPage } from './PerfLabPage.js';

/**
 * 在指定 DOM 容器中挂载 Perf Lab 页面，方便团队在本地或任意宿主中快速体验。
 *
 * @param container DOM 元素或选择器，如 '#root'
 * @returns React Root 实例，调用 root.unmount() 可卸载
 */
export function mountPerfLab(
  container: HTMLElement | string = '#root',
): ReactDOM.Root | null {
  if (typeof document === 'undefined') {
    // SSR / 非浏览器环境下直接跳过
    return null;
  }

  const el =
    typeof container === 'string'
      ? (document.querySelector(container) as HTMLElement | null)
      : container;

  if (!el) {
    // 如果选择器找不到节点，尝试自动创建一个 root 容器
    const auto = document.createElement('div');
    auto.id = 'perf-lab-root';
    document.body.appendChild(auto);
    const root = ReactDOM.createRoot(auto);
    root.render(
      <React.StrictMode>
        <PerfLabPage />
      </React.StrictMode>,
    );
    return root;
  }

  const root = ReactDOM.createRoot(el);
  root.render(
    <React.StrictMode>
      <PerfLabPage />
    </React.StrictMode>,
  );
  return root;
}



