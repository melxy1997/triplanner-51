import React from 'react';
import ReactDOM from 'react-dom/client';
import { PerfLabPage } from './perf/PerfLabPage.js';

const container = document.getElementById('root');

if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <PerfLabPage />
    </React.StrictMode>,
  );
} else {
  // eslint-disable-next-line no-console
  console.error('Perf Lab root container #root not found');
}


