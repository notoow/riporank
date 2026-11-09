/**
 * LipoRank Main Application Controller
 * Handles SPA navigation tabs, 3D Scene events, Walk-in WASD controls,
 * 1m³ Cube Tower counts, and private pending application workflow
 */
import { LipoRankScene } from './scene.js';
import { getDoctors, getMyPendingTower, submitDoctorApplication } from './ranking-store.js';
import { COMPARISON_OBJECTS } from './objects-data.js';

class LipoRankApp {
  constructor() {
    this.currentLiters = 4820; // Default: SAMPLE 원장 4,820L
    this.activeDoctor = getDoctors()[0];
    this.doctors = getDoctors();
    this.myPendingTower = getMyPendingTower();

    this.initElements();
    this.initNavigation();
    this.init3DScene();
    this.initUIEvents();
    this.renderLeaderboards();
    this.renderMyPendingBanner();
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
    
    // Bottom Register Button (under 3D Canvas)
    this.btnRegisterRankBottom = document.getElementById('btn-register-rank-bottom');
    this.registerModal = document.getElementById('register-modal');
    this.modalClose = document.getElementById('modal-close');
    this.registerForm = document.getElementById('register-form');
    this.homeDoctorsTableBody = document.getElementById('home-doctors-table-body');
    this.fullDoctorsTableBody = document.getElementById('full-doctors-table-body');

    // Controls: Sunset, Giant View, Walk-in HUD
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

    // Carousel buttons & dots
    this.btnPrev = document.getElementById('carousel-prev');
    this.btnNext = document.getElementById('carousel-next');
    this.dots = document.querySelectorAll('.carousel-dots .dot');
    this.objectTabs = document.querySelectorAll('.object-label-tab, .center-highlight-box');

    // Pending Banner Elements
    this.myPendingBannerHome = document.getElementById('my-pending-banner-home');
    this.myPendingNameHome = document.getElementById('my-pending-name-home');
    this.myPendingClinicHome = document.getElementById('my-pending-clinic-home');
    this.myPendingLitersHome = document.getElementById('my-pending-liters-home');
  }

  initNavigation() {
    this.navLinks = document.querySelectorAll('.header-nav .nav-link, .header-logo, .link-more-ranking');
    this.tabViews = document.querySelectorAll('.tab-view');

    const switchTab = (targetId) => {
      // Update nav link states
      document.querySelectorAll('.header-nav .nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.nav === targetId);
      });

      // Switch views
      this.tabViews.forEach(view => {
        view.classList.toggle('active', view.id === `view-${targetId}`);
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.refreshIcons();

      // Trigger 3D canvas resize when switching back to home
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

    // Handle hash on page load
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '') || 'home';
      switchTab(hash);
    });

