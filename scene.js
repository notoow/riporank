/**
 * LipoRank High-Fidelity 3D Scene
 * Calibrated 1:1 Real-World Physical Scale (1 unit = 1 meter):
 * [Fiji 0.22m] -- [Barrel 0.88m] -- [Lamborghini 1.16m] -- [★ SAMPLE Official Tower 4.82m] -- [Cow 1.45m] -- [Human 1.75m] -- [Cybertruck 1.79m (Gleaming Metallic)] -- [Thinker 1.8m] -- [T-Rex 3.8m] -- [Statue of Liberty & Pool: Smart Culling]
 * Features:
 * 1. "내 수술량 조절" spawns a highlighted preview tower in front stage (z = 1.6) with glowing aura
 * 2. On "내 탑 등록하기", smooth animated slide transition into the exact height-ranked lineup slot
 * 3. Cybertruck material upgraded to gleaming stainless steel metallic silver
 * 4. Smart Visibility: Giant landmarks auto-toggle only when comparable volume/focus
 * 5. 2.8s fluid fill & WASD/QE Walk-in mode
 */
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { COMPARISON_OBJECTS } from './objects-data.js';

export class LipoRankScene {
  constructor(canvasContainer, options = {}) {
    this.container = canvasContainer;
    this.onVolumeChange = options.onVolumeChange || (() => {});
    this.onObjectChange = options.onObjectChange || (() => {});
    this.onCameraModeChange = options.onCameraModeChange || (() => {});

    this.selectedLiters = options.initialLiters || 4820; // 4,820L (SAMPLE 원장)
    this.activeObjectId = null;
    this.objectConfigs = COMPARISON_OBJECTS;

    // Camera Modes: 'overview', 'giant', 'walkin'
    this.cameraMode = 'overview';
    this.isSunsetMode = false;

    // Fill Animation parameters (2.8s Golden Time)
    this.fillDuration = 2.8;
    this.fillStartTime = 0;
    this.isFilling = false;
    this.startFillPct = 0;
    this.targetFillPct = 1.0;
    this.currentFillPct = 1.0;

    // Camera transition
    this.isTransitioningCamera = false;
    this.camStartPos = new THREE.Vector3();
    this.camTargetPos = new THREE.Vector3(-3.0, 2.5, 16.0);
    this.lookAtStart = new THREE.Vector3();
    this.lookAtTarget = new THREE.Vector3(0, 0.9, 0);
    this.camTransitionProgress = 1.0;

    // First-Person Walk-in Controls (WASD + QE + Mouse Look)
    this.keys = { w: false, a: false, s: false, d: false, q: false, e: false };
    this.moveSpeed = 4.2;
    this.isMouseDown = false;
    this.prevMousePos = { x: 0, y: 0 };
    this.cameraEuler = new THREE.Euler(0, 0, 0, 'YXZ');

    this.loader = new GLTFLoader();
    this.models = {};
    this.modelHolders = {};
    this.originalMaterials = new Map();
    this.fatMeshes = {};
    this.clipPlanes = {};
    this.worldBounds = {};

    // 1m³ Cube Towers:
    // 1. officialTowerGroup: SAMPLE 원장 공인 탑 (람보르기니 바로 오른쪽 x = -1.2에 상시 배치)
    // 2. previewTowerGroup: 슬라이더 조절 시 앞쪽 중앙(z = 1.6)에 멋진 오라와 함께 뜨는 프리뷰 탑
    // 3. registeredMyTowerGroup: "내 탑 등록하기" 완료 시 라인업으로 슬라이드 이동한 내 영구 탑
    this.officialTowerGroup = new THREE.Group();
    this.previewTowerGroup = new THREE.Group();
    this.registeredMyTowerGroup = new THREE.Group();

    // Tower Sliding Animation
    this.isSlidingMyTower = false;
    this.slideStartPos = new THREE.Vector3(0, 0, 1.6);
    this.slideTargetPos = new THREE.Vector3(1.4, 0, 0.0);
    this.slideProgress = 1.0;

    this.init();
    this.initLights();
    this.initStudioFloor();
    this.initMaterials();
    this.initPreviewAura();
    this.loadAllObjects();

    // Permanent Official SAMPLE Tower (4,820L / 4.82m) — right of lamborghini (x=-13)
    this.buildTowerMesh(this.officialTowerGroup, 4820, -8.5, 0.0, false, 'SAMPLE 원장 (공인 1위 / 4,820L)');

    this.initControls();
    this.initEvents();
    this.animate();
  }

