/**
 * LAS Parser with EPSG:4326 support (lat/lon degrees + meters elevation)
 * Supports LAS 1.0 - 1.4, Point Formats 0-10
 */

/**
 * Generate elevation-based color gradient
 * @param {number} t - Normalized value 0-1
 * @returns {{r: number, g: number, b: number}}
 */
export function elevationColor(t) {
  t = Math.max(0, Math.min(1, t));
  let r, g, b;
  if (t < 0.25) {
    r = 0;
    g = t * 4;
    b = 1;
  } else if (t < 0.5) {
    r = 0;
    g = 1;
    b = 1 - (t - 0.25) * 4;
  } else if (t < 0.75) {
    r = (t - 0.5) * 4;
    g = 1;
    b = 0;
  } else {
    r = 1;
    g = 1 - (t - 0.75) * 4;
    b = 0;
  }
  return { r, g, b };
}

/**
 * @typedef {Object} LASHeader
 * @property {string} signature
 * @property {number} versionMajor
 * @property {number} versionMinor
 * @property {number} headerSize
 * @property {number} offsetToPointData
 * @property {number} pointDataRecordFormat
 * @property {number} pointDataRecordLength
 * @property {number} numberOfPoints
 * @property {number} scaleX
 * @property {number} scaleY
 * @property {number} scaleZ
 * @property {number} offsetX
 * @property {number} offsetY
 * @property {number} offsetZ
 * @property {number} [loadedPoints]
 * @property {{lon: [number, number], lat: [number, number], z: [number, number]}} [bounds]
 * @property {{lon: number, lat: number, z: number}} [center]
 * @property {{x: number, y: number, z: number}} [extentMeters]
 */

/**
 * @typedef {Object} LASPoints
 * @property {Float32Array} positions
 * @property {Float32Array} colors
 */

/**
 * @typedef {Object} LASData
 * @property {LASHeader} header
 * @property {LASPoints} points
 */

export class LASParser {
  /**
   * @param {ArrayBuffer} arrayBuffer
   * @param {{isGeographic?: boolean, maxPoints?: number, onProgress?: (progress: number) => void}} options
   */
  constructor(arrayBuffer, options = {}) {
    this.buffer = arrayBuffer;
    this.view = new DataView(arrayBuffer);
    this.header = {};
    this.isGeographic = options.isGeographic !== false;
    this.maxPoints = options.maxPoints || 2000000;
    this.onProgress = options.onProgress || null;
  }

  /**
   * Parse the LAS file
   * @returns {LASData}
   */
  parse() {
    this.parseHeader();
    const points = this.parsePoints();
    return { header: this.header, points };
  }

  /**
   * Validate LAS file before full parsing
   * @returns {{valid: boolean, error?: string, pointCount?: number, estimatedMemory?: number}}
   */
  validate() {
    try {
      const signature = String.fromCharCode(
        this.view.getUint8(0),
        this.view.getUint8(1),
        this.view.getUint8(2),
        this.view.getUint8(3)
      );

      if (signature !== 'LASF') {
        return { valid: false, error: `Invalid LAS file signature: ${signature}` };
      }

      const legacyNumberOfPoints = this.view.getUint32(107, true);
      const versionMajor = this.view.getUint8(24);
      const versionMinor = this.view.getUint8(25);
      const headerSize = this.view.getUint16(94, true);

      let numberOfPoints = legacyNumberOfPoints;
      if (versionMajor >= 1 && versionMinor >= 4 && headerSize >= 375) {
        const low = this.view.getUint32(247, true);
        const high = this.view.getUint32(251, true);
        const count64 = low + high * 0x100000000;
        if (count64 > 0) numberOfPoints = count64;
      }

      // Estimate memory: positions (3 floats) + colors (3 floats) = 24 bytes per point
      const estimatedMemory = Math.min(numberOfPoints, this.maxPoints) * 24;

      return {
        valid: true,
        pointCount: numberOfPoints,
        estimatedMemory,
      };
    } catch (err) {
      return { valid: false, error: `Failed to read LAS header: ${err.message}` };
    }
  }

