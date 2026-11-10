/**
 * LipoRank Main Application Controller
 * Handles SPA navigation, Real-World Physical Scale 3D Scene,
 * Front-Stage Preview Tower, Animated Slide Registration, and Audit Verification Flow
 */
import * as THREE from 'three';
import { LipoRankScene } from './scene.js';
import { getDoctors, getMyPendingTower, submitDoctorApplication, getCurrentUser, setCurrentUser, saveMyTower } from './ranking-store.js';
import { COMPARISON_OBJECTS } from './objects-data.js';

class LipoRankApp {
  constructor() {
    this.currentLiters = 4820; // Default: SAMPLE 원장 4,820L
    this.activeDoctor = getDoctors()[0];
    this.doctors = getDoctors();
    this.myPendingTower = getMyPendingTower();
    this.currentUser = getCurrentUser();
    this.onlyVerifiedFilter = false;

    this.initElements();
    this.initNavigation();
    this.init3DScene();
    this.initUIEvents();
    this.renderLeaderboards();
    this.renderMyRegisteredBanner();
    this.updateAuthButtonUI();
    this.updateAllTexts(this.currentLiters, this.scene.activeObjectId);
    this.refreshIcons();
  }

  refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  initElements() {
    this.canvasContainer = document.getElementById('canvas-container');
    this.volSlider = document.getElementById('vol-slider');
    this.currentVolText = document.getElementById('current-vol-text');
    this.cubeCountBadge = document.getElementById('cube-count-badge');
    this.centerHighlightAmount = document.getElementById('center-highlight-amount');
    this.centerHighlightRatio = document.getElementById('center-highlight-ratio');
    this.presetChips = document.querySelectorAll('.chip');
    
    // Bottom Register Button
    this.btnRegisterRankBottom = document.getElementById('btn-register-rank-bottom');
    this.registerModal = document.getElementById('register-modal');
    this.modalClose = document.getElementById('modal-close');
    this.registerForm = document.getElementById('register-form');
    this.homeDoctorsTableBody = document.getElementById('home-doctors-table-body');
    this.fullDoctorsTableBody = document.getElementById('full-doctors-table-body');

    // Controls: Sunset, Walk-in HUD
    this.btnToggleSunset = document.getElementById('btn-toggle-sunset');
    this.sunsetBtnText = document.getElementById('sunset-btn-text');
    this.btnToggleGiant = document.getElementById('btn-toggle-giant');
    this.giantBtnText = document.getElementById('giant-btn-text');
    this.walkinHud = document.getElementById('walkin-hud');
    this.btnExitWalkin = document.getElementById('btn-exit-walkin');

    this.giantViewCard = document.getElementById('giant-view-card');
    this.giantObjName = document.getElementById('giant-obj-name');
    this.giantDetailText = document.getElementById('giant-detail-text');
    this.btnExitGiant = document.getElementById('btn-exit-giant');
    this.labelsOverlay = document.getElementById('labels-overlay');

    // Viral flex banner
    this.flexDocName = document.getElementById('flex-doc-name');
    this.flexLitersVal = document.getElementById('flex-liters-val');
    this.flexComparisonText = document.getElementById('flex-comparison-text');
    this.fatWeightText = document.getElementById('fat-weight-text');
    this.fatCalText = document.getElementById('fat-cal-text');

    // Carousel buttons & object tabs
    this.btnPrev = document.getElementById('carousel-prev');
    this.btnNext = document.getElementById('carousel-next');
    this.objectTabs = document.querySelectorAll('.object-label-tab, .center-highlight-box');

    // Registered Banner Elements & Verify CTA
    this.myRegisteredBanner = document.getElementById('my-registered-banner');
    this.myRegisteredName = document.getElementById('my-registered-name');
    this.myRegisteredClinic = document.getElementById('my-registered-clinic');
    this.myRegisteredLiters = document.getElementById('my-registered-liters');
    this.btnRequestVerify = document.getElementById('btn-request-verify');
    this.auditStatusTag = document.getElementById('audit-status-tag');
    this.privateTowerPill = document.getElementById('private-tower-pill');
    this.btnPillVerify = document.getElementById('btn-pill-verify');

    // Modals: Login & Edit Profile
    this.btnAuth = document.querySelector('.btn-auth');
    this.loginModal = document.getElementById('login-modal');
    this.loginModalClose = document.getElementById('login-modal-close');
    this.loginForm = document.getElementById('login-form');

    this.editProfileModal = document.getElementById('edit-profile-modal');
    this.editProfileClose = document.getElementById('edit-profile-close');
    this.editProfileForm = document.getElementById('edit-profile-form');

    // Verified Doctor Only Toggles
    this.chkVdrHome = document.getElementById('chk-verified-only-home');
    this.chkVdrFull = document.getElementById('chk-verified-only-full');
  }

