/**
 * Cherry Street Labs — NYC Night Traffic (Three.js)
 * Bird's-eye Manhattan grid with glowing vehicles, bloom, mouse parallax.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ─── Constants ─────────────────────────────────────────────────── */
const MANHATTAN_ANGLE = 29 * (Math.PI / 180);
const COS_A = Math.cos(MANHATTAN_ANGLE);
const SIN_A = Math.sin(MANHATTAN_ANGLE);
const GRID    = 8;       // roads per axis
const BLOCK   = 16;      // spacing between roads
const ROAD_W  = 2.0;     // road width
const SPAN    = GRID * BLOCK;
const CARS    = 600;

export class NYCTrafficScene {
    constructor(canvas) {
        this.canvas = canvas;
        this.W = window.innerWidth;
        this.H = window.innerHeight;
        this.mouse = { x: 0, y: 0 };
        this.running = false;
        this.clock = new THREE.Clock();
        this._onResize = this._onResize.bind(this);
        this._onMouse  = this._onMouse.bind(this);
    }

    init() {
        /* Renderer */
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.W, this.H);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        /* Scene */
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x04040c);
        this.scene.fog = new THREE.FogExp2(0x04040c, 0.004);

        /* Camera — bird's eye with slight angle */
        this.camera = new THREE.PerspectiveCamera(50, this.W / this.H, 0.5, 500);
        this.camera.position.set(0, 78, 48);
        this.camera.lookAt(0, 0, 0);
        this.cameraBase = this.camera.position.clone();

        /* Bloom */
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        this.composer.addPass(new UnrealBloomPass(
            new THREE.Vector2(this.W, this.H),
            1.3,   // strength
            0.5,   // radius
            0.65   // threshold
        ));
        this.composer.addPass(new OutputPass());

        /* Build world */
        this._buildGround();
        this._buildRoads();
        this._buildBuildings();
        this._buildVehicles();

        /* Events */
        window.addEventListener('resize', this._onResize);
        window.addEventListener('mousemove', this._onMouse);

        this.running = true;
        this.canvas.classList.add('visible');
        this._loop();
    }

    /* ─── Ground ─────────────────────────────────────────────────── */
    _buildGround() {
        const g = new THREE.Mesh(
            new THREE.PlaneGeometry(500, 500),
            new THREE.MeshBasicMaterial({ color: 0x050510 })
        );
        g.rotation.x = -Math.PI / 2;
        g.position.y = -0.05;
        this.scene.add(g);
    }

    /* ─── Roads ──────────────────────────────────────────────────── */
    _buildRoads() {
        const group = new THREE.Group();
        group.rotation.y = MANHATTAN_ANGLE;
        this.scene.add(group);

        const roadMat  = new THREE.MeshBasicMaterial({ color: 0x0c0c1e });
        const lineMat  = new THREE.MeshBasicMaterial({ color: 0x181830 });
        const crossMat = new THREE.MeshBasicMaterial({ color: 0x141428 });

        const halfGrid = (GRID - 1) / 2;
        const roadLen  = SPAN * 1.6;

        for (let i = 0; i < GRID; i++) {
            const off = (i - halfGrid) * BLOCK;

            // Horizontal road
            const hr = new THREE.Mesh(new THREE.PlaneGeometry(roadLen, ROAD_W), roadMat);
            hr.rotation.x = -Math.PI / 2;
            hr.position.set(0, 0, off);
            group.add(hr);

            // Vertical road
            const vr = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, roadLen), roadMat);
            vr.rotation.x = -Math.PI / 2;
            vr.position.set(off, 0, 0);
            group.add(vr);

            // Dashed center lines
            const dashN = Math.floor(roadLen / 3);
            for (let d = 0; d < dashN; d++) {
                const pos = -roadLen / 2 + d * 3 + 1.5;
                // Horizontal dashes
                const dh = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.06), lineMat);
                dh.rotation.x = -Math.PI / 2;
                dh.position.set(pos, 0.01, off);
                group.add(dh);
                // Vertical dashes
                const dv = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 1.3), lineMat);
                dv.rotation.x = -Math.PI / 2;
                dv.position.set(off, 0.01, pos);
                group.add(dv);
            }
        }

        // Intersections
        for (let i = 0; i < GRID; i++) {
            for (let j = 0; j < GRID; j++) {
                const c = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, ROAD_W), crossMat);
                c.rotation.x = -Math.PI / 2;
                c.position.set((i - halfGrid) * BLOCK, 0.005, (j - halfGrid) * BLOCK);
                group.add(c);
            }
        }

        this.roadGroup = group;
    }

    /* ─── Buildings ──────────────────────────────────────────────── */
    _buildBuildings() {
        const group = new THREE.Group();
        group.rotation.y = MANHATTAN_ANGLE;
        this.scene.add(group);

        const halfGrid = (GRID - 1) / 2;
        const bSize = BLOCK - ROAD_W - 1.5;

        for (let i = 0; i < GRID - 1; i++) {
            for (let j = 0; j < GRID - 1; j++) {
                const cx = (i - halfGrid + 0.5) * BLOCK;
                const cz = (j - halfGrid + 0.5) * BLOCK;
                const numB = 2 + Math.floor(Math.random() * 4);

                for (let b = 0; b < numB; b++) {
                    const w = bSize * (0.25 + Math.random() * 0.35);
                    const d = bSize * (0.25 + Math.random() * 0.35);
                    const h = 1.5 + Math.random() * 12;
                    const bx = cx + (Math.random() - 0.5) * bSize * 0.5;
                    const bz = cz + (Math.random() - 0.5) * bSize * 0.5;

                    const mesh = new THREE.Mesh(
                        new THREE.BoxGeometry(w, h, d),
                        new THREE.MeshBasicMaterial({ color: 0x070714 })
                    );
                    mesh.position.set(bx, h / 2, bz);
                    group.add(mesh);

                    // Lit windows — tiny glowing planes on building faces
                    const nWin = 1 + Math.floor(Math.random() * 4);
                    for (let wi = 0; wi < nWin; wi++) {
                        const wColor = Math.random() < 0.65
                            ? new THREE.Color(0xffcc55)
                            : new THREE.Color(0xb8d4ff);
                        const wMat = new THREE.MeshBasicMaterial({
                            color: wColor,
                            transparent: true,
                            opacity: 0.25 + Math.random() * 0.45,
                        });
                        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.35), wMat);
                        const wy = h * (0.15 + Math.random() * 0.7);
                        const face = Math.floor(Math.random() * 4);
                        if (face === 0) { win.position.set(bx + (Math.random() - 0.5) * w * 0.7, wy, bz + d / 2 + 0.01); }
                        else if (face === 1) { win.position.set(bx + (Math.random() - 0.5) * w * 0.7, wy, bz - d / 2 - 0.01); win.rotation.y = Math.PI; }
                        else if (face === 2) { win.position.set(bx + w / 2 + 0.01, wy, bz + (Math.random() - 0.5) * d * 0.7); win.rotation.y = Math.PI / 2; }
                        else { win.position.set(bx - w / 2 - 0.01, wy, bz + (Math.random() - 0.5) * d * 0.7); win.rotation.y = -Math.PI / 2; }
                        group.add(win);
                    }
                }
            }
        }
    }

    /* ─── Vehicles (InstancedMesh) ──────────────────────────────── */
    _buildVehicles() {
        const halfGrid = (GRID - 1) / 2;
        // Headlight mesh (front of car — bright white/amber)
        const hGeo = new THREE.BoxGeometry(0.5, 0.18, 0.9);
        const hMat = new THREE.MeshStandardMaterial({
            color: 0xfffaee,
            emissive: new THREE.Color(0xfffaee),
            emissiveIntensity: 2.2,
        });
        this.headlights = new THREE.InstancedMesh(hGeo, hMat, CARS);
        this.headlights.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        // Taillight mesh (back — red)
        const tGeo = new THREE.BoxGeometry(0.45, 0.1, 0.06);
        const tMat = new THREE.MeshStandardMaterial({
            color: 0xff2200,
            emissive: new THREE.Color(0xff2200),
            emissiveIntensity: 2.5,
        });
        this.taillights = new THREE.InstancedMesh(tGeo, tMat, CARS);
        this.taillights.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        // Per-vehicle data
        this.cars = [];
        for (let i = 0; i < CARS; i++) {
            const isH   = Math.random() > 0.5;                  // horizontal or vertical road
            const lane  = Math.floor(Math.random() * GRID);     // which road
            const dir   = Math.random() > 0.5 ? 1 : -1;        // direction
            const speed = 0.04 + Math.random() * 0.12;          // units per frame
            const laneOff = (lane - halfGrid) * BLOCK;
            const perpOff = (Math.random() - 0.5) * (ROAD_W * 0.7);
            const pos   = (Math.random() - 0.5) * SPAN * 1.4;  // spread across road length

            // Rotation: horizontal roads = ±X, vertical roads = ±Z
            let rotY;
            if (isH) {
                rotY = dir > 0 ? 0 : Math.PI;          // +Z or -Z
            } else {
                rotY = dir > 0 ? Math.PI / 2 : -Math.PI / 2;  // +X or -X
            }

            // Headlight color variation
            const isAmber = Math.random() < 0.2;
            if (isAmber) {
                this.headlights.setColorAt(i, new THREE.Color(0xffcc44));
            } else {
                this.headlights.setColorAt(i, new THREE.Color(0xfffaee));
            }

            this.cars.push({ isH, laneOff, perpOff, dir, speed, pos, rotY });
        }
        if (this.headlights.instanceColor) this.headlights.instanceColor.needsUpdate = true;

        this.scene.add(this.headlights);
        this.scene.add(this.taillights);
    }

    /* ─── Update vehicles ────────────────────────────────────────── */
    _updateVehicles() {
        const dummy = new THREE.Object3D();
        const bound = SPAN * 0.8;

        for (let i = 0; i < this.cars.length; i++) {
            const c = this.cars[i];

            // Move along the road
            c.pos += c.speed * c.dir;

            // Wrap around
            if (c.pos > bound)  c.pos -= bound * 2;
            if (c.pos < -bound) c.pos += bound * 2;

            // Local grid position
            let lx, lz;
            if (c.isH) {
                lx = c.laneOff + c.perpOff;  // fixed on this road
                lz = c.pos;                   // moving along Z
            } else {
                lx = c.pos;                   // moving along X
                lz = c.laneOff + c.perpOff;
            }

            // Rotate to world space (Manhattan angle)
            const wx = lx * COS_A - lz * SIN_A;
            const wz = lx * SIN_A + lz * COS_A;
            const worldRot = c.rotY + MANHATTAN_ANGLE;

            // Headlight position
            dummy.position.set(wx, 0.12, wz);
            dummy.rotation.set(0, worldRot, 0);
            dummy.updateMatrix();
            this.headlights.setMatrixAt(i, dummy.matrix);

            // Taillight — offset behind vehicle
            const tailDist = 0.55;
            const cosR = Math.cos(worldRot);
            const sinR = Math.sin(worldRot);
            dummy.position.set(wx - sinR * tailDist, 0.1, wz - cosR * tailDist);
            dummy.updateMatrix();
            this.taillights.setMatrixAt(i, dummy.matrix);
        }

        this.headlights.instanceMatrix.needsUpdate = true;
        this.taillights.instanceMatrix.needsUpdate = true;
    }

    /* ─── Animation Loop ─────────────────────────────────────────── */
    _loop() {
        if (!this.running) return;
        requestAnimationFrame(() => this._loop());

        const t = this.clock.getElapsedTime();

        // Slow camera drift
        this.camera.position.x = this.cameraBase.x + Math.sin(t * 0.035) * 3.5;
        this.camera.position.z = this.cameraBase.z + Math.cos(t * 0.028) * 2.5;

        // Mouse parallax
        this.camera.position.x += this.mouse.x * 5;
        this.camera.position.z += this.mouse.y * -3;
        this.camera.lookAt(0, 0, 0);

        this._updateVehicles();
        this.composer.render();
    }

    /* ─── Events ─────────────────────────────────────────────────── */
    _onResize() {
        this.W = window.innerWidth;
        this.H = window.innerHeight;
        this.camera.aspect = this.W / this.H;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.W, this.H);
        this.composer.setSize(this.W, this.H);
    }

    _onMouse(e) {
        this.mouse.x = (e.clientX / this.W - 0.5);
        this.mouse.y = (e.clientY / this.H - 0.5);
    }

    /* ─── Control ────────────────────────────────────────────────── */
    stop()  { this.running = false; }
    start() { if (!this.running) { this.running = true; this._loop(); } }
}
