/**
 * LAZ Decompressor using laz-perf WASM
 * Decompresses LAZ files to LAS format in the browser
 */

import { createLazPerf } from 'laz-perf';

let LazPerf = null;
let lazPerfInitializing = null;

/**
 * Initialize the laz-perf WASM module
 * @returns {Promise<object>}
 */
async function initLazPerf() {
  if (LazPerf) return LazPerf;
  
  if (lazPerfInitializing) {
    return lazPerfInitializing;
  }

  lazPerfInitializing = createLazPerf().then((module) => {
    LazPerf = module;
    return module;
  });

  return lazPerfInitializing;
}

/**
 * Check if a file is a LAZ file based on extension
 * @param {string} filename
 * @returns {boolean}
 */
export function isLazFile(filename) {
  return filename.toLowerCase().endsWith('.laz');
}

/**
 * Check if a file is a LAS file based on extension
 * @param {string} filename
 * @returns {boolean}
 */
export function isLasFile(filename) {
  return filename.toLowerCase().endsWith('.las');
}

/**
 * Check if file is a supported point cloud format
 * @param {string} filename
 * @returns {boolean}
 */
export function isSupportedFile(filename) {
  const lower = filename.toLowerCase();
  return lower.endsWith('.las') || lower.endsWith('.laz');
}

/**
 * Read LAZ header to get point count and format info
 * @param {ArrayBuffer} buffer - LAZ file buffer
 * @returns {Object} Header information
 */
function readLazHeader(buffer) {
  const view = new DataView(buffer);
  
  // Verify signature
  const signature = String.fromCharCode(
    view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)
  );
  
  if (signature !== 'LASF') {
    throw new Error('Invalid LAZ file signature');
  }

  const versionMajor = view.getUint8(24);
  const versionMinor = view.getUint8(25);
  const headerSize = view.getUint16(94, true);
  const offsetToPointData = view.getUint32(96, true);
  const pointDataRecordFormat = view.getUint8(104);
  const pointDataRecordLength = view.getUint16(105, true);
  const legacyNumberOfPoints = view.getUint32(107, true);

  // Scale and offset
  const scaleX = view.getFloat64(131, true);
  const scaleY = view.getFloat64(139, true);
  const scaleZ = view.getFloat64(147, true);
  const offsetX = view.getFloat64(155, true);
  const offsetY = view.getFloat64(163, true);
  const offsetZ = view.getFloat64(171, true);

  // Get 64-bit point count for LAS 1.4
  let numberOfPoints = legacyNumberOfPoints;
  if (versionMajor >= 1 && versionMinor >= 4 && headerSize >= 375) {
    const low = view.getUint32(247, true);
    const high = view.getUint32(251, true);
    const count64 = low + high * 0x100000000;
    if (count64 > 0) numberOfPoints = count64;
  }

  return {
    signature,
    versionMajor,
    versionMinor,
    headerSize,
    offsetToPointData,
    pointDataRecordFormat,
    pointDataRecordLength,
    numberOfPoints,
    scaleX,
    scaleY,
    scaleZ,
    offsetX,
    offsetY,
    offsetZ,
  };
}

/**
 * Decompress a LAZ buffer to LAS format
 * @param {ArrayBuffer} lazBuffer - Compressed LAZ file buffer
 * @param {(progress: number) => void} [onProgress] - Progress callback
 * @returns {Promise<ArrayBuffer>} - Decompressed LAS buffer
 */
export async function decompressLaz(lazBuffer, onProgress) {
  const module = await initLazPerf();
  
  const header = readLazHeader(lazBuffer);
  const { offsetToPointData } = header;

  if (onProgress) onProgress(5);

  // Create the LASZip reader
  const laszip = new module.LASZip();
  
  // Allocate memory in Emscripten heap for the file data
  const fileData = new Uint8Array(lazBuffer);
  const filePtr = module._malloc(fileData.byteLength);
  
  // Copy file data to Emscripten heap
  module.HEAPU8.set(fileData, filePtr);

  let laszip;
  try {
    // Create the LASZip reader
    laszip = new module.LASZip();
    
    // Open the LAZ file
    try {
      laszip.open(filePtr, fileData.byteLength);
    } catch (openError) {
      throw new Error(`Failed to open LAZ file: ${openError.message || 'Unknown error'}`);
    }

    if (onProgress) onProgress(10);

    // Get point count and length from laz-perf
    const pointCount = laszip.getCount();
    const pointLength = laszip.getPointLength();

    console.log(`LAZ: ${pointCount} points, ${pointLength} bytes per point`);

    // Allocate buffer for decompressed LAS file
    const pointDataSize = pointCount * pointLength;
    const totalSize = offsetToPointData + pointDataSize;
    const outputBuffer = new ArrayBuffer(totalSize);
    const outputView = new Uint8Array(outputBuffer);
    const outputDataView = new DataView(outputBuffer);

    // Copy header from original LAZ file
    const headerView = new Uint8Array(lazBuffer, 0, offsetToPointData);
    outputView.set(headerView);

    // Modify the output to be a LAS file (remove LAZ compression marker)
    // Clear compression bits from point format (bits 6-7)
    const originalFormat = outputDataView.getUint8(104);
    outputDataView.setUint8(104, originalFormat & 0x3F);

    if (onProgress) onProgress(15);

    // Allocate buffer for single point in Emscripten heap
    const pointPtr = module._malloc(pointLength);

    // Decompress points
    const progressInterval = Math.max(1, Math.floor(pointCount / 85));

    for (let i = 0; i < pointCount; i++) {
      // Read decompressed point into heap buffer
      laszip.getPoint(pointPtr);
      
      // Copy point data from heap to output buffer
      const pointData = new Uint8Array(module.HEAPU8.buffer, pointPtr, pointLength);
      outputView.set(pointData, offsetToPointData + i * pointLength);

      if (onProgress && i % progressInterval === 0) {
        onProgress(15 + (i / pointCount) * 85);
      }
    }

    // Free the point buffer
    module._free(pointPtr);

    if (onProgress) onProgress(100);

    return outputBuffer;
  } finally {
    // Clean up
    if (laszip) {
      laszip.delete();
    }
    module._free(filePtr);
  }
}

/**
 * Process a file - decompress if LAZ, pass through if LAS
 * @param {File} file - Input file
 * @param {(progress: number) => void} [onProgress] - Progress callback
 * @returns {Promise<{buffer: ArrayBuffer, originalName: string, wasCompressed: boolean}>}
 */
export async function processFile(file, onProgress) {
  const buffer = await file.arrayBuffer();
  const filename = file.name;

  if (isLazFile(filename)) {
    if (onProgress) onProgress(0);
    const decompressed = await decompressLaz(buffer, onProgress);
    return {
      buffer: decompressed,
      originalName: filename,
      wasCompressed: true,
    };
  }

  // LAS file - pass through
  return {
    buffer,
    originalName: filename,
    wasCompressed: false,
  };
}

export default {
  isLazFile,
  isLasFile,
  isSupportedFile,
  decompressLaz,
  processFile,
};
