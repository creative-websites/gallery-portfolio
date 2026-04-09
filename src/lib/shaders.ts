export const vertexShader = /* glsl */`
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = /* glsl */`
  precision highp float;

  uniform vec2  uResolution;
  uniform vec2  uOffset;
  uniform vec2  uMouse;
  uniform float uZoom;

  uniform sampler2D uImageAtlas;
  uniform sampler2D uTextAtlas;

  uniform float uCellSize;
  uniform int   uCols;
  uniform int   uCount;

  uniform vec4  uBgColor;
  uniform vec4  uBorderColor;
  uniform vec4  uTextColor;
  uniform vec4  uHoverColor;

  uniform float uDistortionStrength;
  uniform float uDistortionRadius;

  varying vec2 vUv;

  vec2 applyDistortion(vec2 fragCoord, vec2 center) {
    vec2 delta = fragCoord - center;
    float dist = length(delta);
    float norm = dist / uDistortionRadius;
    float factor = norm < 1.0
      ? 1.0 - uDistortionStrength * (1.0 - norm * norm)
      : 1.0 + uDistortionStrength * (norm - 1.0);
    return center + delta * factor;
  }

  vec4 sampleAtlas(sampler2D atlas, vec2 uv, int index, int atlasSize) {
    float s = float(atlasSize);
    float col = float(index - (index / atlasSize) * atlasSize);
    float row = float(index / atlasSize);
    vec2 tileUv = (vec2(col, row) + clamp(uv, 0.0, 1.0)) / s;
    return texture2D(atlas, tileUv);
  }

  void main() {
    vec2 fragCoord = vUv * uResolution;
    vec2 center    = uResolution * 0.5;
    vec2 distorted = applyDistortion(fragCoord, center);

    vec2 world = (distorted - center) / uZoom + center - uOffset;

    vec2  cell   = floor(world / uCellSize);
    vec2  cellUv = fract(world / uCellSize);

    int cols   = uCols;
    int rawIdx = int(mod(cell.y, float(cols))) * cols
               + int(mod(cell.x, float(cols)));
    int idx    = int(mod(float(rawIdx), float(uCount)));

    float border  = 0.02;
    bool  onBorder = cellUv.x < border || cellUv.x > 1.0 - border
                  || cellUv.y < border || cellUv.y > 1.0 - border;

    vec2 mouseD = applyDistortion(uMouse, center);
    vec2 hWorld = (mouseD - center) / uZoom + center - uOffset;
    vec2 hCell  = floor(hWorld / uCellSize);
    bool hovered = (hCell == cell);

    int atlasSize = int(ceil(sqrt(float(uCount))));

    vec4 finalColor = uBgColor;
    if (onBorder) {
      finalColor = hovered ? uHoverColor : uBorderColor;
    } else if (cellUv.y > 0.78) {
      vec2 txtUv = vec2(cellUv.x, (cellUv.y - 0.78) / 0.22);
      finalColor = mix(uBgColor, sampleAtlas(uTextAtlas, txtUv, idx, atlasSize), 0.9);
      if (hovered) finalColor = mix(finalColor, uHoverColor, 0.15);
    } else {
      finalColor = sampleAtlas(uImageAtlas, cellUv, idx, atlasSize);
      if (hovered) finalColor = mix(finalColor, uHoverColor, 0.08);
    }

    gl_FragColor = finalColor;
  }
`;
