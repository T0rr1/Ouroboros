// Basic fallback shaders that work across WebGL1/2
export const BASIC_VERTEX_SHADER = `#version 300 es
layout(location=0) in vec2 aPosition;
uniform mat4 uProjection;
uniform mat4 uModelView;

void main() {
  gl_Position = uProjection * uModelView * vec4(aPosition, 0.0, 1.0);
}`;

export const BASIC_FRAGMENT_SHADER = `#version 300 es
precision mediump float;
uniform vec4 uColor;
out vec4 fragColor;

void main() {
  fragColor = uColor;
}`;

export const TEXTURED_VERTEX_SHADER = `#version 300 es
layout(location=0) in vec2 aPosition;
layout(location=1) in vec2 aTexCoord;
uniform mat4 uProjection;
uniform mat4 uModelView;
out vec2 vTexCoord;

void main() {
  gl_Position = uProjection * uModelView * vec4(aPosition, 0.0, 1.0);
  vTexCoord = aTexCoord;
}`;

export const TEXTURED_FRAGMENT_SHADER = `#version 300 es
precision mediump float;
uniform sampler2D uTexture;
uniform vec4 uColor;
in vec2 vTexCoord;
out vec4 fragColor;

void main() {
  vec4 texColor = texture(uTexture, vTexCoord);
  fragColor = texColor * uColor;
}`;

// Simple particle shader
export const PARTICLE_VERTEX_SHADER = `#version 300 es
layout(location=0) in vec2 aPosition;
layout(location=1) in vec2 aVelocity;
layout(location=2) in float aLife;
layout(location=3) in vec4 aColor;
uniform mat4 uProjection;
uniform float uTime;
out vec4 vColor;

void main() {
  vec2 pos = aPosition + aVelocity * uTime;
  gl_Position = uProjection * vec4(pos, 0.0, 1.0);
  gl_PointSize = mix(1.0, 8.0, aLife);
  vColor = aColor * aLife;
}`;

export const PARTICLE_FRAGMENT_SHADER = `#version 300 es
precision mediump float;
in vec4 vColor;
out vec4 fragColor;

void main() {
  // Simple circular particle
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) discard;
  
  float alpha = 1.0 - (dist * 2.0);
  fragColor = vec4(vColor.rgb, vColor.a * alpha);
}`;