import { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';

/**
 * @typedef {'3d' | 'horizontal' | 'vertical'} MeasureAxis
 */

/**
 * @typedef {Object} MeasurementState
 * @property {boolean} enabled
 * @property {THREE.Vector3[]} points
 * @property {number | null} distance
 * @property {MeasureAxis} axis
 */

/**
 * Custom hook for measurement functionality
 * @param {React.RefObject<{scene: THREE.Scene, camera: THREE.Camera, points: THREE.Points}>} threeRef
 * @param {{x: number, y: number, z: number} | null} extentMeters
 * @returns {Object}
 */
export function useMeasurement(threeRef, extentMeters) {
  const [enabled, setEnabled] = useState(false);
  const [points, setPoints] = useState([]);
  const [distance, setDistance] = useState(null);
  const [axis, setAxis] = useState('3d');

  const measureLineRef = useRef(null);
  const measureCylinderRef = useRef(null);
  const measureMarkersRef = useRef([]);

  /**
   * Calculate distance based on axis mode
   */
  const calculateDistance = useCallback((p1, p2, axisMode) => {
    if (axisMode === 'horizontal') {
      return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    } else if (axisMode === 'vertical') {
      return Math.abs(p2.z - p1.z);
    }
    return p1.distanceTo(p2);
  }, []);

  /**
   * Add a marker sphere at a position
   */
  const addMarker = useCallback(
    (position, color) => {
      const scene = threeRef.current?.scene;
      if (!scene) return;

      const geometry = new THREE.SphereGeometry(0.5, 16, 16);
      const material = new THREE.MeshBasicMaterial({ color });
      const marker = new THREE.Mesh(geometry, material);
      marker.position.copy(position);

      // Scale marker based on scene size
      if (extentMeters) {
        const maxExtent = Math.max(extentMeters.x, extentMeters.y, extentMeters.z);
        marker.scale.setScalar(maxExtent * 0.005);
      }

      scene.add(marker);
      measureMarkersRef.current.push(marker);
    },
    [threeRef, extentMeters]
  );

  /**
   * Draw measurement line between two points
   */
  const drawLine = useCallback(
    (p1, p2, axisMode) => {
      const scene = threeRef.current?.scene;
      if (!scene) return;

      // Remove old line
      if (measureLineRef.current) {
        scene.remove(measureLineRef.current);
        measureLineRef.current.geometry.dispose();
        measureLineRef.current.material.dispose();
        measureLineRef.current = null;
      }

      // Remove old cylinder
      if (measureCylinderRef.current) {
        scene.remove(measureCylinderRef.current);
        measureCylinderRef.current.geometry.dispose();
        measureCylinderRef.current.material.dispose();
        measureCylinderRef.current = null;
      }

      // Determine line endpoints and color based on axis mode
      let linePoints;
      let lineColor = 0xffff00; // Default yellow

      if (axisMode === 'horizontal') {
        const p2Projected = new THREE.Vector3(p2.x, p2.y, p1.z);
        linePoints = [p1, p2Projected];
        lineColor = 0x00ffff; // Cyan
      } else if (axisMode === 'vertical') {
        const p2Projected = new THREE.Vector3(p1.x, p1.y, p2.z);
        linePoints = [p1, p2Projected];
        lineColor = 0xff00ff; // Magenta
      } else {
        linePoints = [p1, p2];
      }

      // Create line
      const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
      const material = new THREE.LineBasicMaterial({
        color: lineColor,
        linewidth: 6,
        depthTest: false,
      });
      const line = new THREE.Line(geometry, material);
      line.renderOrder = 999;
      scene.add(line);
      measureLineRef.current = line;

      // Create cylinder for better visibility
      const direction = new THREE.Vector3().subVectors(linePoints[1], linePoints[0]);
      const length = direction.length();

      if (length > 0 && extentMeters) {
        const radius =
          Math.max(extentMeters.x, extentMeters.y, extentMeters.z) * 0.002;
        const cylinderGeom = new THREE.CylinderGeometry(radius, radius, length, 8);
        const cylinderMat = new THREE.MeshBasicMaterial({
          color: lineColor,
          transparent: true,
          opacity: 0.8,
        });
        const cylinder = new THREE.Mesh(cylinderGeom, cylinderMat);

        // Position at midpoint
        const midpoint = new THREE.Vector3()
          .addVectors(linePoints[0], linePoints[1])
          .multiplyScalar(0.5);
        cylinder.position.copy(midpoint);

        // Align to direction
        cylinder.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction.normalize()
        );
        cylinder.renderOrder = 998;

        scene.add(cylinder);
        measureCylinderRef.current = cylinder;
      }
    },
    [threeRef, extentMeters]
  );

  /**
   * Clear all measurement visuals
   */
  const clearVisuals = useCallback(() => {
    const scene = threeRef.current?.scene;
    if (!scene) return;

    if (measureLineRef.current) {
      scene.remove(measureLineRef.current);
      measureLineRef.current.geometry.dispose();
      measureLineRef.current.material.dispose();
      measureLineRef.current = null;
    }

    if (measureCylinderRef.current) {
      scene.remove(measureCylinderRef.current);
      measureCylinderRef.current.geometry.dispose();
      measureCylinderRef.current.material.dispose();
      measureCylinderRef.current = null;
    }

    measureMarkersRef.current.forEach((marker) => {
      scene.remove(marker);
      marker.geometry.dispose();
      marker.material.dispose();
    });
    measureMarkersRef.current = [];
  }, [threeRef]);

  /**
   * Handle click for measurement
   */
  const handleClick = useCallback(
    (event, containerRect) => {
      if (!enabled || !threeRef.current?.points) return;

      const { camera, points: pointCloud } = threeRef.current;

      const x = ((event.clientX - containerRect.left) / containerRect.width) * 2 - 1;
      const y = -((event.clientY - containerRect.top) / containerRect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      // Set threshold based on point cloud extent
      const threshold = extentMeters
        ? Math.max(extentMeters.x, extentMeters.y, extentMeters.z) * 0.01
        : 2;
      raycaster.params.Points.threshold = threshold;
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

      const intersects = raycaster.intersectObject(pointCloud);

      if (intersects.length > 0) {
        const point = intersects[0].point.clone();

        if (points.length === 0) {
          // First point
          setPoints([point]);
          setDistance(null);
          clearVisuals();
          addMarker(point, 0x00ff00);
        } else if (points.length === 1) {
          // Second point
          const p1 = points[0];
          const dist = calculateDistance(p1, point, axis);

          setPoints([p1, point]);
          setDistance(dist);
          addMarker(point, 0xff0000);
          drawLine(p1, point, axis);
        } else {
          // Reset and start new measurement
          clearVisuals();
          setPoints([point]);
          setDistance(null);
          addMarker(point, 0x00ff00);
        }
      }
    },
    [enabled, threeRef, extentMeters, points, axis, clearVisuals, addMarker, calculateDistance, drawLine]
  );

  /**
   * Toggle measurement mode
   */
  const toggle = useCallback(() => {
    if (enabled) {
      clearVisuals();
      setPoints([]);
      setDistance(null);
    }
    setEnabled(!enabled);
  }, [enabled, clearVisuals]);

  /**
   * Clear current measurement
   */
  const clear = useCallback(() => {
    clearVisuals();
    setPoints([]);
    setDistance(null);
  }, [clearVisuals]);

  // Recalculate when axis changes
  useEffect(() => {
    if (points.length === 2) {
      const dist = calculateDistance(points[0], points[1], axis);
      setDistance(dist);
      drawLine(points[0], points[1], axis);
    }
  }, [axis, points, calculateDistance, drawLine]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearVisuals();
    };
  }, [clearVisuals]);

  return {
    enabled,
    points,
    distance,
    axis,
    setAxis,
    toggle,
    clear,
    handleClick,
  };
}

/**
 * Format distance for display
 * @param {number} meters
 * @returns {{metric: string, imperial: string, raw: string}}
 */
export function formatDistance(meters) {
  let metric;
  if (meters < 1) {
    metric = `${(meters * 100).toFixed(2)} cm`;
  } else if (meters < 1000) {
    metric = `${meters.toFixed(3)} m`;
  } else {
    metric = `${(meters / 1000).toFixed(3)} km`;
  }

  const totalFeet = meters * 3.28084;
  let imperial;
  if (totalFeet < 1) {
    imperial = `${(meters * 39.3701).toFixed(2)} in`;
  } else {
    const feet = Math.floor(totalFeet);
    const inches = ((totalFeet - feet) * 12).toFixed(1);
    imperial = `${feet}' ${inches}"`;
  }

  const raw = `${meters.toFixed(4)} m / ${(meters * 3.28084).toFixed(4)} ft`;

  return { metric, imperial, raw };
}

export default useMeasurement;
