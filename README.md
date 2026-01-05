# LAS/LAZ Point Cloud Viewer

A browser-based LAS/LAZ point cloud viewer built with React and Three.js. Supports EPSG:4326 (WGS84) coordinate systems with elevation in meters.

Developed based on scans from the [3D Scanner App](https://3dscannerapp.com/) using iOS lidar equipped devices. This was needed to scan complex stormwater junction boxes. 
This is 99.9% Claude Coded. Feel free to make it better.

## 🚀 Try It Now

**[Launch Live Viewer](https://geomoff.github.io/Simple-LAS-viewer/)**

Don't have a LAS file? Try the [sample file](https://github.com/GeoMoff/Simple-LAS-viewer/blob/main/Scan%203.las) - just download it and drag it into the viewer!

![LAS Viewer Screenshot](screenshot.png)

## How to Scan

- **Download 3D Scanner App** iOS, lidar-equipped models required
- **New Scan > Point Cloud Scan** Point Cloud
- **After Scan Completed** Share > LAS Geo-Referenced (High Density)
- **Save /Share File as Required**
- **Load .LAS into Viewer**
- **Profit**

  
## Features

### Visualization
- **3D Point Cloud Rendering** - Efficient WebGL rendering via Three.js
- **Color Options** - Original colors (RGB or elevation gradient) or solid color presets
- **Adjustable Point Size** - Scale points for optimal viewing
- **Opacity Control** - Adjust transparency from 0-100%
- **Background Toggle** - Switch between dark and white backgrounds

### Navigation
- **Orbit Controls** - Left-click drag to rotate view (touch: single finger drag)
- **Pan Controls** - Right-click drag to pan
- **Zoom** - Mouse wheel to zoom in/out (touch: pinch to zoom)
- **Arrow Keys** - Left/Right to pan horizontally, Up/Down to move vertically (Z axis)
- **View Presets** - Quick buttons for Top, Front, Right, and Isometric views
- **Rotation Buttons** - Fine-tune view angle with incremental rotation

### Measurement Tool
- **3D Distance** - Measure true 3D distance between two points
- **Horizontal Distance** - Measure XY plane distance only
- **Vertical Distance** - Measure Z axis distance only
- **Dual Units** - Displays both metric (m/cm) and imperial (ft/in)

### Slicer
- **3-Axis Slicing** - Filter points by X, Y, and Z ranges simultaneously
- **World Coordinates** - Slices align with scene axes, not data axes
- **Works with Rotation** - Rotate data to align features for precise slicing
- **Debounced Updates** - Smooth performance when adjusting sliders

### Data Rotation
- **Z-Axis Rotation** - Rotate point cloud around vertical axis
- **Fine Control** - ±1° and ±10° increment buttons
- **Slice Integration** - Rotate data to make angled features perpendicular for slicing

## Supported File Formats

- **LAS 1.0 - 1.4** - Standard ASPRS LAS format
- **LAZ** - Compressed LAS format (uses laz-perf WASM decompression)
- **Point Formats 0-10** - Including RGB color support (formats 2, 3, 5, 7, 8, 10)
- **EPSG:4326** - WGS84 lat/lon with meters elevation

## Installation

### Option 1: Standalone HTML (No Build Required)

Simply open `index.html` in any modern browser. This works directly from the repository without any installation - just download and open!

Alternatively, use the [live viewer](https://geomoff.github.io/Simple-LAS-viewer/) hosted on GitHub Pages.

### Option 2: Development Build

```bash
# Clone the repository
git clone https://github.com/yourusername/las-point-cloud-viewer.git
cd las-point-cloud-viewer

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Usage

1. Open the application in your browser
2. Drag and drop a `.las` or `.laz` file onto the viewer, or click "Load File" to select a file
3. Use mouse controls to navigate the point cloud
4. Enable measurement mode to measure distances
5. Use the slicer to isolate specific regions
6. Rotate data as needed to align features with slice planes

## Controls Reference

| Action | Mouse | Touch |
|--------|-------|-------|
| Rotate view | Left-click + drag | Single finger drag |
| Pan view | Right-click + drag | - |
| Zoom | Mouse wheel | Pinch gesture |
| Pan left/right | ← / → arrow keys | - |
| Pan up/down (Z) | ↑ / ↓ arrow keys | - |

## Project Structure

```
src/
├── index.js               # Barrel exports for library use
├── LASViewer.jsx          # Main viewer component
├── main.jsx               # Application entry point
├── index.css              # Tailwind styles
├── lib/
│   ├── LASParser.js       # LAS file parsing with validation & progress
│   └── OrbitControls.js   # Camera controls with mouse & touch support
├── hooks/
│   ├── useFileLoader.js   # File loading with Web Worker support
│   ├── useMeasurement.js  # Measurement tool state & logic
│   └── useSlicer.js       # Slicer state management with debouncing
├── components/
│   ├── Header.jsx         # Top toolbar & overlay components
│   ├── InfoPanel.jsx      # File information sidebar
│   └── ControlsPanel.jsx  # View, slicer & rotation controls
└── workers/
    └── lasParser.worker.js # Background thread for LAS parsing
```

## Technical Details

- **Max Points** - Subsamples to 2M points for browser performance
- **Coordinate Handling** - Converts lat/lon to meters using local tangent plane approximation
- **Memory** - Stores original positions/colors for non-destructive slicing
- **Web Workers** - LAS parsing runs in background thread for responsive UI
- **Debounced Slicer** - 50ms debounce prevents excessive re-renders
- **Accessibility** - ARIA labels and keyboard navigation support

## Dependencies

- [React](https://react.dev/) - UI framework
- [Three.js](https://threejs.org/) - 3D rendering
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Vite](https://vitejs.dev/) - Build tool

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Changelog

### v2.1.0
- **LAZ support** - Added compressed LAZ file support using laz-perf WASM
- **Improved loading UI** - Status messages show decompression vs parsing progress

### v2.0.0
- **Refactored architecture** - Split monolithic component into modular files
- **Custom hooks** - `useMeasurement`, `useSlicer`, `useFileLoader` for better state management
- **Web Worker support** - Background thread parsing for large files
- **Touch controls** - Added pinch-to-zoom and touch rotation
- **Performance** - Debounced slicer updates, optimized array operations
- **Accessibility** - Added ARIA labels and focus indicators
- **File validation** - Size warnings and format validation before parsing

### v1.0.0
- Initial release

## Limitations

It's free and it's vibe-coded. Don't expect itq to be accurate. Don't build anything of value against it. Caveat Emptor and all that. Enjoy!
