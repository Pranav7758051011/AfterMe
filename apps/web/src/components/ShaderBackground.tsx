import React, { useEffect, useRef } from 'react';

interface ShaderBackgroundProps {
  isDark?: boolean;
}

export const ShaderBackground: React.FC<ShaderBackgroundProps> = ({ isDark = true }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (!isDark) {
    return null;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function syncSize() {
      if (!canvas) return;
      const w = window.innerWidth || 1280;
      const h = window.innerHeight || 720;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    syncSize();
    window.addEventListener('resize', syncSize);

    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return;

    const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

    const fs = `precision highp float;
varying vec2 v_texCoord;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

void main() {
    vec2 uv = v_texCoord;
    vec2 mouse = u_mouse / u_resolution;
    
    // Deep obsidian base
    vec3 color = vec3(0.039, 0.051, 0.078);
    
    // Indigo flows
    float flow1 = sin(uv.x * 3.0 + u_time * 0.4) * 0.5 + 0.5;
    float flow2 = cos(uv.y * 2.0 - u_time * 0.25) * 0.5 + 0.5;
    vec3 indigo = vec3(0.388, 0.4, 0.945) * 0.12 * flow1 * flow2;
    
    // Subtle cyber grid
    float grid = step(0.985, fract(uv.x * 24.0)) + step(0.985, fract(uv.y * 24.0));
    color += indigo + grid * 0.008;
    
    // Interactive mouse glow
    float dist = length(uv - mouse);
    float glow = smoothstep(0.35, 0.0, dist);
    color += vec3(0.22, 0.74, 0.97) * glow * 0.08;
    
    gl_FragColor = vec4(color, 1.0);
}`;

    function createShader(type: number, src: string): WebGLShader | null {
      if (!gl) return null;
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }

    const vertexShader = createShader(gl.VERTEX_SHADER, vs);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fs);
    if (!vertexShader || !fragmentShader) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vertexShader);
    gl.attachShader(prog, fragmentShader);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');

    let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = window.innerHeight - event.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let animationId: number;
    function render(t: number) {
      if (!gl || !canvas) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationId = requestAnimationFrame(render);
    }

    animationId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', syncSize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
        opacity: 0.85,
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
};
