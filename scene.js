/**
 * LipoRank High-Fidelity 3D Scene
 * Strictly Ordered Volumetric Lineup:
 * [Fiji Water] -- [Lamborghini] -- [★ SAMPLE Official Tower (Always Present)] -- [Cybertruck] -- [Statue of Liberty] -- [Olympic Pool (Rightmost)]
 * Features:
 * 1. Default all models in solid original textures (Lamborghini not always crystal)
 * 2. Crossfade/smooth transition to Crystal Glass on click, clean revert on switching
 * 3. SAMPLE Official 1m³ Cube Tower (4,820L / 4.82m) is permanent on stage
 * 4. Immersive First-Person Walk-in mode with WASD (move), QE (elevation), and mouse look-around
 * 5. Sunset Golden Hour mode toggle
 */
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { COMPARISON_OBJECTS } from './objects-data.js';

export class LipoRankScene {
  constructor(canvasContainer, options = {}) {
    this.container = canvasContainer;
    this.onVolumeChange = options.onVolumeChange || (() => {});
    this.onObjectChange = options.onObjectChange || (() => {});
    this.onCameraModeChange = options.onCameraModeChange || (() => {});

    this.selectedLiters = options.initialLiters || 4820; // 4,820L (SAMPLE 원장)
    this.activeObjectId = null; // No object is crystal by default!
    this.objectConfigs = COMPARISON_OBJECTS;

    // Camera Modes: 'overview', 'giant', 'walkin'
    this.cameraMode = 'overview';
    this.isSunsetMode = false;

    // 2.8s Golden Time Fluid Fill
    this.fillDuration = 2.8;
    this.fillStartTime = 0;
    this.isFilling = false;
    this.startFillPct = 0;
    this.targetFillPct = 1.0;
    this.currentFillPct = 1.0;

    // Smooth Camera Transition
    this.isTransitioningCamera = false;
    this.camStartPos = new THREE.Vector3();
    this.camTargetPos = new THREE.Vector3(0, 0.58, 8.4);
    this.lookAtStart = new THREE.Vector3();
    this.lookAtTarget = new THREE.Vector3(0, 0.58, 0);
    this.camTransitionProgress = 1.0;

    // First-Person Walk-in Controls (WASD + QE + Mouse Look)
    this.keys = { w: false, a: false, s: false, d: false, q: false, e: false };
    this.moveSpeed = 3.6; // m/s
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

    // Cube Towers (Official SAMPLE tower is permanent)
    this.cubeTowerGroup = new THREE.Group();
    this.privateTowerGroup = new THREE.Group();

    this.init();
    this.initLights();
    this.initStudioFloor();
    this.initMaterials();
    this.loadAllObjects();
    // Build permanent official SAMPLE doctor tower (4,820L)
    this.buildCubeTower(this.selectedLiters, false);
    this.initControls();
    this.initEvents();
    this.animate();
  }

  init() {
    this.scene = new THREE.Scene();
    this.studioBgColor = new THREE.Color(0xfcfdfe);
    this.sunsetBgColor = new THREE.Color(0xffedd5);
    this.scene.background = this.studioBgColor.clone();
    this.scene.fog = new THREE.FogExp2(0xfcfdfe, 0.012);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(26, width / height, 0.1, 140);
    this.camera.position.set(0, 0.58, 8.4);
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
    this.renderer.toneMappingExposure = 1.15;

    this.container.appendChild(this.renderer.domElement);
    this.clock = new THREE.Clock();

    this.scene.add(this.cubeTowerGroup);
    this.scene.add(this.privateTowerGroup);
  }

  initLights() {
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0xf1f5f9, 2.0);
    this.scene.add(this.hemiLight);

    this.mainLight = new THREE.DirectionalLight(0xffffff, 2.5);
    this.mainLight.position.set(7, 14, 9);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.width = 2048;
    this.mainLight.shadow.mapSize.height = 2048;
    this.mainLight.shadow.camera.near = 0.5;
    this.mainLight.shadow.camera.far = 40;
    this.mainLight.shadow.camera.left = -14;
    this.mainLight.shadow.camera.right = 14;
    this.mainLight.shadow.camera.top = 10;
    this.mainLight.shadow.camera.bottom = -4;
    this.mainLight.shadow.bias = -0.0001;
    this.scene.add(this.mainLight);

    this.fillLight = new THREE.DirectionalLight(0xf1f5f9, 1.3);
    this.fillLight.position.set(-8, 7, 5);
    this.scene.add(this.fillLight);

    this.fatGlow = new THREE.PointLight(0xf59e0b, 1.8, 8);
    this.fatGlow.position.set(-1.0, 1.2, -0.8);
    this.scene.add(this.fatGlow);

