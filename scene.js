/**
 * LipoRank High-Fidelity 3D Scene
 * Perfectly spaced 5 Objects in pure studio lighting:
 * [Fiji Water] -- [Olympic Pool] -- [Lamborghini] -- [Cybertruck] -- [Statue of Liberty]
 * Feature: Active Object converts to Crystal Glass Shell with Golden Fat fluid fill & surface meniscus
 */
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { COMPARISON_OBJECTS, getBestMatchingObject } from './objects-data.js';

export class LipoRankScene {
  constructor(canvasContainer, options = {}) {
    this.container = canvasContainer;
    this.onVolumeChange = options.onVolumeChange || (() => {});
    this.onObjectChange = options.onObjectChange || (() => {});
    this.selectedLiters = options.initialLiters || 4820; // Default: Top rank doctor 4,820L

    this.activeObjectId = options.initialObjectId || 'lamborghini';
    this.objectConfigs = COMPARISON_OBJECTS;

    this.loader = new GLTFLoader();
    this.models = {};           // outer shell scenes
    this.modelHolders = {};      // holder groups on stage
    this.originalMaterials = new Map(); // cache original materials
    this.fatMeshes = {};        // internal fat duplicate meshes
    this.clipPlanes = {};       // clipping planes per object
    this.targetFillPcts = {};   // target fill percent [0, 1]
    this.currentFillPcts = {};  // animated current fill percent
    this.worldBounds = {};      // accurate world bounding boxes

    this.init();
    this.initLights();
    this.initStudioFloor();
    this.initMaterials();
    this.loadAllObjects();
    this.initControls();
    this.initEvents();
    this.animate();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xfcfdfe);
    this.scene.fog = new THREE.FogExp2(0xfcfdfe, 0.012);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // Front-parallel eye-level perspective with wide view for 5 objects
    this.camera = new THREE.PerspectiveCamera(26, width / height, 0.1, 100);
    this.camera.position.set(0, 0.58, 8.2);
    this.camera.lookAt(0, 0.58, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.localClippingEnabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.14;

    this.container.appendChild(this.renderer.domElement);
    this.clock = new THREE.Clock();
  }

  initLights() {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xf1f5f9, 2.0);
    this.scene.add(hemiLight);

    this.mainLight = new THREE.DirectionalLight(0xffffff, 2.5);
    this.mainLight.position.set(7, 14, 9);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.width = 2048;
    this.mainLight.shadow.mapSize.height = 2048;
    this.mainLight.shadow.camera.near = 0.5;
    this.mainLight.shadow.camera.far = 35;
    this.mainLight.shadow.camera.left = -10;
    this.mainLight.shadow.camera.right = 10;
    this.mainLight.shadow.camera.top = 8;
    this.mainLight.shadow.camera.bottom = -4;
    this.mainLight.shadow.bias = -0.0001;
    this.scene.add(this.mainLight);

    const fillLight = new THREE.DirectionalLight(0xf1f5f9, 1.3);
    fillLight.position.set(-8, 7, 5);
    this.scene.add(fillLight);

