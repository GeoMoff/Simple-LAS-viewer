import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';

// Lib imports
import { LASParser } from './lib/LASParser';
import { OrbitControls } from './lib/OrbitControls';
import { isSupportedFile, isLazFile, processFile } from './lib/LAZDecompressor';

// Hook imports
import { useMeasurement } from './hooks/useMeasurement';
import { useSlicer } from './hooks/useSlicer';

// Component imports
import { InfoPanel } from './components/InfoPanel';
import {
  ViewControls,
  SlicerControls,
  DataRotationControls,
  ControlsHelp,
} from './components/ControlsPanel';
import {
  Header,
  MeasurementOverlay,
  LoadingOverlay,
  ErrorDisplay,
  DropZonePlaceholder,
} from './components/Header';

/**
 * Main LAS Viewer Component
 */
export default function LASViewer() {
  const containerRef = useRef(null);
  const threeRef = useRef({});

  // Core state
  const [fileInfo, setFileInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState(''); // Status message during load
  const [error, setError] = useState(null);

  // Display options
  const [pointSize, setPointSize] = useState(2.0);
  const [opacity, setOpacity] = useState(100);
  const [darkBackground, setDarkBackground] = useState(true);
  const [pointColor, setPointColor] = useState('original');
  const [rotationZ, setRotationZ] = useState(0);

  // Custom hooks
  const measurement = useMeasurement(threeRef, fileInfo?.extentMeters || null);
  const slicer = useSlicer(threeRef, pointColor, rotationZ);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100000);
    camera.up.set(0, 0, 1); // Z is up

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);

    // Data group for rotatable content
    const dataGroup = new THREE.Group();
    scene.add(dataGroup);

    // Ground grid on XY plane (Z = 0)
    const grid = new THREE.GridHelper(100, 20, 0x444466, 0x333344);
    grid.rotation.x = Math.PI / 2;
    dataGroup.add(grid);

    // Axes helper
    const axes = new THREE.AxesHelper(50);
    dataGroup.add(axes);

    // Store references
    threeRef.current = {
      renderer,
      scene,
      camera,
      controls,
      grid,
      axes,
      dataGroup,
      measureLine: null,
      measureMarkers: [],
      measureCylinder: null,
    };

    // Animation loop
    const animate = () => {
      threeRef.current.animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Keyboard controls
    const handleKeyDown = (e) => {
      const controls = threeRef.current.controls;
      if (!controls) return;

      switch (e.key) {
        case 'ArrowLeft':
          controls.panTarget(1, 0);
          e.preventDefault();
          break;
        case 'ArrowRight':
          controls.panTarget(-1, 0);
          e.preventDefault();
          break;
        case 'ArrowUp':
          controls.panTarget(0, 0, 1);
          e.preventDefault();
          break;
        case 'ArrowDown':
          controls.panTarget(0, 0, -1);
          e.preventDefault();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(threeRef.current.animId);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update point size
  useEffect(() => {
    if (threeRef.current.points) {
      threeRef.current.points.material.size = pointSize;
    }
  }, [pointSize]);

  // Update opacity
  useEffect(() => {
    if (threeRef.current.points) {
      threeRef.current.points.material.opacity = opacity / 100;
    }
  }, [opacity]);

  // Update background color
  useEffect(() => {
    if (threeRef.current.scene) {
      threeRef.current.scene.background = new THREE.Color(
        darkBackground ? 0x1a1a2e : 0xffffff
      );

      if (threeRef.current.grid) {
        const gridColor = darkBackground ? 0x444466 : 0xcccccc;
        threeRef.current.grid.material.color.setHex(gridColor);
      }
    }
  }, [darkBackground]);

  // Update point colors
  useEffect(() => {
    if (!threeRef.current.points || !threeRef.current.originalColors) return;
    if (slicer.enabled) return; // Let slicer handle colors when active

    const geometry = threeRef.current.points.geometry;
    const originalColors = threeRef.current.originalColors;

    if (pointColor === 'original') {
      geometry.setAttribute(
        'color',
        new THREE.BufferAttribute(new Float32Array(originalColors), 3)
      );
    } else {
      const color = new THREE.Color(pointColor);
      const numPoints = originalColors.length / 3;
      const newColors = new Float32Array(numPoints * 3);

      for (let i = 0; i < numPoints; i++) {
        newColors[i * 3] = color.r;
        newColors[i * 3 + 1] = color.g;
        newColors[i * 3 + 2] = color.b;
      }

      geometry.setAttribute('color', new THREE.BufferAttribute(newColors, 3));
    }
    geometry.attributes.color.needsUpdate = true;
  }, [pointColor, slicer.enabled]);

  // Apply rotation to points
  useEffect(() => {
    if (threeRef.current.points) {
      threeRef.current.points.rotation.z = (rotationZ * Math.PI) / 180;
    }

    // Update slicer bounds for new rotation
    if (threeRef.current.originalPositions) {
      slicer.updateBoundsForRotation(threeRef.current.originalPositions, rotationZ);
    }
  }, [rotationZ, slicer]);

  // Load file handler
  const loadFile = useCallback(
    async (file) => {
      // Check if file is supported
      if (!isSupportedFile(file.name)) {
        setError('Unsupported file format. Please use .las or .laz files.');
        return;
      }

      // Validate file size (warn if > 100MB)
      if (file.size > 100 * 1024 * 1024) {
        const confirmLoad = window.confirm(
          `This file is ${(file.size / 1024 / 1024).toFixed(1)}MB. Large files may take a while to load. Continue?`
        );
        if (!confirmLoad) return;
      }

      setLoading(true);
      setLoadProgress(0);
      setLoadingStatus('');
      setError(null);

      try {
        let buffer;
        const isLaz = isLazFile(file.name);

        if (isLaz) {
          // Decompress LAZ file first
          setLoadingStatus('Decompressing LAZ file...');
          const result = await processFile(file, (progress) => {
            setLoadProgress(progress * 0.4); // 0-40% for decompression
          });
          buffer = result.buffer;
          setLoadingStatus('Parsing point cloud...');
        } else {
          buffer = await file.arrayBuffer();
          setLoadingStatus('Parsing point cloud...');
        }

        const parser = new LASParser(buffer, {
          isGeographic: true,
          onProgress: (progress) => {
            // If LAZ, progress is 40-100%, otherwise 0-100%
            setLoadProgress(isLaz ? 40 + progress * 0.6 : progress);
          },
        });

        // Validate before full parse
        const validation = parser.validate();
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        const data = parser.parse();

        const { scene, camera, controls, grid, axes, dataGroup } = threeRef.current;

        // Remove existing points
        if (threeRef.current.points) {
          dataGroup.remove(threeRef.current.points);
          threeRef.current.points.geometry.dispose();
          threeRef.current.points.material.dispose();
        }

        // Create geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          'position',
          new THREE.BufferAttribute(data.points.positions, 3)
        );
        geometry.setAttribute(
          'color',
          new THREE.BufferAttribute(data.points.colors, 3)
        );

        // Store original data
        threeRef.current.originalPositions = data.points.positions.slice();
        threeRef.current.originalColors = data.points.colors.slice();

        // Create material
        const material = new THREE.PointsMaterial({
          size: pointSize,
          vertexColors: true,
          sizeAttenuation: false,
          transparent: true,
          opacity: opacity / 100,
        });

        // Create points mesh
        const points = new THREE.Points(geometry, material);
        dataGroup.add(points);
        threeRef.current.points = points;

        // Update camera
        const ext = data.header.extentMeters;
        const maxExtent = Math.max(ext.x, ext.y, ext.z);

        camera.near = maxExtent * 0.0001;
        camera.far = maxExtent * 100;
        camera.updateProjectionMatrix();

        // Update grid
        dataGroup.remove(grid);
        dataGroup.remove(axes);

        const gridSize = Math.max(ext.x, ext.y) * 1.5;
        const newGrid = new THREE.GridHelper(gridSize, 20, 0x444466, 0x333344);
        newGrid.rotation.x = Math.PI / 2;
        newGrid.position.z = -ext.z / 2;
        dataGroup.add(newGrid);

        const newAxes = new THREE.AxesHelper(maxExtent * 0.3);
        newAxes.position.z = -ext.z / 2;
        dataGroup.add(newAxes);

        threeRef.current.grid = newGrid;
        threeRef.current.axes = newAxes;

        // Reset view
        controls.reset(maxExtent);

        // Calculate bounds for slicer
        const positions = data.points.positions;
        let minX = Infinity,
          maxX = -Infinity;
        let minY = Infinity,
          maxY = -Infinity;
        let minZ = Infinity,
          maxZ = -Infinity;

        for (let i = 0; i < positions.length; i += 3) {
          if (positions[i] < minX) minX = positions[i];
          if (positions[i] > maxX) maxX = positions[i];
          if (positions[i + 1] < minY) minY = positions[i + 1];
          if (positions[i + 1] > maxY) maxY = positions[i + 1];
          if (positions[i + 2] < minZ) minZ = positions[i + 2];
          if (positions[i + 2] > maxZ) maxZ = positions[i + 2];
        }

        threeRef.current.dataBounds = {
          x: { min: minX, max: maxX },
          y: { min: minY, max: maxY },
          z: { min: minZ, max: maxZ },
        };

        // Initialize slicer
        slicer.initialize({
          x: { min: minX, max: maxX },
          y: { min: minY, max: maxY },
          z: { min: minZ, max: maxZ },
        });

        // Reset display options
        setPointColor('original');
        setRotationZ(0);

        // Set file info
        const h = data.header;
        setFileInfo({
          name: file.name,
          size: (file.size / 1024 / 1024).toFixed(2),
          version: `${h.versionMajor}.${h.versionMinor}`,
          format: h.pointDataRecordFormat,
          totalPoints: h.numberOfPoints.toLocaleString(),
          loadedPoints: h.loadedPoints.toLocaleString(),
          bounds: h.bounds,
          center: h.center,
          extentMeters: h.extentMeters,
        });
      } catch (err) {
        console.error('Parse error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
        setLoadingStatus('');
      }
    },
    [pointSize, opacity, slicer]
  );

  // File drop handler
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && isSupportedFile(file.name)) {
      loadFile(file);
    }
  };

  // Measurement click handler
  const handleMeasureClick = useCallback(
    (event) => {
      if (!measurement.enabled) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        measurement.handleClick(event, rect);
      }
    },
    [measurement]
  );

  // View control callbacks
  const viewTop = () => threeRef.current.controls?.viewTop();
  const viewFront = () => threeRef.current.controls?.viewFront();
  const viewRight = () => threeRef.current.controls?.viewRight();
  const viewIsometric = () => threeRef.current.controls?.viewIsometric();

  const resetView = () => {
    if (fileInfo && threeRef.current.controls) {
      const ext = fileInfo.extentMeters;
      const maxExtent = Math.max(ext.x, ext.y, ext.z);
      threeRef.current.controls.reset(maxExtent);
    }
  };

  const rotateLeft = () => threeRef.current.controls?.rotateLeft();
  const rotateRight = () => threeRef.current.controls?.rotateRight();
  const rotateUp = () => threeRef.current.controls?.rotateUp();
  const rotateDown = () => threeRef.current.controls?.rotateDown();

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <Header
        onFileSelect={loadFile}
        pointSize={pointSize}
        onPointSizeChange={setPointSize}
        opacity={opacity}
        onOpacityChange={setOpacity}
        darkBackground={darkBackground}
        onDarkBackgroundToggle={() => setDarkBackground(!darkBackground)}
        pointColor={pointColor}
        onPointColorChange={setPointColor}
        measureEnabled={measurement.enabled}
        measureAxis={measurement.axis}
        onMeasureToggle={measurement.toggle}
        onMeasureAxisChange={measurement.setAxis}
        onMeasureClear={measurement.clear}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Main viewport */}
        <div
          ref={containerRef}
          className="flex-1 relative"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={handleMeasureClick}
          style={{ cursor: measurement.enabled ? 'crosshair' : 'default' }}
          role="application"
          aria-label="3D point cloud viewer"
        >
          {/* Empty state */}
          {!fileInfo && !loading && <DropZonePlaceholder darkBackground={darkBackground} />}

          {/* Loading state */}
          {loading && (
            <LoadingOverlay
              darkBackground={darkBackground}
              progress={loadProgress}
              status={loadingStatus}
            />
          )}

          {/* Error state */}
          {error && <ErrorDisplay message={error} onDismiss={() => setError(null)} />}

          {/* Controls help */}
          <ControlsHelp darkBackground={darkBackground} />

          {/* Measurement overlay */}
          {measurement.enabled && (
            <MeasurementOverlay
              darkBackground={darkBackground}
              measureAxis={measurement.axis}
              pointCount={measurement.points.length}
              distance={measurement.distance}
              hasFileInfo={!!fileInfo}
            />
          )}

          {/* View and slicer controls */}
          {fileInfo && (
            <div className="absolute top-2 left-2 flex flex-col gap-2">
              <ViewControls
                darkBackground={darkBackground}
                onViewTop={viewTop}
                onViewFront={viewFront}
                onViewRight={viewRight}
                onViewIsometric={viewIsometric}
                onReset={resetView}
                onRotateLeft={rotateLeft}
                onRotateRight={rotateRight}
                onRotateUp={rotateUp}
                onRotateDown={rotateDown}
              />

              <SlicerControls
                darkBackground={darkBackground}
                enabled={slicer.enabled}
                onToggle={() => slicer.setEnabled(!slicer.enabled)}
                sliceX={slicer.x}
                sliceY={slicer.y}
                sliceZ={slicer.z}
                onSetX={slicer.setX}
                onSetY={slicer.setY}
                onSetZ={slicer.setZ}
                onReset={slicer.resetRanges}
                getActualValues={slicer.getActualValues}
              />

              <DataRotationControls
                darkBackground={darkBackground}
                rotationZ={rotationZ}
                onSetRotation={setRotationZ}
              />
            </div>
          )}
        </div>

        {/* Info panel */}
        <InfoPanel fileInfo={fileInfo} />
      </div>
    </div>
  );
}