    this.sunsetRimLight = new THREE.DirectionalLight(0xf97316, 0.0);
    this.sunsetRimLight.position.set(-10, 4, -8);
    this.scene.add(this.sunsetRimLight);
  }

  initStudioFloor() {
    const floorGeo = new THREE.PlaneGeometry(100, 100);
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

    // 1m³ Glass Cube Shell Material
    this.cubeGlassMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xffffff),
      metalness: 0.05,
      roughness: 0.06,
      transmission: 0.96,
      thickness: 0.6,
      ior: 1.52,
      transparent: true,
      opacity: 0.40,
      reflectivity: 0.95,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
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

          const holder = new THREE.Group();
          holder.name = cfg.id;
          holder.userData = { config: cfg };

          // 1. Outer Shell (solid default)
          holder.add(root);

          // 2. Inner Fat Mesh (hidden by default)
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
   * Builds the 1m³ Glass Cube Tower
   * Permanent Official Tower is placed right next to Lamborghini at x = -1.0m
   */
  buildCubeTower(liters, isPrivate = false) {
    const group = isPrivate ? this.privateTowerGroup : this.cubeTowerGroup;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const fullCubes = Math.floor(liters / 1000);
    const remainderLiters = liters % 1000;
    const partialRatio = remainderLiters / 1000;
    const totalCubes = remainderLiters > 0 ? fullCubes + 1 : fullCubes;

    const cubeSize = 0.44;
    const gap = 0.02;
    const stepY = cubeSize + gap;
    // Positioned immediately to the right of Lamborghini (x = -2.3m -> Tower at x = -1.0m)
    const posX = isPrivate ? 1.8 : -1.0;
    const posZ = 0.05;

    for (let i = 0; i < totalCubes; i++) {
      const isTopPartial = (i === fullCubes && partialRatio > 0);
      const fillPct = isTopPartial ? partialRatio : 1.0;
      const cubeY = (i * stepY) + (cubeSize / 2);

      const cubeHolder = new THREE.Group();
      cubeHolder.position.set(posX, cubeY, posZ);

      // Crystal Glass Outer Shell
      const boxGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
      const glassMesh = new THREE.Mesh(boxGeo, this.cubeGlassMaterial);
      glassMesh.castShadow = true;
      glassMesh.receiveShadow = true;
      cubeHolder.add(glassMesh);

      // Edge wireframe
      const wireGeo = new THREE.EdgesGeometry(boxGeo);
      const wireMat = new THREE.LineBasicMaterial({
        color: isPrivate ? 0x60a5fa : 0xfde68a,
        transparent: true,
        opacity: 0.85
      });
      const wireLine = new THREE.LineSegments(wireGeo, wireMat);
      cubeHolder.add(wireLine);

      // Inner Golden Fat Core
      const fatHeight = Math.max(0.02, (cubeSize * 0.94) * fillPct);
      const fatGeo = new THREE.BoxGeometry(cubeSize * 0.92, fatHeight, cubeSize * 0.92);
      const fatMat = new THREE.MeshStandardMaterial({
        color: isPrivate ? 0x38bdf8 : 0xf59e0b,
        emissive: isPrivate ? 0x0284c7 : 0xb45309,
        emissiveIntensity: 0.48,
        roughness: 0.22,
        metalness: 0.08
      });
      const fatMesh = new THREE.Mesh(fatGeo, fatMat);
      fatMesh.position.y = - (cubeSize * 0.94 / 2) + (fatHeight / 2);
      cubeHolder.add(fatMesh);

      group.add(cubeHolder);
    }

    const topHeight = (totalCubes * stepY);
    this.createTowerTopMarker(group, posX, topHeight, liters, isPrivate);
  }

  createTowerTopMarker(group, posX, topHeight, liters, isPrivate) {
    const markerGroup = new THREE.Group();
    markerGroup.position.set(posX, topHeight + 0.12, 0.05);

    const pinGeo = new THREE.OctahedronGeometry(0.08, 0);
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
   * Set Active Object: cleanly transitions previous object back to solid,
   * and turns target object into crystal glass with 2.8s golden fluid fill.
   */
  setActiveObject(objectId) {
    if (this.activeObjectId && this.activeObjectId !== objectId) {
      this.revertToSolid(this.activeObjectId);
    }

    this.activeObjectId = objectId;
    if (objectId) {
      this.applyGlassFill(objectId, this.selectedLiters);
    }
    this.onObjectChange(objectId);
  }

  applyGlassFill(objectId, liters) {
    const root = this.models[objectId];
    const fatMesh = this.fatMeshes[objectId];
    const cfg = this.objectConfigs.find(c => c.id === objectId);

    if (!root || !fatMesh || !cfg) return;

    // Convert outer shell meshes to transparent crystal glass
    root.traverse(c => {
      if (c.isMesh) {
        c.material = this.glassMaterial;
      }
    });

    // Reveal inner fat
    fatMesh.visible = true;

    // Trigger 2.8s smooth fluid rising
    const ratio = liters / cfg.volumeLiters;
    this.targetFillPct = Math.min(Math.max(ratio, 0.05), 1.0);
    this.startFillPct = 0.05;
    this.fillStartTime = this.clock.getElapsedTime();
    this.isFilling = true;

    if (this.fatGlow) {
      this.fatGlow.position.set(cfg.position[0], 0.7, cfg.position[2] - 0.8);
    }
  }

  revertToSolid(objectId) {
    const root = this.models[objectId];
    const fatMesh = this.fatMeshes[objectId];

    if (!root) return;

    // Smoothly restore original solid materials
    root.traverse(c => {
      if (c.isMesh && this.originalMaterials.has(c)) {
        c.material = this.originalMaterials.get(c);
      }
    });

    if (fatMesh) {
      fatMesh.visible = false;
    }
  }

  setVolume(liters) {
    this.selectedLiters = liters;
    // Rebuild SAMPLE official tower with new volume
    this.buildCubeTower(liters, false);

    if (this.activeObjectId) {
      this.applyGlassFill(this.activeObjectId, liters);
    }

    this.onVolumeChange(liters);
  }

  /**
   * Giant Hero View
   */
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
      new THREE.Vector3(0, 0.58, 8.4),
      new THREE.Vector3(0, 0.58, 0)
    );
    this.onCameraModeChange('overview', null);
  }

  /**
   * First-Person Walk-in Mode (admerest style WASD + QE exploration)
   */
  enterFirstPersonMode() {
    this.cameraMode = 'walkin';
    this.controls.enabled = false; // Disable OrbitControls during walk-in

    // Start near floor level at eye-height (y = 1.3m, z = 3.2m)
    this.startCameraTransition(
      new THREE.Vector3(0, 1.3, 3.2),
      new THREE.Vector3(0, 1.2, 0)
    );

    this.cameraEuler.set(0, 0, 0, 'YXZ');
    this.onCameraModeChange('walkin', null);
  }

  exitFirstPersonMode() {
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
      this.mainLight.intensity = 2.5;
      this.sunsetRimLight.intensity = 0.0;
      this.fatGlow.intensity = 1.8;
    }

    return this.isSunsetMode;
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1.0;
    this.controls.maxDistance = 18.0;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.01;
    this.controls.minPolarAngle = Math.PI / 2.25;
    this.controls.target.set(0, 0.58, 0);
  }

  initEvents() {
    window.addEventListener('resize', () => this.onWindowResize());

    // WASD & QE Keyboard navigation in Walk-in mode
    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (this.keys.hasOwnProperty(k)) {
        this.keys[k] = true;
      }
      if (e.key === 'Escape') {
        if (this.cameraMode !== 'overview') {
          this.exitFirstPersonMode();
        }
      }
    });

    window.addEventListener('keyup', e => {
      const k = e.key.toLowerCase();
      if (this.keys.hasOwnProperty(k)) {
        this.keys[k] = false;
      }
    });

    // Mouse Drag Look-around in Walk-in mode
    this.container.addEventListener('mousedown', e => {
      this.isMouseDown = true;
      this.prevMousePos.x = e.clientX;
      this.prevMousePos.y = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    window.addEventListener('mousemove', e => {
      if (!this.isMouseDown || this.cameraMode !== 'walkin') return;
      const deltaX = e.clientX - this.prevMousePos.x;
      const deltaY = e.clientY - this.prevMousePos.y;
      this.prevMousePos.x = e.clientX;
      this.prevMousePos.y = e.clientY;

      this.cameraEuler.y -= deltaX * 0.003;
      this.cameraEuler.x -= deltaY * 0.003;
      // Clamp vertical pitch [-80 deg, 80 deg]
      this.cameraEuler.x = Math.max(-1.4, Math.min(1.4, this.cameraEuler.x));
      this.camera.quaternion.setFromEuler(this.cameraEuler);
    });

    // Click 3D models to trigger Giant View & Crystal Fill
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    this.container.addEventListener('click', e => {
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
    forward.y = 0; // lock to horizontal plane
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

    // Height control via Q (down) / E (up)
    if (this.keys.e) {
      this.camera.position.y += this.moveSpeed * delta * 0.8;
    }
    if (this.keys.q) {
      this.camera.position.y -= this.moveSpeed * delta * 0.8;
    }
    // Floor boundary constraint
    this.camera.position.y = Math.max(0.4, Math.min(16.0, this.camera.position.y));
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // 1. First-Person Walk-in movement
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

    // 3. 2.8s Fluid Fill Animation (Cubic Ease-Out)
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
