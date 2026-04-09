export const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;

  uniform vec2  uResolution;
  uniform vec2  uOffset;
  uniform vec2  uMouse;
  uniform float uZoom;

  uniform sampler2D uCardAtlas;
  uniform sampler2D uCardAtlasHover;

  uniform float uCellSize;
  uniform int   uCols;
  uniform int   uCount;

  uniform vec4  uBgColor;
  uniform vec4  uBorderColor;
  uniform vec4  uHoverColor;

  uniform float uDistortionStrength;
  uniform float uDistortionRadius;

  varying vec2 vUv;

  vec2 applyDistortion(vec2 fragCoord, vec2 center) {
    vec2 delta = fragCoord - center;
    float dist = length(delta);
    float norm = dist / uDistortionRadius;
    float factor = norm < 1.0
      ? 1.0 + uDistortionStrength * (1.0 - norm * norm)
      : 1.0;
    return center + delta * factor;
  }

  vec4 sampleAtlas(sampler2D atlas, vec2 uv, int index, int atlasSize) {
    float s   = float(atlasSize);
    float col = float(index - (index / atlasSize) * atlasSize);
    float row = float(index / atlasSize);
    vec2 tileUv = (vec2(col, row) + clamp(uv, 0.0, 1.0)) / s;
    return texture2D(atlas, tileUv);
  }

  // 9-tap Gaussian blur, clamped to the tile boundary.
  vec4 blurAtlas(sampler2D atlas, vec2 uv, int index, int atlasSize, float b) {
    float s   = float(atlasSize);
    float col = float(index - (index / atlasSize) * atlasSize);
    float row = float(index / atlasSize);
    vec2  base = vec2(col, row);
    #define S(ox,oy,w) texture2D(atlas,(base+clamp(uv+vec2(ox,oy),0.0,1.0))/s)*(w)
    return S(-b,-b,1.0/16.0)+S(0.,-b,2.0/16.0)+S( b,-b,1.0/16.0)
          +S(-b, 0.,2.0/16.0)+S(0., 0.,4.0/16.0)+S( b, 0.,2.0/16.0)
          +S(-b, b,1.0/16.0)+S(0., b,2.0/16.0)+S( b, b,1.0/16.0);
    #undef S
  }

  void main() {
    vec2 fragCoord    = vUv * uResolution;
    vec2 screenCenter = uResolution * 0.5;

    vec2 distorted = applyDistortion(fragCoord, screenCenter);
    vec2 world     = (distorted - screenCenter) / uZoom + screenCenter - uOffset;

    vec2 cell   = floor(world / uCellSize);
    vec2 cellUv = fract(world / uCellSize);

    int cols   = uCols;
    int rawIdx = int(mod(cell.y, float(cols))) * cols
               + int(mod(cell.x, float(cols)));
    int idx    = int(mod(float(rawIdx), float(uCount)));

    // Signed distances from each edge (0 = at edge, grows inward)
    float bx = min(cellUv.x, 1.0 - cellUv.x);
    float by = min(cellUv.y, 1.0 - cellUv.y);
    float b  = min(bx, by);

    // Hover detection
    vec2 mouseD = applyDistortion(uMouse, screenCenter);
    vec2 hWorld = (mouseD - screenCenter) / uZoom + screenCenter - uOffset;
    vec2 hCell  = floor(hWorld / uCellSize);
    bool hovered = (hCell == cell);

    int atlasSize = int(ceil(sqrt(float(uCount))));

    vec4 finalColor;

    if (hovered) {
      // ── Hovered card ──────────────────────────────────────────────────────────
      // uCardAtlasHover has a blurred image baked as background.
      // Show it sharp — the blur effect is in the texture itself.
      finalColor = sampleAtlas(uCardAtlasHover, cellUv, idx, atlasSize);
    } else {
      // ── Normal card ───────────────────────────────────────────────────────────
      float border = 0.0015;
      float aa     = fwidth(b) * 1.5;
      float borderMask = 1.0 - smoothstep(border - aa, border + aa, b);

      if (borderMask > 0.01) {
        finalColor = mix(uBgColor, uBorderColor, borderMask);
      } else {
        finalColor = sampleAtlas(uCardAtlas, cellUv, idx, atlasSize);
      }
    }

    // Lens vignette — darken corners like a fisheye lens barrel
    vec2  vigUv  = vUv - 0.5;
    float vign   = 1.0 - smoothstep(0.25, 0.75, length(vigUv));
    finalColor.rgb *= vign;

    gl_FragColor = finalColor;
  }
`;
