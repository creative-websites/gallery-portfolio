Core stack
HTML/CSS/JS for the basic page structure, styling, and interaction wiring.

Three.js (3JS) as the WebGL abstraction and rendering engine.

Custom vertex and fragment shaders (GLSL) to draw and animate the grid, distortion, hover, and text completely on the GPU.

Data and content structure
A data.js file with an array of project objects (title, image path, year, route) to drive the gallery dynamically.

A simple additional HTML page for a “sample project” route as a demo target.

A public assets folder containing 25 project images.

Visual and UI techniques
Infinite draggable project grid rendered on a single full‑screen plane via shaders.

Inverted fisheye / radial distortion effect around the cursor.

Subtle zoom-out while dragging and smooth zoom-back on release, driven by a zoom and targetZoom uniform.

Vignette overlay using a full-screen div with CSS radial gradient to darken corners.

Custom cursor change (grab ↔ grabbing) tied to drag state for better UX.

Monospace font (IBM Plex Mono) from Google Fonts for a clean tech look.

GPU / shader-side techniques
Custom vertex and fragment shaders stored in shaders.js.

Shader uniforms for:

Grid offset and target offset (panning).

Resolution, zoom level, mouse position.

Colors (background, border, text, hover) passed as normalized RGBA arrays.

Image and text atlas textures.

Radial distortion math in shader space so hover and click detection match the warped view.

Texture handling and performance
createTexture helper:

Creates an offscreen canvas, draws title (left) and year (right), converts to a Three.js CanvasTexture.

createTextureAtlas:

Packs many textures (images or text canvases) into a single atlas texture by laying them out in a grid (e.g., 5×5 for 25 items).

Draws each source texture into computed atlas positions, then makes one atlas CanvasTexture with proper wrapping/filtering.

loadTextures:

Uses THREE.TextureLoader to asynchronously load all project images.

Configures texture parameters (clamp to edge, linear filtering, etc.).

In parallel builds corresponding text textures for each project.

Interaction logic and math
Drag logic with:

Flags: isDragging, isClick, clickStartTime.

Pointer and touch support (pointerdown/move/up, touchstart/move/end).

Smooth interpolation (lerp) between offset and targetOffset using a “lerp factor” config value.

Zoom interaction:

Short timeout (~0.1s) after pointer down to trigger zoom-out if user keeps dragging.

zoom and targetZoom interpolated in the animation loop.

Mouse tracking:

updateMousePosition maps screen coordinates to canvas coordinates and updates shader uniforms for hover effects.

Click detection and routing
Distinguishing click vs drag using movement threshold and interaction duration (< 200 ms).

Converting final pointer position to:

Canvas space → distorted screen space (same radial distortion as shader) → world/grid coordinates.

Indexing the correct grid cell via division by cellSize and modular wrapping.

Using the computed index to read the project from the data array and window.location redirect to its route if present.

Layout, responsiveness, and animation
Orthographic camera (no perspective) for a flat 2D-style grid.

onWindowResize:

Recomputes camera parameters, renderer size, pixel ratio, and passes updated resolution to shader.

Central animate loop with requestAnimationFrame:

Lerp offset and zoom toward their targets each frame.

Update shader uniforms, then render the scene.

setupEventListeners:

Registers all pointer, touch, resize, context-menu suppression, and mouse-move/leave handlers.
