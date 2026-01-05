import React from 'react';
import { formatDistance } from '../hooks/useMeasurement';

/**
 * Color preset options
 */
const COLOR_PRESETS = [
  { color: '#ffffff', name: 'White' },
  { color: '#000000', name: 'Black' },
  { color: '#ff3333', name: 'Red' },
  { color: '#33ff33', name: 'Green' },
  { color: '#3399ff', name: 'Blue' },
  { color: '#ffff33', name: 'Yellow' },
  { color: '#ff33ff', name: 'Magenta' },
  { color: '#33ffff', name: 'Cyan' },
  { color: '#ff9933', name: 'Orange' },
  { color: '#9933ff', name: 'Purple' },
];

/**
 * Header Component with main controls
 * @param {{
 *   onFileSelect: (file: File) => void,
 *   pointSize: number,
 *   onPointSizeChange: (size: number) => void,
 *   opacity: number,
 *   onOpacityChange: (opacity: number) => void,
 *   darkBackground: boolean,
 *   onDarkBackgroundToggle: () => void,
 *   pointColor: string,
 *   onPointColorChange: (color: string) => void,
 *   measureEnabled: boolean,
 *   measureAxis: string,
 *   onMeasureToggle: () => void,
 *   onMeasureAxisChange: (axis: string) => void,
 *   onMeasureClear: () => void
 * }} props
 */
