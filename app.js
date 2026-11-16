(function () {
  const DB_NAME = 'media-slideshow-db';
  const DB_VER = 1;
  const STORE = 'media';
  const META_STORE = 'meta';

  let media = [];
  let currentIndex = 0;
  let timerId = null;
  let progressId = null;
  let isPaused = false;
  let slideStart = 0;
  let remainingMs = 0;
  let musicUrl = null;
  let musicMuted = false;
  let videoEndedHandler = null;

  const $ = (s) => document.querySelector(s);
  const loadingScreen = $('#loadingScreen');
  const setup = $('#setup');
  const floatSettings = $('#floatSettings');
  const dropzone = $('#dropzone');
  const fileInput = $('#fileInput');
  const photoList = $('#photoList');
  const emptyHint = $('#emptyHint');
  const globalBar = $('#globalBar');
  const globalDuration = $('#globalDuration');
  const photoCount = $('#photoCount');
  const startBtn = $('#startBtn');
  const clearBtn = $('#clearBtn');
  const applyAllBtn = $('#applyAllBtn');
  const backToPlayBtn = $('#backToPlayBtn');
  const slideshow = $('#slideshow');
  const slideImg = $('#slideImg');
  const slideVideo = $('#slideVideo');
  const progressBar = $('#progressBar');
  const slideCounter = $('#slideCounter');
  const slideTimer = $('#slideTimer');
  const pauseBtn = $('#pauseBtn');
  const musicInput = $('#musicInput');
  const musicName = $('#musicName');
  const musicClearBtn = $('#musicClearBtn');
  const volumeSlider = $('#volumeSlider');
  const bgAudio = $('#bgAudio');
  const muteBtn = $('#muteBtn');
  const fsBtn = $('#fsBtn');
  const musicStatus = $('#musicStatus');

  const params = new URLSearchParams(location.search);
  const forceAdmin = params.get('admin') === '1' || params.get('settings') === '1';

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbGetAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbPut(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbDelete(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbClear() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbGetMeta(key) {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const req = tx.objectStore(META_STORE).get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => resolve(null);
    });
  }

  async function idbSetMeta(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readwrite');
      tx.objectStore(META_STORE).put({ key, value });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function guessType(path) {
    const p = (path || '').toLowerCase();
    if (/\.(mp4|webm|mov|m4v|ogg)(\?|$)/.test(p)) return 'video';
    return 'image';
  }

  async function loadPlaylistJson() {
    try {
      const res = await fetch('playlist.json?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return [];
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.items || []);
      return items.map((it, i) => ({
        id: 'remote-' + i + '-' + (it.src || it.url || ''),
        name: it.name || (it.src || it.url || '').split('/').pop() || 'media',
        url: it.src || it.url,
        type: it.type || guessType(it.src || it.url),
        duration: typeof it.duration === 'number' ? it.duration : 5,
        naturalDuration: 0,
        source: 'remote',
        blob: null
      })).filter(x => x.url);
    } catch (e) {
      return [];
    }
  }

  async function loadLocalMedia() {
    const rows = await idbGetAll();
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      url: URL.createObjectURL(r.blob),
      type: r.type,
      duration: r.duration,
      naturalDuration: r.naturalDuration || 0,
      source: 'local',
      blob: r.blob
    }));
  }

  async function loadMusicFromDb() {
    const meta = await idbGetMeta('music');
    if (!meta || !meta.blob) return;
    if (musicUrl) URL.revokeObjectURL(musicUrl);
    musicUrl = URL.createObjectURL(meta.blob);
    bgAudio.src = musicUrl;
    const vol = typeof meta.volume === 'number' ? meta.volume : 70;
    volumeSlider.value = vol;
    bgAudio.volume = vol / 100;
    musicName.textContent = meta.name || '已儲存的音樂';
    musicName.classList.add('has-file');
    musicClearBtn.style.display = 'inline-flex';
  }

  function probeVideoDuration(item) {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.src = item.url;
    v.addEventListener('loadedmetadata', () => {
      item.naturalDuration = v.duration || 0;
      if (!item.duration) item.duration = Math.ceil(item.naturalDuration) || 5;
      renderList();
    });
  }

  async function bootstrap() {
    const [remote, local] = await Promise.all([loadPlaylistJson(), loadLocalMedia()]);
    media = [...remote, ...local];
    for (const m of media) {
      if (m.type === 'video' && m.source === 'remote') probeVideoDuration(m);
    }
    await loadMusicFromDb();
    renderList();
    loadingScreen.classList.add('hidden');
    if (media.length > 0 && !forceAdmin) {
      startSlideshow();
      floatSettings.classList.add('visible');
    } else {
      showSetup(false);
    }
  }

  function showSetup(fromPlay) {
    stopSlideMedia();
    stopMusic(false);
    slideshow.classList.remove('active');
    document.body.style.overflow = '';
    progressBar.style.width = '0%';
    setup.classList.add('visible');
    floatSettings.classList.remove('visible');
    backToPlayBtn.style.display = media.length ? 'inline-flex' : 'none';
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  }

  function renderList() {
    photoList.innerHTML = '';
    if (media.length === 0) {
      photoList.appendChild(emptyHint);
      emptyHint.style.display = 'block';
      globalBar.style.display = 'none';
      clearBtn.style.display = 'none';
      startBtn.disabled = true;
      backToPlayBtn.style.display = 'none';
      return;
    }
    emptyHint.style.display = 'none';
    globalBar.style.display = 'flex';
    clearBtn.style.display = media.some(m => m.source === 'local') ? 'inline-flex' : 'none';
    startBtn.disabled = false;
    const imgCount = media.filter(m => m.type === 'image').length;
    const vidCount = media.filter(m => m.type === 'video').length;
    const parts = [];
    if (imgCount) parts.push(imgCount + ' 張相片');
    if (vidCount) parts.push(vidCount + ' 部影片');
    photoCount.textContent = '共 ' + parts.join(' · ');

    media.forEach((p) => {
      const item = document.createElement('div');
      item.className = 'photo-item';
      const isVideo = p.type === 'video';
      const durVal = p.duration || (isVideo ? Math.ceil(p.naturalDuration || 0) : 5);
      const thumb = isVideo
        ? '<video src="' + p.url + '" muted preload="metadata"></video><span class="thumb-badge">' + (p.source === 'remote' ? '遠端影片' : '影片') + '</span>'
        : '<img src="' + p.url + '" alt="" /><span class="thumb-badge">' + (p.source === 'remote' ? '遠端' : '相片') + '</span>';
      const hint = isVideo
        ? '<span class="hint">（0=完整 · 約 ' + (p.naturalDuration ? Math.round(p.naturalDuration) + 's' : '…') + '）</span>'
        : '';
      const canRemove = p.source === 'local';
      item.innerHTML =
        '<div class="thumb-wrap">' + thumb + '</div>' +
        '<div class="photo-meta">' +
          '<div class="name" title="' + escapeHtml(p.name) + '">' + escapeHtml(p.name) + '</div>' +
          '<div class="duration-row">' +
            '<label>秒數</label>' +
            '<input type="number" min="0" max="600" step="1" value="' + durVal + '" data-id="' + escapeHtml(p.id) + '" />' +
            hint +
          '</div></div>' +
        (canRemove
          ? '<button class="btn btn-danger" type="button" data-remove="' + escapeHtml(p.id) + '">移除</button>'
          : '<span style="font-size:0.75rem;color:var(--muted);">playlist</span>');
      photoList.appendChild(item);
    });

    photoList.querySelectorAll('input[type="number"]').forEach(inp => {
      inp.addEventListener('change', async () => {
        const item = media.find(x => x.id === inp.dataset.id);
        if (!item) return;
        let val = parseInt(inp.value, 10);
        if (isNaN(val) || val < 0) val = item.type === 'video' ? 0 : 5;
        if (val > 600) val = 600;
        inp.value = val;
        item.duration = val;
        if (item.source === 'local' && item.blob) {
          await idbPut({ id: item.id, name: item.name, type: item.type, duration: item.duration, naturalDuration: item.naturalDuration || 0, blob: item.blob });
        }
      });
    });

    photoList.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.remove;
        const idx = media.findIndex(x => x.id === id);
        if (idx === -1) return;
        const m = media[idx];
        if (m.source === 'local') {
          URL.revokeObjectURL(m.url);
          await idbDelete(id);
        }
        media.splice(idx, 1);
        renderList();
      });
    });
  }

  async function handleFiles(fileList) {
    const defaultDur = Math.max(1, parseInt(globalDuration.value, 10) || 5);
    const incoming = Array.from(fileList).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    for (const file of incoming) {
      const id = crypto.randomUUID();
      const isVideo = file.type.startsWith('video/');
      const blob = file;
      const url = URL.createObjectURL(blob);
      const item = {
        id, name: file.name, url, type: isVideo ? 'video' : 'image',
        duration: isVideo ? 0 : defaultDur, naturalDuration: 0, source: 'local', blob
      };
      media.push(item);
      await idbPut({ id, name: file.name, type: item.type, duration: item.duration, naturalDuration: 0, blob });
      if (isVideo) {
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.src = url;
        v.addEventListener('loadedmetadata', async () => {
          item.naturalDuration = v.duration || 0;
          if (!item.duration) item.duration = Math.ceil(item.naturalDuration) || 5;
          await idbPut({ id, name: file.name, type: 'video', duration: item.duration, naturalDuration: item.naturalDuration, blob });
          renderList();
        });
      }
    }
    renderList();
  }

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
  fileInput.addEventListener('change', () => { handleFiles(fileInput.files); fileInput.value = ''; });

  applyAllBtn.addEventListener('click', async () => {
    const val = Math.max(1, Math.min(300, parseInt(globalDuration.value, 10) || 5));
    globalDuration.value = val;
    for (const p of media) {
      if (p.type === 'image') {
        p.duration = val;
        if (p.source === 'local' && p.blob) {
          await idbPut({ id: p.id, name: p.name, type: p.type, duration: p.duration, naturalDuration: 0, blob: p.blob });
        }
      }
    }
    renderList();
  });

  clearBtn.addEventListener('click', async () => {
    if (!confirm('清除此裝置上儲存的本機媒體？遠端 playlist 不會被刪。')) return;
    for (const m of media) { if (m.source === 'local') URL.revokeObjectURL(m.url); }
    await idbClear();
    media = media.filter(m => m.source === 'remote');
    renderList();
  });

  $('#musicPickBtn').addEventListener('click', () => musicInput.click());
  musicInput.addEventListener('change', async () => {
    const file = musicInput.files[0];
    if (!file) return;
    if (musicUrl) URL.revokeObjectURL(musicUrl);
    musicUrl = URL.createObjectURL(file);
    bgAudio.src = musicUrl;
    bgAudio.volume = volumeSlider.value / 100;
    musicName.textContent = file.name;
    musicName.classList.add('has-file');
    musicClearBtn.style.display = 'inline-flex';
    await idbSetMeta('music', { name: file.name, blob: file, volume: +volumeSlider.value });
    musicInput.value = '';
  });
  musicClearBtn.addEventListener('click', async () => {
    bgAudio.pause(); bgAudio.removeAttribute('src'); bgAudio.load();
    if (musicUrl) URL.revokeObjectURL(musicUrl);
    musicUrl = null;
    musicName.textContent = '尚未選擇';
    musicName.classList.remove('has-file');
    musicClearBtn.style.display = 'none';
    musicStatus.textContent = '';
    await idbSetMeta('music', null);
  });
  volumeSlider.addEventListener('input', async () => {
    bgAudio.volume = volumeSlider.value / 100;
    const meta = await idbGetMeta('music');
    if (meta) { meta.volume = +volumeSlider.value; await idbSetMeta('music', meta); }
  });

  function playMusic() {
    if (!musicUrl) { musicStatus.textContent = ''; return; }
    bgAudio.muted = musicMuted;
    bgAudio.volume = volumeSlider.value / 100;
    const p = bgAudio.play();
    if (p) p.catch(() => { musicStatus.textContent = '· 點擊以啟用音樂'; });
    musicStatus.textContent = musicMuted ? '· 🔇' : '· 🎵';
  }
  function stopMusic(reset) {
    bgAudio.pause();
    if (reset) bgAudio.currentTime = 0;
    musicStatus.textContent = '';
  }
  function toggleMute() {
    if (!musicUrl) return;
    musicMuted = !musicMuted;
    bgAudio.muted = musicMuted;
    muteBtn.textContent = musicMuted ? '🔇' : '🔊';
    musicStatus.textContent = musicMuted ? '· 🔇' : '· 🎵';
  }
  muteBtn.addEventListener('click', toggleMute);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      slideshow.requestFullscreen?.() || slideshow.webkitRequestFullscreen?.();
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.();
    }
  }
  fsBtn.addEventListener('click', toggleFullscreen);

  startBtn.addEventListener('click', () => {
    setup.classList.remove('visible');
    floatSettings.classList.add('visible');
    startSlideshow();
  });
  backToPlayBtn.addEventListener('click', () => {
    if (!media.length) return;
    setup.classList.remove('visible');
    floatSettings.classList.add('visible');
    startSlideshow();
  });
  floatSettings.addEventListener('click', () => showSetup(true));
  $('#settingsFromPlayBtn').addEventListener('click', () => showSetup(true));
  $('#exitBtn').addEventListener('click', () => showSetup(true));
  $('#prevBtn').addEventListener('click', () => goTo(currentIndex - 1));
  $('#nextBtn').addEventListener('click', () => goTo(currentIndex + 1));
  pauseBtn.addEventListener('click', togglePause);

  function stopSlideMedia() {
    clearTimers();
    if (videoEndedHandler) {
      slideVideo.removeEventListener('ended', videoEndedHandler);
      videoEndedHandler = null;
    }
    slideVideo.pause();
    slideVideo.removeAttribute('src');
    slideVideo.load();
    slideImg.removeAttribute('src');
    slideImg.style.display = 'none';
    slideVideo.style.display = 'none';
  }

  function startSlideshow() {
    if (!media.length) return;
    currentIndex = 0;
    isPaused = false;
    pauseBtn.textContent = '⏸';
    slideshow.classList.add('active');
    document.body.style.overflow = 'hidden';
    playMusic();
    try {
      if (!document.fullscreenElement) {
        slideshow.requestFullscreen?.() || slideshow.webkitRequestFullscreen?.();
      }
    } catch (e) {}
    showSlide(0);
  }

  function clearTimers() {
    if (timerId) { clearTimeout(timerId); timerId = null; }
    if (progressId) { clearInterval(progressId); progressId = null; }
  }

  function resolveDuration(item) {
    if (item.type === 'video') {
      if (item.duration > 0) return item.duration;
      return item.naturalDuration || 5;
    }
    return item.duration || 5;
  }

  function showSlide(index) {
    if (!media.length) return;
    stopSlideMedia();
    currentIndex = ((index % media.length) + media.length) % media.length;
    const item = media[currentIndex];
    const durationSec = resolveDuration(item);
    const durationMs = durationSec * 1000;
    slideCounter.textContent = (currentIndex + 1) + ' / ' + media.length;
    slideTimer.textContent = item.type === 'video' ? '· 影片 ' + Math.round(durationSec) + 's' : '· ' + Math.round(durationSec) + 's';
    remainingMs = durationMs;
    slideStart = Date.now();

    if (item.type === 'video') {
      slideImg.style.display = 'none';
      slideVideo.style.display = 'block';
      slideVideo.src = item.url;
      slideVideo.currentTime = 0;
      slideVideo.muted = !!musicUrl && !musicMuted;
      if (!musicUrl) slideVideo.muted = false;
      const startVideo = () => {
        if (isPaused) return;
        slideVideo.play().catch(() => {});
        startProgress(durationMs);
        if (item.duration > 0) {
          timerId = setTimeout(() => goTo(currentIndex + 1), durationMs);
        } else {
          videoEndedHandler = () => goTo(currentIndex + 1);
          slideVideo.addEventListener('ended', videoEndedHandler);
          timerId = setTimeout(() => goTo(currentIndex + 1), durationMs + 800);
        }
      };
      if (slideVideo.readyState >= 2) startVideo();
      else slideVideo.addEventListener('loadeddata', startVideo, { once: true });
    } else {
      slideVideo.style.display = 'none';
      slideImg.style.display = 'block';
      slideImg.classList.add('fade-out');
      setTimeout(() => {
        slideImg.src = item.url;
        slideImg.classList.remove('fade-out');
        if (!isPaused) {
          startProgress(durationMs);
          timerId = setTimeout(() => goTo(currentIndex + 1), durationMs);
        }
      }, 180);
    }
  }

  function startProgress(totalMs) {
    clearInterval(progressId);
    progressBar.style.width = '0%';
    const start = Date.now();
    progressId = setInterval(() => {
      if (isPaused) return;
      const pct = Math.min(100, ((Date.now() - start) / totalMs) * 100);
      progressBar.style.width = pct + '%';
      if (pct >= 100) clearInterval(progressId);
    }, 40);
  }

  function goTo(index) { showSlide(index); }

  function togglePause() {
    if (isPaused) {
      isPaused = false;
      pauseBtn.textContent = '⏸';
      slideStart = Date.now();
      startProgress(remainingMs);
      timerId = setTimeout(() => goTo(currentIndex + 1), remainingMs);
      if (musicUrl && !musicMuted) bgAudio.play().catch(() => {});
      if (media[currentIndex] && media[currentIndex].type === 'video') slideVideo.play().catch(() => {});
    } else {
      isPaused = true;
      pauseBtn.textContent = '▶';
      remainingMs = Math.max(0, remainingMs - (Date.now() - slideStart));
      clearTimers();
      bgAudio.pause();
      slideVideo.pause();
    }
  }

  document.addEventListener('keydown', (e) => {
    if (!slideshow.classList.contains('active')) return;
    if (e.key === 'Escape') {
      if (document.fullscreenElement) document.exitFullscreen?.() || document.webkitExitFullscreen?.();
      else showSetup(true);
    } else if (e.key === 'ArrowRight') goTo(currentIndex + 1);
    else if (e.key === 'ArrowLeft') goTo(currentIndex - 1);
    else if (e.key === ' ') { e.preventDefault(); togglePause(); }
    else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    else if (e.key === 'm' || e.key === 'M') toggleMute();
    else if (e.key === 's' || e.key === 'S') showSetup(true);
  });

  let overlayTimer;
  slideshow.addEventListener('touchstart', () => {
    const overlay = $('#overlay');
    overlay.classList.add('show');
    clearTimeout(overlayTimer);
    overlayTimer = setTimeout(() => overlay.classList.remove('show'), 3500);
  });

  bootstrap().catch((err) => {
    console.error(err);
    loadingScreen.classList.add('hidden');
    showSetup(false);
  });
})();
