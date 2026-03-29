import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// --- Shared Utility: makePaletteTexture ---
function makePaletteTexture(colors: string[]) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const stops = colors && colors.length > 0 ? colors : ['#000', '#fff'];
    const grad = ctx.createLinearGradient(0, 0, 256, 0);
    if (Array.isArray(stops) && stops.length > 0) {
        stops.forEach((c, i) => {
            const pos = i / (stops.length - 1);
            grad.addColorStop(pos, c);
        });
    } else {
        grad.addColorStop(0, '#000');
        grad.addColorStop(1, '#fff');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 1);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
}

// --- Shader Strings ---
const face_vert = `
  attribute vec3 position;
  uniform vec2 px;
  uniform vec2 boundarySpace;
  varying vec2 uv;
  precision highp float;
  void main(){
    vec3 pos = position;
    vec2 scale = 1.0 - boundarySpace * 2.0;
    pos.xy = pos.xy * scale;
    uv = vec2(0.5)+(pos.xy)*0.5;
    gl_Position = vec4(pos, 1.0);
  }
`;

const mouse_vert = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform vec2 center;
  uniform vec2 scale;
  uniform vec2 px;
  varying vec2 vUv;
  void main(){
    vec2 pos = position.xy * scale * 2.0 * px + center;
    vUv = uv;
    gl_Position = vec4(pos, 0.0, 1.0);
  }
`;

const advection_frag = `
  precision highp float;
  uniform sampler2D velocity;
  uniform float dt;
  uniform bool isBFECC;
  uniform vec2 fboSize;
  uniform vec2 px;
  varying vec2 uv;
  void main(){
    vec2 ratio = max(fboSize.x, fboSize.y) / fboSize;
    if(isBFECC == false){
        vec2 vel = texture2D(velocity, uv).xy;
        vec2 uv2 = uv - vel * dt * ratio;
        vec2 newVel = texture2D(velocity, uv2).xy;
        gl_FragColor = vec4(newVel, 0.0, 0.0);
    } else {
        vec2 spot_new = uv;
        vec2 vel_old = texture2D(velocity, uv).xy;
        vec2 spot_old = spot_new - vel_old * dt * ratio;
        vec2 vel_new1 = texture2D(velocity, spot_old).xy;
        vec2 spot_new2 = spot_old + vel_new1 * dt * ratio;
        vec2 error = spot_new2 - spot_new;
        vec2 spot_new3 = spot_new - error / 2.0;
        vec2 vel_2 = texture2D(velocity, spot_new3).xy;
        vec2 spot_old2 = spot_new3 - vel_2 * dt * ratio;
        vec2 newVel2 = texture2D(velocity, spot_old2).xy; 
        gl_FragColor = vec4(newVel2, 0.0, 0.0);
    }
  }
`;

const color_frag = `
  precision highp float;
  uniform sampler2D velocity;
  uniform sampler2D palette;
  uniform vec4 bgColor;
  varying vec2 uv;
  void main(){
    vec2 vel = texture2D(velocity, uv).xy;
    float lenv = clamp(length(vel) * 3.5, 0.0, 1.0);
    vec3 c = texture2D(palette, vec2(lenv * 0.9 + 0.05, 0.5)).rgb;
    float alpha = clamp(lenv * 1.5, 0.0, 1.0);
    vec3 outRGB = mix(bgColor.rgb, c, alpha);
    float outA = mix(bgColor.a, 1.0, alpha);
    gl_FragColor = vec4(outRGB, outA);
  }
`;

const divergence_frag = `
  precision highp float;
  uniform sampler2D velocity;
  uniform float dt;
  uniform vec2 px;
  varying vec2 uv;
  void main(){
    float x0 = texture2D(velocity, uv-vec2(px.x, 0.0)).x;
    float x1 = texture2D(velocity, uv+vec2(px.x, 0.0)).x;
    float y0 = texture2D(velocity, uv-vec2(0.0, px.y)).y;
    float y1 = texture2D(velocity, uv+vec2(0.0, px.y)).y;
    float divergence = (x1 - x0 + y1 - y0) / 2.0;
    gl_FragColor = vec4(divergence / dt);
  }
