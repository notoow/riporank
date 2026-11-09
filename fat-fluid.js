/**
 * LipoRank Premium Aluminum-Lid Glass Can Jar System
 * Exact match to user reference design (Transparent Can Jar with Aluminum Rim,
 * Silk-screen Measurement Scale, Translucent Amber Fat Jelly Fluid & Dynamic Sloshing)
 */
import * as THREE from 'three';

export class FatFluidSystem {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.maxLiters = options.maxLiters || 5000;
    this.currentLiters = options.initialLiters || 3000;
    this.targetLiters = this.currentLiters;

    // Dimensions: Plump, stable aesthetic can-jar proportion
    this.jarRadius = 0.52;
    this.jarHeight = 1.65;
    this.bottomOffset = 0.04;

    // Sloshing physics state
    this.waveAmplitude = 0.035;
    this.targetAmplitude = 0.015;
    this.waveSpeed = 3.6;
    this.isPouring = false;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.initLidAndBase();
    this.initGlassBody();
    this.initScaleTexture();
    this.initFluid();
    this.updateFluidLevel(this.currentLiters, true);
  }

  initLidAndBase() {
    // 1. High-End Chrome Aluminum Metal Material
    const aluminumMat = new THREE.MeshStandardMaterial({
      color: 0xf3f4f6,
      metalness: 0.98,
      roughness: 0.14,
      envMapIntensity: 2.0
    });

    // Top Aluminum Can Seam (Outer rolled rim)
    const rimGeo = new THREE.TorusGeometry(this.jarRadius * 0.93, 0.035, 24, 64);
    rimGeo.rotateX(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeo, aluminumMat);
    rimMesh.position.y = this.jarHeight + 0.02;
    rimMesh.castShadow = true;
    this.group.add(rimMesh);

    // Top Can Recessed Lid (Indented top metal disc)
    const lidDiscGeo = new THREE.CylinderGeometry(
      this.jarRadius * 0.91,
      this.jarRadius * 0.91,
      0.02,
      64
    );
    const lidDisc = new THREE.Mesh(lidDiscGeo, aluminumMat);
    lidDisc.position.y = this.jarHeight + 0.01;
    this.group.add(lidDisc);

    // Pull Tab Accent on Top
    const tabGeo = new THREE.BoxGeometry(0.16, 0.01, 0.25);
    const tabMesh = new THREE.Mesh(tabGeo, aluminumMat);
    tabMesh.position.set(0, this.jarHeight + 0.026, 0.1);
    this.group.add(tabMesh);

    // Bottom Thin Aluminum Base Plate
    const baseGeo = new THREE.CylinderGeometry(
      this.jarRadius * 1.05,
      this.jarRadius * 1.06,
      0.028,
      64
    );
    const baseMesh = new THREE.Mesh(baseGeo, aluminumMat);
    baseMesh.position.y = 0.014;
    baseMesh.castShadow = true;
    this.group.add(baseMesh);
  }

  initGlassBody() {
    // Smooth rounded transparent glass cylinder body
    const glassGeo = new THREE.CylinderGeometry(
      this.jarRadius,
      this.jarRadius,
      this.jarHeight,
      64,
      1,
      true
    );

    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.96,
      opacity: 1.0,
      transparent: true,
      roughness: 0.05,
      ior: 1.52,
      thickness: 0.1,
      specularIntensity: 1.2,
      side: THREE.DoubleSide
    });

    this.glassMesh = new THREE.Mesh(glassGeo, this.glassMat);
    this.glassMesh.position.y = this.jarHeight / 2 + this.bottomOffset;
    this.glassMesh.castShadow = true;
    this.group.add(this.glassMesh);
  }

  initScaleTexture() {
    // Generate High-Res White Silkscreen Ruler Texture via 2D Canvas
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 512, 1024);

    // Draw scale markings in front center
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 4;
    ctx.font = 'bold 36px Pretendard, sans-serif';
    ctx.textAlign = 'right';

    const steps = 6; // 500, 1000, 1500, 2000, 2500, 3000 ml
    const topMargin = 120;
    const bottomMargin = 120;
    const usableH = 1024 - topMargin - bottomMargin;

    for (let i = 0; i <= steps; i++) {
      const y = 1024 - bottomMargin - (i / steps) * usableH;
      const ml = i * 500;

      if (i > 0) {
        // Main line
        ctx.beginPath();
        ctx.moveTo(280, y);
        ctx.lineTo(360, y);
        ctx.stroke();

        // Sub label
        ctx.fillText(`${ml}ml`, 260, y + 12);
      }

      // Minor tick halfway
      if (i < steps) {
        const midY = y - (1 / steps) * usableH * 0.5;
        ctx.beginPath();
        ctx.moveTo(310, midY);
        ctx.lineTo(350, midY);
        ctx.stroke();
      }
    }

    // Vertical ruler back line
    ctx.beginPath();
    ctx.moveTo(360, topMargin);
    ctx.lineTo(360, 1024 - bottomMargin);
    ctx.stroke();

    const scaleTex = new THREE.CanvasTexture(canvas);
    scaleTex.anisotropy = 8;

    // Curved decal mesh in front of the glass
    const decalGeo = new THREE.CylinderGeometry(
      this.jarRadius * 1.002,
      this.jarRadius * 1.002,
      this.jarHeight * 0.92,
      32,
      1,
      true,
      -Math.PI * 0.35,
      Math.PI * 0.7
    );
    const decalMat = new THREE.MeshBasicMaterial({
      map: scaleTex,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const decalMesh = new THREE.Mesh(decalGeo, decalMat);
    decalMesh.position.y = this.jarHeight / 2 + this.bottomOffset;
    this.group.add(decalMesh);
  }

  initFluid() {
    // 1. Fat Fluid Column Cylinder
    this.fluidRadius = this.jarRadius * 0.982;
    this.fluidGeo = new THREE.CylinderGeometry(
      this.fluidRadius,
      this.fluidRadius,
      1.0,
      48,
      1,
      false
    );
    this.fluidGeo.translate(0, 0.5, 0);

    // Luscious golden amber fat jelly material
    this.fluidMat = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b, // Amber Gold
      emissive: 0xd97706,
      emissiveIntensity: 0.22,
      transmission: 0.55,
      opacity: 0.95,
      transparent: true,
      roughness: 0.22,
      metalness: 0.05,
      ior: 1.46,
      thickness: 0.9,
      side: THREE.DoubleSide
    });

    this.fluidMesh = new THREE.Mesh(this.fluidGeo, this.fluidMat);
    this.fluidMesh.position.y = this.bottomOffset;
    this.group.add(this.fluidMesh);

    // 2. Liquid Surface Disk for Sloshing Ripple Physics
    this.surfaceSegments = 36;
    this.surfaceGeo = new THREE.CircleGeometry(this.fluidRadius, this.surfaceSegments);
    this.surfaceGeo.rotateX(-Math.PI / 2);

    const pos = this.surfaceGeo.attributes.position;
    this.surfaceOriginals = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count * 3; i++) {
      this.surfaceOriginals[i] = pos.array[i];
    }

    this.surfaceMat = new THREE.MeshPhysicalMaterial({
      color: 0xfbbf24,
      emissive: 0xb45309,
      emissiveIntensity: 0.3,
      transmission: 0.35,
      opacity: 0.98,
      roughness: 0.12,
      ior: 1.46,
      side: THREE.DoubleSide
    });

    this.surfaceMesh = new THREE.Mesh(this.surfaceGeo, this.surfaceMat);
    this.group.add(this.surfaceMesh);
  }

  pourTo(targetLiters, durationMs = 1500) {
    this.targetLiters = Math.max(100, Math.min(targetLiters, this.maxLiters));
    this.isPouring = true;
    this.waveAmplitude = 0.09; // Trigger sloshing waves
    this.pourStartTime = performance.now();
    this.pourDuration = durationMs;
    this.startLiters = this.currentLiters;
  }

  updateFluidLevel(liters, immediate = false) {
    this.currentLiters = liters;
    const clamped = Math.max(50, Math.min(liters, this.maxLiters));
    const maxHeight = this.jarHeight * 0.90;
    const targetHeight = (clamped / this.maxLiters) * maxHeight;

    if (immediate) {
      this.fluidHeight = targetHeight;
    }

    this.fluidHeight = targetHeight;
    this.fluidMesh.scale.set(1, targetHeight, 1);
    this.surfaceMesh.position.y = this.bottomOffset + targetHeight;
  }

  animate(time, delta) {
    if (this.isPouring) {
      const elapsed = performance.now() - this.pourStartTime;
      const t = Math.min(1.0, elapsed / this.pourDuration);
      const ease = 1 - Math.pow(1 - t, 3);
      const lerpedLiters = this.startLiters + (this.targetLiters - this.startLiters) * ease;
      this.updateFluidLevel(lerpedLiters);

      if (t >= 1.0) {
        this.isPouring = false;
      }
    } else {
      if (Math.abs(this.currentLiters - this.targetLiters) > 1) {
        this.currentLiters = THREE.MathUtils.lerp(this.currentLiters, this.targetLiters, 0.06);
        this.updateFluidLevel(this.currentLiters);
      }
    }

    // Sloshing Wave Animation (찰랑찰랑)
    this.waveAmplitude = THREE.MathUtils.lerp(
      this.waveAmplitude,
      this.targetAmplitude,
      0.02
    );

    const pos = this.surfaceGeo.attributes.position;
    const t = time * this.waveSpeed;

    for (let i = 0; i < pos.count; i++) {
      const ox = this.surfaceOriginals[i * 3 + 0];
      const oz = this.surfaceOriginals[i * 3 + 2];
      const dist = Math.sqrt(ox * ox + oz * oz);
      const angle = Math.atan2(oz, ox);

      const wave1 = Math.sin(t * 1.3 + dist * 6.0) * this.waveAmplitude * 0.5;
      const wave2 = Math.cos(t * 0.9 + angle * 2.0) * this.waveAmplitude * 0.35;
      const wave3 = Math.sin(t * 1.7 + ox * 4.0) * this.waveAmplitude * 0.15;

      pos.array[i * 3 + 1] = wave1 + wave2 + wave3;
    }
    pos.needsUpdate = true;
    this.surfaceGeo.computeVertexNormals();
  }

  triggerSlosh(intensity = 0.06) {
    this.waveAmplitude = Math.min(0.15, this.waveAmplitude + intensity);
  }
}
