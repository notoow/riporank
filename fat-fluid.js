/**
 * LipoRank Fat Fluid & Beaker System
 * Realistic Liquid Sloshing, Pouring Particles & Volumetric Gauge
 */
import * as THREE from 'three';

export class FatFluidSystem {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.maxLiters = options.maxLiters || 5000;
    this.currentLiters = options.initialLiters || 3000;
    this.targetLiters = this.currentLiters;

    // Visual dimensions (in meters)
    this.beakerRadius = 0.55;
    this.beakerHeight = 2.4;
    this.bottomOffset = 0.05;

    // Sloshing physics state
    this.waveAmplitude = 0.05; // Current slosh height
    this.targetAmplitude = 0.02; // Idle ripple height
    this.waveSpeed = 4.0;
    this.damping = 0.96;
    this.isPouring = false;
    this.pourProgress = 1.0;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.initBeaker();
    this.initFluid();
    this.initPourStream();
    this.initParticles();
    this.updateFluidLevel(this.currentLiters, true);
  }

  initBeaker() {
    // 1. Transparent Glass Cylinder Body
    const glassGeo = new THREE.CylinderGeometry(
      this.beakerRadius,
      this.beakerRadius,
      this.beakerHeight,
      48,
      1,
      true
    );
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.92,
      opacity: 1.0,
      transparent: true,
      roughness: 0.08,
      ior: 1.5,
      thickness: 0.08,
      specularIntensity: 1.0,
      side: THREE.DoubleSide
    });
    this.glassMesh = new THREE.Mesh(glassGeo, glassMat);
    this.glassMesh.position.y = this.beakerHeight / 2;
    this.group.add(this.glassMesh);

    // 2. Beaker Base Disc
    const baseGeo = new THREE.CylinderGeometry(
      this.beakerRadius * 1.08,
      this.beakerRadius * 1.12,
      0.08,
      48
    );
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.7,
      roughness: 0.3
    });
    this.baseMesh = new THREE.Mesh(baseGeo, baseMat);
    this.baseMesh.position.y = 0.04;
    this.group.add(this.baseMesh);

    // 3. Beaker Top Rim
    const rimGeo = new THREE.TorusGeometry(this.beakerRadius, 0.025, 16, 48);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.8,
      roughness: 0.2
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = this.beakerHeight;
    this.group.add(rimMesh);

    // 4. Volume Measurement Markings (Scale)
    this.initScaleMarkings();
  }

  initScaleMarkings() {
    const scaleGroup = new THREE.Group();
    const steps = 10;
    const stepLiters = this.maxLiters / steps;

    for (let i = 1; i <= steps; i++) {
      const liters = i * stepLiters;
      const y = (liters / this.maxLiters) * (this.beakerHeight * 0.92) + this.bottomOffset;

      // Major line (ring arc on glass)
      const lineGeo = new THREE.BufferGeometry();
      const points = [];
      const arcAngle = Math.PI * 0.35; // Front-facing arc
      const segments = 16;
      for (let s = 0; s <= segments; s++) {
        const theta = -arcAngle / 2 + (arcAngle * s) / segments;
        const x = Math.sin(theta) * (this.beakerRadius * 1.002);
        const z = Math.cos(theta) * (this.beakerRadius * 1.002);
        points.push(new THREE.Vector3(x, y, z));
      }
      lineGeo.setFromPoints(points);

      const isMajor = i % 2 === 0 || i === steps;
      const lineMat = new THREE.LineBasicMaterial({
        color: isMajor ? 0xffffff : 0x94a3b8,
        transparent: true,
        opacity: isMajor ? 0.85 : 0.45,
        linewidth: isMajor ? 2 : 1
      });
      const line = new THREE.Line(lineGeo, lineMat);
      scaleGroup.add(line);
    }

    this.group.add(scaleGroup);
  }

  initFluid() {
    // 1. Fluid Column (Cylinder body under the surface)
    this.fluidRadius = this.beakerRadius * 0.985;
    this.fluidGeo = new THREE.CylinderGeometry(
      this.fluidRadius,
      this.fluidRadius,
      1.0, // Initial height scale
      48,
      1,
      false
    );
    // Shift geometry anchor to bottom
    this.fluidGeo.translate(0, 0.5, 0);

    // Rich translucent golden-amber fat shader material
    this.fluidMat = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b, // Amber gold
      emissive: 0xd97706,
      emissiveIntensity: 0.15,
      transmission: 0.65,
      opacity: 0.95,
      transparent: true,
      roughness: 0.18,
      metalness: 0.05,
      ior: 1.45,
      thickness: 0.8,
      side: THREE.DoubleSide
    });

    this.fluidMesh = new THREE.Mesh(this.fluidGeo, this.fluidMat);
    this.fluidMesh.position.y = this.bottomOffset;
    this.group.add(this.fluidMesh);

    // 2. Liquid Surface (Interactive Wavy Disk with Dynamic Sloshing)
    this.surfaceSegments = 40;
    this.surfaceGeo = new THREE.CircleGeometry(this.fluidRadius, this.surfaceSegments);
    this.surfaceGeo.rotateX(-Math.PI / 2);

    // Store original vertex positions for ripple displacement
    const pos = this.surfaceGeo.attributes.position;
    this.surfaceOriginals = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count * 3; i++) {
      this.surfaceOriginals[i] = pos.array[i];
    }

    this.surfaceMat = new THREE.MeshPhysicalMaterial({
      color: 0xfbbf24,
      emissive: 0xb45309,
      emissiveIntensity: 0.25,
      transmission: 0.4,
      opacity: 0.98,
      roughness: 0.1,
      ior: 1.45,
      side: THREE.DoubleSide
    });

    this.surfaceMesh = new THREE.Mesh(this.surfaceGeo, this.surfaceMat);
    this.group.add(this.surfaceMesh);
  }

  initPourStream() {
    // Golden falling liquid stream from top
    const streamGeo = new THREE.CylinderGeometry(0.045, 0.035, 1.2, 16);
    streamGeo.translate(0, -0.6, 0);
    const streamMat = new THREE.MeshPhysicalMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.0, // Initially hidden
      roughness: 0.1,
      transmission: 0.7
    });
    this.pourStream = new THREE.Mesh(streamGeo, streamMat);
    this.pourStream.position.set(0, this.beakerHeight + 1.0, 0);
    this.group.add(this.pourStream);
  }

  initParticles() {
    // Splash droplets when pouring
    const particleCount = 45;
    const pGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    this.particleVelocities = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 0] = 0;
      positions[i * 3 + 1] = -100; // Off-screen initially
      positions[i * 3 + 2] = 0;

      this.particleVelocities.push({
        x: (Math.random() - 0.5) * 0.4,
        y: Math.random() * 0.6 + 0.3,
        z: (Math.random() - 0.5) * 0.4,
        life: 0
      });
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const pMat = new THREE.PointsMaterial({
      color: 0xfde047,
      size: 0.035,
      transparent: true,
      opacity: 0.85
    });

    this.splashParticles = new THREE.Points(pGeo, pMat);
    this.group.add(this.splashParticles);
  }

  pourTo(targetLiters, durationMs = 1800) {
    this.targetLiters = Math.max(50, Math.min(targetLiters, this.maxLiters));
    this.isPouring = true;
    this.waveAmplitude = 0.12; // Big slosh trigger!
    this.pourStartTime = performance.now();
    this.pourDuration = durationMs;
    this.startLiters = this.currentLiters;

    // Show pouring stream
    this.pourStream.material.opacity = 0.85;
  }

  updateFluidLevel(liters, immediate = false) {
    this.currentLiters = liters;
    const clamped = Math.max(10, Math.min(liters, this.maxLiters));
    const maxHeight = this.beakerHeight * 0.92;
    const targetHeight = (clamped / this.maxLiters) * maxHeight;

    if (immediate) {
      this.fluidHeight = targetHeight;
    }

    this.fluidHeight = targetHeight;
    this.fluidMesh.scale.set(1, targetHeight, 1);
    this.surfaceMesh.position.y = this.bottomOffset + targetHeight;

    // Reposition pour stream end to meet current surface
    if (this.pourStream) {
      const streamTop = this.beakerHeight + 0.8;
      const streamLen = streamTop - (this.bottomOffset + targetHeight);
      this.pourStream.position.y = streamTop;
      this.pourStream.scale.set(1, streamLen / 1.2, 1);
    }
  }

  animate(time, delta) {
    // 1. Pouring / Filling Interpolation
    if (this.isPouring) {
      const elapsed = performance.now() - this.pourStartTime;
      const t = Math.min(1.0, elapsed / this.pourDuration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - t, 3);
      const lerpedLiters = this.startLiters + (this.targetLiters - this.startLiters) * ease;
      this.updateFluidLevel(lerpedLiters);

      // Fade out pour stream as it reaches destination
      if (t >= 0.92) {
        this.pourStream.material.opacity = THREE.MathUtils.lerp(
          this.pourStream.material.opacity,
          0.0,
          0.2
        );
      }

      if (t >= 1.0) {
        this.isPouring = false;
        this.pourStream.material.opacity = 0.0;
      }

      // Animate splash droplets
      this.updateSplashes(delta);
    } else {
      // Natural idle tracking
      if (Math.abs(this.currentLiters - this.targetLiters) > 1) {
        this.currentLiters = THREE.MathUtils.lerp(this.currentLiters, this.targetLiters, 0.05);
        this.updateFluidLevel(this.currentLiters);
      }
    }

    // 2. Sloshing Wave Ripple Physics (찰랑찰랑)
    this.waveAmplitude = THREE.MathUtils.lerp(
      this.waveAmplitude,
      this.targetAmplitude,
      0.025
    );

    const pos = this.surfaceGeo.attributes.position;
    const t = time * this.waveSpeed;

    for (let i = 0; i < pos.count; i++) {
      const ox = this.surfaceOriginals[i * 3 + 0];
      const oz = this.surfaceOriginals[i * 3 + 2];
      const dist = Math.sqrt(ox * ox + oz * oz);
      const angle = Math.atan2(oz, ox);

      // Multi-wave superposition (Primary tilt + radial ripples)
      const wave1 = Math.sin(t * 1.2 + dist * 5.0) * this.waveAmplitude * 0.45;
      const wave2 = Math.cos(t * 0.8 + angle * 2.0) * this.waveAmplitude * 0.35;
      const wave3 = Math.sin(t * 1.6 + ox * 3.0) * this.waveAmplitude * 0.2;

      pos.array[i * 3 + 1] = wave1 + wave2 + wave3;
    }
    pos.needsUpdate = true;
    this.surfaceGeo.computeVertexNormals();

    // Subtle gentle breathing scale on the beaker
    const pulse = 1.0 + Math.sin(time * 2.0) * 0.001;
    this.fluidMesh.scale.x = pulse;
    this.fluidMesh.scale.z = pulse;
  }

  updateSplashes(delta) {
    if (!this.splashParticles) return;
    const pos = this.splashParticles.geometry.attributes.position;
    const surfaceY = this.bottomOffset + this.fluidHeight;

    for (let i = 0; i < this.particleVelocities.length; i++) {
      const v = this.particleVelocities[i];
      if (v.life <= 0) {
        // Respawn near stream impact point
        pos.array[i * 3 + 0] = (Math.random() - 0.5) * 0.12;
        pos.array[i * 3 + 1] = surfaceY + 0.02;
        pos.array[i * 3 + 2] = (Math.random() - 0.5) * 0.12;

        v.x = (Math.random() - 0.5) * 0.35;
        v.y = Math.random() * 0.5 + 0.25;
        v.z = (Math.random() - 0.5) * 0.35;
        v.life = Math.random() * 0.4 + 0.2;
      } else {
        pos.array[i * 3 + 0] += v.x * delta;
        pos.array[i * 3 + 1] += v.y * delta;
        pos.array[i * 3 + 2] += v.z * delta;
        v.y -= 2.5 * delta; // Gravity
        v.life -= delta;
      }
    }
    pos.needsUpdate = true;
  }

  triggerSlosh(intensity = 0.08) {
    this.waveAmplitude = Math.min(0.2, this.waveAmplitude + intensity);
  }
}
