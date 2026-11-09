/**
 * LipoRank High-Fidelity 3D Scene
 * Loads Real GLB Models (Fiji Bottle, Olympic Pool, Barrel/Fluid, Lamborghini, Cybertruck, Cow)
 * Pristine White Studio Backdrop, Smooth Shadows & Floating Labels
 */
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { FatFluidSystem } from './fat-fluid.js';

export class LipoRankScene {
  constructor(canvasContainer, options = {}) {
    this.container = canvasContainer;
    this.onVolumeChange = options.onVolumeChange || (() => {});
    this.selectedLiters = options.initialLiters || 3000;
    this.isAutoRotate = false;

    this.loader = new GLTFLoader();
    this.models = {};

    this.init();
    this.initLights();
    this.initStudioFloor();
    this.initCenterFatContainer();
    this.loadRealGLBModels();
    this.initControls();
    this.initEvents();
    this.animate();
  }

  init() {
    this.scene = new THREE.Scene();
    // Ultra Clean Pristine White Studio Fog & Background (Exact Match to Mockup)
    this.scene.background = new THREE.Color(0xfbfcfe);
    this.scene.fog = new THREE.FogExp2(0xfbfcfe, 0.02);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    // Adjusted camera for wide studio lineup view
    this.camera.position.set(0, 2.2, 7.5);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.container.appendChild(this.renderer.domElement);
    this.clock = new THREE.Clock();
  }

  initLights() {
    // Soft high-key studio hemisphere ambient
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xf1f5f9, 1.4);
    this.scene.add(hemiLight);

    // Key directional light for crisp clean contact shadows
    this.mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
    this.mainLight.position.set(6, 12, 8);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.width = 2048;
    this.mainLight.shadow.mapSize.height = 2048;
    this.mainLight.shadow.camera.near = 0.5;
    this.mainLight.shadow.camera.far = 30;
    this.mainLight.shadow.camera.left = -8;
    this.mainLight.shadow.camera.right = 8;
    this.mainLight.shadow.camera.top = 8;
    this.mainLight.shadow.camera.bottom = -4;
    this.mainLight.shadow.bias = -0.0001;
    this.scene.add(this.mainLight);