`;

const externalForce_frag = `
  precision highp float;
  uniform vec2 force;
  uniform vec2 center;
  uniform vec2 scale;
  uniform vec2 px;
  varying vec2 vUv;
  void main(){
    vec2 circle = (vUv - 0.5) * 2.0;
    float d = 1.0 - min(length(circle), 1.0);
    d *= d;
    gl_FragColor = vec4(force * d, 0.0, 1.0);
  }
`;

const poisson_frag = `
  precision highp float;
  uniform sampler2D pressure;
  uniform sampler2D divergence;
  uniform vec2 px;
  varying vec2 uv;
  void main(){
    float p0 = texture2D(pressure, uv + vec2(px.x * 2.0, 0.0)).r;
    float p1 = texture2D(pressure, uv - vec2(px.x * 2.0, 0.0)).r;
    float p2 = texture2D(pressure, uv + vec2(0.0, px.y * 2.0)).r;
    float p3 = texture2D(pressure, uv - vec2(0.0, px.y * 2.0)).r;
    float div = texture2D(divergence, uv).r;
    float newP = (p0 + p1 + p2 + p3) / 4.0 - div;
    gl_FragColor = vec4(newP);
  }
`;

const pressure_frag = `
  precision highp float;
  uniform sampler2D pressure;
  uniform sampler2D velocity;
  uniform vec2 px;
  uniform float dt;
  varying vec2 uv;
  void main(){
    float step = 1.0;
    float p0 = texture2D(pressure, uv + vec2(px.x * step, 0.0)).r;
    float p1 = texture2D(pressure, uv - vec2(px.x * step, 0.0)).r;
    float p2 = texture2D(pressure, uv + vec2(0.0, px.y * step)).r;
    float p3 = texture2D(pressure, uv - vec2(0.0, px.y * step)).r;
    vec2 v = texture2D(velocity, uv).xy;
    vec2 gradP = vec2(p0 - p1, p2 - p3) * 0.5;
    gradP = gradP * dt;
    v = v - gradP;
    gl_FragColor = vec4(v, 0.0, 1.0);
  }
`;

const viscous_frag = `
  precision highp float;
  uniform sampler2D velocity;
  uniform sampler2D velocity_new;
  uniform float v;
  uniform vec2 px;
  uniform float dt;
  varying vec2 uv;
  void main(){
    vec2 old = texture2D(velocity, uv).xy;
    vec2 new0 = texture2D(velocity_new, uv + vec2(px.x * 2.0, 0.0)).xy;
    vec2 new1 = texture2D(velocity_new, uv - vec2(px.x * 2.0, 0.0)).xy;
    vec2 new2 = texture2D(velocity_new, uv + vec2(0.0, px.y * 2.0)).xy;
    vec2 new3 = texture2D(velocity_new, uv - vec2(0.0, px.y * 2.0)).xy;
    vec2 newv = 4.0 * old + v * dt * (new0 + new1 + new2 + new3);
    newv /= 4.0 * (1.0 + v * dt);
    gl_FragColor = vec4(newv, 0.0, 0.0);
  }
