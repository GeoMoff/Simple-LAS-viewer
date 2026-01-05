import React from 'react';

/**
 * View Controls Panel Component
 * @param {{
 *   darkBackground: boolean,
 *   onViewTop: () => void,
 *   onViewFront: () => void,
 *   onViewRight: () => void,
 *   onViewIsometric: () => void,
 *   onReset: () => void,
 *   onRotateLeft: () => void,
 *   onRotateRight: () => void,
 *   onRotateUp: () => void,
 *   onRotateDown: () => void
 * }} props
 */
export function ViewControls({
  darkBackground,
  onViewTop,
  onViewFront,
  onViewRight,
  onViewIsometric,
  onReset,
  onRotateLeft,
  onRotateRight,
  onRotateUp,
  onRotateDown,
}) {
  const panelClass = darkBackground
    ? 'bg-black/80'
    : 'bg-white/90 border border-gray-300';
  const labelClass = darkBackground ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className="flex flex-col gap-2">
      {/* View presets */}
      <div className={`rounded p-2 flex flex-col gap-1 ${panelClass}`}>
        <span className={`text-xs mb-1 ${labelClass}`}>Views</span>
        <div className="grid grid-cols-2 gap-1" role="group" aria-label="View presets">
          <button
            onClick={onViewTop}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            aria-label="Top view"
          >
            Top
          </button>
          <button
            onClick={onViewFront}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            aria-label="Front view from South"
          >
            Front (S)
          </button>
          <button
            onClick={onViewRight}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            aria-label="Right view from West"
          >
            Right (W)
          </button>
          <button
            onClick={onViewIsometric}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            aria-label="Isometric view"
          >
            Iso
          </button>
        </div>
        <button
          onClick={onReset}
          className="px-2 py-1 bg-blue-700 hover:bg-blue-600 rounded text-xs mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          aria-label="Reset view"
        >
          Reset
        </button>
      </div>

      {/* Rotation controls */}
      <div className={`rounded p-2 ${panelClass}`}>
        <span className={`text-xs mb-1 block ${labelClass}`}>Rotate</span>
        <div
          className="grid grid-cols-3 gap-1 w-24"
          role="group"
          aria-label="View rotation controls"
        >
          <div></div>
          <button
            onClick={onRotateUp}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            aria-label="Rotate view up"
          >
            ↑
          </button>
          <div></div>
          <button
            onClick={onRotateLeft}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            aria-label="Rotate view left"
          >
            ←
          </button>
          <div></div>
          <button
            onClick={onRotateRight}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            aria-label="Rotate view right"
          >
            →
          </button>
          <div></div>
          <button
            onClick={onRotateDown}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            aria-label="Rotate view down"
          >
            ↓
          </button>
          <div></div>
        </div>
      </div>
    </div>
  );
}

/**
 * Slicer Controls Component
 * @param {{
 *   darkBackground: boolean,
 *   enabled: boolean,
 *   onToggle: () => void,
 *   sliceX: {min: number, max: number},
 *   sliceY: {min: number, max: number},
 *   sliceZ: {min: number, max: number},
 *   onSetX: (range: {min: number, max: number}) => void,
 *   onSetY: (range: {min: number, max: number}) => void,
 *   onSetZ: (range: {min: number, max: number}) => void,
 *   onReset: () => void,
 *   getActualValues: (axis: string) => {min: number, max: number}
 * }} props
 */
