/**
 * Hook for loading LAS files with Web Worker support
 */

import { useState, useCallback, useRef } from 'react';
import { LASParser } from '../lib/LASParser';

/**
 * Check if Web Workers are supported
 */
const supportsWorkers = typeof Worker !== 'undefined';

/**
 * Custom hook for file loading with optional Web Worker support
 * @returns {Object}
 */
export function useFileLoader() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const workerRef = useRef(null);

  /**
   * Parse file using Web Worker (if available) or main thread
   * @param {File} file
   * @param {Object} options
   * @returns {Promise<{header: Object, positions: Float32Array, colors: Float32Array}>}
   */
  const loadFile = useCallback(async (file, options = {}) => {
    setLoading(true);
    setProgress(0);
    setError(null);

    try {
      const buffer = await file.arrayBuffer();

      // Try Web Worker first
      if (supportsWorkers && options.useWorker !== false) {
        try {
          const result = await parseWithWorker(buffer, options, setProgress);
          return result;
        } catch (workerError) {
          console.warn('Worker failed, falling back to main thread:', workerError);
          // Fall through to main thread parsing
        }
      }

      // Main thread parsing (fallback or if workers disabled)
      const parser = new LASParser(buffer, {
        ...options,
        onProgress: setProgress,
      });

      const validation = parser.validate();
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const data = parser.parse();
      return {
        header: data.header,
        positions: data.points.positions,
        colors: data.points.colors,
      };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cancel ongoing worker operation
   */
  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setLoading(false);
  }, []);

  return {
    loading,
    progress,
    error,
    loadFile,
    cancel,
    clearError: () => setError(null),
  };
}

/**
 * Parse LAS file using Web Worker
 * @param {ArrayBuffer} buffer
 * @param {Object} options
 * @param {Function} onProgress
 * @returns {Promise}
 */
function parseWithWorker(buffer, options, onProgress) {
  return new Promise((resolve, reject) => {
    // Create worker using Vite's worker syntax
    const worker = new Worker(
      new URL('../workers/lasParser.worker.js', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e) => {
      const { type, data, progress, error } = e.data;

      switch (type) {
        case 'progress':
          onProgress(progress);
          break;
        case 'complete':
          worker.terminate();
          resolve({
            header: data.header,
            positions: new Float32Array(data.positions),
            colors: new Float32Array(data.colors),
          });
          break;
        case 'error':
          worker.terminate();
          reject(new Error(error));
          break;
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };

    // Transfer buffer to worker
    worker.postMessage({ buffer, options }, [buffer]);
  });
}

export default useFileLoader;