`;

// --- Utility Classes ---
class CommonClass {
    width = 0;
    height = 0;
    renderer: THREE.WebGLRenderer | null = null;
    init($wrapper: HTMLElement) {
        this.width = $wrapper.offsetWidth;
        this.height = $wrapper.offsetHeight;
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.width, this.height);
        this.renderer.setClearColor(0, 0);
    }
    resize() {
        if (!this.renderer || !this.renderer.domElement.parentElement) return;
        this.width = this.renderer.domElement.parentElement.offsetWidth;
        this.height = this.renderer.domElement.parentElement.offsetHeight;
        this.renderer.setSize(this.width, this.height);
    }
    dispose() {
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
    }
}

class MouseClass {
    pos = new THREE.Vector2();
    old = new THREE.Vector2();
    vel = new THREE.Vector2();
    target = new THREE.Vector2();
    isMove = false;
    autoIntensity = 1.0;
    takeoverDuration = 3.0;
    onInteract?: () => void;
    common: CommonClass;

    constructor(common: CommonClass) {
        this.common = common;
    }

    init($el: HTMLElement) {
        $el.addEventListener('mousemove', this.move.bind(this));
        $el.addEventListener('touchstart', this.move.bind(this), { passive: false });
        $el.addEventListener('touchmove', this.move.bind(this), { passive: false });
    }
    move(e: any) {
        this.isMove = true;
        if (this.onInteract) this.onInteract();
        let x, y;
        if (e.touches) {
            x = e.touches[0].clientX;
            y = e.touches[0].clientY;
        } else {
            x = e.clientX;
            y = e.clientY;
        }
        if (!this.common.renderer) return;
        const rect = this.common.renderer.domElement.getBoundingClientRect();
        this.target.set((x - rect.left) / rect.width, 1.0 - (y - rect.top) / rect.height);
    }
    update() {
        this.old.copy(this.pos);
        this.pos.lerp(this.target, 0.15);
        this.vel.subVectors(this.pos, this.old);
    }
    dispose() { }
}

class AutoDriver {
    enabled: boolean;
    speed: number;
    resumeDelay: number;
    rampDurationMs: number;
    mouse: MouseClass;
    lastInteraction = 0;
    constructor(mouse: MouseClass, opts: any) {
        this.mouse = mouse;
        this.enabled = opts.enabled ?? true;
        this.speed = opts.speed ?? 1.0;
        this.resumeDelay = opts.resumeDelay ?? 2000;
        this.rampDurationMs = (opts.rampDuration ?? 2.0) * 1000;
        this.lastInteraction = performance.now();
    }
    forceStop() {
        this.lastInteraction = performance.now();
    }
    update() {
        if (!this.enabled) return;
        const now = performance.now();
        if (now - this.lastInteraction < this.resumeDelay) return;
        const time = now * 0.001 * this.speed;
        const ramp = Math.min(1.0, (now - this.lastInteraction - this.resumeDelay) / this.rampDurationMs);
        const intensity = this.mouse.autoIntensity * ramp;
        const rx = 0.5 + Math.cos(time * 0.7) * 0.25;
        const ry = 0.5 + Math.sin(time * 0.8) * 0.25;
        this.mouse.target.set(rx, ry);
        const vx = Math.cos(time * 1.2) * 0.02 * intensity;
        const vy = Math.sin(time * 1.5) * 0.02 * intensity;
        this.mouse.vel.set(vx, vy);
    }
}

class ShaderPass {
    props: any;
    uniforms: any;
    scene: any;
    camera: any;
    material: any;
    geometry: any;
    plane: any;
    common: CommonClass;
    constructor(common: CommonClass, props?: any) {
        this.common = common;
        this.props = props || {};
        this.uniforms = this.props.material?.uniforms;
    }
    init() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.Camera();
        this.material = new THREE.RawShaderMaterial({
            ...this.props.material,
            depthWrite: false,
            depthTest: false
        });
        this.geometry = new THREE.PlaneGeometry(2, 2);
        this.plane = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.plane);
    }
    update(..._args: any[]) {
        if (!this.common.renderer) return;
        const target = (this.props.output && (this.props.output as any).isWebGLRenderTarget) ? this.props.output : null;
        this.common.renderer.setRenderTarget(target);
        this.common.renderer.render(this.scene, this.camera);
        this.common.renderer.setRenderTarget(null);
    }
}

class Advection extends ShaderPass {
    constructor(common: CommonClass, simProps: any) {
        super(common, {
            material: {
                vertexShader: face_vert,
                fragmentShader: advection_frag,
                uniforms: {
                    boundarySpace: { value: new THREE.Vector2() },
                    px: { value: simProps.cellScale },
                    fboSize: { value: simProps.fboSize },
                    velocity: { value: simProps.src?.texture || null },
                    dt: { value: simProps.dt },
                    isBFECC: { value: true }
                }
            },
            output: simProps.dst
        });
        this.init();
    }
    update({ dt, isBounce, BFECC }: any) {
        this.uniforms.dt.value = dt;
        this.uniforms.isBFECC.value = BFECC;
        this.uniforms.boundarySpace.value.set(isBounce ? 0 : this.uniforms.px.value.x, isBounce ? 0 : this.uniforms.px.value.y);
        super.update();
    }
}

class ExternalForce extends ShaderPass {
    mouse: MouseClass;
    constructor(common: CommonClass, mouse: MouseClass, simProps: any) {
        super(common, {
            material: {
                vertexShader: mouse_vert,
                fragmentShader: externalForce_frag,
                uniforms: {
                    px: { value: simProps.cellScale },
                    center: { value: new THREE.Vector2() },
                    scale: { value: new THREE.Vector2(simProps.cursor_size, simProps.cursor_size) },
                    force: { value: new THREE.Vector2() }
                }
            },
            output: simProps.dst
        });
        this.mouse = mouse;
        this.init();
    }
    update({ cursor_size, mouse_force, cellScale }: any) {
        this.uniforms.center.value.copy(this.mouse.pos);
        this.uniforms.center.value.multiplyScalar(2).subScalar(1);
        this.uniforms.scale.value.set(cursor_size, cursor_size);
        this.uniforms.force.value.copy(this.mouse.vel).multiplyScalar(mouse_force * 2.0);
        this.uniforms.px.value.copy(cellScale);
        super.update();
    }
}

class Viscous extends ShaderPass {
    output0: THREE.WebGLRenderTarget;
    output1: THREE.WebGLRenderTarget;
    constructor(common: CommonClass, simProps: any) {
        super(common, {
            material: {
                vertexShader: face_vert,
                fragmentShader: viscous_frag,
                uniforms: {
                    boundarySpace: { value: simProps.boundarySpace },
                    velocity: { value: simProps.src?.texture || null },
                    velocity_new: { value: simProps.src?.texture || null },
                    v: { value: simProps.viscous },
                    px: { value: simProps.cellScale },
                    dt: { value: simProps.dt }
                }
            },
            output: simProps.dst
        });
        this.output0 = simProps.dst;
        this.output1 = simProps.dst_;
        this.init();
    }
    update({ viscous, dt, iterations }: any) {
        this.uniforms.v.value = viscous;
        this.uniforms.dt.value = dt;
        
        const iter = Math.min(iterations || 12, 32);
        
        for (let i = 0; i < iter; i++) {
            const p_in = i % 2 === 0 ? this.output0 : this.output1;
            const p_out = i % 2 === 0 ? this.output1 : this.output0;

            if (!p_in || !p_out) break;

            this.uniforms.velocity_new.value = p_in.texture;
            this.props.output = p_out;
            super.update();
        }
        return this.props.output;
    }
}

class Divergence extends ShaderPass {
    constructor(common: CommonClass, simProps: any) {
        super(common, {
            material: {
                vertexShader: face_vert,
                fragmentShader: divergence_frag,
                uniforms: {
                    boundarySpace: { value: simProps.boundarySpace },
                    velocity: { value: simProps.src?.texture || null },
                    px: { value: simProps.cellScale },
                    dt: { value: simProps.dt }
                }
            },
            output: simProps.dst
        });
        this.init();
    }
    update({ vel }: any) {
        this.uniforms.velocity.value = vel.texture;
        super.update();
    }
}

class Poisson extends ShaderPass {
    output0: THREE.WebGLRenderTarget;
    output1: THREE.WebGLRenderTarget;
    constructor(common: CommonClass, simProps: any) {
        super(common, {
            material: {
                vertexShader: face_vert,
                fragmentShader: poisson_frag,
                uniforms: {
                    boundarySpace: { value: simProps.boundarySpace },
                    pressure: { value: simProps.dst_?.texture || null },
                    divergence: { value: simProps.src?.texture || null },
                    px: { value: simProps.cellScale }
                }
            },
            output: simProps.dst
        });
        this.output0 = simProps.dst;
        this.output1 = simProps.dst_;
        this.init();
    }
    update({ iterations }: any) {
        const iter = Math.min(iterations || 12, 32);
        for (let i = 0; i < iter; i++) {
            const p_in = i % 2 === 0 ? this.output0 : this.output1;
            const p_out = i % 2 === 0 ? this.output1 : this.output0;

            if (!p_in || !p_out) break;

            this.uniforms.pressure.value = p_in.texture;
            this.props.output = p_out;
            super.update();
        }
        return this.props.output;
    }
}

class Pressure extends ShaderPass {
    constructor(common: CommonClass, simProps: any) {
        super(common, {
            material: {
                vertexShader: face_vert,
                fragmentShader: pressure_frag,
                uniforms: {
                    boundarySpace: { value: simProps.boundarySpace },
                    pressure: { value: simProps.src_p?.texture || null },
                    velocity: { value: simProps.src_v?.texture || null },
                    px: { value: simProps.cellScale },
                    dt: { value: simProps.dt }
                }
            },
            output: simProps.dst
        });
        this.init();
    }
    update({ vel, pressure }: any) {
        this.uniforms.velocity.value = vel.texture;
        this.uniforms.pressure.value = pressure.texture;
        super.update();
    }
}

class Simulation {
    options: any;
    fbos: any;
    fboSize = new THREE.Vector2();
    cellScale = new THREE.Vector2();
    boundarySpace = new THREE.Vector2();
    advection: any;
    externalForce: any;
    viscous: any;
    divergence: any;
    poisson: any;
    pressure: any;
    common: CommonClass;
    mouse: MouseClass;

    constructor(common: CommonClass, mouse: MouseClass, options?: any) {
        this.common = common;
        this.mouse = mouse;
        this.options = {
            iterations_poisson: 32,
            iterations_viscous: 32,
            mouse_force: 20,
            resolution: 0.5,
            cursor_size: 100,
            viscous: 30,
            isBounce: false,
            dt: 0.014,
            isViscous: false,
            BFECC: true,
            ...options
        };
        this.fbos = {
            vel_0: null, vel_1: null,
            vel_viscous0: null, vel_viscous1: null,
            div: null, pressure_0: null, pressure_1: null
        };
        this.init();
    }
    init() {
        this.calcSize();
        this.createAllFBO();
        this.createShaderPass();
    }
    getFloatType() {
        const isIOS = /(iPad|iPhone|iPod)/i.test(navigator.userAgent);
        return isIOS ? THREE.HalfFloatType : THREE.FloatType;
    }
    createAllFBO() {
        const type = this.getFloatType();
        const opts = {
            type, depthBuffer: false, stencilBuffer: false,
            minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
            wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping
        };
        for (const key in this.fbos) {
            this.fbos[key] = new THREE.WebGLRenderTarget(this.fboSize.x, this.fboSize.y, opts);
        }
    }
    createShaderPass() {
        this.advection = new Advection(this.common, {
            cellScale: this.cellScale, fboSize: this.fboSize,
            dt: this.options.dt, src: this.fbos.vel_0, dst: this.fbos.vel_1
        });
        this.externalForce = new ExternalForce(this.common, this.mouse, {
            cellScale: this.cellScale, cursor_size: this.options.cursor_size, dst: this.fbos.vel_1
        });
        this.viscous = new Viscous(this.common, {
            cellScale: this.cellScale, boundarySpace: this.boundarySpace,
            viscous: this.options.viscous, src: this.fbos.vel_1,
            dst: this.fbos.vel_viscous1, dst_: this.fbos.vel_viscous0, dt: this.options.dt
        });
        this.divergence = new Divergence(this.common, {
            cellScale: this.cellScale, boundarySpace: this.boundarySpace,
            src: this.fbos.vel_viscous0, dst: this.fbos.div, dt: this.options.dt
        });
        this.poisson = new Poisson(this.common, {
            cellScale: this.cellScale, boundarySpace: this.boundarySpace,
            src: this.fbos.div, dst: this.fbos.pressure_1, dst_: this.fbos.pressure_0
        });
        this.pressure = new Pressure(this.common, {
            cellScale: this.cellScale, boundarySpace: this.boundarySpace,
            src_p: this.fbos.pressure_0, src_v: this.fbos.vel_viscous0,
            dst: this.fbos.vel_0, dt: this.options.dt
        });
    }
    calcSize() {
        const width = Math.max(1, Math.round(this.options.resolution * this.common.width));
        const height = Math.max(1, Math.round(this.options.resolution * this.common.height));
        this.cellScale.set(1.0 / width, 1.0 / height);
        this.fboSize.set(width, height);
    }
    resize() {
        this.calcSize();
        for (const key in this.fbos) {
            this.fbos[key].setSize(this.fboSize.x, this.fboSize.y);
        }
    }
    update() {
        if (this.options.isBounce) this.boundarySpace.set(0, 0);
        else this.boundarySpace.copy(this.cellScale);
        this.advection.update({ dt: this.options.dt, isBounce: this.options.isBounce, BFECC: this.options.BFECC });
        this.externalForce.update({ cursor_size: this.options.cursor_size, mouse_force: this.options.mouse_force, cellScale: this.cellScale });
        let vel = this.fbos.vel_1;
        if (this.options.isViscous) {
            vel = this.viscous.update({ viscous: this.options.viscous, iterations: this.options.iterations_viscous, dt: this.options.dt });
        }
        this.divergence.update({ vel });
        const pressure = this.poisson.update({ iterations: this.options.iterations_poisson });
        this.pressure.update({ vel, pressure });
    }
}

class Output {
    simulation: any;
    scene: any;
    camera: any;
    mesh: any;
    common: CommonClass;
    mouse: MouseClass;

    constructor(common: CommonClass, mouse: MouseClass, props: any, palette: THREE.Texture | null, bgColor: THREE.Vector4) {
        this.common = common;
        this.mouse = mouse;
        this.simulation = new Simulation(common, mouse, {
            mouse_force: props.mouseForce, cursor_size: props.cursorSize, viscous: props.viscous,
            iterations_viscous: props.iterationsViscous, iterations_poisson: props.iterationsPoisson,
            dt: props.dt, resolution: props.resolution, isBounce: props.isBounce, isViscous: props.isViscous
        });
        this.scene = new THREE.Scene();
        this.camera = new THREE.Camera();
        this.mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            new THREE.RawShaderMaterial({
                vertexShader: face_vert, fragmentShader: color_frag,
                transparent: true, depthWrite: false,
                uniforms: {
                    velocity: { value: this.simulation.fbos.vel_0?.texture || null },
                    palette: { value: palette },
                    bgColor: { value: bgColor }
                }
            })
        );
        this.scene.add(this.mesh);
    }
    update() {
        this.simulation.update();
        if (this.common.renderer) {
            this.common.renderer.setRenderTarget(null);
            this.common.renderer.render(this.scene, this.camera);
        }
    }
}

class WebGLManager {
    props: any;
    autoDriver: any;
    output: any;
    running = false;
    common = new CommonClass();
    mouse: MouseClass;
    rafRef: React.MutableRefObject<number | null>;
    isVisibleRef: React.MutableRefObject<boolean>;

    constructor(props: any, rafRef: React.MutableRefObject<number | null>, isVisibleRef: React.MutableRefObject<boolean>, palette: THREE.Texture | null, bgColor: THREE.Vector4) {
        this.props = props;
        this.rafRef = rafRef;
        this.isVisibleRef = isVisibleRef;
        this.common.init(props.$wrapper);
        this.mouse = new MouseClass(this.common);
        this.mouse.init(props.$wrapper);
        this.mouse.autoIntensity = props.autoIntensity;
        this.mouse.takeoverDuration = props.takeoverDuration;
        this.mouse.onInteract = () => { if (this.autoDriver) this.autoDriver.forceStop(); };

        this.autoDriver = new AutoDriver(this.mouse, {
            enabled: props.autoDemo, speed: props.autoSpeed,
            resumeDelay: props.autoResumeDelay, rampDuration: props.autoRampDuration
        });
        
        this.output = new Output(this.common, this.mouse, this.props, palette, bgColor);
        this.props.$wrapper.prepend(this.common.renderer!.domElement);

        window.addEventListener('resize', this.resize);
        document.addEventListener('visibilitychange', this.onVisibility);
        this.running = false;
    }
    onVisibility = () => {
        if (document.hidden) this.pause();
        else if (this.isVisibleRef.current) this.start();
    };
    resize = () => {
        this.common.resize();
        this.output.simulation.resize();
    };
    loop = () => {
        if (!this.running) return;
        if (this.autoDriver) this.autoDriver.update();
        this.mouse.update();
        this.output.update();
        this.rafRef.current = requestAnimationFrame(this.loop);
    };
    start() {
        if (this.running) return;
        this.running = true;
        this.loop();
    }
    pause() {
        this.running = false;
        if (this.rafRef.current) {
            cancelAnimationFrame(this.rafRef.current);
            this.rafRef.current = null;
        }
    }
    dispose() {
        window.removeEventListener('resize', this.resize);
        document.removeEventListener('visibilitychange', this.onVisibility);
        this.pause();
        this.common.dispose();
    }
}

// --- Main Component ---
interface LiquidEtherProps {
    className?: string; style?: React.CSSProperties; colors?: string[]; bgOpacity?: number;
    mouseForce?: number; cursorSize?: number; viscous?: number; iterationsViscous?: number;
    iterationsPoisson?: number; dt?: number; resolution?: number; isBounce?: boolean;
    isViscous?: boolean; BFECC?: boolean; autoDemo?: boolean; autoSpeed?: number;
    autoIntensity?: number; takeoverDuration?: number; autoResumeDelay?: number;
    autoRampDuration?: number; isMobile?: boolean;
}

export default function LiquidEther(props: LiquidEtherProps) {
    const {
        className = '', style = { width: '100%', height: '100%' }, colors = ['#ffffff', '#ffffff', '#ffffff'],
        bgOpacity = 0, mouseForce = 15, cursorSize = 80, viscous = 30, iterationsViscous = 32, iterationsPoisson = 32,
        dt = 0.014, resolution = 0.5, isBounce = false, isViscous = false, BFECC = true, autoDemo = true,
        autoSpeed = 1, autoIntensity = 1, takeoverDuration = 3, autoResumeDelay = 2000, autoRampDuration = 2, isMobile = false
    } = props;

    const mountRef = useRef<HTMLDivElement>(null);
    const webglRef = useRef<WebGLManager | null>(null);
    const rafRef = useRef<number | null>(null);
    const isVisibleRef = useRef<boolean>(true);
    const paletteRef = useRef<THREE.Texture | null>(null);
    const bgVecRef = useRef(new THREE.Vector4(0, 0, 0, bgOpacity));

    useEffect(() => {
        paletteRef.current = makePaletteTexture(colors);
        bgVecRef.current.set(0, 0, 0, bgOpacity);
    }, [colors, bgOpacity]);

    useEffect(() => {
        if (!mountRef.current) return;
        const webgl = new WebGLManager({
            $wrapper: mountRef.current, mouseForce, cursorSize, viscous, iterationsViscous, iterationsPoisson,
            dt, resolution, isBounce, isViscous, BFECC, autoDemo, autoSpeed, autoIntensity,
            takeoverDuration, autoResumeDelay, autoRampDuration, isMobile
        }, rafRef, isVisibleRef, paletteRef.current, bgVecRef.current);
        
        webglRef.current = webgl;
        webgl.start();

        const io = new IntersectionObserver(entries => {
            isVisibleRef.current = entries[0].isIntersecting;
            if (isVisibleRef.current && !document.hidden) webgl.start();
            else webgl.pause();
        }, { threshold: 0.01 });
        io.observe(mountRef.current);

        return () => {
            io.disconnect();
            webgl.dispose();
            webglRef.current = null;
        };
    }, []);

    useEffect(() => {
        const webgl = webglRef.current;
        if (!webgl) return;
        const sim = webgl.output.simulation;
        const currentRes = isMobile ? 0.35 : resolution;
        const prevRes = sim.options.resolution;

        Object.assign(sim.options, {
            mouse_force: mouseForce, cursor_size: cursorSize, isViscous, viscous,
            iterations_viscous: isMobile ? 12 : iterationsViscous,
            iterations_poisson: isMobile ? 12 : iterationsPoisson,
            dt, BFECC, resolution: currentRes, isBounce
        });

        if (webgl.autoDriver) {
            webgl.autoDriver.enabled = autoDemo;
            webgl.autoDriver.speed = autoSpeed;
            webgl.autoDriver.resumeDelay = autoResumeDelay;
            webgl.autoDriver.rampDurationMs = autoRampDuration * 1000;
            webgl.mouse.autoIntensity = autoIntensity;
            webgl.mouse.takeoverDuration = takeoverDuration;
        }

        if (currentRes !== prevRes) sim.resize();
    }, [mouseForce, cursorSize, isViscous, viscous, iterationsViscous, iterationsPoisson, dt, BFECC, resolution, isBounce, autoDemo, autoSpeed, autoIntensity, takeoverDuration, autoResumeDelay, autoRampDuration, isMobile]);

    return <div ref={mountRef} className={`liquid-ether-container ${className}`} style={style} />;
}