    // Warm golden glow behind active fat model
    this.fatGlow = new THREE.PointLight(0xf59e0b, 1.8, 6);
    this.fatGlow.position.set(0, 0.8, -1.0);
    this.scene.add(this.fatGlow);
  }

  initStudioFloor() {
    const floorGeo = new THREE.PlaneGeometry(80, 80);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.12 });
    const shadowFloor = new THREE.Mesh(floorGeo, floorMat);
    shadowFloor.rotation.x = -Math.PI / 2;
    shadowFloor.position.y = 0;
    shadowFloor.receiveShadow = true;
    this.scene.add(shadowFloor);

    const baseMat = new THREE.MeshBasicMaterial({ color: 0xfcfdfe });
    const baseFloor = new THREE.Mesh(floorGeo, baseMat);
    baseFloor.rotation.x = -Math.PI / 2;
    baseFloor.position.y = -0.002;
    this.scene.add(baseFloor);
  }

  initMaterials() {
    // 1. Crystal Glass Shell Material
    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xffffff),
      metalness: 0.05,
      roughness: 0.08,
      transmission: 0.94,
      thickness: 0.75,
      ior: 1.5,
      transparent: true,
      opacity: 0.42,
      reflectivity: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      side: THREE.DoubleSide
    });
  }

  loadAllObjects() {
    this.lineupGroup = new THREE.Group();
    this.scene.add(this.lineupGroup);

    this.objectConfigs.forEach(cfg => {
      this.loader.load(
        cfg.modelPath,
        gltf => {
          const root = gltf.scene;
          this.models[cfg.id] = root;

          // Cache original materials
          root.traverse(c => {
            if (c.isMesh) {
              this.originalMaterials.set(c, c.material);
              c.castShadow = true;
              c.receiveShadow = true;
            }
          });

          // Container group for outer shell + inner fat
          const holder = new THREE.Group();
          holder.name = cfg.id;

          // 1. Outer Shell
          holder.add(root);

          // 2. Inner Fat Mesh (Duplicate)
          const fatMesh = root.clone();
          const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 100);
          this.clipPlanes[cfg.id] = clipPlane;

          const fatMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0xf59e0b),
            emissive: new THREE.Color(0xb45309),
            emissiveIntensity: 0.45,
            roughness: 0.22,
            metalness: 0.08,
            clippingPlanes: [clipPlane],
            clipShadows: true,
            side: THREE.DoubleSide
          });

          fatMesh.traverse(c => {
            if (c.isMesh) {
              c.material = fatMaterial;
              c.castShadow = false;
            }
          });
          fatMesh.scale.setScalar(0.99); // snug fit inside glass
          fatMesh.visible = false;
          holder.add(fatMesh);
          this.fatMeshes[cfg.id] = fatMesh;

          // Normalize size & place firmly on floor y = 0
          if (cfg.rotation) {
            holder.rotation.set(cfg.rotation[0], cfg.rotation[1], cfg.rotation[2]);
          }

          const box = new THREE.Box3().setFromObject(holder);
          const size = box.getSize(new THREE.Vector3());

          let scale = 1.0;
          if (cfg.targetHeight) {
            scale = cfg.targetHeight / (size.y || 1);
          } else if (cfg.targetWidth) {
            scale = cfg.targetWidth / (size.x || 1);
          } else if (cfg.targetLength) {
            scale = cfg.targetLength / (Math.max(size.x, size.z) || 1);
          }
          holder.scale.setScalar(scale);

          box.setFromObject(holder);
          holder.position.set(
            cfg.position[0],
            -box.min.y,
            cfg.position[2]
          );

          this.lineupGroup.add(holder);
          this.modelHolders[cfg.id] = holder;
          this.targetFillPcts[cfg.id] = 0;
          this.currentFillPcts[cfg.id] = 0;

          // Compute accurate world bounds
          holder.updateMatrixWorld(true);
          const worldBox = new THREE.Box3().setFromObject(holder);
          this.worldBounds[cfg.id] = {
            minY: worldBox.min.y,
            maxY: worldBox.max.y,
            height: worldBox.max.y - worldBox.min.y
          };

          // If this is the active object, apply glass fill immediately
          if (cfg.id === this.activeObjectId) {
            this.applyGlassFill(cfg.id, this.selectedLiters);
          }
        },
        undefined,
        err => console.warn(`Error loading model ${cfg.modelPath}:`, err)
      );
    });
  }

  setActiveObject(objectId) {
    if (!this.objectConfigs.find(c => c.id === objectId)) return;
    
    // Revert previous active object to solid original
    if (this.activeObjectId && this.activeObjectId !== objectId) {
      this.revertToSolid(this.activeObjectId);
    }

    this.activeObjectId = objectId;
    this.applyGlassFill(objectId, this.selectedLiters);
    this.onObjectChange(objectId);
  }

  applyGlassFill(objectId, liters) {
    const root = this.models[objectId];
    const fatMesh = this.fatMeshes[objectId];
    const holder = this.modelHolders[objectId];
    const cfg = this.objectConfigs.find(c => c.id === objectId);

    if (!root || !fatMesh || !holder || !cfg) return;

    // Convert outer shell meshes to transparent crystal glass
    root.traverse(c => {
      if (c.isMesh) {
        c.material = this.glassMaterial;
      }
    });

    // Make inner fat visible
    fatMesh.visible = true;

    // Calculate fill percentage relative to this object's capacity
    const ratio = liters / cfg.volumeLiters;
    const clampedPct = Math.min(Math.max(ratio, 0.05), 1.0);
    this.targetFillPcts[objectId] = clampedPct;

    // Move warm fat glow to active object
    if (this.fatGlow) {
      this.fatGlow.position.set(cfg.position[0], 0.7, cfg.position[2] - 0.8);
    }
  }

  revertToSolid(objectId) {
    const root = this.models[objectId];
    const fatMesh = this.fatMeshes[objectId];

    if (!root) return;

    // Restore original materials
    root.traverse(c => {
      if (c.isMesh && this.originalMaterials.has(c)) {
        c.material = this.originalMaterials.get(c);
      }
    });

    // Hide inner fat
    if (fatMesh) {
      fatMesh.visible = false;
    }
  }

  setVolume(liters) {
    this.selectedLiters = liters;
    
    // Update active glass fill
    if (this.activeObjectId) {
      this.applyGlassFill(this.activeObjectId, liters);
    }

    this.onVolumeChange(liters);
  }

  nextObject() {
    const currentIndex = this.objectConfigs.findIndex(c => c.id === this.activeObjectId);
    const nextIndex = (currentIndex + 1) % this.objectConfigs.length;
    this.setActiveObject(this.objectConfigs[nextIndex].id);
  }

  prevObject() {
    const currentIndex = this.objectConfigs.findIndex(c => c.id === this.activeObjectId);
    const prevIndex = (currentIndex - 1 + this.objectConfigs.length) % this.objectConfigs.length;
    this.setActiveObject(this.objectConfigs[prevIndex].id);
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 4.5;
    this.controls.maxDistance = 14.0;
    
    // Strictly restrict polar angle to maintain clean eye-level studio look
    this.controls.maxPolarAngle = Math.PI / 2 - 0.01;
    this.controls.minPolarAngle = Math.PI / 2.12;
    this.controls.target.set(0, 0.58, 0);
  }

  initEvents() {
    window.addEventListener('resize', () => this.onWindowResize());
  }

  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // Smoothly animate fluid level of active object
    if (this.activeObjectId && this.clipPlanes[this.activeObjectId]) {
      const b = this.worldBounds[this.activeObjectId];
      if (b && b.height) {
        const target = this.targetFillPcts[this.activeObjectId] || 0.8;
        const current = this.currentFillPcts[this.activeObjectId] || 0;
        const next = THREE.MathUtils.lerp(current, target, delta * 4.0);
        this.currentFillPcts[this.activeObjectId] = next;

        // Subtle gentle liquid breathing wave
        const sloshWave = Math.sin(time * 3.2) * (b.height * 0.008);
        const planeConstant = b.minY + (b.height * next) + sloshWave;
        this.clipPlanes[this.activeObjectId].constant = planeConstant;
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