  init() {
    this.scene = new THREE.Scene();
    this.studioBgColor = new THREE.Color(0xfcfdfe);
    this.sunsetBgColor = new THREE.Color(0xffedd5);
    this.scene.background = this.studioBgColor.clone();
    this.scene.fog = new THREE.FogExp2(0xfcfdfe, 0.006); // Reduced density for wide lineup

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // Eye-level camera: centered on the core lineup, far enough to see all small-mid objects
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 300);
    this.camera.position.set(-3.0, 2.5, 16.0);
    this.camera.lookAt(-3.0, 1.0, 0);

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
    this.renderer.toneMappingExposure = 1.18;

    this.container.appendChild(this.renderer.domElement);
    this.clock = new THREE.Clock();

    this.scene.add(this.officialTowerGroup);
    this.scene.add(this.previewTowerGroup);
    this.scene.add(this.registeredMyTowerGroup);
  }

  initLights() {
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0xf1f5f9, 2.2);
    this.scene.add(this.hemiLight);

    this.mainLight = new THREE.DirectionalLight(0xffffff, 2.6);
    this.mainLight.position.set(8, 16, 10);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.width = 2048;
    this.mainLight.shadow.mapSize.height = 2048;
    this.mainLight.shadow.camera.near = 0.5;
    this.mainLight.shadow.camera.far = 45;
    this.mainLight.shadow.camera.left = -16;
    this.mainLight.shadow.camera.right = 16;
    this.mainLight.shadow.camera.top = 12;
    this.mainLight.shadow.camera.bottom = -4;
    this.mainLight.shadow.bias = -0.0001;
    this.scene.add(this.mainLight);

    this.fillLight = new THREE.DirectionalLight(0xf1f5f9, 1.4);
    this.fillLight.position.set(-10, 8, 6);
    this.scene.add(this.fillLight);

    // Warm golden accent light
    this.fatGlow = new THREE.PointLight(0xf59e0b, 1.8, 8);
    this.fatGlow.position.set(-1.2, 1.5, -0.6);
    this.scene.add(this.fatGlow);

    this.sunsetRimLight = new THREE.DirectionalLight(0xf97316, 0.0);
    this.sunsetRimLight.position.set(-10, 4, -8);
    this.scene.add(this.sunsetRimLight);
  }

  initStudioFloor() {
    const floorGeo = new THREE.PlaneGeometry(120, 120);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.12 });
    this.shadowFloor = new THREE.Mesh(floorGeo, floorMat);
    this.shadowFloor.rotation.x = -Math.PI / 2;
    this.shadowFloor.receiveShadow = true;
    this.scene.add(this.shadowFloor);

    const baseMat = new THREE.MeshBasicMaterial({ color: 0xfcfdfe });
    this.baseFloor = new THREE.Mesh(floorGeo, baseMat);
    this.baseFloor.rotation.x = -Math.PI / 2;
    this.baseFloor.position.y = -0.002;
    this.scene.add(this.baseFloor);
  }

  initMaterials() {
    // Crystal Glass Material
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

    // 1m³ Glass Cube Shell Material (1.0m x 1.0m x 1.0m = 1,000L)
    // Use simple transparent material (transmission requires WebGL2 extra passes)
    this.cubeGlassMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xe8f4ff),
      metalness: 0.0,
      roughness: 0.05,
      transparent: true,
      opacity: 0.18,
      reflectivity: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    // Gleaming Stainless Steel for Cybertruck
    this.stainlessCybertruckMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xc0ccd8),
      metalness: 0.88,
      roughness: 0.18,
      envMapIntensity: 1.2
    });

    // Build a simple cube envmap to give metallic surfaces reflections
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    // Create a simple sky-like scene for envmap
    const envScene = new RoomEnvironment();
    this.envMap = pmremGenerator.fromScene(envScene).texture;
    this.scene.environment = this.envMap;
    pmremGenerator.dispose();
  }

  /**
   * Glowing Highlight Aura ring for Preview Tower (front stage)
   */
  initPreviewAura() {
    this.auraGroup = new THREE.Group();
    this.auraGroup.position.set(0, 0.01, 1.6);
    this.auraGroup.visible = false;

    // Glowing circle ring
    const ringGeo = new THREE.RingGeometry(0.55, 0.75, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x0953ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    this.auraRing = new THREE.Mesh(ringGeo, ringMat);
    this.auraRing.rotation.x = -Math.PI / 2;
    this.auraGroup.add(this.auraRing);

    // Inner bright halo
    const haloGeo = new THREE.RingGeometry(0.3, 0.52, 48);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4
    });
    this.auraHalo = new THREE.Mesh(haloGeo, haloMat);
    this.auraHalo.rotation.x = -Math.PI / 2;
    this.auraGroup.add(this.auraHalo);

    this.scene.add(this.auraGroup);
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

          // Upgrade Cybertruck material to gleaming metallic silver
          if (cfg.id === 'cybertruck') {
            const tiresMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(0x1a1a1a),
              roughness: 0.85,
              metalness: 0.05
            });
            root.traverse(c => {
              if (c.isMesh) {
                const n = c.name.toLowerCase();
                if (n.includes('cylinder')) {
                  // Cylinders are wheels/tires
                  c.material = tiresMat;
                } else {
                  c.material = this.stainlessCybertruckMaterial;
                }
              }
            });
          }

          // Cache original materials
          root.traverse(c => {
            if (c.isMesh) {
              this.originalMaterials.set(c, c.material);
              c.castShadow = true;
              c.receiveShadow = true;
            }
          });

          const holder = new THREE.Group();
          holder.name = cfg.id;
          holder.userData = { config: cfg };

          holder.add(root);

          // Inner Fat Mesh (hidden by default)
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
          fatMesh.scale.setScalar(0.99);
          fatMesh.visible = false;
          holder.add(fatMesh);
          this.fatMeshes[cfg.id] = fatMesh;

          if (cfg.rotation) {
            holder.rotation.set(cfg.rotation[0], cfg.rotation[1], cfg.rotation[2]);
          }

          // 1:1 Physical Scale Normalization
          // Step 1: measure at position=0 to get clean local bounds
          holder.position.set(0, 0, 0);
          const box0 = new THREE.Box3().setFromObject(holder);
          const size0 = box0.getSize(new THREE.Vector3());

          let scale = 1.0;
          if (cfg.targetHeight) {
            scale = cfg.targetHeight / (size0.y || 1);
          } else if (cfg.targetLength) {
            scale = cfg.targetLength / (Math.max(size0.x, size0.z) || 1);
          }
          holder.scale.setScalar(scale);

          // Step 2: re-measure after scale to get final ground offset
          const box1 = new THREE.Box3().setFromObject(holder);
          holder.position.set(
            cfg.position[0],
            -box1.min.y, // lift so bottom of object is exactly at y = 0
            cfg.position[2]
          );

          // Smart Visibility Culling: Giant landmarks hidden by default until volume threshold met
          if (cfg.hasOwnProperty('isAlwaysVisible') && !cfg.isAlwaysVisible) {
            holder.visible = false;
          }

          this.lineupGroup.add(holder);
          this.modelHolders[cfg.id] = holder;

          holder.updateMatrixWorld(true);
          const worldBox = new THREE.Box3().setFromObject(holder);
          this.worldBounds[cfg.id] = {
            minY: worldBox.min.y,
            maxY: worldBox.max.y,
            height: worldBox.max.y - worldBox.min.y
          };
        },
        undefined,
        err => console.warn(`Error loading ${cfg.modelPath}:`, err)
      );
    });
  }

  /**
   * Builds a 1m³ Glass Cube Tower
   * @param {THREE.Group} group
   * @param {number} liters
   * @param {number} posX
   * @param {number} posZ
   * @param {boolean} isPrivate
   * @param {string} badgeLabel
   */
  buildTowerMesh(group, liters, posX, posZ, isPrivate, badgeLabel) {
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const fullCubes = Math.floor(liters / 1000);
    const remainderLiters = liters % 1000;
    const partialRatio = remainderLiters / 1000;
    const totalCubes = remainderLiters > 0 ? fullCubes + 1 : fullCubes;

    // 1m³ cube: each cube is exactly 1.0 x 1.0 x 1.0 meters = 1,000L
    const cubeSize = 1.0;
    const gap = 0.02;
    const stepY = cubeSize + gap;

    group.position.set(posX, 0, posZ);

    for (let i = 0; i < totalCubes; i++) {
      const isTopPartial = (i === fullCubes && partialRatio > 0);
      const fillPct = isTopPartial ? partialRatio : 1.0;
      const cubeY = (i * stepY) + (cubeSize / 2);

      const cubeHolder = new THREE.Group();
      cubeHolder.position.set(0, cubeY, 0);

      // Crystal Glass Outer Shell — subtle ghost-blue tint, very transparent
      const boxGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
      const glassMesh = new THREE.Mesh(boxGeo, this.cubeGlassMaterial);
      glassMesh.castShadow = false;
      glassMesh.receiveShadow = false;
      glassMesh.renderOrder = 1; // Render glass after solid objects
      cubeHolder.add(glassMesh);

      // Glowing edge wireframe (most visible part of the cube)
      const wireGeo = new THREE.EdgesGeometry(boxGeo);
      const wireMat = new THREE.LineBasicMaterial({
        color: isPrivate ? 0x38bdf8 : 0xfde68a,
        transparent: true,
        opacity: 0.90
      });
      const wireLine = new THREE.LineSegments(wireGeo, wireMat);
      cubeHolder.add(wireLine);

      // Inner Golden Fat Core — translucent so glass outline is visible
      const fatHeight = Math.max(0.02, (cubeSize * 0.94) * fillPct);
      const fatGeo = new THREE.BoxGeometry(cubeSize * 0.90, fatHeight, cubeSize * 0.90);
      const fatMat = new THREE.MeshStandardMaterial({
        color: isPrivate ? 0x38bdf8 : 0xf59e0b,
        emissive: isPrivate ? 0x0369a1 : 0xd97706,
        emissiveIntensity: 0.5,
        roughness: 0.25,
        metalness: 0.1,
        transparent: true,
        opacity: 0.88
      });
      const fatMesh = new THREE.Mesh(fatGeo, fatMat);
      fatMesh.position.y = -(cubeSize * 0.94 / 2) + (fatHeight / 2);
      cubeHolder.add(fatMesh);

      group.add(cubeHolder);
    }

    const topHeight = (totalCubes * stepY);
    this.createTowerTopMarker(group, topHeight, liters, isPrivate);
  }

  createTowerTopMarker(group, topHeight, liters, isPrivate) {
    const markerGroup = new THREE.Group();
    markerGroup.position.set(0, topHeight + 0.16, 0);

    const pinGeo = new THREE.OctahedronGeometry(0.12, 0);
    const pinMat = new THREE.MeshStandardMaterial({
      color: isPrivate ? 0x38bdf8 : 0xf59e0b,
      emissive: isPrivate ? 0x0284c7 : 0xd97706,
      emissiveIntensity: 0.95,
      metalness: 0.2,
      roughness: 0.1
    });
    const pinMesh = new THREE.Mesh(pinGeo, pinMat);
    markerGroup.add(pinMesh);

    group.add(markerGroup);
  }

  /**
   * "내 수술량 조절": Spawns the preview tower in front stage (z = 1.6) with glowing aura
   */
  setVolume(liters) {
    this.selectedLiters = liters;

    // Show Preview Tower with glowing aura in front of lineup
    this.buildTowerMesh(this.previewTowerGroup, liters, 0, 1.6, true, '내 조절 탑');
    this.auraGroup.visible = true;

    // Check smart visibility for giant landmarks (statue of liberty, pool)
    this.updateSmartLandmarkVisibility(liters);

    // If an object is active, update its fill level
    if (this.activeObjectId) {
      this.applyGlassFill(this.activeObjectId, liters);
    }

    this.onVolumeChange(liters);
  }

  toggleObjectVisibility(objectId) {
    const holder = this.modelHolders[objectId];
    if (!holder) return false;
    holder.visible = !holder.visible;
    return holder.visible;
  }

  isObjectVisible(objectId) {
    const holder = this.modelHolders[objectId];
    return holder ? holder.visible : false;
  }

  updateSmartLandmarkVisibility(liters) {
    this.objectConfigs.forEach(cfg => {
      if (cfg.minLitersThreshold && this.modelHolders[cfg.id]) {
        // Toggle on when volume is large enough
        this.modelHolders[cfg.id].visible = (liters >= cfg.minLitersThreshold);
      }
    });
  }

  /**
   * "내 탑 등록하기" 완료 시:
   * Smoothly slides the front preview tower to its height-ranked slot in lineup!
   */
  confirmAndRegisterMyTower(doctorData) {
    const liters = doctorData.totalLiters;
    
    // Determine height-ranked X position (placed between cow and cybertruck at x = 1.4m)
    const targetX = 1.4;
    const targetZ = 0.0;

    // Build the registered tower in preview position first
    this.buildTowerMesh(this.registeredMyTowerGroup, liters, 0, 1.6, true, `${doctorData.name} 탑`);
    this.previewTowerGroup.visible = false;
    this.auraGroup.visible = false;

    // Trigger smooth slide transition
    this.isSlidingMyTower = true;
    this.slideProgress = 0.0;
    this.slideStartPos.set(0, 0, 1.6);
    this.slideTargetPos.set(targetX, 0, targetZ);
  }

  /**
   * Smoothly transitions active object to crystal glass
   */
  setActiveObject(objectId) {
    if (this.activeObjectId && this.activeObjectId !== objectId) {
      this.revertToSolid(this.activeObjectId);
    }

    this.activeObjectId = objectId;
    if (objectId) {
      // Ensure object is visible even if giant landmark
      if (this.modelHolders[objectId]) {
        this.modelHolders[objectId].visible = true;
      }
      this.applyGlassFill(objectId, this.selectedLiters);
    }
    this.onObjectChange(objectId);
  }

  applyGlassFill(objectId, liters) {
    const root = this.models[objectId];
    const fatMesh = this.fatMeshes[objectId];
    const cfg = this.objectConfigs.find(c => c.id === objectId);

    if (!root || !fatMesh || !cfg) return;

    root.traverse(c => {
      if (c.isMesh) {
        c.material = this.glassMaterial;
      }
    });

    fatMesh.visible = true;

    const ratio = liters / cfg.volumeLiters;
    this.targetFillPct = Math.min(Math.max(ratio, 0.05), 1.0);
    this.startFillPct = 0.05;
    this.fillStartTime = this.clock.getElapsedTime();
    this.isFilling = true;

    if (this.fatGlow) {
      this.fatGlow.position.set(cfg.position[0], 0.8, cfg.position[2] - 0.8);
    }
  }

  revertToSolid(objectId) {
    const root = this.models[objectId];
    const fatMesh = this.fatMeshes[objectId];

    if (!root) return;

    root.traverse(c => {
      if (c.isMesh && this.originalMaterials.has(c)) {
        c.material = this.originalMaterials.get(c);
      }
    });

    if (fatMesh) {
      fatMesh.visible = false;
    }
  }

  enterGiantView(objectId) {
    const cfg = this.objectConfigs.find(c => c.id === objectId);
    if (!cfg || !cfg.heroCamPos) return;

    this.cameraMode = 'giant';
    this.setActiveObject(objectId);

    this.startCameraTransition(
      new THREE.Vector3(cfg.heroCamPos[0], cfg.heroCamPos[1], cfg.heroCamPos[2]),
      new THREE.Vector3(cfg.heroLookAt[0], cfg.heroLookAt[1], cfg.heroLookAt[2])
    );

    this.onCameraModeChange('giant', cfg);
  }

  exitGiantView() {
    this.cameraMode = 'overview';
    this.startCameraTransition(
      new THREE.Vector3(-3.0, 2.5, 16.0),
      new THREE.Vector3(-3.0, 1.0, 0)
    );
    this.onCameraModeChange('overview', null);
  }

  enterFirstPersonMode() {
    this.cameraMode = 'walkin';
    this.controls.enabled = false;
    this.prevMousePos = { x: 0, y: 0, init: false };

    // Request pointer lock for true FPS mouse-look if permitted
    try {
      this.renderer.domElement.requestPointerLock?.();
    } catch (e) {}

    this.startCameraTransition(
      new THREE.Vector3(0, 1.35, 3.8),
      new THREE.Vector3(0, 1.25, 0)
    );

    this.cameraEuler.set(0, 0, 0, 'YXZ');
    this.onCameraModeChange('walkin', null);
  }

  exitFirstPersonMode() {
    if (document.pointerLockElement) {
      try {
        document.exitPointerLock?.();
      } catch (e) {}
    }
    this.controls.enabled = true;
    this.exitGiantView();
  }

  startCameraTransition(targetPos, targetLookAt) {
    this.isTransitioningCamera = true;
    this.camTransitionProgress = 0.0;
    this.camStartPos.copy(this.camera.position);
    this.camTargetPos.copy(targetPos);
    this.lookAtStart.copy(this.controls.target);
    this.lookAtTarget.copy(targetLookAt);
  }

  toggleSunsetMode() {
    this.isSunsetMode = !this.isSunsetMode;

    if (this.isSunsetMode) {
      this.scene.background = new THREE.Color(0xfef3c7);
      this.scene.fog.color.set(0xfef3c7);
      this.baseFloor.material.color.set(0xfef3c7);
      this.hemiLight.color.set(0xfde68a);
      this.hemiLight.groundColor.set(0xfb923c);
      this.mainLight.color.set(0xf59e0b);
      this.mainLight.intensity = 2.8;
      this.sunsetRimLight.intensity = 2.2;
      this.fatGlow.intensity = 2.5;
    } else {
      this.scene.background = this.studioBgColor.clone();
      this.scene.fog.color.copy(this.studioBgColor);
      this.baseFloor.material.color.copy(this.studioBgColor);
      this.hemiLight.color.set(0xffffff);
      this.hemiLight.groundColor.set(0xf1f5f9);
      this.mainLight.color.set(0xffffff);
      this.mainLight.intensity = 2.6;
      this.sunsetRimLight.intensity = 0.0;
      this.fatGlow.intensity = 1.8;
    }

    return this.isSunsetMode;
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 80.0;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.01;
    this.controls.minPolarAngle = Math.PI / 2.3;
    this.controls.target.set(-3.0, 1.0, 0);
  }

  initEvents() {
    window.addEventListener('resize', () => this.onWindowResize());

    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (this.keys.hasOwnProperty(k)) this.keys[k] = true;
      if (e.key === 'Escape' && this.cameraMode !== 'overview') {
        this.exitFirstPersonMode();
      }
    });

    window.addEventListener('keyup', e => {
      const k = e.key.toLowerCase();
      if (this.keys.hasOwnProperty(k)) this.keys[k] = false;
    });

    // Mouse move for FPS camera control in walk-in mode
    window.addEventListener('mousemove', e => {
      if (this.cameraMode !== 'walkin') return;

      let movementX = e.movementX;
      let movementY = e.movementY;

      // Fallback if Pointer Lock isn't active or movementX is undefined
      if (movementX === undefined || (movementX === 0 && movementY === 0 && !document.pointerLockElement)) {
        if (!this.prevMousePos.init) {
          this.prevMousePos.x = e.clientX;
          this.prevMousePos.y = e.clientY;
          this.prevMousePos.init = true;
          return;
        }
        movementX = e.clientX - this.prevMousePos.x;
        movementY = e.clientY - this.prevMousePos.y;
        this.prevMousePos.x = e.clientX;
        this.prevMousePos.y = e.clientY;
      }

      this.cameraEuler.y -= (movementX || 0) * 0.0025;
      this.cameraEuler.x -= (movementY || 0) * 0.0025;
      this.cameraEuler.x = Math.max(-1.45, Math.min(1.45, this.cameraEuler.x));
      this.camera.quaternion.setFromEuler(this.cameraEuler);
    });

    // Pointer lock change listener
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && this.cameraMode === 'walkin') {
        // user pressed ESC or unlocked pointer
      }
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    this.container.addEventListener('click', e => {
      // In walk-in mode, clicks do not trigger giant view
      if (this.cameraMode === 'walkin') return;

      const rect = this.container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObjects(this.lineupGroup.children, true);

      if (intersects.length > 0) {
        let topParent = intersects[0].object;
        while (topParent.parent && topParent.parent !== this.lineupGroup) {
          topParent = topParent.parent;
        }
        if (topParent && topParent.userData && topParent.userData.config) {
          this.enterGiantView(topParent.userData.config.id);
        }
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

  updateWalkinMovement(delta) {
    if (this.cameraMode !== 'walkin' || this.isTransitioningCamera) return;

    const moveVector = new THREE.Vector3();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    right.y = 0;
    right.normalize();

    if (this.keys.w) moveVector.add(forward);
    if (this.keys.s) moveVector.sub(forward);
    if (this.keys.d) moveVector.add(right);
    if (this.keys.a) moveVector.sub(right);

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize().multiplyScalar(this.moveSpeed * delta);
      this.camera.position.add(moveVector);
    }

    if (this.keys.e) this.camera.position.y += this.moveSpeed * delta * 0.8;
    if (this.keys.q) this.camera.position.y -= this.moveSpeed * delta * 0.8;
    this.camera.position.y = Math.max(0.4, Math.min(18.0, this.camera.position.y));
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // 1. Walk-in movement
    this.updateWalkinMovement(delta);

    // 2. Camera Transition
    if (this.isTransitioningCamera) {
      this.camTransitionProgress += delta * 2.2;
      const t = Math.min(this.camTransitionProgress, 1.0);
      const ease = t * t * (3 - 2 * t);

      this.camera.position.lerpVectors(this.camStartPos, this.camTargetPos, ease);
      if (this.cameraMode !== 'walkin') {
        this.controls.target.lerpVectors(this.lookAtStart, this.lookAtTarget, ease);
      }

      if (t >= 1.0) {
        this.isTransitioningCamera = false;
      }
    }

    // 3. Slide Transition for Registered Tower
    if (this.isSlidingMyTower) {
      this.slideProgress += delta * 1.5;
      const t = Math.min(this.slideProgress, 1.0);
      const ease = t * t * (3 - 2 * t);
      this.registeredMyTowerGroup.position.lerpVectors(this.slideStartPos, this.slideTargetPos, ease);
      if (t >= 1.0) {
        this.isSlidingMyTower = false;
      }
    }

    // 4. Rotating Aura animation under preview tower
    if (this.auraGroup && this.auraGroup.visible) {
      this.auraRing.rotation.z += delta * 1.2;
      this.auraHalo.rotation.z -= delta * 1.5;
      const pulse = 1.0 + Math.sin(time * 4.0) * 0.08;
      this.auraGroup.scale.set(pulse, pulse, pulse);
    }

    // 5. 2.8s Fluid Fill Animation (Cubic Ease-Out)
    if (this.isFilling && this.activeObjectId && this.clipPlanes[this.activeObjectId]) {
      const elapsed = time - this.fillStartTime;
      const progress = Math.min(elapsed / this.fillDuration, 1.0);
      
      const easeOut = 1 - Math.pow(1 - progress, 3);
      this.currentFillPct = THREE.MathUtils.lerp(this.startFillPct, this.targetFillPct, easeOut);

      const b = this.worldBounds[this.activeObjectId];
      if (b && b.height) {
        const sloshWave = Math.sin(time * 3.5) * (b.height * 0.008);
        this.clipPlanes[this.activeObjectId].constant = b.minY + (b.height * this.currentFillPct) + sloshWave;
      }

      if (progress >= 1.0) {
        this.isFilling = false;
      }
    }

    if (this.cameraMode !== 'walkin') {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }
}