    const initialHash = window.location.hash.replace('#', '') || 'home';
    switchTab(initialHash);
  }

  init3DScene() {
    this.scene = new LipoRankScene(this.canvasContainer, {
      initialLiters: this.currentLiters,
      onVolumeChange: liters => {
        this.updateAllTexts(liters, this.scene.activeObjectId);
      },
      onObjectChange: objectId => {
        this.updateObjectTabsAndDots(objectId);
        this.updateAllTexts(this.currentLiters, objectId);
        if (this.scene.cameraMode === 'giant') {
          this.updateGiantCard(objectId);
        }
      },
      onCameraModeChange: (mode, cfg) => {
        this.handleCameraModeUI(mode, cfg);
      }
    });

    if (this.myPendingTower) {
      this.scene.buildCubeTower(this.myPendingTower.totalLiters, true);
    }
  }

  initUIEvents() {
    // 1. Slider change (Volume & 1m³ Cube Tower)
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

    // 3. Carousel Navigation (< and >)
    if (this.btnPrev) {
      this.btnPrev.addEventListener('click', () => {
        const currIdx = COMPARISON_OBJECTS.findIndex(c => c.id === this.scene.activeObjectId);
        const prevIdx = (currIdx - 1 + COMPARISON_OBJECTS.length) % COMPARISON_OBJECTS.length;
        const targetId = COMPARISON_OBJECTS[prevIdx].id;
        if (this.scene.cameraMode === 'giant') {
          this.scene.enterGiantView(targetId);
        } else {
          this.scene.setActiveObject(targetId);
        }
      });
    }
    if (this.btnNext) {
      this.btnNext.addEventListener('click', () => {
        const currIdx = COMPARISON_OBJECTS.findIndex(c => c.id === this.scene.activeObjectId);
        const nextIdx = (currIdx + 1) % COMPARISON_OBJECTS.length;
        const targetId = COMPARISON_OBJECTS[nextIdx].id;
        if (this.scene.cameraMode === 'giant') {
          this.scene.enterGiantView(targetId);
        } else {
          this.scene.setActiveObject(targetId);
        }
      });
    }

    // 4. Object Tab Clicks (In overview mode: select object; or enter giant view)
    this.objectTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const objId = tab.dataset.objectId;
        if (objId) {
          if (this.scene.cameraMode === 'giant') {
            this.scene.enterGiantView(objId);
          } else {
            this.scene.setActiveObject(objId);
          }
        }
      });
    });

    // 5. Dots Click
    this.dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const idx = Number(dot.dataset.index);
        if (COMPARISON_OBJECTS[idx]) {
          const targetId = COMPARISON_OBJECTS[idx].id;
          if (this.scene.cameraMode === 'giant') {
            this.scene.enterGiantView(targetId);
          } else {
            this.scene.setActiveObject(targetId);
          }
        }
      });
    });

    // 6. Sunset Golden Hour Toggle
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

    // 7. 3D Walk-in Direct Enter / Exit Buttons (WASD mode)
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

    // 8. Register Rank Modal (Bottom Button triggers modal with current slider value prefilled)
    const openModal = () => {
      if (this.registerModal) {
        const litersInput = document.getElementById('reg-liters');
        if (litersInput) litersInput.value = this.currentLiters;
        this.registerModal.classList.add('active');
        this.refreshIcons();
      }
    };
    const closeModal = () => {
      if (this.registerModal) this.registerModal.classList.remove('active');
    };

    if (this.btnRegisterRankBottom) {
      this.btnRegisterRankBottom.addEventListener('click', openModal);
    }
    if (this.modalClose) {
      this.modalClose.addEventListener('click', closeModal);
    }
    if (this.registerModal) {
      this.registerModal.addEventListener('click', e => {
        if (e.target === this.registerModal) closeModal();
      });
    }

    // Form submit: Create Private Pending Tower
    if (this.registerForm) {
      this.registerForm.addEventListener('submit', e => {
        e.preventDefault();
        const formData = {
          name: document.getElementById('reg-name').value,
          licenseNo: document.getElementById('reg-license').value,
          clinic: document.getElementById('reg-clinic').value,
          liters: document.getElementById('reg-liters').value,
          cases: document.getElementById('reg-cases').value,
          crmSystem: document.getElementById('reg-crm').value,
          contact: document.getElementById('reg-contact').value
        };

        const pending = submitDoctorApplication(formData);
        this.myPendingTower = pending;
        this.renderMyPendingBanner();

        // Build private tower immediately on stage!
        this.scene.buildCubeTower(pending.totalLiters, true);

        alert(`[${formData.name}] 원장님의 공인 랭크 등록 신청이 정상 접수되었습니다!\n\n관리자 심사 완료 전까지 원장님 브라우저에서 [공인 심사 진행중 (나만 보기 모드)]로 원장님만의 3D 큐브 탑을 감상하실 수 있습니다.`);
        closeModal();
        this.registerForm.reset();
      });
    }
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
      this.labelsOverlay.classList.toggle('hidden', isGiant || isWalkin);
    }
    if (this.giantBtnText) {
      this.giantBtnText.textContent = (isWalkin || isGiant) ? '전체보기 복귀' : '3D 세상 직접 들어가기';
    }
    if (isGiant && cfg) {
      this.updateGiantCard(cfg.id);
    }
    this.refreshIcons();
  }

  updateGiantCard(objectId) {
    const cfg = COMPARISON_OBJECTS.find(c => c.id === objectId);
    if (!cfg) return;

    if (this.giantObjName) {
      this.giantObjName.textContent = `${cfg.name} 거인 뷰`;
    }
    if (this.giantDetailText) {
      this.giantDetailText.innerHTML = cfg.getGiantDetail(this.currentLiters);
    }
  }

  updateObjectTabsAndDots(objectId) {
    const activeIdx = COMPARISON_OBJECTS.findIndex(c => c.id === objectId);
    this.dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === activeIdx);
    });

    this.objectTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.objectId === objectId);
    });
  }

  updateAllTexts(liters, objectId) {
    const formattedL = liters.toLocaleString();
    const cubeCount = (liters / 1000).toFixed(2);

    if (this.currentVolText) {
      this.currentVolText.textContent = `${formattedL} L`;
    }
    if (this.cubeCountBadge) {
      this.cubeCountBadge.textContent = `${cubeCount} 개 완판`;
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

    if (this.centerHighlightRatio) {
      this.centerHighlightRatio.textContent = `1m³ 큐브 ${cubeCount}개 완판`;
    }

    if (this.flexComparisonText) {
      const cfg = COMPARISON_OBJECTS.find(c => c.id === objectId) || COMPARISON_OBJECTS[1];
      let customMsg = `<strong>1m³(1,000L) 큐브 ${cubeCount}개</strong> 및 <strong>${cfg.name}</strong> 완판 체적입니다!`;
      if (objectId === 'lamborghini') {
        const pct = ((liters / 4700) * 100).toFixed(1);
        customMsg = `<strong>1m³ 큐브 ${cubeCount}개</strong> 및 <strong>람보르기니 우라칸 1대(${pct}%)</strong>를 황금빛 순수 지방으로 완판한 대기록입니다!`;
      } else if (objectId === 'cybertruck') {
        const pct = ((liters / 7100) * 100).toFixed(1);
        customMsg = `<strong>1m³ 큐브 ${cubeCount}개</strong> 및 <strong>테슬라 사이버트럭의 ${pct}%</strong>를 황금빛 순수 지방으로 채운 체적입니다!`;
      } else if (objectId === 'fiji_bottle') {
        const bottles = Math.round(liters / 0.5);
        customMsg = `<strong>1m³ 큐브 ${cubeCount}개</strong> 및 500ml 생수병 <strong>${bottles.toLocaleString()}병</strong>을 가득 채운 양입니다!`;
      } else if (objectId === 'statue_of_liberty') {
        const pct = ((liters / 15000) * 100).toFixed(1);
        customMsg = `<strong>1m³ 큐브 ${cubeCount}개</strong> 및 <strong>자유의 여신상 기단부의 ${pct}%</strong>에 도달한 거대한 실적입니다!`;
      } else if (objectId === 'swimming_pool') {
        const pct = ((liters / 2500000) * 100).toFixed(4);
        customMsg = `<strong>1m³ 큐브 ${cubeCount}개</strong> 및 올림픽 공인 수영장의 <strong>${pct}%</strong>에 해당하는 체적입니다!`;
      }
      this.flexComparisonText.innerHTML = customMsg;
    }

    if (this.scene.cameraMode === 'giant') {
      this.updateGiantCard(objectId);
    }
  }

  renderMyPendingBanner() {
    if (this.myPendingTower) {
      if (this.myPendingBannerHome) {
        this.myPendingBannerHome.style.display = 'flex';
        if (this.myPendingNameHome) this.myPendingNameHome.textContent = this.myPendingTower.name;
        if (this.myPendingClinicHome) this.myPendingClinicHome.textContent = this.myPendingTower.clinic;
        if (this.myPendingLitersHome) this.myPendingLitersHome.textContent = `${this.myPendingTower.totalLiters.toLocaleString()} L`;
      }
    } else {
      if (this.myPendingBannerHome) this.myPendingBannerHome.style.display = 'none';
    }
    this.refreshIcons();
  }

  renderLeaderboards() {
    const renderRows = (container) => {
      if (!container) return;
      container.innerHTML = '';

      this.doctors.forEach(doc => {
        const row = document.createElement('tr');

        row.innerHTML = `
          <td>
            <div class="rank-badge">${doc.rank}</div>
          </td>
          <td>
            <div class="doc-profile-cell">
              <img src="${doc.avatar}" class="doc-img" alt="${doc.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(doc.name)}&background=0953ff&color=fff'">
              <div class="doc-info-text">
                <div class="name">${doc.name}</div>
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
            <span class="badge-verified">
              <i data-lucide="shield-check" class="icon-sm"></i>
              <span>${doc.badge}</span>
            </span>
          </td>
          <td>
            <button class="btn-fill-beaker" data-liters="${doc.totalLiters}" title="해당 원장님의 1m³ 큐브 탑 & 사물 체급 연동">
              <span>3D 체급 연동</span>
              <i data-lucide="arrow-right" class="icon-sm"></i>
            </button>
          </td>
        `;

        row.querySelector('.btn-fill-beaker').addEventListener('click', () => {
          this.currentLiters = doc.totalLiters;
          if (this.volSlider) this.volSlider.value = doc.totalLiters;
          this.scene.setVolume(doc.totalLiters);
          // Navigate to home and smoothly scroll to 3D canvas
          window.location.hash = '#home';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });

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