    // Subtle soft fill light from opposite side
    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.8);
    fillLight.position.set(-8, 6, -4);
    this.scene.add(fillLight);

    // Warm amber backlight to make the fat fluid glow
    const amberBacklight = new THREE.PointLight(0xf59e0b, 1.2, 8);
    amberBacklight.position.set(0, 1.5, -1.8);
    this.scene.add(amberBacklight);
  }

  initStudioFloor() {
    // Pure white studio infinite plane with soft shadow catching
    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.ShadowMaterial({
      opacity: 0.12
    });
    const shadowFloor = new THREE.Mesh(floorGeo, floorMat);
    shadowFloor.rotation.x = -Math.PI / 2;
    shadowFloor.position.y = 0;
    shadowFloor.receiveShadow = true;
    this.scene.add(shadowFloor);

    // Base White Surface
    const baseFloorGeo = new THREE.PlaneGeometry(60, 60);
    const baseFloorMat = new THREE.MeshBasicMaterial({
      color: 0xfbfcfe
    });
    const baseFloor = new THREE.Mesh(baseFloorGeo, baseFloorMat);
    baseFloor.rotation.x = -Math.PI / 2;
    baseFloor.position.y = -0.002;
    this.scene.add(baseFloor);
  }

  initCenterFatContainer() {
    // Center Beaker / Jar with Sloshing Liquid
    this.fatSystem = new FatFluidSystem(this.scene, {
      maxLiters: 5000,
      initialLiters: this.selectedLiters
    });
    this.fatSystem.group.position.set(0, 0, 0);
  }

  loadRealGLBModels() {
    this.modelsGroup = new THREE.Group();
    this.scene.add(this.modelsGroup);

    // Lineup Layout (Exact arrangement from user's reference images):
    // [Water Bottle] --- [Olympic Pool] --- [CENTER FAT BEAKER] --- [Lamborghini] --- [Cybertruck] --- [Cow]
    const modelConfigs = [
      {
        id: 'fiji_bottle',
        path: './assets/models/fiji_water_bottle.glb',
        targetHeight: 0.9,
        position: [-3.8, 0, 0.6],
        rotation: [0, 0.2, 0]
      },
      {
        id: 'swimming_pool',
        path: './assets/models/swimming_pool_343.glb',
        targetWidth: 2.4,
        position: [-2.1, 0, -0.2],
        rotation: [0, 0, 0]
      },
      {
        id: 'lamborghini',
        path: './assets/models/lambo_lp670.glb',
        targetLength: 2.2,
        position: [1.8, 0, 0.2],
        rotation: [0, -0.35, 0]
      },
      {
        id: 'cybertruck',
        path: './assets/models/Cyber_truck.glb',
        targetLength: 2.4,
        position: [3.8, 0, -0.2],
        rotation: [0, -0.2, 0]
      },
      {
        id: 'cow',
        path: './assets/models/cow.glb',
        targetHeight: 1.2,
        position: [5.6, 0, -0.5],
        rotation: [0, -0.4, 0]
      }
    ];

    modelConfigs.forEach(cfg => {
      this.loader.load(
        cfg.path,
        gltf => {
          const root = gltf.scene;

          // Enable shadows and enhance materials
          root.traverse(child => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                child.material.envMapIntensity = 1.0;
              }
            }
          });

          // Normalize size using Box3
          const box = new THREE.Box3().setFromObject(root);
          const size = box.getSize(new THREE.Vector3());

          let scale = 1.0;
          if (cfg.targetHeight) {
            scale = cfg.targetHeight / (size.y || 1);
          } else if (cfg.targetWidth) {
            scale = cfg.targetWidth / (size.x || 1);
          } else if (cfg.targetLength) {
            scale = cfg.targetLength / (Math.max(size.x, size.z) || 1);
          }

          root.scale.setScalar(scale);

          // Re-compute bounding box after scale to ground it at y = 0
          box.setFromObject(root);
          root.position.set(
            cfg.position[0],
            cfg.position[1] - box.min.y,
            cfg.position[2]
          );

          if (cfg.rotation) {
            root.rotation.set(cfg.rotation[0], cfg.rotation[1], cfg.rotation[2]);
          }

          this.modelsGroup.add(root);
          this.models[cfg.id] = root;
        },
        undefined,
        err => {
          console.warn(`Could not load GLB ${cfg.path}, fallback to procedural`, err);
        }
      );
    });
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 3.0;
    this.controls.maxDistance = 18.0;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02; // Keep above floor
    this.controls.minPolarAngle = 0.2;
    this.controls.target.set(0, 1.0, 0);
  }

  initEvents() {
    window.addEventListener('resize', () => this.onWindowResize());

    // Slosh beaker on canvas click
    this.container.addEventListener('pointerdown', () => {
      if (this.fatSystem) {
        this.fatSystem.triggerSlosh(0.06);
      }
    });
  }

  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  setVolume(liters, animatePour = true) {
    this.selectedLiters = liters;
    if (this.fatSystem) {
      if (animatePour) {
        this.fatSystem.pourTo(liters);
      } else {
        this.fatSystem.updateFluidLevel(liters);
      }
    }
    this.onVolumeChange(liters);
  }

  toggleAutoRotate() {
    this.isAutoRotate = !this.isAutoRotate;
    this.controls.autoRotate = this.isAutoRotate;
    this.controls.autoRotateSpeed = 1.0;
    return this.isAutoRotate;
  }

  resetCamera() {
    this.camera.position.set(0, 2.2, 7.5);
    this.controls.target.set(0, 1.0, 0);
    this.controls.update();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    if (this.fatSystem) {
      this.fatSystem.animate(time, delta);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
