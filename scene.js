/**
 * LipoRank High-Fidelity 3D Scene
 * Lineup Layout (Exact Match to User Reference Image):
 * [Fiji Water] -- [Olympic Pool] -- [CENTER CAN JAR] -- [Lamborghini] -- [Cybertruck]
 * Perfectly Oriented Three-Quarter Angles, Clean Studio Lighting & Contact Shadows
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
    this.initCenterFatJar();
    this.loadLineupModels();
    this.initControls();
    this.initEvents();
    this.animate();
  }

  init() {
    this.scene = new THREE.Scene();
    // Ultra Clean Pure White Studio Fog & Background
    this.scene.background = new THREE.Color(0xfcfdfe);
    this.scene.fog = new THREE.FogExp2(0xfcfdfe, 0.018);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // Perspective matching reference screenshot (front-parallel wide camera)
    this.camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    this.camera.position.set(0, 1.25, 5.5);

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
    this.renderer.toneMappingExposure = 1.08;

    this.container.appendChild(this.renderer.domElement);
    this.clock = new THREE.Clock();
  }

  initLights() {
    // Soft high-key ambient studio light
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xf1f5f9, 1.6);
    this.scene.add(hemiLight);

    // Main key light from top-front-right for natural soft floor shadows
    this.mainLight = new THREE.DirectionalLight(0xffffff, 2.2);
    this.mainLight.position.set(5, 12, 7);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.width = 2048;
    this.mainLight.shadow.mapSize.height = 2048;
    this.mainLight.shadow.camera.near = 0.5;
    this.mainLight.shadow.camera.far = 25;
    this.mainLight.shadow.camera.left = -6;
    this.mainLight.shadow.camera.right = 6;
    this.mainLight.shadow.camera.top = 6;
    this.mainLight.shadow.camera.bottom = -3;
    this.mainLight.shadow.bias = -0.0001;
    this.scene.add(this.mainLight);

    // Fill light from left to soften car contours
    const fillLight = new THREE.DirectionalLight(0xf1f5f9, 1.0);
    fillLight.position.set(-6, 6, 4);
    this.scene.add(fillLight);

    // Warm glow point light behind the central fat jar
    const jarBackGlow = new THREE.PointLight(0xf59e0b, 1.4, 5);
    jarBackGlow.position.set(0, 0.9, -1.2);
    this.scene.add(jarBackGlow);
  }

  initStudioFloor() {
    // Pure White Seamless Studio Floor
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.14 });
    const shadowFloor = new THREE.Mesh(floorGeo, floorMat);
    shadowFloor.rotation.x = -Math.PI / 2;
    shadowFloor.position.y = 0;
    shadowFloor.receiveShadow = true;
    this.scene.add(shadowFloor);

    // Base background plate
    const baseMat = new THREE.MeshBasicMaterial({ color: 0xfcfdfe });
    const baseFloor = new THREE.Mesh(floorGeo, baseMat);
    baseFloor.rotation.x = -Math.PI / 2;
    baseFloor.position.y = -0.002;
    this.scene.add(baseFloor);
  }

  initCenterFatJar() {
    // Central Aluminum-Lid Glass Can Jar with Golden Fat & Sloshing
    this.fatSystem = new FatFluidSystem(this.scene, {
      maxLiters: 5000,
      initialLiters: this.selectedLiters
    });
    this.fatSystem.group.position.set(0, 0, 0);
  }

  loadLineupModels() {
    this.modelsGroup = new THREE.Group();
    this.scene.add(this.modelsGroup);

    // Exact Lineup Configurations (Matching User Reference Image):
    // 1. Fiji Water (Leftmost)
    // 2. Olympic Pool (Left-Mid, perspective)
    // 3. Center Fat Jar (Center at x=0)
    // 4. Lamborghini LP670 (Right-Mid, front angled towards camera)
    // 5. Cybertruck (Rightmost, front angled towards camera)
    const modelConfigs = [
      {
        id: 'fiji_bottle',
        path: './assets/models/fiji_water_bottle.glb',
        targetHeight: 0.92,
        position: [-2.85, 0, 0.05],
        rotation: [0, 0.15, 0]
      },
      {
        id: 'swimming_pool',
        path: './assets/models/swimming_pool_343.glb',
        targetWidth: 1.75,
        position: [-1.45, 0, -0.05],
        rotation: [0, -0.20, 0] // Perspective showing front steps
      },
      {
        id: 'lamborghini',
        path: './assets/models/lambo_lp670.glb',
        targetLength: 1.85,
        position: [1.25, 0, 0.05],
        // Facing front-three-quarter towards camera (Front headlights visible)
        rotation: [0, Math.PI * 0.26, 0]
      },
      {
        id: 'cybertruck',
        path: './assets/models/Cyber_truck.glb',
        targetLength: 2.15,
        position: [2.95, 0, 0.0],
        // Facing front-three-quarter towards camera (Front lightbar visible)
        rotation: [0, Math.PI * 0.28, 0]
      }
    ];

    modelConfigs.forEach(cfg => {
      this.loader.load(
        cfg.path,
        gltf => {
          const root = gltf.scene;

          root.traverse(child => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // Normalize Scale
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

          // Ground to y = 0
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
        err => console.warn(`Model load error for ${cfg.path}`, err)
      );
    });
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 3.5;
    this.controls.maxDistance = 14.0;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
    this.controls.minPolarAngle = 0.2;
    this.controls.target.set(0, 0.75, 0);
  }

  initEvents() {
    window.addEventListener('resize', () => this.onWindowResize());
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
    this.controls.autoRotateSpeed = 0.8;
    return this.isAutoRotate;
  }

  resetCamera() {
    this.camera.position.set(0, 1.35, 6.2);
    this.controls.target.set(0, 0.75, 0);
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
