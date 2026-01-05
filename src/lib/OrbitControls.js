import * as THREE from 'three';

/**
 * Custom orbit controls for Z-up coordinate system
 * Provides rotation, panning, and zoom functionality
 */
export class OrbitControls {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {HTMLElement} element
   */
  constructor(camera, element) {
    this.camera = camera;
    this.element = element;
    this.target = new THREE.Vector3(0, 0, 0);
    this.distance = 100;

    // Azimuth angle (rotation around Z axis, 0 = looking from +X direction)
    this.azimuth = Math.PI / 4;
    // Elevation angle (0 = horizontal, PI/2 = looking straight down from above)
    this.elevation = Math.PI / 4;

    this.dragging = false;
    this.panning = false;
    this.lastX = 0;
    this.lastY = 0;

    // Sensitivity settings
    this.rotateSensitivity = 0.003;
    this.panSensitivity = 0.0008;
    this.zoomSensitivity = 0.08;

    // Limits
    this.minDistance = 0.1;
    this.maxDistance = 100000;
    this.minElevation = -Math.PI / 3;
    this.maxElevation = Math.PI / 2 - 0.05;

    // Set camera up vector to Z
    this.camera.up.set(0, 0, 1);

    // Bind event handlers
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onContextMenu = this._onContextMenu.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);

    // Touch state
    this._touches = [];
    this._lastTouchDistance = 0;

