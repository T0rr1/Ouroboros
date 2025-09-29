// src/core/gl/ShaderUtils.ts
export type GLSLTarget = 'auto' | 'webgl1' | 'webgl2';

export interface ShaderBuildOptions {
  target?: GLSLTarget;
  forcePrecision?: 'lowp' | 'mediump' | 'highp';
  defines?: Record<string, string | number | boolean>;
  name?: string;
}

function numberLines(src: string) {
  return src.split('\n').map((l, i) => `${(i+1).toString().padStart(3,' ')}| ${l}`).join('\n');
}

function injectDefines(src: string, defines?: ShaderBuildOptions['defines']) {
  const lines = ['// <<auto-defines>>'];
  if (defines) {
    for (const k of Object.keys(defines)) {
      const v = defines[k];
      if (typeof v === 'boolean') lines.push(`#define ${k} ${v ? 1 : 0}`);
      else lines.push(`#define ${k} ${v}`);
    }
  }
  return src.replace(/^\s*#version[^\n]*\n?/, (m) => m + lines.join('\n') + '\n');
}

function ensurePrecision(src: string, fallback: 'lowp'|'mediump'|'highp', isFragment: boolean) {
  if (!isFragment) return src; // vertex precision is not required
  // If a #version 300 es fragment already has precision, keep it.
  if (/#version\s+300\s+es/.test(src) && /precision\s+(lowp|mediump|highp)\s+float\s*;/.test(src)) return src;
  // WebGL1 fragments MUST have precision for float.
  if (!/precision\s+(lowp|mediump|highp)\s+float\s*;/.test(src)) {
    const insertAt = src.match(/^\s*#version[^\n]*\n/)?.[0]?.length ?? 0;
    const head = src.slice(0, insertAt);
    const body = src.slice(insertAt);
    return head + `precision ${fallback} float;\n` + body;
  }
  return src;
}

function toWebGL1Compat(src: string, isFragment: boolean) {
  // Only convert if this is actually a WebGL2 shader (has #version 300 es)
  const isWebGL2Shader = /#version\s+300\s+es/.test(src);
  if (!isWebGL2Shader) {
    // Already WebGL1 compatible, just return as-is
    return src;
  }
  
  // Convert GLSL ES 3.00 to 1.00 style
  let out = src;
  // remove version, replace io qualifiers
  out = out.replace(/^\s*#version\s+300\s+es\s*\n/, '');
  
  // Convert vertex shader inputs/outputs
  if (!isFragment) {
    out = out.replace(/\bin\s+/g, 'attribute ');
    out = out.replace(/\bout\s+/g, 'varying ');
  } else {
    // Convert fragment shader inputs
    out = out.replace(/\bin\s+/g, 'varying ');
    // replace `out vec4 fragColor;` with gl_FragColor and assignments
    out = out.replace(/out\s+vec4\s+([A-Za-z_]\w*)\s*;\s*/g, '');
    out = out.replace(/(\b[A-Za-z_]\w*\b)\s*=\s*/g, (m, v) => v === 'fragColor' ? 'gl_FragColor = ' : m);
    // also replace `layout(location = 0) out vec4 fragColor;`
    out = out.replace(/layout\s*\(\s*location\s*=\s*\d+\s*\)\s*out\s+vec4\s+([A-Za-z_]\w*)\s*;\s*/g, '');
  }
  
  // texture() → texture2D/textureCube
  out = out.replace(/\btexture\(/g, 'texture2D(');
  // flat qualifiers not supported in ES 1.00
  out = out.replace(/\bflat\s+/g, '');
  return out;
}

export function buildProgram(gl: WebGLRenderingContext | WebGL2RenderingContext,
                            vsSrc: string, fsSrc: string, opts: ShaderBuildOptions = {}) {
  const isGL2 = (gl as WebGL2RenderingContext).TEXTURE_BINDING_3D !== undefined;
  const wantGL2 = opts.target === 'webgl2' || (opts.target !== 'webgl1' && isGL2);

  // Prepare sources
  let v = injectDefines(vsSrc, opts.defines);
  let f = injectDefines(fsSrc, opts.defines);
  
  console.log(`[SHADER] Building ${opts.name || 'unnamed'} - GL2: ${isGL2}, Want GL2: ${wantGL2}`);
  
  if (!wantGL2) {
    // Make sure these are WebGL1-friendly
    const originalV = v;
    const originalF = f;
    v = toWebGL1Compat(v, false);
    f = toWebGL1Compat(f, true);
    
    if (v !== originalV) {
      console.log(`[SHADER] Converted vertex shader for WebGL1`);
    }
    if (f !== originalF) {
      console.log(`[SHADER] Converted fragment shader for WebGL1`);
    }
  }
  f = ensurePrecision(f, opts.forcePrecision ?? 'mediump', true);

  const program = gl.createProgram();
  const vs = gl.createShader(wantGL2 ? (gl as WebGL2RenderingContext).VERTEX_SHADER : gl.VERTEX_SHADER)!;
  const fs = gl.createShader(wantGL2 ? (gl as WebGL2RenderingContext).FRAGMENT_SHADER : gl.FRAGMENT_SHADER)!;

  gl.shaderSource(vs, v);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(vs) || 'vertex shader compile failed';
    const errorDetails = `[SHADER] VS (${opts.name ?? ''})\n${numberLines(v)}\n--- INFOLOG ---\n${info}`;
    console.error(errorDetails);
    
    // Also log to window for debugging
    if (typeof window !== 'undefined') {
      (window as any).lastShaderError = {
        type: 'vertex',
        name: opts.name,
        source: v,
        error: info,
        fullError: errorDetails
      };
    }
    
    throw new Error(`Vertex shader compilation failed: ${info}`);
  }

  gl.shaderSource(fs, f);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(fs) || 'fragment shader compile failed';
    const errorDetails = `[SHADER] FS (${opts.name ?? ''})\n${numberLines(f)}\n--- INFOLOG ---\n${info}`;
    console.error(errorDetails);
    
    // Try to show ANGLE/driver translation if available
    const dbg = (gl.getExtension('WEBGL_debug_shaders') as any);
    if (dbg?.getTranslatedShaderSource) {
      console.warn('Translated FS:\n', dbg.getTranslatedShaderSource(fs));
    }
    
    // Also log to window for debugging
    if (typeof window !== 'undefined') {
      (window as any).lastShaderError = {
        type: 'fragment',
        name: opts.name,
        source: f,
        error: info,
        fullError: errorDetails
      };
    }
    
    throw new Error(`Fragment shader compilation failed: ${info}`);
  }

  gl.attachShader(program!, vs);
  gl.attachShader(program!, fs);
  gl.linkProgram(program!);
  if (!gl.getProgramParameter(program!, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program!) || 'program link failed';
    console.error(`[SHADER] LINK (${opts.name ?? ''})\n${info}`);
    throw new Error(info);
  }

  // Cleanup (keep shaders attached is okay, but detach to be tidy)
  gl.detachShader(program!, vs);
  gl.detachShader(program!, fs);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  return program!;
}

// Minimal test shaders for validation (WebGL1 compatible)
export const TEST_VERTEX_SHADER = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

export const TEST_FRAGMENT_SHADER = `
precision mediump float;
void main() {
  gl_FragColor = vec4(0.95, 0.75, 0.1, 1.0); // golden
}`;

// WebGL2 test shaders for when we specifically want to test WebGL2
export const TEST_VERTEX_SHADER_GL2 = `#version 300 es
layout(location=0) in vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

export const TEST_FRAGMENT_SHADER_GL2 = `#version 300 es
precision mediump float;
out vec4 fragColor;
void main() {
  fragColor = vec4(0.95, 0.75, 0.1, 1.0); // golden
}`;

// Legacy compatibility wrapper for existing code
export class ShaderUtils {
  static compileShader(gl: WebGLRenderingContext | WebGL2RenderingContext, source: string, type: number): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      console.error('Shader compilation error:', error);
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  static createProgram(gl: WebGLRenderingContext | WebGL2RenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram | null {
    try {
      return buildProgram(gl, vertexSource, fragmentSource, { target: 'auto' });
    } catch (e) {
      console.error('Program creation failed:', e);
      return null;
    }
  }

  static isWebGL2(gl: WebGLRenderingContext | WebGL2RenderingContext): gl is WebGL2RenderingContext {
    return 'texStorage2D' in gl;
  }

  static convertToWebGL1(source: string, isFragment: boolean): string {
    return toWebGL1Compat(source, isFragment);
  }
}