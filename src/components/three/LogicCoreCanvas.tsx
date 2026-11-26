/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logic Quest — Interactive 3D Geometric Puzzle Centerpiece (Living Logic Core)
 * - Preserves the Logic Quest 3D crystal model, inner nucleus, 3 gyroscopic rings,
 *   and 8 orbiting category polyhedra.
 * - Real mouse & touch drag-to-rotate with pointer capture, drag-vs-tap threshold,
 *   clamped vertical pitch limits, smooth exponential damping, and release inertia.
 * - Tapping without dragging triggers a coordinated magical energy pulse.
 * - Separate `interactionPivot` and `autoOrbitGroup` hierarchy so manual drag rotation
 *   never conflicts with continuous automatic idle rotation or internal ring motion.
 * - Layout-neutral `absolute inset-0` canvas mounting so the 3D renderer adapts to the
 *   available flex space on phones and tablets without pushing the Home screen cards below
 *   the viewport.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundEngine } from '../../audio/soundEngine';
import { PUZZLE_CATEGORIES_ORDER, getCategoryMetadata } from '../../engine/categories';
import { PuzzleCategory } from '../../types/game';

// Module-level persisted elapsed time & rotation so returning to Home is seamless
let _persistedElapsedTime = 0;
let _persistedAutoRotationY = 0;

// Pre-allocated scratch math objects outside the animation loop (Zero GC)
const _instanceMatrix = new THREE.Matrix4();
const _instancePos = new THREE.Vector3();
const _instanceQuat = new THREE.Quaternion();
const _instanceScale = new THREE.Vector3();
const _instanceEuler = new THREE.Euler();
const _color = new THREE.Color();
const _targetColor = new THREE.Color();

const DRAG_THRESHOLD_PX = 6;
const MAX_PITCH_RAD = 0.78; // ~45 deg vertical pitch clamp

interface LogicCoreCanvasProps {
  activeCategory?: PuzzleCategory | null;
  resolvedTheme: 'dark' | 'light';
}

function createCalibrationRingTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0c1938';
    ctx.fillRect(0, 0, 512, 64);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    for (let i = 0; i < 64; i++) {
      const x = i * 8;
      const tickHeight = i % 8 === 0 ? 22 : i % 4 === 0 ? 14 : 8;
      ctx.beginPath();
      ctx.moveTo(x, 32 - tickHeight / 2);
      ctx.lineTo(x, 32 + tickHeight / 2);
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
    grad.addColorStop(0, 'rgba(6, 182, 212, 0.36)');
    grad.addColorStop(0.45, 'rgba(15, 23, 42, 0.22)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export const LogicCoreCanvas: React.FC<LogicCoreCanvasProps> = ({
  activeCategory = null,
  resolvedTheme,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglFallback, setWebglFallback] = useState(false);
  const [fallbackPulse, setFallbackPulse] = useState(false);

  const stateRef = useRef({
    activeCategory,
    resolvedTheme,
    hoverX: 0,
    hoverY: 0,
    pulseImpulse: 0,
    reducedMotion: false,
    isPageHidden: false,
    isContextLost: false,
    // Manual drag & inertia state
    activePointerId: null as number | null,
    isPointerDown: false,
    isDragging: false,
    downX: 0,
    downY: 0,
    lastX: 0,
    lastY: 0,
    lastMoveTime: 0,
    targetYaw: 0,
    targetPitch: 0,
    currentYaw: 0,
    currentPitch: 0,
    velYaw: 0,
    velPitch: 0,
    idleBlend: 1,
  });

  useEffect(() => {
    stateRef.current.activeCategory = activeCategory;
    if (activeCategory) {
      stateRef.current.pulseImpulse = 0.95;
    }
  }, [activeCategory]);

  useEffect(() => {
    stateRef.current.resolvedTheme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    stateRef.current.reducedMotion = reducedMotionQuery.matches;
    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      stateRef.current.reducedMotion = e.matches;
    };
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);

    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const isLowPowerOrTablet = (() => {
      const cores = navigator.hardwareConcurrency || 4;
      const isTouchTablet =
        navigator.maxTouchPoints > 0 &&
        Math.min(window.innerWidth, window.innerHeight) >= 600;
      return cores <= 4 || isTouchTablet;
    })();

    const width = Math.max(160, container.clientWidth);
    const height = Math.max(95, container.clientHeight);

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFallback(true);
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setClearColor(0x000000, 0);

    const computePixelRatio = () => {
      if (isSoftwareGl) return 1;
      const maxDpr = isLowPowerOrTablet ? 1.5 : 2.0;
      return Math.min(window.devicePixelRatio || 1, maxDpr);
    };

    const isSmallMobileScreen = window.innerWidth < 640;
    renderer.setPixelRatio(computePixelRatio());
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = !isSoftwareGl && !isSmallMobileScreen;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvasEl = renderer.domElement;
    canvasEl.style.width = '100%';
    canvasEl.style.height = '100%';
    canvasEl.style.display = 'block';
    canvasEl.style.touchAction = 'none';
    canvasEl.style.userSelect = 'none';
    canvasEl.style.webkitUserSelect = 'none';

    container.innerHTML = '';
    container.appendChild(canvasEl);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x09152e, 1.0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xf0f9ff, 2.35);
    keyLight.position.set(4.5, 6.5, 5.0);
    keyLight.castShadow = !isSoftwareGl && !isSmallMobileScreen;
    keyLight.shadow.camera.left = -4;
    keyLight.shadow.camera.right = 4;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -4;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x0ea5e9, 1.7);
    rimLight.position.set(-5.0, 2.5, -4.5);
    scene.add(rimLight);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const calibrationTex = createCalibrationRingTexture(maxAnisotropy);
    const contactShadowTex = createContactShadowTexture();

    const coreCrystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x06b6d4,
      emissive: 0x0284c7,
      emissiveIntensity: 0.44,
      metalness: 0.14,
      roughness: 0.10,
      transmission: isSoftwareGl ? 0 : 0.80,
      transparent: true,
      opacity: isSoftwareGl ? 0.85 : 0.93,
      ior: 1.68,
      thickness: 1.45,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });

    const innerNucleusMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.95,
      metalness: 0.85,
      roughness: 0.15,
    });

    const cageFrameMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.16,
      metalness: 0.92,
      roughness: 0.22,
    });

    const ringMachinedMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      map: calibrationTex,
      emissive: 0x0284c7,
      emissiveIntensity: 0.24,
      metalness: 0.86,
      roughness: 0.28,
    });

    const outerHeavyRingMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.36,
      metalness: 0.78,
      roughness: 0.30,
    });

    // Separate Interaction Pivot (manual drag + inertia) vs Auto Orbit Group (idle rotation + levitation)
    const interactionPivot = new THREE.Group();
    interactionPivot.position.set(0, 0.14, 0);
    scene.add(interactionPivot);

    const autoOrbitGroup = new THREE.Group();
    autoOrbitGroup.rotation.y = _persistedAutoRotationY;
    interactionPivot.add(autoOrbitGroup);

    // Internal point light so the crystal acts as a true radiant energy source
    const corePointLight = new THREE.PointLight(0x22d3ee, 1.85, 6.8, 1.5);
    corePointLight.position.set(0, 0, 0);
    autoOrbitGroup.add(corePointLight);

    // 1 & 2. Inner Nucleus & Central Crystal Shell
    const nucleusGeo = new THREE.OctahedronGeometry(0.58, 0);
    const nucleusMesh = new THREE.Mesh(nucleusGeo, innerNucleusMat);
    autoOrbitGroup.add(nucleusMesh);

    const crystalShellGeo = new THREE.OctahedronGeometry(0.96, 0);
    const crystalShellMesh = new THREE.Mesh(crystalShellGeo, coreCrystalMat);
    crystalShellMesh.renderOrder = 2;
    autoOrbitGroup.add(crystalShellMesh);

    const dodecaGeo = new THREE.DodecahedronGeometry(1.22, 0);
    const edgeWireGeo = new THREE.EdgesGeometry(dodecaGeo);
    dodecaGeo.dispose();
    const edgeWireMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.68,
    });
    const edgeWireSegments = new THREE.LineSegments(edgeWireGeo, edgeWireMat);
    autoOrbitGroup.add(edgeWireSegments);

    // 3. Three Independent Gyroscopic Rings
    // Inner Ring (Delicate movement, calibrated luminous detail)
    const ringRadiusA = 1.56;
    const ringGeoA = new THREE.TorusGeometry(ringRadiusA, 0.036, 16, 64);
    const ringMeshA = new THREE.Mesh(ringGeoA, ringMachinedMat);
    autoOrbitGroup.add(ringMeshA);

    // Middle Ring (Independent rotation axis, orbital precession)
    const ringRadiusB = 1.82;
    const ringGeoB = new THREE.TorusGeometry(ringRadiusB, 0.038, 16, 64);
    const ringMeshB = new THREE.Mesh(ringGeoB, cageFrameMat);
    ringMeshB.rotation.x = Math.PI / 3;
    autoOrbitGroup.add(ringMeshB);

    // Outer Ring (Slow deliberate mechanical rotation)
    const ringRadiusC = 2.08;
    const ringGeoC = new THREE.TorusGeometry(ringRadiusC, 0.048, 16, 72);
    const ringMeshC = new THREE.Mesh(ringGeoC, outerHeavyRingMat);
    ringMeshC.rotation.y = Math.PI / 4;
    autoOrbitGroup.add(ringMeshC);

    const spireGeo = new THREE.ConeGeometry(0.18, 0.46, 6);
    const topSpire = new THREE.Mesh(spireGeo, cageFrameMat);
    topSpire.position.set(0, 1.38, 0);
    autoOrbitGroup.add(topSpire);

    const bottomSpire = new THREE.Mesh(spireGeo, cageFrameMat);
    bottomSpire.rotation.x = Math.PI;
    bottomSpire.position.set(0, -1.38, 0);
    autoOrbitGroup.add(bottomSpire);

    // 4A. Luminous Energy Nodes & Short Trails Travelling Along the 3 Rings (Zero-GC InstancedMesh)
    const travelerCount = 24;
    const travelerGeo = new THREE.OctahedronGeometry(0.052, 0);
    const travelerMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x22d3ee,
      emissiveIntensity: 1.45,
      metalness: 0.4,
      roughness: 0.15,
    });
    const travelerInstanced = new THREE.InstancedMesh(
      travelerGeo,
      travelerMat,
      travelerCount
    );
    travelerInstanced.frustumCulled = false;
    for (let i = 0; i < travelerCount; i++) {
      const seg = i % 4;
      _color.setHex(seg === 0 ? 0xffffff : seg === 1 ? 0xa5f3fc : 0x38bdf8);
      travelerInstanced.setColorAt(i, _color);
    }
    if (travelerInstanced.instanceColor) {
      travelerInstanced.instanceColor.needsUpdate = true;
    }
    autoOrbitGroup.add(travelerInstanced);

    // 4B. Tiny Orbiting Energy Particles Inside the Sanctuary Core (Zero-GC InstancedMesh)
    const microParticleCount = 16;
    const microParticleGeo = new THREE.OctahedronGeometry(0.034, 0);
    const microParticleMat = new THREE.MeshBasicMaterial({
      color: 0xa5f3fc,
      transparent: true,
      opacity: 0.85,
    });
    const microOrbitInstanced = new THREE.InstancedMesh(
      microParticleGeo,
      microParticleMat,
      microParticleCount
    );
    microOrbitInstanced.frustumCulled = false;
    for (let i = 0; i < microParticleCount; i++) {
      _color.setHex(i % 3 === 0 ? 0xffffff : i % 2 === 0 ? 0x67e8f9 : 0x38bdf8);
      microOrbitInstanced.setColorAt(i, _color);
    }
    if (microOrbitInstanced.instanceColor) {
      microOrbitInstanced.instanceColor.needsUpdate = true;
    }
    autoOrbitGroup.add(microOrbitInstanced);

    // 5. Eight Orbiting Category Objects
    const categoryNodesGroup = new THREE.Group();
    autoOrbitGroup.add(categoryNodesGroup);

    const nodeEntries: Array<{
      category: PuzzleCategory;
      mesh: THREE.Mesh;
      material: THREE.MeshStandardMaterial;
      baseAngle: number;
      baseRadius: number;
      speedOffset: number;
    }> = [];

    const nodeGeometries: THREE.BufferGeometry[] = [
      new THREE.OctahedronGeometry(0.19, 0),
      new THREE.IcosahedronGeometry(0.19, 0),
      new THREE.DodecahedronGeometry(0.19, 0),
      new THREE.TetrahedronGeometry(0.21, 0),
      new THREE.BoxGeometry(0.25, 0.25, 0.25),
      new THREE.CylinderGeometry(0.16, 0.16, 0.25, 6),
      new THREE.TorusGeometry(0.14, 0.05, 12, 24),
      new THREE.ConeGeometry(0.18, 0.3, 4),
    ];

    PUZZLE_CATEGORIES_ORDER.forEach((catId, index) => {
      const meta = getCategoryMetadata(catId);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(meta.accentHex),
        emissive: new THREE.Color(meta.accentHex),
        emissiveIntensity: 0.36,
        metalness: 0.66,
        roughness: 0.24,
      });

      const geo = nodeGeometries[index % nodeGeometries.length];
      const mesh = new THREE.Mesh(geo, mat);
      const angle = (index / PUZZLE_CATEGORIES_ORDER.length) * Math.PI * 2;
      const radius = 2.42 + (index % 2) * 0.11;
      mesh.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle * 2) * 0.25,
        Math.sin(angle) * radius
      );

      categoryNodesGroup.add(mesh);
      nodeEntries.push({
        category: catId,
        mesh,
        material: mat,
        baseAngle: angle,
        baseRadius: radius,
        speedOffset: 0.92 + (index % 3) * 0.08,
      });
    });

    // Ground Contact Shadow Plane (stays horizontal beneath the floating core)
    const groundY = -1.62;
    const shadowPlaneGeo = new THREE.PlaneGeometry(4.8, 4.8);
    const shadowPlaneMat = new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.5,
    });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(0, groundY, 0);
    scene.add(shadowPlane);

    // Outer Ambient Crystal Shard Belt (rotates with interactionPivot so dragging feels unified)
    const shardCount = 28;
    const shardGeo = new THREE.OctahedronGeometry(0.048, 0);
    const shardMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.38,
      metalness: 0.8,
      roughness: 0.2,
    });
    const shardInstanced = new THREE.InstancedMesh(shardGeo, shardMat, shardCount);
    for (let i = 0; i < shardCount; i++) {
      const angle = (i / shardCount) * Math.PI * 2;
      const radius = 2.82 + (i % 4) * 0.16;
      const yOffset = ((i % 7) - 3) * 0.28;
      const scale = 0.72 + (i % 3) * 0.18;

      _instancePos.set(Math.cos(angle) * radius, yOffset, Math.sin(angle) * radius);
      _instanceEuler.set(angle, angle * 0.5, 0);
      _instanceQuat.setFromEuler(_instanceEuler);
      _instanceScale.setScalar(scale);
      _instanceMatrix.compose(_instancePos, _instanceQuat, _instanceScale);
      shardInstanced.setMatrixAt(i, _instanceMatrix);

      _color.setHex(i % 2 === 0 ? 0x38bdf8 : 0x818cf8);
      shardInstanced.setColorAt(i, _color);
    }
    shardInstanced.instanceMatrix.needsUpdate = true;
    if (shardInstanced.instanceColor) shardInstanced.instanceColor.needsUpdate = true;
    shardInstanced.computeBoundingSphere();
    interactionPivot.add(shardInstanced);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // =========================================================================
    // POINTER & TOUCH DRAG ROTATION + TAP PULSE + INERTIA
    // =========================================================================
    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const st = stateRef.current;
      if (st.activePointerId !== null) return;

      st.activePointerId = e.pointerId;
      st.isPointerDown = true;
      st.isDragging = false;
      st.downX = e.clientX;
      st.downY = e.clientY;
      st.lastX = e.clientX;
      st.lastY = e.clientY;
      st.lastMoveTime = performance.now();
      st.velYaw = 0;
      st.velPitch = 0;

      try {
        canvasEl.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if synthetic event lacks pointer capture support
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const st = stateRef.current;
      const rect = canvasEl.getBoundingClientRect();

      if (!st.isPointerDown && e.pointerType === 'mouse') {
        if (rect.width > 0 && rect.height > 0) {
          st.hoverX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          st.hoverY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        }
        return;
      }

      if (e.pointerId !== st.activePointerId || !st.isPointerDown) return;

      const totalDist = Math.hypot(e.clientX - st.downX, e.clientY - st.downY);
      if (!st.isDragging && totalDist >= DRAG_THRESHOLD_PX) {
        st.isDragging = true;
      }

      if (st.isDragging) {
        const now = performance.now();
        const moveDt = Math.max(0.008, Math.min(0.1, (now - st.lastMoveTime) / 1000));
        const dx = e.clientX - st.lastX;
        const dy = e.clientY - st.lastY;

        st.lastX = e.clientX;
        st.lastY = e.clientY;
        st.lastMoveTime = now;

        const referenceSpan = Math.max(200, Math.min(rect.width || 300, 460));
        const rotScale = 3.25 / referenceSpan;

        const deltaYaw = dx * rotScale;
        const deltaPitch = dy * rotScale * 0.85;

        st.targetYaw += deltaYaw;
        st.targetPitch = THREE.MathUtils.clamp(
          st.targetPitch + deltaPitch,
          -MAX_PITCH_RAD,
          MAX_PITCH_RAD
        );

        const instVelYaw = THREE.MathUtils.clamp(deltaYaw / moveDt, -8.5, 8.5);
        const instVelPitch = THREE.MathUtils.clamp(deltaPitch / moveDt, -6.5, 6.5);
        st.velYaw = THREE.MathUtils.lerp(st.velYaw, instVelYaw, 0.55);
        st.velPitch = THREE.MathUtils.lerp(st.velPitch, instVelPitch, 0.55);
      }
    };

    const finishPointerInteraction = (e: PointerEvent, allowTapPulse: boolean) => {
      const st = stateRef.current;
      if (e.pointerId !== st.activePointerId) return;

      try {
        if (canvasEl.hasPointerCapture(e.pointerId)) {
          canvasEl.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore
      }

      if (!st.isDragging && allowTapPulse) {
        st.pulseImpulse = 1.38;
        soundEngine.playClick();
      } else if (st.isDragging) {
        if (performance.now() - st.lastMoveTime > 110) {
          st.velYaw *= 0.15;
          st.velPitch *= 0.15;
        }
      }

      st.isPointerDown = false;
      st.isDragging = false;
      st.activePointerId = null;
    };

    const handlePointerUp = (e: PointerEvent) => finishPointerInteraction(e, true);
    const handlePointerCancel = (e: PointerEvent) => finishPointerInteraction(e, false);
    const handleLostPointerCapture = (e: PointerEvent) => finishPointerInteraction(e, false);

    const handlePointerLeave = () => {
      stateRef.current.hoverX = 0;
      stateRef.current.hoverY = 0;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const st = stateRef.current;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        st.velYaw = -1.8;
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        st.velYaw = 1.8;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        st.velPitch = -1.3;
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        st.velPitch = 1.3;
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        st.pulseImpulse = 1.38;
        soundEngine.playClick();
      }
    };

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      stateRef.current.isContextLost = true;
      setWebglFallback(true);
    };

    const handleContextRestored = () => {
      stateRef.current.isContextLost = false;
      setWebglFallback(false);
    };

    canvasEl.addEventListener('pointerdown', handlePointerDown);
    canvasEl.addEventListener('pointermove', handlePointerMove, { passive: true });
    canvasEl.addEventListener('pointerup', handlePointerUp);
    canvasEl.addEventListener('pointercancel', handlePointerCancel);
    canvasEl.addEventListener('lostpointercapture', handleLostPointerCapture);
    canvasEl.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    container.addEventListener('keydown', handleKeyDown);
    canvasEl.addEventListener('webglcontextlost', handleContextLost, false);
    canvasEl.addEventListener('webglcontextrestored', handleContextRestored, false);

    // =========================================================================
    // RESPONSIVE CAMERA FRAMING VIA RESIZEOBSERVER
    // =========================================================================
    const handleResize = () => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const w = Math.max(160, Math.floor(rect.width || container.clientWidth));
      const h = Math.max(95, Math.floor(rect.height || container.clientHeight));
      const aspect = w / h;

      camera.aspect = aspect;
      // Fit both vertical radius (~2.15) and horizontal radius (~3.05) within 40deg FOV
      // so the complete crystal, all 3 rings, and all 8 orbiting category objects remain
      // 100% visible without clipping across compact phones and tablets.
      const zForVertical = 5.95;
      const zForHorizontal = 8.42 / Math.max(0.42, aspect);
      const targetZ = Math.max(zForVertical, zForHorizontal);

      camera.position.set(0, 0.90 * (targetZ / 5.95), targetZ);
      camera.lookAt(0, 0.06, 0);
      camera.updateProjectionMatrix();

      renderer.setPixelRatio(computePixelRatio());
      renderer.setSize(w, h, false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => handleResize())
        : null;
    resizeObserver?.observe(container);

    const clock = new THREE.Clock();
    let frameId = 0;
    let currentThemeMix = stateRef.current.resolvedTheme === 'dark' ? 0 : 1;

    const handleVisibilityChange = () => {
      stateRef.current.isPageHidden = document.hidden;
      if (!document.hidden) {
        clock.getDelta();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const ringDefs = [
      { mesh: ringMeshA, radius: ringRadiusA, speed: 0.94, dir: 1 },
      { mesh: ringMeshB, radius: ringRadiusB, speed: 0.66, dir: -1 },
      { mesh: ringMeshC, radius: ringRadiusC, speed: 0.42, dir: 1 },
    ];

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function tick() {
      const st = stateRef.current;

      if (st.isPageHidden || st.isContextLost) {
        frameId = window.setTimeout(tick, 250);
        return;
      }

      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const motionScale = st.reducedMotion ? 0 : 1.0;
      _persistedElapsedTime += dt * motionScale;
      const elapsed = _persistedElapsedTime;

      const targetThemeMix = st.resolvedTheme === 'dark' ? 0 : 1;
      currentThemeMix = THREE.MathUtils.damp(currentThemeMix, targetThemeMix, 5, dt);
      hemiLight.intensity = 0.98 + currentThemeMix * 0.22;

      if (st.activeCategory) {
        const activeMeta = getCategoryMetadata(st.activeCategory);
        _targetColor.set(activeMeta.accentHex);
      } else {
        _targetColor.setHex(0x22d3ee);
      }
      corePointLight.color.lerp(_targetColor, Math.min(1, dt * 4));

      st.pulseImpulse = THREE.MathUtils.damp(st.pulseImpulse, 0, 3.4, dt);
      const periodicHarmonicPulse =
        Math.pow(Math.max(0, Math.sin(elapsed * 0.88)), 8) * 0.36;
      const totalEnergyPulse = st.pulseImpulse + periodicHarmonicPulse;

      // 1. MANUAL DRAG ROTATION, INERTIA & SEAMLESS IDLE ROTATION BLENDING
      if (!st.isDragging) {
        st.targetYaw += st.velYaw * dt;
        st.targetPitch = THREE.MathUtils.clamp(
          st.targetPitch + st.velPitch * dt,
          -MAX_PITCH_RAD,
          MAX_PITCH_RAD
        );

        st.velYaw = THREE.MathUtils.damp(st.velYaw, 0, 3.2, dt);
        st.velPitch = THREE.MathUtils.damp(st.velPitch, 0, 3.6, dt);

        if (!st.isPointerDown && Math.abs(st.velPitch) < 0.32) {
          st.targetPitch = THREE.MathUtils.damp(st.targetPitch, 0, 0.72, dt);
        }
      }

      st.currentYaw = THREE.MathUtils.damp(st.currentYaw, st.targetYaw, 16, dt);
      st.currentPitch = THREE.MathUtils.damp(st.currentPitch, st.targetPitch, 16, dt);

      interactionPivot.rotation.y = st.currentYaw;
      interactionPivot.rotation.x = st.currentPitch;

      const isActivelySpinning =
        st.isPointerDown || Math.hypot(st.velYaw, st.velPitch) > 0.16;
      st.idleBlend = THREE.MathUtils.damp(
        st.idleBlend,
        isActivelySpinning ? 0 : 1,
        3.2,
        dt
      );

      _persistedAutoRotationY += dt * 0.30 * motionScale * st.idleBlend;
      autoOrbitGroup.rotation.y = _persistedAutoRotationY;
      autoOrbitGroup.position.y = Math.sin(elapsed * 1.32) * 0.082;

      autoOrbitGroup.rotation.x = THREE.MathUtils.damp(
        autoOrbitGroup.rotation.x,
        st.hoverY * 0.16 * st.idleBlend,
        4.2,
        dt
      );
      autoOrbitGroup.rotation.z = THREE.MathUtils.damp(
        autoOrbitGroup.rotation.z,
        -st.hoverX * 0.14 * st.idleBlend,
        4.2,
        dt
      );

      // 2. CENTRAL CRYSTAL & INNER NUCLEUS ANIMATION
      const crystalBreathing =
        1 + Math.sin(elapsed * 1.85) * 0.028 + totalEnergyPulse * 0.08;
      crystalShellMesh.scale.setScalar(crystalBreathing);
      crystalShellMesh.rotation.y += dt * 0.22 * motionScale;
      crystalShellMesh.rotation.x = Math.sin(elapsed * 0.68) * 0.13;
      crystalShellMesh.rotation.z = Math.cos(elapsed * 0.54) * 0.095;
      coreCrystalMat.emissiveIntensity = 0.40 + totalEnergyPulse * 0.36;
      coreCrystalMat.clearcoatRoughness = 0.07 + Math.sin(elapsed * 1.4) * 0.035;

      edgeWireSegments.rotation.y -= dt * 0.18 * motionScale;
      edgeWireSegments.rotation.z = Math.sin(elapsed * 0.6) * 0.08;
      edgeWireMat.opacity = 0.58 + totalEnergyPulse * 0.30;

      const nucleusScale =
        1 + Math.sin(elapsed * 2.5) * 0.048 + totalEnergyPulse * 0.15;
      nucleusMesh.rotation.y -= dt * 0.90 * motionScale;
      nucleusMesh.rotation.x += dt * 0.60 * motionScale;
      nucleusMesh.rotation.z -= dt * 0.34 * motionScale;
      nucleusMesh.scale.setScalar(nucleusScale);
      innerNucleusMat.emissiveIntensity =
        0.86 + Math.sin(elapsed * 2.5) * 0.20 + totalEnergyPulse * 0.72;
      corePointLight.intensity = 1.70 + totalEnergyPulse * 1.45;

      // 3. THREE INDEPENDENT GYROSCOPIC RINGS
      ringMeshA.rotation.x += dt * 0.54 * motionScale;
      ringMeshA.rotation.y += dt * 0.35 * motionScale;
      ringMeshA.rotation.z = Math.sin(elapsed * 0.82) * 0.22;
      ringMachinedMat.emissiveIntensity =
        0.22 + Math.sin(elapsed * 2.1) * 0.06 + totalEnergyPulse * 0.28;

      ringMeshB.rotation.y -= dt * 0.42 * motionScale;
      ringMeshB.rotation.z += dt * 0.36 * motionScale;
      ringMeshB.rotation.x = Math.PI / 3 + Math.cos(elapsed * 0.64) * 0.19;

      const mechCadence = 1 + Math.sin(elapsed * 2.4) * 0.18;
      ringMeshC.rotation.z -= dt * 0.22 * mechCadence * motionScale;
      ringMeshC.rotation.x += dt * 0.15 * motionScale;
      ringMeshC.rotation.y = Math.PI / 4 + Math.sin(elapsed * 0.42) * 0.14;
      outerHeavyRingMat.emissiveIntensity = 0.32 + totalEnergyPulse * 0.26;

      // 4. RING ENERGY PULSES & TINY ORBITING PARTICLES (ZERO GC)
      let instanceIdx = 0;
      for (let rIdx = 0; rIdx < 3; rIdx++) {
        const rDef = ringDefs[rIdx];
        for (let tIdx = 0; tIdx < 2; tIdx++) {
          const basePhase = tIdx * Math.PI + rIdx * 1.05;
          for (let seg = 0; seg < 4; seg++) {
            const trailLag = seg * 0.095 * rDef.dir;
            const theta =
              basePhase + elapsed * rDef.speed * rDef.dir - trailLag;
            _instancePos.set(
              Math.cos(theta) * rDef.radius,
              Math.sin(theta) * rDef.radius,
              0
            );
            _instancePos.applyQuaternion(rDef.mesh.quaternion);

            const segScale =
              (seg === 0 ? 1.18 : seg === 1 ? 0.84 : seg === 2 ? 0.58 : 0.36) *
              (1 + totalEnergyPulse * 0.32);
            _instanceScale.setScalar(segScale);
            _instanceEuler.set(theta, elapsed * 1.5, 0);
            _instanceQuat.setFromEuler(_instanceEuler);
            _instanceMatrix.compose(_instancePos, _instanceQuat, _instanceScale);
            travelerInstanced.setMatrixAt(instanceIdx, _instanceMatrix);
            instanceIdx++;
          }
        }
      }
      travelerInstanced.instanceMatrix.needsUpdate = true;
      travelerMat.emissiveIntensity = 1.30 + totalEnergyPulse * 0.90;

      for (let i = 0; i < microParticleCount; i++) {
        const speed = 0.55 + (i % 5) * 0.14;
        const dir = i % 2 === 0 ? 1 : -1;
        const angle = (i / microParticleCount) * Math.PI * 2 + elapsed * speed * dir;
        const radius = 1.18 + (i % 4) * 0.24 + Math.sin(elapsed * 1.4 + i) * 0.06;
        const tilt = ((i % 5) - 2) * 0.32;

        _instancePos.set(
          Math.cos(angle) * radius,
          Math.sin(angle * 1.5 + i) * 0.38 + tilt * 0.25,
          Math.sin(angle) * radius
        );
        const pScale =
          (0.68 + Math.sin(elapsed * 2.8 + i * 1.3) * 0.24) *
          (1 + totalEnergyPulse * 0.25);
        _instanceScale.setScalar(pScale);
        _instanceEuler.set(elapsed + i, angle, 0);
        _instanceQuat.setFromEuler(_instanceEuler);
        _instanceMatrix.compose(_instancePos, _instanceQuat, _instanceScale);
        microOrbitInstanced.setMatrixAt(i, _instanceMatrix);
      }
      microOrbitInstanced.instanceMatrix.needsUpdate = true;

      // 5. ORBITING CATEGORY OBJECTS
      nodeEntries.forEach((entry, idx) => {
        const orbitAngle =
          entry.baseAngle + elapsed * 0.21 * entry.speedOffset;
        const dynamicRadius =
          entry.baseRadius + Math.sin(elapsed * 0.85 + idx * 1.2) * 0.09;
        const dynamicY =
          Math.sin(orbitAngle * 2 + idx * 0.85) * 0.26 +
          Math.cos(elapsed * 1.15 + idx) * 0.05;

        entry.mesh.position.set(
          Math.cos(orbitAngle) * dynamicRadius,
          dynamicY,
          Math.sin(orbitAngle) * dynamicRadius
        );
        entry.mesh.rotation.x += dt * (0.68 + (idx % 3) * 0.12) * motionScale;
        entry.mesh.rotation.y += dt * (0.85 + (idx % 2) * 0.15) * motionScale;

        const isHighlighted = st.activeCategory === entry.category;
        const targetNodeScale = isHighlighted
          ? 1.28
          : 1.0 + totalEnergyPulse * 0.07;
        entry.mesh.scale.setScalar(
          THREE.MathUtils.damp(entry.mesh.scale.x, targetNodeScale, 5, dt)
        );
        entry.material.emissiveIntensity = isHighlighted
          ? 0.78 + totalEnergyPulse * 0.35
          : 0.34 + totalEnergyPulse * 0.22;
      });

      shardInstanced.rotation.y = elapsed * 0.075;

      renderer.render(scene, camera);

      const isUserInteractingOrPulsing =
        st.isPointerDown ||
        Math.hypot(st.velYaw, st.velPitch) > 0.02 ||
        st.pulseImpulse > 0.02;

      if (isSoftwareGl) {
        afterDraw(tick);
      } else if (st.reducedMotion && !isUserInteractingOrPulsing) {
        frameId = window.setTimeout(tick, 180);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver?.disconnect();
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);

      canvasEl.removeEventListener('pointerdown', handlePointerDown);
      canvasEl.removeEventListener('pointermove', handlePointerMove);
      canvasEl.removeEventListener('pointerup', handlePointerUp);
      canvasEl.removeEventListener('pointercancel', handlePointerCancel);
      canvasEl.removeEventListener('lostpointercapture', handleLostPointerCapture);
      canvasEl.removeEventListener('pointerleave', handlePointerLeave);
      container.removeEventListener('keydown', handleKeyDown);
      canvasEl.removeEventListener('webglcontextlost', handleContextLost);
      canvasEl.removeEventListener('webglcontextrestored', handleContextRestored);

      nucleusGeo.dispose();
      crystalShellGeo.dispose();
      edgeWireGeo.dispose();
      ringGeoA.dispose();
      ringGeoB.dispose();
      ringGeoC.dispose();
      spireGeo.dispose();
      travelerGeo.dispose();
      microParticleGeo.dispose();
      shadowPlaneGeo.dispose();
      shardGeo.dispose();
      nodeGeometries.forEach((g) => g.dispose());

      coreCrystalMat.dispose();
      innerNucleusMat.dispose();
      cageFrameMat.dispose();
      ringMachinedMat.dispose();
      outerHeavyRingMat.dispose();
      travelerMat.dispose();
      microParticleMat.dispose();
      edgeWireMat.dispose();
      shadowPlaneMat.dispose();
      shardMat.dispose();
      nodeEntries.forEach((n) => n.material.dispose());

      calibrationTex.dispose();
      contactShadowTex.dispose();
      envTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-0 rounded-2xl sm:rounded-3xl overflow-hidden">
      <div
        ref={mountRef}
        tabIndex={0}
        role="region"
        aria-label="Interactive 3D Logic Core"
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing select-none touch-none rounded-2xl sm:rounded-3xl"
      />
      {webglFallback && (
        <button
          type="button"
          aria-label="Interactive Logic Core Crystal"
          onClick={() => {
            soundEngine.playClick();
            setFallbackPulse(true);
            window.setTimeout(() => setFallbackPulse(false), 420);
          }}
          className="absolute inset-0 w-full h-full flex items-center justify-center cursor-pointer select-none focus:outline-none"
        >
          <svg
            viewBox="0 0 280 280"
            className={`w-full h-full max-w-[260px] max-h-[260px] transition-transform duration-300 ${
              fallbackPulse ? 'scale-105' : 'scale-100'
            }`}
          >
            <defs>
              <radialGradient id="lqCoreFallbackGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.48" />
                <stop offset="60%" stopColor="#0284c7" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="lqCoreFacetBright" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e0f2fe" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <linearGradient id="lqCoreFacetDeep" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>
            </defs>
            <circle cx="140" cy="140" r="118" fill="url(#lqCoreFallbackGlow)" />
            <ellipse
              cx="140"
              cy="140"
              rx="104"
              ry="42"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeOpacity="0.65"
              transform="rotate(-24 140 140)"
            />
            <ellipse
              cx="140"
              cy="140"
              rx="92"
              ry="36"
              fill="none"
              stroke="#a5f3fc"
              strokeWidth="1.75"
              strokeOpacity="0.55"
              transform="rotate(32 140 140)"
            />
            <circle
              cx="140"
              cy="140"
              r="76"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="1.5"
              strokeDasharray="6 6"
              strokeOpacity="0.5"
            />
            <polygon
              points="140,56 196,140 140,224 84,140"
              fill="url(#lqCoreFacetDeep)"
              stroke="#bae6fd"
              strokeWidth="2"
            />
            <polygon
              points="140,56 196,140 140,140"
              fill="url(#lqCoreFacetBright)"
              fillOpacity="0.88"
            />
            <polygon
              points="140,88 172,140 140,192 108,140"
              fill="#e0f2fe"
              fillOpacity="0.72"
            />
          </svg>
        </button>
      )}
    </div>
  );
};