export function Header({
  onFileSelect,
  pointSize,
  onPointSizeChange,
  opacity,
  onOpacityChange,
  darkBackground,
  onDarkBackgroundToggle,
  pointColor,
  onPointColorChange,
  measureEnabled,
  measureAxis,
  onMeasureToggle,
  onMeasureAxisChange,
  onMeasureClear,
}) {
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <header
      className="bg-gray-800 p-3 border-b border-gray-700 flex items-center justify-between flex-wrap gap-3"
      role="banner"
    >
      <h1 className="text-lg font-bold text-blue-400">LAS/LAZ Viewer</h1>

      <div className="flex items-center gap-4 flex-wrap">
        {/* LAS File input */}
        <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded cursor-pointer text-sm focus-within:ring-2 focus-within:ring-blue-500">
          Load LAS
          <input
            type="file"
            accept=".las"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Load LAS file"
          />
        </label>

        {/* LAZ File input */}
        <label className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded cursor-pointer text-sm focus-within:ring-2 focus-within:ring-green-500">
          Load LAZ
          <input
            type="file"
            accept=".laz"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Load LAZ file"
          />
        </label>

        {/* Point size control */}
        <div className="flex items-center gap-2">
          <label htmlFor="point-size" className="text-sm text-gray-400">
            Size:
          </label>
          <input
            id="point-size"
            type="range"
            min="1"
            max="8"
            step="0.5"
            value={pointSize}
            onChange={(e) => onPointSizeChange(parseFloat(e.target.value))}
            className="w-20"
            aria-valuemin={1}
            aria-valuemax={8}
            aria-valuenow={pointSize}
          />
          <span className="text-sm w-6" aria-hidden="true">
            {pointSize}
          </span>
        </div>

        {/* Opacity control */}
        <div className="flex items-center gap-2">
          <label htmlFor="opacity" className="text-sm text-gray-400">
            Opacity:
          </label>
          <input
            id="opacity"
            type="range"
            min="0"
            max="100"
            step="5"
            value={opacity}
            onChange={(e) => onOpacityChange(parseInt(e.target.value))}
            className="w-20"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={opacity}
          />
          <span className="text-sm w-8" aria-hidden="true">
            {opacity}%
          </span>
        </div>

        {/* Background toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">BG:</span>
          <button
            onClick={onDarkBackgroundToggle}
            className={`px-2 py-1 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none ${
              darkBackground
                ? 'bg-gray-800 text-white border border-gray-600'
                : 'bg-white text-black border border-gray-400'
            }`}
            aria-label={darkBackground ? 'Switch to light background' : 'Switch to dark background'}
            aria-pressed={darkBackground}
          >
            {darkBackground ? '⬛' : '⬜'}
          </button>
        </div>

        {/* Color picker */}
        <div className="flex items-center gap-1" role="group" aria-label="Point color selection">
          <span className="text-sm text-gray-400">Color:</span>
          <button
            onClick={() => onPointColorChange('original')}
            className={`w-6 h-6 rounded text-xs border-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
              pointColor === 'original' ? 'border-yellow-400' : 'border-transparent'
            }`}
            style={{
              background: 'linear-gradient(135deg, #ff0000 25%, #00ff00 50%, #0000ff 75%)',
            }}
            title="Original colors"
            aria-label="Use original colors"
            aria-pressed={pointColor === 'original'}
          />
          {COLOR_PRESETS.map(({ color, name }) => (
            <button
              key={color}
              onClick={() => onPointColorChange(color)}
              className={`w-6 h-6 rounded border-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                pointColor === color
                  ? 'border-yellow-400'
                  : color === '#ffffff'
                  ? 'border-gray-400'
                  : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
              title={name}
              aria-label={`Set point color to ${name}`}
              aria-pressed={pointColor === color}
            />
          ))}
        </div>

        {/* Measure controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onMeasureToggle}
            className={`px-3 py-2 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${
              measureEnabled
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-gray-600 hover:bg-gray-500'
            }`}
            aria-pressed={measureEnabled}
            aria-label={measureEnabled ? 'Disable measurement mode' : 'Enable measurement mode'}
          >
            📏 Measure {measureEnabled ? 'ON' : 'OFF'}
          </button>

          {measureEnabled && (
            <>
              <div
                className="flex rounded overflow-hidden text-xs"
                role="group"
                aria-label="Measurement axis selection"
              >
                <button
                  onClick={() => onMeasureAxisChange('3d')}
                  className={`px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    measureAxis === '3d' ? 'bg-yellow-600' : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                  aria-pressed={measureAxis === '3d'}
                >
                  3D
                </button>
                <button
                  onClick={() => onMeasureAxisChange('horizontal')}
                  className={`px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    measureAxis === 'horizontal'
                      ? 'bg-cyan-600'
                      : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                  aria-pressed={measureAxis === 'horizontal'}
                >
                  Horiz
                </button>
                <button
                  onClick={() => onMeasureAxisChange('vertical')}
                  className={`px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    measureAxis === 'vertical'
                      ? 'bg-fuchsia-600'
                      : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                  aria-pressed={measureAxis === 'vertical'}
                >
                  Vert
                </button>
              </div>
              <button
                onClick={onMeasureClear}
                className="px-2 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                aria-label="Clear measurement"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/**
 * Measurement Overlay Component
 * @param {{
 *   darkBackground: boolean,
 *   measureAxis: string,
 *   pointCount: number,
 *   distance: number | null,
 *   hasFileInfo: boolean
 * }} props
 */
export function MeasurementOverlay({
  darkBackground,
  measureAxis,
  pointCount,
  distance,
  hasFileInfo,
}) {
  const bgClass = darkBackground
    ? 'bg-black/90'
    : 'bg-white/95 border border-gray-300';
  const textClass = darkBackground ? 'text-gray-300' : 'text-gray-700';

  const axisColors = {
    '3d': { label: 'text-yellow-400', value: 'text-yellow-500' },
    horizontal: { label: 'text-cyan-400', value: 'text-cyan-500' },
    vertical: { label: 'text-fuchsia-400', value: 'text-fuchsia-500' },
  };

  const axisLabels = {
    '3d': '3D Distance',
    horizontal: 'Horizontal (XY) Only',
    vertical: 'Vertical (Z) Only',
  };

  const colors = axisColors[measureAxis];

  return (
    <div
      className={`absolute top-2 right-2 p-3 rounded text-sm ${bgClass}`}
      style={{ marginRight: hasFileInfo ? '288px' : '0' }}
      role="status"
      aria-live="polite"
      aria-label="Measurement status"
    >
      <div className="text-yellow-500 font-semibold mb-2">📏 Measure Mode</div>
      <div className={`text-xs mb-2 ${colors.label}`}>{axisLabels[measureAxis]}</div>

      {pointCount === 0 && <div className={textClass}>Click first point</div>}
      {pointCount === 1 && <div className={textClass}>Click second point</div>}

      {distance !== null && (
        <div className="mt-2">
          <div className={`text-xs ${darkBackground ? 'text-gray-400' : 'text-gray-500'}`}>
            Distance:
          </div>
          {(() => {
            const formatted = formatDistance(distance);
            return (
              <>
                <div className={`text-lg font-mono ${colors.value}`}>{formatted.metric}</div>
                <div className={`text-sm font-mono mt-1 ${colors.label}`}>
                  {formatted.imperial}
                </div>
                <div
                  className={`text-xs mt-1 ${darkBackground ? 'text-gray-500' : 'text-gray-400'}`}
                >
                  ({formatted.raw})
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

/**
 * Loading Overlay Component
 * @param {{darkBackground: boolean, progress?: number, status?: string}} props
 */
export function LoadingOverlay({ darkBackground, progress, status }) {
  const bgClass = darkBackground ? 'bg-black/50' : 'bg-white/50';
  const textClass = darkBackground ? 'text-white' : 'text-gray-800';
  const subtextClass = darkBackground ? 'text-gray-400' : 'text-gray-600';

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center ${bgClass}`}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className={textClass}>
          {status || 'Loading...'}
        </p>
        {progress !== undefined && (
          <div className="mt-2">
            <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden mx-auto">
              <div
                className="h-full bg-blue-500 transition-all duration-200"
                style={{ width: `${Math.round(progress)}%` }}
              />
            </div>
            <p className={`text-sm mt-1 ${subtextClass}`}>{Math.round(progress)}%</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Error Display Component
 * @param {{message: string, onDismiss: () => void}} props
 */
export function ErrorDisplay({ message, onDismiss }) {
  return (
    <div
      className="absolute top-2 left-2 right-2 bg-red-900 border border-red-600 p-2 rounded text-sm"
      role="alert"
    >
      Error: {message}
      <button
        onClick={onDismiss}
        className="float-right focus:ring-2 focus:ring-red-500 focus:outline-none"
        aria-label="Dismiss error"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Drop Zone Placeholder
 * @param {{darkBackground: boolean}} props
 */
export function DropZonePlaceholder({ darkBackground }) {
  const borderClass = darkBackground ? 'border-gray-600' : 'border-gray-400';
  const textClass = darkBackground ? 'text-gray-400' : 'text-gray-600';
  const subtextClass = darkBackground ? 'text-gray-500' : 'text-gray-500';

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className={`text-center p-6 border-2 border-dashed rounded-lg ${borderClass}`}>
        <p className={textClass}>Drop LAS or LAZ file here</p>
        <p className={`text-sm ${subtextClass}`}>Supports EPSG:4326 (lat/lon + meters Z)</p>
      </div>
    </div>
  );
}

export default Header;