    this._addEventListeners();
    this.update();
  }

  _addEventListeners() {
    this.element.addEventListener('mousedown', this._onMouseDown);
    this.element.addEventListener('mousemove', this._onMouseMove);
    this.element.addEventListener('mouseup', this._onMouseUp);
    this.element.addEventListener('mouseleave', this._onMouseUp);
    this.element.addEventListener('wheel', this._onWheel, { passive: false });
    this.element.addEventListener('contextmenu', this._onContextMenu);

    // Touch support
    this.element.addEventListener('touchstart', this._onTouchStart, { passive: false });
    this.element.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this.element.addEventListener('touchend', this._onTouchEnd);
    this.element.addEventListener('touchcancel', this._onTouchEnd);
  }

  _removeEventListeners() {
    this.element.removeEventListener('mousedown', this._onMouseDown);
    this.element.removeEventListener('mousemove', this._onMouseMove);
    this.element.removeEventListener('mouseup', this._onMouseUp);
    this.element.removeEventListener('mouseleave', this._onMouseUp);
    this.element.removeEventListener('wheel', this._onWheel);
    this.element.removeEventListener('contextmenu', this._onContextMenu);
    this.element.removeEventListener('touchstart', this._onTouchStart);
    this.element.removeEventListener('touchmove', this._onTouchMove);
    this.element.removeEventListener('touchend', this._onTouchEnd);
    this.element.removeEventListener('touchcancel', this._onTouchEnd);
  }

  _onContextMenu(e) {
    e.preventDefault();
  }

  _onMouseDown(e) {
    if (e.button === 0) this.dragging = true;
    else if (e.button === 2) this.panning = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  _onMouseMove(e) {
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    if (this.dragging) {
      this._rotate(dx, dy);
    } else if (this.panning) {
      this._pan(dx, dy);
    }
  }

  _onMouseUp() {
    this.dragging = false;
    this.panning = false;
  }

  _onWheel(e) {
    e.preventDefault();
    const factor = 1 + (e.deltaY > 0 ? this.zoomSensitivity : -this.zoomSensitivity);
    this.distance = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.distance * factor)
    );
    this.update();
  }

  // Touch event handlers
  _onTouchStart(e) {
    e.preventDefault();
    this._touches = Array.from(e.touches);

    if (this._touches.length === 1) {
      this.lastX = this._touches[0].clientX;
      this.lastY = this._touches[0].clientY;
      this.dragging = true;
    } else if (this._touches.length === 2) {
      this.dragging = false;
      this._lastTouchDistance = this._getTouchDistance();
    }
  }

  _onTouchMove(e) {
    e.preventDefault();
    this._touches = Array.from(e.touches);

    if (this._touches.length === 1 && this.dragging) {
      const dx = this._touches[0].clientX - this.lastX;
      const dy = this._touches[0].clientY - this.lastY;
      this.lastX = this._touches[0].clientX;
      this.lastY = this._touches[0].clientY;
      this._rotate(dx, dy);
    } else if (this._touches.length === 2) {
      // Pinch to zoom
      const distance = this._getTouchDistance();
      const delta = this._lastTouchDistance - distance;
      this._lastTouchDistance = distance;

      const factor = 1 + delta * 0.005;
      this.distance = Math.max(
        this.minDistance,
        Math.min(this.maxDistance, this.distance * factor)
      );
      this.update();
    }
  }

  _onTouchEnd() {
    this.dragging = false;
    this._touches = [];
  }

  _getTouchDistance() {
    if (this._touches.length < 2) return 0;
    const dx = this._touches[0].clientX - this._touches[1].clientX;
    const dy = this._touches[0].clientY - this._touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  _rotate(dx, dy) {
    // Horizontal drag rotates azimuth
    this.azimuth -= dx * this.rotateSensitivity;
    // Vertical drag changes elevation (clamped to avoid flipping)
    this.elevation = Math.max(
      this.minElevation,
      Math.min(this.maxElevation, this.elevation + dy * this.rotateSensitivity)
    );
    this.update();
  }

  _pan(dx, dy) {
    const panSpeed = this.distance * this.panSensitivity;

    // Get right vector (perpendicular to view direction in XY plane)
    const rightX = Math.sin(this.azimuth);
    const rightY = -Math.cos(this.azimuth);

    // Get forward vector (in XY plane)
    const forwardX = Math.cos(this.azimuth);
    const forwardY = Math.sin(this.azimuth);

    this.target.x += (-dx * rightX + dy * forwardX) * panSpeed;
    this.target.y += (-dx * rightY + dy * forwardY) * panSpeed;
    this.update();
  }

  /**
   * Update camera position based on current state
   */
  update() {
    // Calculate camera position using Z-up spherical coordinates
    const cosEl = Math.cos(this.elevation);
    const sinEl = Math.sin(this.elevation);

    const x = this.target.x + this.distance * cosEl * Math.cos(this.azimuth);
    const y = this.target.y + this.distance * cosEl * Math.sin(this.azimuth);
    const z = this.target.z + this.distance * sinEl;

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }

  /**
   * Set camera distance
   * @param {number} d
   */
  setDistance(d) {
    this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, d));
    this.update();
  }

  /**
   * Reset view with given extent
   * @param {number} extent - Maximum extent of the scene
   */
  reset(extent) {
    this.target.set(0, 0, 0);
    this.azimuth = Math.PI * 0.75; // Looking from SW
    this.elevation = Math.PI / 6; // 30 degrees above horizontal
    this.setDistance(extent * 1.5);
  }

  /**
   * Pan the target position
   * @param {number} dx - X delta
   * @param {number} dy - Y delta
   * @param {number} dz - Z delta
   */
  panTarget(dx, dy, dz = 0) {
    const panAmount = this.distance * 0.05;
    const rightX = Math.sin(this.azimuth);
    const rightY = -Math.cos(this.azimuth);

    this.target.x += dx * rightX * panAmount;
    this.target.y += dx * rightY * panAmount;
    this.target.z += dz * panAmount;
    this.update();
  }

  // View presets for Z-up system
  viewTop() {
    this.azimuth = 0;
    this.elevation = Math.PI / 2 - 0.01; // Almost straight down
    this.target.set(0, 0, 0);
    this.update();
  }

  viewFront() {
    // Looking from South toward North (camera at -Y)
    this.azimuth = -Math.PI / 2;
    this.elevation = 0.01; // Nearly horizontal
    this.target.set(0, 0, 0);
    this.update();
  }

  viewRight() {
    // Looking from West toward East (camera at -X)
    this.azimuth = Math.PI;
    this.elevation = 0.01;
    this.target.set(0, 0, 0);
    this.update();
  }

  viewIsometric() {
    this.azimuth = Math.PI * 0.75; // From SW
    this.elevation = Math.PI / 6; // 30 degrees up
    this.target.set(0, 0, 0);
    this.update();
  }

  // Incremental rotations
  rotateLeft() {
    this.azimuth += Math.PI / 8;
    this.update();
  }

  rotateRight() {
    this.azimuth -= Math.PI / 8;
    this.update();
  }

  rotateUp() {
    this.elevation = Math.min(this.maxElevation, this.elevation + Math.PI / 16);
    this.update();
  }

  rotateDown() {
    this.elevation = Math.max(this.minElevation, this.elevation - Math.PI / 16);
    this.update();
  }

  /**
   * Dispose of controls and remove event listeners
   */
  dispose() {
    this._removeEventListeners();
  }
}

export default OrbitControls;