  initNavigation() {
    this.navLinks = document.querySelectorAll('.header-nav .nav-link, .header-logo, .link-more-ranking');
    this.tabViews = document.querySelectorAll('.tab-view');

    const switchTab = (targetId) => {
      document.querySelectorAll('.header-nav .nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.nav === targetId);
      });

      this.tabViews.forEach(view => {
        view.classList.toggle('active', view.id === `view-${targetId}`);
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.refreshIcons();

      if (targetId === 'home' && this.scene) {
        setTimeout(() => this.scene.onWindowResize(), 50);
      }
    };

    this.navLinks.forEach(link => {
      link.addEventListener('click', e => {
        const target = link.dataset.nav;
        if (target) {
          e.preventDefault();
          switchTab(target);
          history.pushState(null, '', `#${target}`);
        }
      });
    });

    window.addEventListener('popstate', () => {
      const hash = window.location.hash.replace('#', '') || 'home';
      switchTab(hash);
    });

    if (window.location.hash) {
      const hash = window.location.hash.replace('#', '');
      switchTab(hash);
    }
  }

  init3DScene() {
    if (!this.canvasContainer) return;

    this.scene = new LipoRankScene(this.canvasContainer, {
      initialLiters: this.currentLiters,
      onVolumeChange: (liters) => {
        this.currentLiters = liters;
        if (this.volSlider) this.volSlider.value = liters;
        this.updateAllTexts(liters, this.scene.activeObjectId);
      },
      onObjectChange: (objectId) => {
        this.updateAllTexts(this.currentLiters, objectId);
        this.updateObjectTabs(objectId);
      },
      onCameraModeChange: (mode, cfg) => {
        this.handleCameraModeUI(mode, cfg);
      }
    });

    // If user has a verified tower, display it on 3D canvas
    if (this.myPendingTower && this.myPendingTower.status === 'verified') {
      this.scene.confirmAndRegisterMyTower(this.myPendingTower);
    }
  }

  updateAuthButtonUI() {
    if (!this.btnAuth) return;
    if (this.currentUser) {
      this.btnAuth.innerHTML = `<i data-lucide="user" class="icon-xs"></i> <span>${this.currentUser.name} (로그아웃)</span>`;
      this.btnAuth.title = '클릭 시 로그아웃';
    } else {
      this.btnAuth.innerHTML = `로그인 / 회원가입`;
      this.btnAuth.title = '의사 회원 로그인';
    }
    this.refreshIcons();
  }

  initUIEvents() {
    // 1. Slider change (Volume & Spawns Front-Stage Preview Tower)
    if (this.volSlider) {
      this.volSlider.addEventListener('input', e => {
        const liters = Number(e.target.value);
        this.currentLiters = liters;
        this.scene.setVolume(liters);
      });
    }

    // 2. Preset chips
    this.presetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.presetChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const liters = Number(chip.dataset.liters);
        this.currentLiters = liters;
        if (this.volSlider) this.volSlider.value = liters;
        this.scene.setVolume(liters);
      });
    });

    // 3. Carousel Navigation (< and >): Scroll ribbon by 1 item without moving 3D camera
    if (this.btnPrev) {
      this.btnPrev.addEventListener('click', () => {
        if (!this.labelsOverlay) return;
        const itemWidth = this.labelsOverlay.clientWidth / 5;
        this.labelsOverlay.scrollBy({ left: -itemWidth, behavior: 'smooth' });
      });
    }
    if (this.btnNext) {
      this.btnNext.addEventListener('click', () => {
        if (!this.labelsOverlay) return;
        const itemWidth = this.labelsOverlay.clientWidth / 5;
        this.labelsOverlay.scrollBy({ left: itemWidth, behavior: 'smooth' });
      });
    }

    // Realtime Standardizer Part Selector change listener
    const selPart = document.getElementById('sel-surgery-part');
    if (selPart) {
      selPart.addEventListener('change', () => {
        this.updateAllTexts(this.currentLiters, this.scene.activeObjectId);
      });
    }

    // 4. Object Tab Clicks & Visibility Toggles
    this.objectTabs = document.querySelectorAll('.object-label-tab');
    this.objectTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        if (e.target.closest('.btn-vis-toggle')) return;

        const objId = tab.dataset.objectId;
        if (!objId) return;

        // A. Verified Doctor Tower Clicked: Focus & Trigger Yellow Comparison Fill!
        if (objId.startsWith('doc-adm-') || objId === 'sample_tower' || objId === 'official_tower') {
          const docId = (objId === 'sample_tower' || objId === 'official_tower') ? 'doc-adm-01' : objId;
          const docEntry = this.scene.doctorTowerGroups ? this.scene.doctorTowerGroups[docId] : null;
          const targetX = docEntry ? docEntry.posX : -8.5;
          const docLiters = docEntry ? docEntry.data.liters : 4820;
          const cubes = Math.max(1, Math.ceil(docLiters / 1000));
          const camY = Math.max(2.2, cubes * 0.55 + 0.6);
          const camZ = Math.max(5.5, 3.5 + cubes * 0.4);

          // Trigger Yellow Comparison Fill inside this blue tower!
          this.scene.setDoctorTowerComparison(docId, this.currentLiters);

          this.scene.startCameraTransition(
            new THREE.Vector3(targetX, camY, camZ),
            new THREE.Vector3(targetX, cubes * 0.5, 0.0)
          );
          this.updateObjectTabs(objId);
          return;
        }

        // B. My Tower Clicked
        if (objId === 'my_tower') {
          this.scene.clearDoctorTowerComparison();
          const targetX = this.scene.slideTargetPos ? this.scene.slideTargetPos.x : 0;
          const cubes = Math.max(1, Math.ceil(this.currentLiters / 1000));
          this.scene.startCameraTransition(
            new THREE.Vector3(targetX, Math.max(2.2, cubes * 0.55 + 0.6), Math.max(5.5, 3.5 + cubes * 0.4)),
            new THREE.Vector3(targetX, cubes * 0.5, 0.0)
          );
          this.updateObjectTabs(objId);
          return;
        }

        // C. Standard Comparison Object Clicked
        this.scene.clearDoctorTowerComparison();
        this.scene.enterGiantView(objId);
        this.updateObjectTabs(objId);
      });
    });

    // Visibility toggle eye buttons
    document.querySelectorAll('.btn-vis-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const objId = btn.dataset.visId;
        if (!objId || !this.scene) return;

        const isVisible = this.scene.toggleObjectVisibility(objId);
        btn.classList.toggle('is-off', !isVisible);
        btn.title = isVisible ? '가시성 끄기 (현재 켜짐)' : '가시성 켜기 (현재 숨김)';
        this.refreshIcons();
      });
    });

    // 5. Sunset Mode Toggle
    if (this.btnToggleSunset) {
      this.btnToggleSunset.addEventListener('click', () => {
        const isSunset = this.scene.toggleSunsetMode();
        this.btnToggleSunset.classList.toggle('active-sunset', isSunset);
        if (this.sunsetBtnText) {
          this.sunsetBtnText.textContent = isSunset ? '스튜디오 모드' : '노을 모드';
        }
        this.refreshIcons();
      });
    }

    // 6. 3D Walk-in Direct Enter / Exit Buttons
    if (this.btnToggleGiant) {
      this.btnToggleGiant.addEventListener('click', () => {
        if (this.scene.cameraMode === 'walkin') {
          this.scene.exitFirstPersonMode();
        } else {
          this.scene.enterFirstPersonMode();
        }
      });
    }

    if (this.btnExitWalkin) {
      this.btnExitWalkin.addEventListener('click', () => {
        this.scene.exitFirstPersonMode();
      });
    }

    if (this.btnExitGiant) {
      this.btnExitGiant.addEventListener('click', () => {
        this.scene.exitGiantView();
      });
    }

    // 7. Instant Register to Ranking Table (Bottom Button)
    if (this.btnRegisterRankBottom) {
      this.btnRegisterRankBottom.addEventListener('click', () => {
        const liters = this.currentLiters;
        const currentData = {
          name: this.currentUser ? this.currentUser.name : (this.myPendingTower ? this.myPendingTower.name : '내 원장'),
          licenseNo: this.myPendingTower ? this.myPendingTower.licenseNo : '제65219호',
          clinic: this.myPendingTower ? this.myPendingTower.clinic : '미인증 의원',
          totalLiters: liters,
          cases: Math.round(liters / 2.5),
          crmSystem: '미연동',
          contact: ''
        };

        const registered = submitDoctorApplication(currentData);
        this.myPendingTower = registered;

        // Slide tower into the lineup & push neighbors apart dynamically!
        this.scene.confirmAndRegisterMyTower(registered);

        // Re-render leaderboards & show registered banner
        this.renderLeaderboards();
        this.renderMyRegisteredBanner();
        this.showRegistrationNotice(liters);
      });
    }

    // Verification request modal open
    const openVerifyModal = () => {
      if (this.registerModal) {
        const litersInput = document.getElementById('reg-liters');
        if (litersInput) litersInput.value = this.myPendingTower ? this.myPendingTower.totalLiters : this.currentLiters;
        this.registerModal.classList.add('active');
        this.refreshIcons();
      }
    };
    const closeVerifyModal = () => {
      if (this.registerModal) this.registerModal.classList.remove('active');
    };

    if (this.modalClose) this.modalClose.addEventListener('click', closeVerifyModal);
    if (this.registerModal) {
      this.registerModal.addEventListener('click', e => {
        if (e.target === this.registerModal) closeVerifyModal();
      });
    }

    if (this.btnPillVerify) {
      this.btnPillVerify.addEventListener('click', () => {
        this.triggerAdminVerification();
      });
    }

    if (this.btnRequestVerify) {
      this.btnRequestVerify.addEventListener('click', () => {
        this.triggerAdminVerification();
      });
    }

    // Form submit: Verification Application
    if (this.registerForm) {
      this.registerForm.addEventListener('submit', e => {
        e.preventDefault();
        const formData = {
          name: document.getElementById('reg-name').value,
          licenseNo: document.getElementById('reg-license').value,
          clinic: document.getElementById('reg-clinic').value,
          liters: Number(document.getElementById('reg-liters').value),
          cases: Number(document.getElementById('reg-cases').value),
          crmSystem: document.getElementById('reg-crm').value,
          contact: document.getElementById('reg-contact').value,
          status: "verified" // Verified!
        };

        const registered = submitDoctorApplication(formData);
        this.myPendingTower = registered;

        // Now certified! Place tower into 3D lineup!
        this.scene.confirmAndRegisterMyTower(registered);
        this.renderLeaderboards();
        this.renderMyRegisteredBanner();

        alert(`[${formData.name}] 원장님의 EMR 전산 공인 인증이 완료되었습니다!\n\n전세계 공식 랭킹 리더보드에 [공인 인증 딱지]가 부여되었으며, 3D 캔버스 월드에 원장님의 크리스탈 큐브 탑이 정식 등재되었습니다.`);
        closeVerifyModal();
        this.registerForm.reset();
      });
    }

    // 8. Login & Auth Event Handlers
    if (this.btnAuth) {
      this.btnAuth.addEventListener('click', () => {
        if (this.currentUser) {
          if (confirm('로그아웃 하시겠습니까?')) {
            setCurrentUser(null);
            this.currentUser = null;
            this.updateAuthButtonUI();
            this.renderLeaderboards();
          }
        } else {
          this.openLoginModal();
        }
      });
    }

    if (this.loginModalClose) {
      this.loginModalClose.addEventListener('click', () => this.closeLoginModal());
    }
    if (this.loginModal) {
      this.loginModal.addEventListener('click', (e) => {
        if (e.target === this.loginModal) this.closeLoginModal();
      });
    }

    if (this.loginForm) {
      this.loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('login-id').value;
        const loggedUser = { id, name: id === 'doctor_kim' ? '김민우 원장' : id };
        setCurrentUser(loggedUser);
        this.currentUser = loggedUser;
        this.updateAuthButtonUI();
        this.closeLoginModal();
        this.renderLeaderboards();

        // Prompt edit profile modal
        setTimeout(() => {
          this.openEditProfileModal();
        }, 300);
      });
    }

    // Edit Profile Modal
    if (this.editProfileClose) {
      this.editProfileClose.addEventListener('click', () => this.closeEditProfileModal());
    }
    if (this.editProfileModal) {
      this.editProfileModal.addEventListener('click', (e) => {
        if (e.target === this.editProfileModal) this.closeEditProfileModal();
      });
    }

    if (this.editProfileForm) {
      this.editProfileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('edit-doc-name').value;
        const clinic = document.getElementById('edit-doc-clinic').value;
        const licenseNo = document.getElementById('edit-doc-license').value;
        const specialty = document.getElementById('edit-doc-specialty').value;

        if (this.myPendingTower) {
          this.myPendingTower.name = name;
          this.myPendingTower.clinic = clinic;
          this.myPendingTower.licenseNo = licenseNo;
          this.myPendingTower.specialty = specialty;
          saveMyTower(this.myPendingTower);
        }

        this.closeEditProfileModal();
        this.renderLeaderboards();
        this.renderMyRegisteredBanner();
        alert('집도의 정보가 성공적으로 수정되었습니다.');
      });
    }

    // 9. Verified Only Toggles
    const handleToggleVerified = (checked) => {
      this.onlyVerifiedFilter = checked;
      if (this.chkVdrHome) this.chkVdrHome.checked = checked;
      if (this.chkVdrFull) this.chkVdrFull.checked = checked;
      this.renderLeaderboards();
    };

    if (this.chkVdrHome) {
      this.chkVdrHome.addEventListener('change', e => handleToggleVerified(e.target.checked));
    }
    if (this.chkVdrFull) {
      this.chkVdrFull.addEventListener('change', e => handleToggleVerified(e.target.checked));
    }
  }

  triggerAdminVerification() {
    if (!this.myPendingTower) return;
    const isNowVerified = confirm(
      `[공인 EMR 인증 심사]\n\n원장님(${this.myPendingTower.name})의 의사면허 및 EMR 수술대장 공증 검증을 진행하시겠습니까?\n\n'확인'을 누르면 즉시 관리자 공인 인증이 완료되어 3D 캔버스에 탑이 영구 등재되고 랭크표에 공인 인증 딱지가 부여됩니다.`
    );
    if (isNowVerified) {
      this.myPendingTower.status = 'verified';
      this.myPendingTower.isOfficial = true;
      this.myPendingTower.badge = 'CRM 전산 실시간 연동 공인';
      saveMyTower(this.myPendingTower);

      // Now showcase in 3D scene!
      this.scene.confirmAndRegisterMyTower(this.myPendingTower);
      this.renderLeaderboards();
      this.renderMyRegisteredBanner();

      alert(`축하합니다! 원장님의 EMR 공인 인증이 완료되었습니다.\n3D 캔버스 뷰포트에 내 탑이 노출되며, 랭크표에 공식 인증 딱지가 부착되었습니다.`);
    }
  }

  openLoginModal() {
    if (this.loginModal) {
      this.loginModal.classList.add('active');
      this.refreshIcons();
    }
  }

  closeLoginModal() {
    if (this.loginModal) this.loginModal.classList.remove('active');
  }

  openEditProfileModal() {
    if (!this.currentUser) {
      this.openLoginModal();
      return;
    }
    if (this.editProfileModal) {
      const nameInput = document.getElementById('edit-doc-name');
      const clinicInput = document.getElementById('edit-doc-clinic');
      const licInput = document.getElementById('edit-doc-license');
      const specInput = document.getElementById('edit-doc-specialty');
      const statusBadge = document.getElementById('edit-status-badge');

      if (this.myPendingTower) {
        if (nameInput) nameInput.value = this.myPendingTower.name || '';
        if (clinicInput) clinicInput.value = this.myPendingTower.clinic || '';
        if (licInput) licInput.value = this.myPendingTower.licenseNo || '';
        if (specInput) specInput.value = this.myPendingTower.specialty || '';
        if (statusBadge) {
          statusBadge.textContent = this.myPendingTower.status === 'verified' ? '✓ 공인 인증 완료' : '공인 인증 대기중';
          statusBadge.style.background = this.myPendingTower.status === 'verified' ? '#ecfdf5' : '#fef3c7';
          statusBadge.style.color = this.myPendingTower.status === 'verified' ? '#047857' : '#b45309';
        }
      }

      this.editProfileModal.classList.add('active');
      this.refreshIcons();
    }
  }

  closeEditProfileModal() {
    if (this.editProfileModal) this.editProfileModal.classList.remove('active');
  }

  handleCameraModeUI(mode, cfg) {
    const isGiant = (mode === 'giant');
    const isWalkin = (mode === 'walkin');

    if (this.giantViewCard) {
      this.giantViewCard.classList.toggle('active', isGiant);
    }
    if (this.walkinHud) {
      this.walkinHud.classList.toggle('active', isWalkin);
    }

    if (this.labelsOverlay) {
      this.labelsOverlay.style.display = isWalkin ? 'none' : 'flex';
    }

    if (isGiant && cfg) {
      this.updateGiantCard(cfg.id);
    }
  }

  updateGiantCard(objectId) {
    const cfg = COMPARISON_OBJECTS.find(c => c.id === objectId);
    if (!cfg) return;

    if (this.giantObjName) {
      this.giantObjName.textContent = `${cfg.name} (${cfg.volumeMlText || cfg.volumeLiters + 'L'})`;
    }
    if (this.giantDetailText && cfg.getGiantDetail) {
      this.giantDetailText.innerHTML = cfg.getGiantDetail(this.currentLiters);
    }
    this.refreshIcons();
  }

  updateObjectTabs(activeId) {
    this.objectTabs.forEach(tab => {
      const isSelected = (tab.dataset.objectId === activeId);
      tab.classList.toggle('active', isSelected);
      if (isSelected && this.labelsOverlay) {
        const ribbonWidth = this.labelsOverlay.clientWidth;
        const tabLeft = tab.offsetLeft;
        const tabWidth = tab.offsetWidth;
        const targetScrollLeft = tabLeft - (ribbonWidth / 2) + (tabWidth / 2);
        this.labelsOverlay.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
      }
    });
  }

  updateAllTexts(liters, objectId) {
    const formattedL = liters.toLocaleString('ko-KR');
    const cubeCount = (liters / 1000).toFixed(2);
    const heightM = (cubeCount * 1.02).toFixed(2);

    if (this.currentVolText) {
      this.currentVolText.textContent = `${formattedL} L`;
    }
    if (this.cubeCountBadge) {
      this.cubeCountBadge.textContent = `${cubeCount} 개 (${formattedL}L = ${cubeCount}m³)`;
    }
    if (this.centerHighlightAmount) {
      this.centerHighlightAmount.textContent = `${formattedL}L`;
    }
    if (this.flexLitersVal) {
      this.flexLitersVal.textContent = `${formattedL}L`;
    }

    const kg = Math.round(liters * 0.9);
    const kcal = Math.round(liters * 0.9 * 9000);
    if (this.fatWeightText) {
      this.fatWeightText.textContent = `약 ${kg.toLocaleString()} kg`;
    }
    if (this.fatCalText) {
      this.fatCalText.textContent = `약 ${kcal.toLocaleString()} kcal`;
    }

    const selPart = document.getElementById('sel-surgery-part');
    const stdPerCase = selPart ? parseFloat(selPart.value) || 3.0 : 3.0;
    const stdPartName = selPart ? selPart.options[selPart.selectedIndex].text.split('(')[0].trim() : '복부 360도 대용량';
    const equivCount = Math.round(liters / stdPerCase);

    const equivText = document.getElementById('clinical-equiv-text');
    if (equivText) {
      equivText.innerHTML = `선택 부위 표준: <strong>${equivCount.toLocaleString()}회 집도</strong> (총 ${formattedL}L)`;
    }

    const partSummary = document.getElementById('part-summary-formula');
    if (partSummary) {
      partSummary.innerHTML = `표준화 환산: 총 흡입량 ${formattedL}L ÷ 1회 표준 ${stdPerCase.toFixed(1)}L (${stdPartName}) = <strong>총 ${equivCount.toLocaleString()}회 집도 실적</strong>`;
    }

    const thighEl = document.getElementById('thigh-count-text');
    if (thighEl) thighEl.textContent = `${Math.round(liters / 2.5).toLocaleString()}회`;
    const armEl = document.getElementById('arm-count-text');
    if (armEl) armEl.textContent = `${Math.round(liters / 1.0).toLocaleString()}회`;
    const chinEl = document.getElementById('chin-count-text');
    if (chinEl) chinEl.textContent = `${Math.round(liters / 0.1).toLocaleString()}회`;

    if (this.centerHighlightRatio) {
      this.centerHighlightRatio.textContent = `4.82m 높이 돌파`;
    }

    if (this.flexComparisonText) {
      const cfg = COMPARISON_OBJECTS.find(c => c.id === objectId) || COMPARISON_OBJECTS[2];
      let customMsg = `<strong>1m³(1,000L) 글래스 큐브 ${cubeCount}개 (높이 ${heightM}m)</strong> 및 <strong>${cfg.name}</strong> 완판 체적입니다!`;
      if (objectId === 'lamborghini') {
        const pct = ((liters / 4700) * 100).toFixed(1);
        customMsg = `<strong>1m³ 큐브 ${cubeCount}개 (높이 ${heightM}m)</strong> 및 <strong>람보르기니 우라칸 1대(${pct}%)</strong>를 순수 지방으로 완판한 대기록입니다!`;
      } else if (objectId === 'cybertruck') {
        const pct = ((liters / 7100) * 100).toFixed(1);
        customMsg = `<strong>1m³ 큐브 ${cubeCount}개</strong> 및 <strong>테슬라 사이버트럭의 ${pct}%</strong>를 황금빛 순수 지방으로 가득 채운 체적입니다!`;
      } else if (objectId === 'fiji_bottle') {
        const bottles = Math.round(liters / 0.5);
        customMsg = `<strong>1m³ 큐브 ${cubeCount}개</strong> 및 500ml 생수병 <strong>${bottles.toLocaleString()}개</strong>를 가득 채운 양입니다!`;
      } else if (objectId === 'cow') {
        const cows = (liters / 300).toFixed(1);
        customMsg = `<strong>1m³ 큐브 ${cubeCount}개</strong> 및 성체 젖소 <strong>${cows}마리</strong>의 체지방량입니다!`;
      }
      this.flexComparisonText.innerHTML = customMsg;
    }

    if (this.scene && this.scene.cameraMode === 'giant') {
      this.updateGiantCard(objectId);
    }
  }

  showRegistrationNotice(liters) {
    const toast = document.createElement('div');
    toast.className = 'reg-success-toast';
    toast.innerHTML = `
      <div class="toast-icon"><i data-lucide="check-circle" class="icon-md"></i></div>
      <div class="toast-body">
        <strong>랭크 표에 내 수술량(${liters.toLocaleString()}L)이 등록되었습니다!</strong>
        <p>현재 상태는 <em>[공인 심사 대기]</em> 모드입니다. 관리자 EMR 실사 인증을 완료하면 3D 캔버스에 내 탑이 노출되고 공식 인증 마크가 부여됩니다.</p>
      </div>
      <button class="toast-btn-action" id="toast-verify-btn">인증 받기</button>
    `;
    document.body.appendChild(toast);
    this.refreshIcons();

    const verifyBtn = toast.querySelector('#toast-verify-btn');
    if (verifyBtn) {
      verifyBtn.addEventListener('click', () => {
        toast.remove();
        this.triggerAdminVerification();
      });
    }

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%, 20px)';
      setTimeout(() => toast.remove(), 400);
    }, 6000);
  }

  renderMyRegisteredBanner() {
    const myTab = document.getElementById('tab-my-tower');
    const myTabVol = document.getElementById('tab-my-tower-vol');

    if (this.myPendingTower) {
      if (myTab) {
        myTab.style.display = 'flex';
        if (myTabVol) {
          const l = this.myPendingTower.totalLiters || 0;
          const h = ((l / 1000) * 1.02).toFixed(2);
          myTabVol.textContent = `${l.toLocaleString()}L · ${h}m`;
        }
      }
      if (this.myRegisteredBanner) {
        this.myRegisteredBanner.style.display = 'flex';
        if (this.myRegisteredName) this.myRegisteredName.textContent = this.myPendingTower.name;
        if (this.myRegisteredClinic) this.myRegisteredClinic.textContent = this.myPendingTower.clinic;
        if (this.myRegisteredLiters) this.myRegisteredLiters.textContent = `${this.myPendingTower.totalLiters.toLocaleString()} L`;

        if (this.auditStatusTag) {
          if (this.myPendingTower.status === 'verified') {
            this.auditStatusTag.textContent = '✓ 공인 EMR 인증 완료 (전세계 공개)';
            this.auditStatusTag.style.background = '#ecfdf5';
            this.auditStatusTag.style.color = '#047857';
          } else {
            this.auditStatusTag.textContent = '공인 인증 대기중 (나만 보기 모드)';
            this.auditStatusTag.style.background = '#fef3c7';
            this.auditStatusTag.style.color = '#b45309';
          }
        }
      }
      if (this.privateTowerPill) {
        if (this.myPendingTower.status === 'verified') {
          this.privateTowerPill.style.display = 'inline-flex';
          this.privateTowerPill.innerHTML = `
            <span class="pill-lock-icon" style="color:#10b981;"><i data-lucide="check-circle-2" class="icon-xs"></i></span>
            <span class="pill-text">내 탑 등재 완료 (<strong>공식 인증됨</strong>)</span>
          `;
        } else {
          this.privateTowerPill.style.display = 'inline-flex';
          this.privateTowerPill.innerHTML = `
            <span class="pill-lock-icon"><i data-lucide="lock" class="icon-xs"></i></span>
            <span class="pill-text">내 탑 등록됨 (<strong>나만 보기</strong>)</span>
            <button id="btn-pill-verify" class="pill-verify-btn">
              <i data-lucide="shield-check" class="icon-xs"></i>
              <span>공인 인증받고 전세계 공개</span>
            </button>
          `;
          const pBtn = this.privateTowerPill.querySelector('#btn-pill-verify');
          if (pBtn) pBtn.addEventListener('click', () => this.triggerAdminVerification());
        }
      }
    } else {
      if (this.myRegisteredBanner) this.myRegisteredBanner.style.display = 'none';
      if (this.privateTowerPill) {
        this.privateTowerPill.style.display = 'none';
      }
    }
    this.refreshIcons();
  }

  renderLeaderboards() {
    const renderRows = (container) => {
      if (!container) return;
      container.innerHTML = '';

      // Prepare list of doctors (official list + my private registered entry)
      let list = [...this.doctors];

      if (this.myPendingTower) {
        const isVerified = (this.myPendingTower.status === 'verified');
        const myDocItem = {
          id: this.myPendingTower.id,
          rank: '-',
          name: this.myPendingTower.name,
          clinic: this.myPendingTower.clinic,
          licenseNo: this.myPendingTower.licenseNo,
          totalLiters: this.myPendingTower.totalLiters,
          totalCases: this.myPendingTower.totalCases,
          avgCcPerCase: this.myPendingTower.avgCcPerCase || 2400,
          pureFatRatio: 90,
          status: this.myPendingTower.status,
          badge: isVerified ? 'CRM 전산 실시간 연동 공인' : '공인 심사 대기 (나만 보기)',
          avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
          isMyPrivate: !isVerified,
          isMine: true
        };
        list.push(myDocItem);
      }

      // Sort by totalLiters descending
      list.sort((a, b) => b.totalLiters - a.totalLiters);

      // Filter verified only if toggle is on
      if (this.onlyVerifiedFilter) {
        list = list.filter(d => d.status === 'verified');
      }

      // Assign display ranks
      list.forEach((doc, idx) => {
        doc.displayRank = idx + 1;
      });

      list.forEach(doc => {
        const row = document.createElement('tr');
        const isVerified = (doc.status === 'verified');
        if (doc.isMine) row.classList.add('my-rank-row');

        row.innerHTML = `
          <td>
            <div class="rank-badge">${doc.displayRank}</div>
          </td>
          <td>
            <div class="doc-profile-cell">
              <div class="doc-avatar-wrap">
                <img src="${doc.avatar}" class="doc-img" alt="${doc.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(doc.name)}&background=0953ff&color=fff'">
                ${isVerified 
                  ? `<span class="avatar-verified-badge" title="공인 인증 의사"><i data-lucide="check" class="icon-xs"></i></span>`
                  : `<span class="avatar-unverified-badge" title="미인증 대기"><i data-lucide="lock" class="icon-xs"></i></span>`}
              </div>
              <div class="doc-info-text">
                <div class="name">
                  ${doc.name}
                  ${doc.isMine ? `<button class="btn-edit-rank-info" title="집도의 정보 수정"><i data-lucide="edit-2" class="icon-xs"></i> 수정</button>` : ''}
                </div>
                <div class="sub">${doc.clinic} · 의사면허 ${doc.licenseNo}</div>
              </div>
            </div>
          </td>
          <td>
            <strong style="color: #0953ff; font-size: 15px;">${doc.totalLiters.toLocaleString()} L</strong>
            <span style="font-size: 11px; color: #94a3b8; display: block;">수술 ${doc.totalCases.toLocaleString()}건 (1m³ 큐브 ${(doc.totalLiters / 1000).toFixed(2)}개)</span>
          </td>
          <td>
            <strong>${doc.avgCcPerCase.toLocaleString()} cc</strong>
            <span style="font-size: 11px; color: #94a3b8; display: block;">순수지방 ${doc.pureFatRatio}%</span>
          </td>
          <td>
            ${isVerified ? `
              <span class="badge-verified">
                <i data-lucide="shield-check" class="icon-sm"></i>
                <span>${doc.badge}</span>
              </span>
            ` : `
              <span class="badge-tag-pending">
                <i data-lucide="clock" class="icon-xs"></i>
                <span>${doc.badge}</span>
              </span>
              ${doc.isMine ? `<button class="btn-row-verify"><i data-lucide="shield-check" class="icon-xs"></i> 인증받기</button>` : ''}
            `}
          </td>
        `;

        // Edit info button click -> require login or open edit modal
        const editBtn = row.querySelector('.btn-edit-rank-info');
        if (editBtn) {
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!this.currentUser) {
              alert('이름과 병원 정보를 수정하려면 의사 로그인이 필요합니다.');
              this.openLoginModal();
            } else {
              this.openEditProfileModal();
            }
          });
        }

        // Row verify button
        const verifyBtn = row.querySelector('.btn-row-verify');
        if (verifyBtn) {
          verifyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.triggerAdminVerification();
          });
        }

        container.appendChild(row);
      });
    };

    renderRows(this.homeDoctorsTableBody);
    renderRows(this.fullDoctorsTableBody);
    this.refreshIcons();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new LipoRankApp();
});
