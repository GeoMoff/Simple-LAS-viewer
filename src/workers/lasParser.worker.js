/**
 * Web Worker for LAS file parsing
 * Offloads heavy parsing to a background thread
 */

import { LASParser } from '../lib/LASParser';

self.onmessage = async function (e) {
  const { buffer, options } = e.data;

  try {
    const parser = new LASParser(buffer, {
      ...options,
      onProgress: (progress) => {
        self.postMessage({ type: 'progress', progress });
      },
    });

    // Validate first
    const validation = parser.validate();
    if (!validation.valid) {
      self.postMessage({ type: 'error', error: validation.error });
      return;
    }

    // Parse
    const data = parser.parse();

    // Transfer arrays back to main thread (transferable objects)
    self.postMessage(
      {
        type: 'complete',
        data: {
          header: data.header,
          positions: data.points.positions,
          colors: data.points.colors,
        },
      },
      [data.points.positions.buffer, data.points.colors.buffer]
    );
  } catch (err) {
    self.postMessage({ type: 'error', error: err.message });
  }
};