export function SlicerControls({
  darkBackground,
  enabled,
  onToggle,
  sliceX,
  sliceY,
  sliceZ,
  onSetX,
  onSetY,
  onSetZ,
  onReset,
  getActualValues,
}) {
  const panelClass = darkBackground
    ? 'bg-black/80'
    : 'bg-white/90 border border-gray-300';
  const labelClass = darkBackground ? 'text-gray-400' : 'text-gray-600';
  const valueClass = darkBackground ? 'text-gray-500' : 'text-gray-500';

  const xValues = getActualValues('x');
  const yValues = getActualValues('y');
  const zValues = getActualValues('z');

  return (
    <div className={`rounded p-2 ${panelClass}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs ${labelClass}`}>Slicer</span>
        <button
          onClick={onToggle}
          className={`px-2 py-0.5 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none ${
            enabled ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'
          }`}
          aria-pressed={enabled}
          aria-label={enabled ? 'Disable slicer' : 'Enable slicer'}
        >
          {enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {enabled && (
        <div className="space-y-2" role="group" aria-label="Slicer axis controls">
          {/* X axis */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs text-red-400 w-4 font-bold" aria-hidden="true">
                X
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={sliceX.min}
                onChange={(e) =>
                  onSetX({ ...sliceX, min: Math.min(parseInt(e.target.value), sliceX.max - 1) })
                }
                className="flex-1 h-1"
                aria-label="X axis minimum"
              />
              <input
                type="range"
                min="0"
                max="100"
                value={sliceX.max}
                onChange={(e) =>
                  onSetX({ ...sliceX, max: Math.max(parseInt(e.target.value), sliceX.min + 1) })
                }
                className="flex-1 h-1"
                aria-label="X axis maximum"
              />
            </div>
            <div className={`text-xs font-mono ${valueClass}`} style={{ fontSize: '9px' }}>
              {xValues.min.toFixed(1)} → {xValues.max.toFixed(1)}m
            </div>
          </div>

          {/* Y axis */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs text-green-400 w-4 font-bold" aria-hidden="true">
                Y
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={sliceY.min}
                onChange={(e) =>
                  onSetY({ ...sliceY, min: Math.min(parseInt(e.target.value), sliceY.max - 1) })
                }
                className="flex-1 h-1"
                aria-label="Y axis minimum"
              />
              <input
                type="range"
                min="0"
                max="100"
                value={sliceY.max}
                onChange={(e) =>
                  onSetY({ ...sliceY, max: Math.max(parseInt(e.target.value), sliceY.min + 1) })
                }
                className="flex-1 h-1"
                aria-label="Y axis maximum"
              />
            </div>
            <div className={`text-xs font-mono ${valueClass}`} style={{ fontSize: '9px' }}>
              {yValues.min.toFixed(1)} → {yValues.max.toFixed(1)}m
            </div>
          </div>

          {/* Z axis */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs text-blue-400 w-4 font-bold" aria-hidden="true">
                Z
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={sliceZ.min}
                onChange={(e) =>
                  onSetZ({ ...sliceZ, min: Math.min(parseInt(e.target.value), sliceZ.max - 1) })
                }
                className="flex-1 h-1"
                aria-label="Z axis minimum"
              />
              <input
                type="range"
                min="0"
                max="100"
                value={sliceZ.max}
                onChange={(e) =>
                  onSetZ({ ...sliceZ, max: Math.max(parseInt(e.target.value), sliceZ.min + 1) })
                }
                className="flex-1 h-1"
                aria-label="Z axis maximum"
              />
            </div>
            <div className={`text-xs font-mono ${valueClass}`} style={{ fontSize: '9px' }}>
              {zValues.min.toFixed(1)} → {zValues.max.toFixed(1)}m
            </div>
          </div>

          <button
            onClick={onReset}
            className="w-full px-1 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-xs mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            Reset All
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Data Rotation Controls Component
 * @param {{
 *   darkBackground: boolean,
 *   rotationZ: number,
 *   onSetRotation: (value: number) => void
 * }} props
 */
export function DataRotationControls({ darkBackground, rotationZ, onSetRotation }) {
  const panelClass = darkBackground
    ? 'bg-black/80'
    : 'bg-white/90 border border-gray-300';
  const labelClass = darkBackground ? 'text-gray-400' : 'text-gray-600';
  const valueClass = darkBackground ? 'text-gray-500' : 'text-gray-600';

  return (
    <div className={`rounded p-2 ${panelClass}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs ${labelClass}`}>Rotate Data (Z)</span>
        <span className={`text-xs font-mono ${valueClass}`}>{rotationZ}°</span>
      </div>

      <div className="flex gap-1 mb-1" role="group" aria-label="Data rotation controls">
        <button
          onClick={() => onSetRotation(rotationZ - 10)}
          className="flex-1 px-1 py-0.5 bg-gray-600 hover:bg-gray-500 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          aria-label="Rotate data minus 10 degrees"
        >
          -10°
        </button>
        <button
          onClick={() => onSetRotation(rotationZ - 1)}
          className="flex-1 px-1 py-0.5 bg-gray-600 hover:bg-gray-500 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          aria-label="Rotate data minus 1 degree"
        >
          -1°
        </button>
        <button
          onClick={() => onSetRotation(rotationZ + 1)}
          className="flex-1 px-1 py-0.5 bg-gray-600 hover:bg-gray-500 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          aria-label="Rotate data plus 1 degree"
        >
          +1°
        </button>
        <button
          onClick={() => onSetRotation(rotationZ + 10)}
          className="flex-1 px-1 py-0.5 bg-gray-600 hover:bg-gray-500 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          aria-label="Rotate data plus 10 degrees"
        >
          +10°
        </button>
      </div>
      <button
        onClick={() => onSetRotation(0)}
        className="w-full px-1 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
        aria-label="Reset data rotation to 0 degrees"
      >
        Reset
      </button>
    </div>
  );
}

/**
 * Controls Help Overlay
 * @param {{darkBackground: boolean}} props
 */
export function ControlsHelp({ darkBackground }) {
  const bgClass = darkBackground
    ? 'bg-black/80 text-gray-400'
    : 'bg-white/90 text-gray-600 border border-gray-300';

  return (
    <div
      className={`absolute bottom-2 left-2 p-2 rounded text-xs ${bgClass}`}
      role="note"
      aria-label="Controls help"
    >
      <div>Left drag: Rotate</div>
      <div>Right drag: Pan</div>
      <div>Scroll: Zoom</div>
      <div>←/→: Pan left/right</div>
      <div>↑/↓: Pan up/down (Z)</div>
    </div>
  );
}

export default {
  ViewControls,
  SlicerControls,
  DataRotationControls,
  ControlsHelp,
};