  parseHeader() {
    const view = this.view;

    const signature = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3)
    );

    if (signature !== 'LASF') {
      throw new Error('Invalid LAS file signature: ' + signature);
    }

    const versionMajor = view.getUint8(24);
    const versionMinor = view.getUint8(25);
    const headerSize = view.getUint16(94, true);
    const offsetToPointData = view.getUint32(96, true);
    const pointDataRecordFormat = view.getUint8(104);
    const pointDataRecordLength = view.getUint16(105, true);
    const legacyNumberOfPoints = view.getUint32(107, true);

    const scaleX = view.getFloat64(131, true);
    const scaleY = view.getFloat64(139, true);
    const scaleZ = view.getFloat64(147, true);
    const offsetX = view.getFloat64(155, true);
    const offsetY = view.getFloat64(163, true);
    const offsetZ = view.getFloat64(171, true);

    let numberOfPoints = legacyNumberOfPoints;
    if (versionMajor >= 1 && versionMinor >= 4 && headerSize >= 375) {
      const low = view.getUint32(247, true);
      const high = view.getUint32(251, true);
      const count64 = low + high * 0x100000000;
      if (count64 > 0) numberOfPoints = count64;
    }

    this.header = {
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

  parsePoints() {
    const h = this.header;
    const view = this.view;
    const format = h.pointDataRecordFormat;

    let hasRGB = false;
    let rgbOffset = 0;

    // Determine RGB offset based on point format
    switch (format) {
      case 2:
        hasRGB = true;
        rgbOffset = 20;
        break;
      case 3:
      case 5:
        hasRGB = true;
        rgbOffset = 28;
        break;
      case 7:
      case 8:
      case 10:
        hasRGB = true;
        rgbOffset = 30;
        break;
    }

    const totalPoints = h.numberOfPoints;
    const step = totalPoints > this.maxPoints ? Math.ceil(totalPoints / this.maxPoints) : 1;
    const recordLen = h.pointDataRecordLength;

    const rawPoints = [];
    let minLon = Infinity,
      maxLon = -Infinity;
    let minLat = Infinity,
      maxLat = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;

    const progressInterval = Math.floor(totalPoints / 100) || 1;

    for (let i = 0; i < totalPoints; i += step) {
      const offset = h.offsetToPointData + i * recordLen;
      if (offset + 12 > this.buffer.byteLength) break;

      const rawX = view.getInt32(offset, true);
      const rawY = view.getInt32(offset + 4, true);
      const rawZ = view.getInt32(offset + 8, true);

      const lon = rawX * h.scaleX + h.offsetX;
      const lat = rawY * h.scaleY + h.offsetY;
      const z = rawZ * h.scaleZ + h.offsetZ;

      rawPoints.push({ lon, lat, z, offset });

      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;

      // Report progress
      if (this.onProgress && i % progressInterval === 0) {
        this.onProgress((i / totalPoints) * 50); // First 50% is reading points
      }
    }

    const centerLon = (minLon + maxLon) / 2;
    const centerLat = (minLat + maxLat) / 2;
    const centerZ = (minZ + maxZ) / 2;

    const DEG_TO_RAD = Math.PI / 180;
    const metersPerDegreeLat = 111320;
    const metersPerDegreeLon = 111320 * Math.cos(centerLat * DEG_TO_RAD);

    const numPoints = rawPoints.length;
    const positions = new Float32Array(numPoints * 3);
    const colors = new Float32Array(numPoints * 3);
    const zRange = maxZ - minZ || 1;

    for (let i = 0; i < numPoints; i++) {
      const pt = rawPoints[i];
      const idx = i * 3;

      // X = East (longitude), Y = North (latitude), Z = Up (elevation)
      const xMeters = (pt.lon - centerLon) * metersPerDegreeLon;
      const yMeters = (pt.lat - centerLat) * metersPerDegreeLat;
      const zMeters = pt.z - centerZ;

      positions[idx] = xMeters;
      positions[idx + 1] = yMeters;
      positions[idx + 2] = zMeters;

      let r = 0.5,
        g = 0.5,
        b = 0.5;

      if (hasRGB && pt.offset + rgbOffset + 6 <= this.buffer.byteLength) {
        const red = view.getUint16(pt.offset + rgbOffset, true);
        const green = view.getUint16(pt.offset + rgbOffset + 2, true);
        const blue = view.getUint16(pt.offset + rgbOffset + 4, true);

        if (red > 255 || green > 255 || blue > 255) {
          r = red / 65535;
          g = green / 65535;
          b = blue / 65535;
        } else if (red > 0 || green > 0 || blue > 0) {
          r = red / 255;
          g = green / 255;
          b = blue / 255;
        }

        if (r === 0 && g === 0 && b === 0) {
          const t = (pt.z - minZ) / zRange;
          const c = elevationColor(t);
          r = c.r;
          g = c.g;
          b = c.b;
        }
      } else {
        const t = (pt.z - minZ) / zRange;
        const c = elevationColor(t);
        r = c.r;
        g = c.g;
        b = c.b;
      }

      colors[idx] = r;
      colors[idx + 1] = g;
      colors[idx + 2] = b;

      // Report progress
      if (this.onProgress && i % progressInterval === 0) {
        this.onProgress(50 + (i / numPoints) * 50); // Second 50% is processing
      }
    }

    const extentX = (maxLon - minLon) * metersPerDegreeLon;
    const extentY = (maxLat - minLat) * metersPerDegreeLat;
    const extentZ = maxZ - minZ;

    this.header.loadedPoints = numPoints;
    this.header.bounds = {
      lon: [minLon, maxLon],
      lat: [minLat, maxLat],
      z: [minZ, maxZ],
    };
    this.header.center = { lon: centerLon, lat: centerLat, z: centerZ };
    this.header.extentMeters = { x: extentX, y: extentY, z: extentZ };

    if (this.onProgress) {
      this.onProgress(100);
    }

    return { positions, colors };
  }
}

export default LASParser;
