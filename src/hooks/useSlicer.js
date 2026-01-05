import { useReducer, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * @typedef {Object} SliceBounds
 * @property {number} min
 * @property {number} max
 */

/**
 * @typedef {Object} SliceRange
 * @property {number} min - Percentage 0-100
 * @property {number} max - Percentage 0-100
 */

/**
 * @typedef {Object} SlicerState
 * @property {boolean} enabled
 * @property {SliceRange} x
 * @property {SliceRange} y
 * @property {SliceRange} z
 * @property {SliceBounds} boundsX
 * @property {SliceBounds} boundsY
 * @property {SliceBounds} boundsZ
 */

const initialState = {
  enabled: false,
  x: { min: 0, max: 100 },
  y: { min: 0, max: 100 },
  z: { min: 0, max: 100 },
  boundsX: { min: 0, max: 100 },
  boundsY: { min: 0, max: 100 },
  boundsZ: { min: 0, max: 100 },
};

/**
 * Reducer for slicer state
 */
function slicerReducer(state, action) {
  switch (action.type) {
    case 'SET_ENABLED':
      return { ...state, enabled: action.payload };

    case 'SET_X':
      return { ...state, x: action.payload };

    case 'SET_Y':
      return { ...state, y: action.payload };

    case 'SET_Z':
      return { ...state, z: action.payload };

    case 'SET_BOUNDS':
      return {
        ...state,
        boundsX: action.payload.x,
        boundsY: action.payload.y,
        boundsZ: action.payload.z,
      };

    case 'RESET_RANGES':
      return {
        ...state,
        x: { min: 0, max: 100 },
        y: { min: 0, max: 100 },
        z: { min: 0, max: 100 },
      };

    case 'RESET_ALL':
      return {
        ...initialState,
        boundsX: state.boundsX,
        boundsY: state.boundsY,
        boundsZ: state.boundsZ,
      };

    case 'INITIALIZE':
      return {
        ...initialState,
        boundsX: action.payload.x,
        boundsY: action.payload.y,
        boundsZ: action.payload.z,
      };

    default:
      return state;
  }
}

/**
 * Custom hook for slicer functionality with debouncing
 * @param {React.RefObject} threeRef
 * @param {string} pointColor
 * @param {number} rotationZ
 * @returns {Object}
 */
export function useSlicer(threeRef, pointColor, rotationZ) {
  const [state, dispatch] = useReducer(slicerReducer, initialState);
  const debounceTimerRef = useRef(null);
  const lastAppliedRef = useRef(null);

  /**
   * Calculate world-space bounds when rotation changes
   */
  const updateBoundsForRotation = useCallback((positions, rotDegrees) => {
    if (!positions || positions.length === 0) return;

    const rotRad = (rotDegrees * Math.PI) / 180;
    const cosR = Math.cos(rotRad);
    const sinR = Math.sin(rotRad);

    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;

    for (let i = 0; i < positions.length; i += 3) {
      const localX = positions[i];
      const localY = positions[i + 1];
      const localZ = positions[i + 2];

      const worldX = localX * cosR - localY * sinR;
      const worldY = localX * sinR + localY * cosR;
      const worldZ = localZ;

      if (worldX < minX) minX = worldX;
      if (worldX > maxX) maxX = worldX;
      if (worldY < minY) minY = worldY;
      if (worldY > maxY) maxY = worldY;
      if (worldZ < minZ) minZ = worldZ;
      if (worldZ > maxZ) maxZ = worldZ;
    }

    dispatch({
      type: 'SET_BOUNDS',
      payload: {
        x: { min: minX, max: maxX },
        y: { min: minY, max: maxY },
        z: { min: minZ, max: maxZ },
      },
    });
  }, []);

  /**
   * Apply slicer filter to point cloud (debounced)
   */
  const applySlice = useCallback(() => {
    const { points, originalPositions, originalColors } = threeRef.current || {};
    if (!points || !originalPositions) return;

    const geometry = points.geometry;

    if (!state.enabled) {
      // Restore all points without creating unnecessary copies
      const currentPosCount = geometry.attributes.position?.count || 0;
      const originalCount = originalPositions.length / 3;

      // Only update if counts differ (was sliced before)
      if (currentPosCount !== originalCount) {
        geometry.setAttribute(
          'position',
          new THREE.BufferAttribute(new Float32Array(originalPositions), 3)
        );

        if (pointColor === 'original') {
          geometry.setAttribute(
            'color',
            new THREE.BufferAttribute(new Float32Array(originalColors), 3)
          );
        } else {
          const color = new THREE.Color(pointColor);
          const newColors = new Float32Array(originalCount * 3);
          for (let i = 0; i < originalCount; i++) {
            newColors[i * 3] = color.r;
            newColors[i * 3 + 1] = color.g;
            newColors[i * 3 + 2] = color.b;
          }
          geometry.setAttribute('color', new THREE.BufferAttribute(newColors, 3));
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
        geometry.computeBoundingBox();
      }
      return;
    }

    // Calculate actual bounds for each axis
    const xMin =
      state.boundsX.min + (state.x.min / 100) * (state.boundsX.max - state.boundsX.min);
    const xMax =
      state.boundsX.min + (state.x.max / 100) * (state.boundsX.max - state.boundsX.min);
    const yMin =
      state.boundsY.min + (state.y.min / 100) * (state.boundsY.max - state.boundsY.min);
    const yMax =
      state.boundsY.min + (state.y.max / 100) * (state.boundsY.max - state.boundsY.min);
    const zMin =
      state.boundsZ.min + (state.z.min / 100) * (state.boundsZ.max - state.boundsZ.min);
    const zMax =
      state.boundsZ.min + (state.z.max / 100) * (state.boundsZ.max - state.boundsZ.min);

    // Get rotation
    const rotRad = (rotationZ * Math.PI) / 180;
    const cosR = Math.cos(rotRad);
    const sinR = Math.sin(rotRad);

    const filteredPositions = [];
    const filteredColors = [];
    const solidColor = pointColor !== 'original' ? new THREE.Color(pointColor) : null;

    for (let i = 0; i < originalPositions.length / 3; i++) {
      const localX = originalPositions[i * 3];
      const localY = originalPositions[i * 3 + 1];
      const localZ = originalPositions[i * 3 + 2];

      // Transform to world coordinates
      const worldX = localX * cosR - localY * sinR;
      const worldY = localX * sinR + localY * cosR;
      const worldZ = localZ;

      // Check bounds
      if (
        worldX >= xMin &&
        worldX <= xMax &&
        worldY >= yMin &&
        worldY <= yMax &&
        worldZ >= zMin &&
        worldZ <= zMax
      ) {
        filteredPositions.push(localX, localY, localZ);

        if (solidColor) {
          filteredColors.push(solidColor.r, solidColor.g, solidColor.b);
        } else {
          filteredColors.push(
            originalColors[i * 3],
            originalColors[i * 3 + 1],
            originalColors[i * 3 + 2]
          );
        }
      }
    }

    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(filteredPositions), 3)
    );
    geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(new Float32Array(filteredColors), 3)
    );
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.computeBoundingBox();
  }, [state, pointColor, rotationZ, threeRef]);

  /**
   * Debounced slice application
   */
  const applySliceDebounced = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Create a key to detect actual changes
    const currentKey = JSON.stringify({
      enabled: state.enabled,
      x: state.x,
      y: state.y,
      z: state.z,
      pointColor,
      rotationZ,
    });

    // Skip if nothing changed
    if (lastAppliedRef.current === currentKey) {
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      applySlice();
      lastAppliedRef.current = currentKey;
    }, 50); // 50ms debounce
  }, [state, pointColor, rotationZ, applySlice]);

  // Apply slice when state changes
  useEffect(() => {
    applySliceDebounced();

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [applySliceDebounced]);

  // Update bounds when rotation changes
  useEffect(() => {
    const positions = threeRef.current?.originalPositions;
    if (positions) {
      updateBoundsForRotation(positions, rotationZ);
    }
  }, [rotationZ, threeRef, updateBoundsForRotation]);

  // Actions
  const setEnabled = useCallback((enabled) => {
    dispatch({ type: 'SET_ENABLED', payload: enabled });
  }, []);

  const setX = useCallback((range) => {
    dispatch({ type: 'SET_X', payload: range });
  }, []);

  const setY = useCallback((range) => {
    dispatch({ type: 'SET_Y', payload: range });
  }, []);

  const setZ = useCallback((range) => {
    dispatch({ type: 'SET_Z', payload: range });
  }, []);

  const resetRanges = useCallback(() => {
    dispatch({ type: 'RESET_RANGES' });
  }, []);

  const initialize = useCallback((bounds) => {
    dispatch({ type: 'INITIALIZE', payload: bounds });
    lastAppliedRef.current = null; // Reset cache on new file
  }, []);

  /**
   * Get actual meter values for display
   */
  const getActualValues = useCallback(
    (axis) => {
      const ranges = { x: state.x, y: state.y, z: state.z };
      const bounds = {
        x: state.boundsX,
        y: state.boundsY,
        z: state.boundsZ,
      };

      const range = ranges[axis];
      const bound = bounds[axis];

      const min = bound.min + (range.min / 100) * (bound.max - bound.min);
      const max = bound.min + (range.max / 100) * (bound.max - bound.min);

      return { min, max };
    },
    [state]
  );

  return {
    ...state,
    setEnabled,
    setX,
    setY,
    setZ,
    resetRanges,
    initialize,
    getActualValues,
    updateBoundsForRotation,
  };
}

export default useSlicer;
