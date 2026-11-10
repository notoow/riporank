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
    this.keys = { w: false, a: false, s: false, d: false, q: false, e: false, shift: false };
    this.baseMoveSpeed = 4.2;
    this.maxSprintSpeed = 16.0;
    this.currentSprintSpeed = 4.2;
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
    // 1. doctorTowerGroups: Map of all verified doctor towers (SAMPLE 원장, 정우진 원장, 강민서 원장)
    // 2. previewTowerGroup: 슬라이더 조절 시 앞쪽 중앙(z = 1.6)에 멋진 오라와 함께 뜨는 내 조절 탑 (Yellow)
    // 3. registeredMyTowerGroup: "내 탑 등록하기" 완료 시 라인업으로 슬라이드 이동한 내 영구 탑 (Yellow)
    this.doctorTowerGroups = {}; // { [doctorId]: { group, data, posX, cubes: [...] } }
    this.officialTowerGroup = new THREE.Group(); // Legacy alias for SAMPLE 원장
    this.previewTowerGroup = new THREE.Group();
    this.registeredMyTowerGroup = new THREE.Group();
    this.activeComparisonDoctorId = null;

    // Tower Sliding Animation
    this.isSlidingMyTower = false;
    this.slideStartPos = new THREE.Vector3(0, 0, 1.6);
    this.slideTargetPos = new THREE.Vector3(1.4, 0, 0.0);
    this.slideProgress = 1.0;

    // Neighbor Shift Animation on registration
    this.isShiftingNeighbors = false;
    this.shiftProgress = 1.0;
    this.shiftedObjects = []; // array of { obj, startX, targetX, y, z }

    this.init();
    this.initLights();
    this.initStudioFloor();
    this.initMaterials();
    this.initPreviewAura();
    this.loadAllObjects();

    // Build all verified doctors' towers from initial verified data
    this.initDoctorTowers();

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
    const floorGeo = new THREE.PlaneGeometry(300, 300);
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
          let groundY = 0;
          if (cfg.id === 'lamborghini') {
            groundY = 0.0; // Lambo origin is already wheels on ground or known offset
          } else {
            groundY = -box1.min.y;
          }

          holder.position.set(
            cfg.position[0],
            groundY,
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

  initDoctorTowers() {
    const verifiedDoctors = [
      { id: 'doc-adm-03', rank: 3, name: '강민서 원장', liters: 3200, x: -11.6, z: 0.0, badge: '공인 3위 강민서 원장' },
      { id: 'doc-adm-02', rank: 2, name: '정우진 원장', liters: 3950, x: -9.8, z: 0.0, badge: '공인 2위 정우진 원장' },
      { id: 'doc-adm-01', rank: 1, name: 'SAMPLE 원장', liters: 4820, x: -8.0, z: 0.0, badge: '공인 1위 SAMPLE 원장' }
    ];

    verifiedDoctors.forEach(doc => {
      const group = new THREE.Group();
      this.scene.add(group);
      this.buildDoctorTower(group, doc.liters, doc.x, doc.z, doc);
      this.doctorTowerGroups[doc.id] = {
        group: group,
        data: doc,
        posX: doc.x,
        posZ: doc.z
      };
      if (doc.id === 'doc-adm-01') {
        this.officialTowerGroup = group; // Maintain backward compatibility
      }
    });
  }

  /**
   * Builds an Official Doctor Tower (Blue theme by default, with yellow comparison fill support)
   */
  buildDoctorTower(group, totalLiters, posX, posZ, doctorData, userCompareLiters = 0) {
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const fullCubes = Math.floor(totalLiters / 1000);
    const remainderLiters = totalLiters % 1000;
    const partialRatio = remainderLiters / 1000;
    const totalCubes = remainderLiters > 0 ? fullCubes + 1 : fullCubes;

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

      // Glass Outer Shell
      const boxGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
      const glassMesh = new THREE.Mesh(boxGeo, this.cubeGlassMaterial);
      glassMesh.castShadow = false;
      glassMesh.receiveShadow = false;
      glassMesh.renderOrder = 1;
      cubeHolder.add(glassMesh);

      // Wireframe: Blue
      const wireGeo = new THREE.EdgesGeometry(boxGeo);
      const wireMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.90
      });
      const wireLine = new THREE.LineSegments(wireGeo, wireMat);
      cubeHolder.add(wireLine);

      // Cube Liters range: from i * 1000 to (i + 1) * 1000
      const cubeStartLiters = i * 1000;
      const cubeCapacityLiters = isTopPartial ? remainderLiters : 1000;
      const cubeEndLiters = cubeStartLiters + cubeCapacityLiters;

      // Fat Meshes inside:
      // If userCompareLiters > 0:
      // The portion up to userCompareLiters is rendered in Yellow (내 수술량),
      // and the portion from userCompareLiters up to cubeEndLiters is Blue (상대 원장 수술량).
      const userLitersInCube = Math.max(0, Math.min(cubeCapacityLiters, userCompareLiters - cubeStartLiters));
      const competitorLitersInCube = Math.max(0, cubeCapacityLiters - userLitersInCube);

      const userPct = userLitersInCube / 1000;
      const compPct = competitorLitersInCube / 1000;

      // 1. User portion (Yellow fat)
      if (userPct > 0) {
        const uHeight = Math.max(0.015, (cubeSize * 0.94) * userPct);
        const uGeo = new THREE.BoxGeometry(cubeSize * 0.90, uHeight, cubeSize * 0.90);
        const uMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xd97706,
          emissiveIntensity: 0.55,
          roughness: 0.25,
          metalness: 0.1,
          transparent: true,
          opacity: 0.92
        });
        const uMesh = new THREE.Mesh(uGeo, uMat);
        uMesh.position.y = -(cubeSize * 0.94 / 2) + (uHeight / 2);
        cubeHolder.add(uMesh);
      }

      // 2. Doctor / Competitor remaining portion (Blue fat)
      if (compPct > 0) {
        const cHeight = Math.max(0.015, (cubeSize * 0.94) * compPct);
        const cGeo = new THREE.BoxGeometry(cubeSize * 0.90, cHeight, cubeSize * 0.90);
        const cMat = new THREE.MeshStandardMaterial({
          color: 0x0284c7,
          emissive: 0x0369a1,
          emissiveIntensity: 0.45,
          roughness: 0.25,
          metalness: 0.1,
          transparent: true,
          opacity: 0.85
        });
        const cMesh = new THREE.Mesh(cGeo, cMat);
        const bottomOffset = userPct > 0 ? (cubeSize * 0.94 * userPct) : 0;
        cMesh.position.y = -(cubeSize * 0.94 / 2) + bottomOffset + (cHeight / 2);
        cubeHolder.add(cMesh);
      }

      group.add(cubeHolder);
    }

    const topHeight = (totalCubes * stepY);
    this.createDoctorTowerTopMarker(group, topHeight, totalLiters, doctorData, userCompareLiters);
  }

  createDoctorTowerTopMarker(group, topHeight, totalLiters, doctorData, userCompareLiters = 0) {
    const markerGroup = new THREE.Group();
    markerGroup.position.set(0, topHeight + 0.16, 0);

    const pinGeo = new THREE.OctahedronGeometry(0.12, 0);
    const pinMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.95,
      metalness: 0.2,
      roughness: 0.1
    });
    const pinMesh = new THREE.Mesh(pinGeo, pinMat);
    markerGroup.add(pinMesh);

    // Canvas label Sprite above the tower
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 160;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // High-contrast solid white background card
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(8, 8, 496, 144);

        // Blue border
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#0284c7';
        ctx.strokeRect(8, 8, 496, 144);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // High contrast Blue background card
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(4, 4, 504, 152);

        // White border
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(4, 4, 504, 152);

        // Badge pill
        ctx.fillStyle = '#e0f2fe';
        ctx.font = '900 32px Arial, sans-serif';
        ctx.fillText(`★ 공인 ${doctorData.rank || ''}위 ${doctorData.name}`, 256, 44);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 44px Arial, sans-serif';
        const heightM = ((totalLiters / 1000) * 1.02).toFixed(2);
        ctx.fillText(`${totalLiters.toLocaleString()}L (${heightM}m)`, 256, 92);

        // If user comparison active, show gap subtitle
        if (userCompareLiters > 0) {
          const diff = userCompareLiters - totalLiters;
          const diffText = diff >= 0
            ? `+${diff.toLocaleString()}L 앞섬! (노란색)`
            : `-${Math.abs(diff).toLocaleString()}L 차이 (노란색 차오름)`;
          ctx.fillStyle = diff >= 0 ? '#4ade80' : '#fef08a';
          ctx.font = 'bold 28px Arial, sans-serif';
          ctx.fillText(diffText, 256, 132);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: false });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(0, 0.9, 0);
        sprite.scale.set(2.4, 0.75, 1.0);
        markerGroup.add(sprite);
      }
    } catch (e) {
      console.warn('Canvas texture creation error:', e);
    }

    group.add(markerGroup);
  }

  /**
   * Set Comparison Fill on another doctor's tower
   */
  setDoctorTowerComparison(doctorId, userLiters) {
    this.activeComparisonDoctorId = doctorId;
    Object.keys(this.doctorTowerGroups).forEach(id => {
      const docEntry = this.doctorTowerGroups[id];
      const compareL = (id === doctorId) ? userLiters : 0;
      this.buildDoctorTower(docEntry.group, docEntry.data.liters, docEntry.posX, docEntry.posZ, docEntry.data, compareL);
    });
  }

  clearDoctorTowerComparison() {
    this.activeComparisonDoctorId = null;
    Object.keys(this.doctorTowerGroups).forEach(id => {
      const docEntry = this.doctorTowerGroups[id];
      this.buildDoctorTower(docEntry.group, docEntry.data.liters, docEntry.posX, docEntry.posZ, docEntry.data, 0);
    });
  }

  /**
   * Builds a 1m³ Glass Cube Tower (User Preview / Registered Tower - Yellow theme)
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

      // Crystal Glass Outer Shell
      const boxGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
      const glassMesh = new THREE.Mesh(boxGeo, this.cubeGlassMaterial);
      glassMesh.castShadow = false;
      glassMesh.receiveShadow = false;
      glassMesh.renderOrder = 1;
      cubeHolder.add(glassMesh);

      // Glowing edge wireframe (Yellow for My Tower)
      const wireGeo = new THREE.EdgesGeometry(boxGeo);
      const wireMat = new THREE.LineBasicMaterial({
        color: 0xfde68a,
        transparent: true,
        opacity: 0.90
      });
      const wireLine = new THREE.LineSegments(wireGeo, wireMat);
      cubeHolder.add(wireLine);

      // Inner Golden Fat Core (Always Yellow for My Tower)
      const fatHeight = Math.max(0.02, (cubeSize * 0.94) * fillPct);
      const fatGeo = new THREE.BoxGeometry(cubeSize * 0.90, fatHeight, cubeSize * 0.90);
      const fatMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.55,
        roughness: 0.25,
        metalness: 0.1,
        transparent: true,
        opacity: 0.90
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

    // Canvas label Sprite above the tower
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 140;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // High-contrast solid white card
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(8, 8, 496, 124);

        // Border
        ctx.lineWidth = 6;
        ctx.strokeStyle = isPrivate ? '#f59e0b' : '#0953ff';
        ctx.strokeRect(8, 8, 496, 124);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Badge pill text
        if (isPrivate) {
          ctx.fillStyle = '#d97706';
          ctx.font = '900 28px "Pretendard", sans-serif';
          ctx.fillText('🔒 나만 보기 (공인 심사 대기)', 256, 44);
          
          ctx.fillStyle = '#0f172a';
          ctx.font = '900 36px "Pretendard", sans-serif';
          ctx.fillText(`내 수술탑 ${liters.toLocaleString()}L`, 256, 88);
        } else {
          ctx.fillStyle = '#0953ff';
          ctx.font = '900 28px "Pretendard", sans-serif';
          ctx.fillText('👑 내 수술탑 (공인 완료)', 256, 44);

          ctx.fillStyle = '#0f172a';
          ctx.font = '900 36px "Pretendard", sans-serif';
          ctx.fillText(`${liters.toLocaleString()}L`, 256, 88);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: false });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(0, 0.85, 0);
        sprite.scale.set(2.4, 0.65, 1.0);
        markerGroup.add(sprite);
      }
    } catch (e) {
      console.warn('Canvas texture creation error:', e);
    }

    group.add(markerGroup);
  }

  /**
   * "내 수술량 조절": Spawns the preview tower in front stage (z = 1.6) with glowing aura
   */
  setVolume(liters, focusCamera = true) {
    this.selectedLiters = liters;

    // Show Preview Tower with glowing aura in front of lineup (z = 1.6)
    this.buildTowerMesh(this.previewTowerGroup, liters, 0, 1.6, true, '내 조절 탑');
    this.auraGroup.visible = true;

    // Check smart visibility for giant landmarks (statue of liberty, pool)
    this.updateSmartLandmarkVisibility(liters);

    // If an object is active, update its fill level
    if (this.activeObjectId) {
      this.applyGlassFill(this.activeObjectId, liters);
    }

    // Auto-focus camera onto my preview tower when slider is adjusted
    if (focusCamera && this.cameraMode !== 'walkin') {
      const cubes = Math.max(1, Math.ceil(liters / 1000));
      const targetLookY = Math.min(6.0, cubes * 0.55);
      const camY = Math.max(1.8, targetLookY + 0.6);
      const camZ = Math.max(4.5, 3.2 + cubes * 0.4);

      this.startCameraTransition(
        new THREE.Vector3(0, camY, camZ),
        new THREE.Vector3(0, targetLookY, 1.6)
      );
    }

    this.onVolumeChange(liters);
  }

  toggleOfficialTowerVisibility() {
    this.officialTowerGroup.visible = !this.officialTowerGroup.visible;
    return this.officialTowerGroup.visible;
  }

  toggleDoctorTowerVisibility(doctorId) {
    const entry = this.doctorTowerGroups[doctorId];
    if (entry && entry.group) {
      entry.group.visible = !entry.group.visible;
      return entry.group.visible;
    }
    return false;
  }

  toggleObjectVisibility(objectId) {
    if (objectId === 'sample_tower' || objectId === 'official_tower' || objectId === 'doc-adm-01') {
      return this.toggleDoctorTowerVisibility('doc-adm-01');
    }
    if (objectId === 'doc-adm-02' || objectId === 'doc-adm-03') {
      return this.toggleDoctorTowerVisibility(objectId);
    }
    if (objectId === 'my_tower') {
      this.registeredMyTowerGroup.visible = !this.registeredMyTowerGroup.visible;
      return this.registeredMyTowerGroup.visible;
    }
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
    const liters = doctorData.totalLiters || this.selectedLiters;
    const isVerified = (doctorData.status === 'verified');
    
    // 1. Calculate appropriate target X slot based on physical height / liters rank:
    // fiji (0.5L): x=-22
    // barrel (200L): x=-19
    // lambo (4700L): x=-14
    // SAMPLE tower (4820L): x=-8.5
    // cow (300L): x=-5
    // human (70L vol / 1.75m height): x=-1.5
    // cybertruck (7100L): x=4.5
    // thinker (500L vol / 1.80m height): x=12
    // rex (8000L): x=20
    // statue (15000L): x=29
    // pool (2500000L): x=38
    let targetX = 1.0;
    if (liters < 100) {
      targetX = -20.5; // between fiji and barrel
    } else if (liters < 250) {
      targetX = -16.5; // between barrel and lambo
    } else if (liters < 1500) {
      targetX = -3.25; // between cow and human
    } else if (liters < 4820) {
      targetX = -11.0; // between lambo and official sample tower
    } else if (liters < 6000) {
      targetX = -6.5; // between sample tower and cow
    } else if (liters < 7500) {
      targetX = 1.5; // between human and cybertruck
    } else if (liters < 12000) {
      targetX = 8.2; // between cybertruck and thinker
    } else if (liters < 20000) {
      targetX = 24.5; // between rex and statue
    } else {
      targetX = 33.5; // between statue and pool
    }
    const targetZ = 0.0;

    // 2. Smoothly shift neighbor objects to make room for the new tower!
    // Shift left neighbors slightly left (-1.5m), right neighbors slightly right (+1.5m)
    this.shiftedObjects = [];
    const pushDist = 1.6;

    // Shift 3D comparison models
    this.objectConfigs.forEach(cfg => {
      const holder = this.modelHolders[cfg.id];
      if (holder) {
        const origX = cfg.position[0];
        let newX = origX;
        if (origX > targetX) {
          newX = origX + pushDist;
        } else if (origX < targetX) {
          newX = origX - pushDist;
        }
        this.shiftedObjects.push({
          obj: holder,
          startX: holder.position.x,
          targetX: newX,
          y: holder.position.y,
          z: holder.position.z
        });
      }
    });

    // Also shift all verified doctor towers
    Object.keys(this.doctorTowerGroups).forEach(docId => {
      const entry = this.doctorTowerGroups[docId];
      if (entry && entry.group) {
        const origDocX = entry.posX;
        const newDocX = origDocX > targetX ? (origDocX + pushDist) : (origDocX - pushDist);
        this.shiftedObjects.push({
          obj: entry.group,
          startX: entry.group.position.x,
          targetX: newDocX,
          y: entry.group.position.y,
          z: entry.group.position.z
        });
      }
    });

    this.isShiftingNeighbors = true;
    this.shiftProgress = 0.0;

    // 3. Build the registered tower:
    this.buildTowerMesh(this.registeredMyTowerGroup, liters, 0, 1.6, !isVerified, `${doctorData.name || '내'} 탑`);
    this.previewTowerGroup.visible = false;
    this.auraGroup.visible = false;

    // 4. Trigger smooth slide transition
    this.isSlidingMyTower = true;
    this.slideProgress = 0.0;
    this.slideStartPos.set(0, 0, 1.6);
    this.slideTargetPos.set(targetX, 0, targetZ);

    // 5. Pan camera to follow the registered tower smoothly
    const cubes = Math.max(1, Math.ceil(liters / 1000));
    const targetLookY = Math.min(6.0, cubes * 0.55);
    const camY = Math.max(2.2, targetLookY + 0.8);
    const camZ = Math.max(6.0, 4.0 + cubes * 0.4);

    this.startCameraTransition(
      new THREE.Vector3(targetX, camY, camZ),
      new THREE.Vector3(targetX, targetLookY, targetZ)
    );
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
      // Ensure object is visible even if previously hidden & sync UI toggle button
      if (this.modelHolders[objectId]) {
        this.modelHolders[objectId].visible = true;
        const btn = document.querySelector(`.btn-vis-toggle[data-vis-id="${objectId}"]`);
        if (btn) {
          btn.classList.remove('is-off');
          const icon = btn.querySelector('i[data-lucide]');
          if (icon) {
            icon.setAttribute('data-lucide', 'eye');
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
              window.lucide.createIcons();
            }
          }
        }
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

    // If an object was active, center camera on that specific object
    let targetX = -3.0;
    let targetLookY = 1.0;
    let camY = 2.5;
    let camZ = 16.0;

    if (this.activeObjectId) {
      const cfg = this.objectConfigs.find(c => c.id === this.activeObjectId);
      if (cfg && cfg.position) {
        targetX = cfg.position[0];
        targetLookY = (cfg.targetHeight || 1.8) * 0.5;
        camY = Math.max(2.2, targetLookY + 1.0);
        camZ = Math.max(7.0, (cfg.targetHeight || 1.8) * 2.8);
      }
    }

    this.startCameraTransition(
      new THREE.Vector3(targetX, camY, camZ),
      new THREE.Vector3(targetX, targetLookY, 0)
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

    // Shift key enables gradual acceleration (sprint)
    if (this.keys.shift) {
      this.currentSprintSpeed = Math.min(this.maxSprintSpeed, this.currentSprintSpeed + delta * 14.0);
    } else {
      this.currentSprintSpeed = Math.max(this.baseMoveSpeed, this.currentSprintSpeed - delta * 20.0);
    }

    const currentSpeed = this.currentSprintSpeed;

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
      moveVector.normalize().multiplyScalar(currentSpeed * delta);
      this.camera.position.add(moveVector);
    }

    if (this.keys.e) this.camera.position.y += currentSpeed * delta * 0.8;
    if (this.keys.q) this.camera.position.y -= currentSpeed * delta * 0.8;
    this.camera.position.y = Math.max(0.4, Math.min(28.0, this.camera.position.y));
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

    // 3.1 Neighbor Objects Pushing / Shifting Animation
    if (this.isShiftingNeighbors && this.shiftedObjects.length > 0) {
      this.shiftProgress += delta * 1.5;
      const t = Math.min(this.shiftProgress, 1.0);
      const ease = t * t * (3 - 2 * t);

      this.shiftedObjects.forEach(item => {
        const curX = item.startX + (item.targetX - item.startX) * ease;
        item.obj.position.set(curX, item.y, item.z);
      });

      if (t >= 1.0) {
        this.isShiftingNeighbors = false;
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
