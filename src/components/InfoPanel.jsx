import React from 'react';

/**
 * @typedef {Object} FileInfoData
 * @property {string} name
 * @property {string} size
 * @property {string} version
 * @property {number} format
 * @property {string} totalPoints
 * @property {string} loadedPoints
 * @property {{lon: [number, number], lat: [number, number], z: [number, number]}} bounds
 * @property {{lon: number, lat: number, z: number}} center
 * @property {{x: number, y: number, z: number}} extentMeters
 */

/**
 * Info Panel Component - displays file metadata
 * @param {{fileInfo: FileInfoData}} props
 */
export function InfoPanel({ fileInfo }) {
  if (!fileInfo) return null;

  return (
    <div
      className="w-72 bg-gray-800 p-3 border-l border-gray-700 text-sm overflow-auto"
      role="complementary"
      aria-label="File information panel"
    >
      <h2 className="font-semibold text-blue-400 mb-3">File Info</h2>
      <div className="space-y-2">
        <div>
          <span className="text-gray-400">Name:</span>
          <div className="text-white break-all">{fileInfo.name}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-gray-400">Size:</span>
            <div>{fileInfo.size} MB</div>
          </div>
          <div>
            <span className="text-gray-400">Version:</span>
            <div>{fileInfo.version}</div>
          </div>
        </div>

        <div>
          <span className="text-gray-400">Format:</span>
          <span className="ml-1">{fileInfo.format}</span>
        </div>

        <div>
          <span className="text-gray-400">Total Points:</span>
          <div>{fileInfo.totalPoints}</div>
        </div>

        <div>
          <span className="text-gray-400">Loaded:</span>
          <div>{fileInfo.loadedPoints}</div>
        </div>

        <div className="pt-2 border-t border-gray-700">
          <span className="text-gray-400">Geographic Bounds:</span>
          <div className="font-mono text-xs mt-1 bg-gray-900 p-2 rounded">
            <div className="text-yellow-400">
              Lon: {fileInfo.bounds.lon[0].toFixed(6)}°
            </div>
            <div className="text-yellow-400 pl-4">
              → {fileInfo.bounds.lon[1].toFixed(6)}°
            </div>
            <div className="text-green-400">
              Lat: {fileInfo.bounds.lat[0].toFixed(6)}°
            </div>
            <div className="text-green-400 pl-4">
              → {fileInfo.bounds.lat[1].toFixed(6)}°
            </div>
            <div className="text-blue-400">
              Elev: {fileInfo.bounds.z[0].toFixed(2)}m
            </div>
            <div className="text-blue-400 pl-4">
              → {fileInfo.bounds.z[1].toFixed(2)}m
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-700">
          <span className="text-gray-400">Center:</span>
          <div className="font-mono text-xs mt-1 bg-gray-900 p-2 rounded">
            <div>{fileInfo.center.lat.toFixed(6)}°N</div>
            <div>{fileInfo.center.lon.toFixed(6)}°E</div>
            <div>{fileInfo.center.z.toFixed(2)}m</div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-700">
          <span className="text-gray-400">Extent (meters):</span>
          <div className="font-mono text-xs mt-1 bg-gray-900 p-2 rounded">
            <div>X (E-W): {fileInfo.extentMeters.x.toFixed(2)}m</div>
            <div>Y (N-S): {fileInfo.extentMeters.y.toFixed(2)}m</div>
            <div>Z (Up): {fileInfo.extentMeters.z.toFixed(2)}m</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InfoPanel;
