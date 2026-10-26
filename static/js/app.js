/**
 * GhostGPT — Client-side Application Logic
 * Offline AI Horror Story Generator
 * Hacktoberfest 2026: "Ghost in the Machine"
 */

(function () {
  'use strict';

  // --- Occult Seed Database (Example Prompts by Archetype) ---
  const PROMPT_DATABASE = {
    haunted_house: [
      "Every night at 3:17 AM, the grandfather clock strikes thirteen and the portrait of the matriarch blinks.",
      "The real estate agent swore Blackwood Manor was empty, until we found a tea party laid out in the crawlspace with warm tea.",
      "I renovated an old Victorian house and uncovered a sealed room with inward-facing locks on the outside door.",
      "The wallpaper in the nursery began peeling off, revealing names written underneath in handwriting identical to mine."
    ],
    ghost_encounter: [
      "My smart home speaker began transcribing voices whispering in an empty guest room: 'Don't let them see you.'",
      "A drenched hitchhiker asked for a ride to the lake road; in my rearview mirror, their seat was completely vacant.",
      "The elevator in our office tower occasionally stops on the 13th floor—a floor that doesn't exist on the blueprints.",
      "Every time the power flickers, someone identical to my late grandfather stands motionless at the end of the corridor."
    ],
    cursed_object: [
      "An antique brass music box only plays songs when someone in the house is about to take their final breath.",
      "A Polaroid camera bought at an estate sale always shows a shadowy silhouette standing one step closer in each photo.",
      "I found an ornate iron key in my coat pocket that opens any locked door—but what enters the room isn't human.",
      "A hand-carved chess set where the opponent's black pieces move on their own whenever the lights are dimmed."
    ],
    abandoned_hospital: [
      "Deep inside Saint Jude's Ashen Ward, the rusted paging intercom crackles to life calling for a doctor dead fifty years.",
      "Explorers entering the hydrotherapy wing discovered wet footprints pacing between bathtubs in a dry building.",
      "The patient charts left in the quarantine basement have entries dated tomorrow with accurate descriptions of our deaths.",
      "A rusted iron lung in the pediatric unit is still humming, rhythmic breath fogging its glass viewing port."
    ],
    paranormal_mystery: [
      "An entire coastal fishing village vanished overnight in 1923, leaving steaming meals and open diaries on every table.",
      "The radio astronomer detected an anomalous repeating broadcast from deep space that repeated his childhood secrets.",
      "A police detective reviewing security footage of a vault robbery realizes none of the suspects cast a shadow.",
      "Every year on the autumn equinox, a train pulls into the abandoned depot with passengers who look out without blinking."
    ],
    psychological_horror: [
      "I started noticing a slight delay between my movements and my reflection in the mirror—and today, it smiled first.",
      "The sound of breathing in my apartment matches my own cadence, but it continues even when I hold my breath.",
      "Everyone in my town behaves normally, but none of them ever blink while looking directly into my eyes.",
      "I found journal entries in my handwriting detailing crimes I have no memory of ever committing."
    ]
  };

  // --- Spooky Loading Phrases ---
  const LOADING_PHRASES = [
    "Communing with the machine...",
    "Summoning spirits from the dark...",
    "Listening to whispers from the ether...",
    "Weaving threads of creeping dread...",
    "Channeling local neural weights...",
    "The ghost awakens in the silicon...",
    "Translating phantom frequencies..."
  ];

  // --- Application State ---
  let currentStory = null;
  let loadingInterval = null;
  let timerInterval = null;
  let currentFontSize = 'font-size-md';
  let speechUtterance = null;
  let isSpeaking = false;

  // --- DOM Elements ---
  const form = document.getElementById('story-form');
  const promptInput = document.getElementById('story-prompt');
  const charCount = document.getElementById('char-count');
  const promptHint = document.getElementById('prompt-hint');
  const promptChipsContainer = document.getElementById('prompt-chips');
  const randomPromptBtn = document.getElementById('random-prompt-btn');
  const generateBtn = document.getElementById('generate-btn');
  const btnLabelText = document.getElementById('btn-label-text');

  // Reading Chamber Elements
  const readingChamber = document.getElementById('reading-chamber');
  const emptyState = document.getElementById('empty-state');
  const loadingState = document.getElementById('loading-state');
  const loadingPhrase = document.getElementById('loading-phrase');
  const elapsedTimeEl = document.getElementById('elapsed-time');
  const storyArticle = document.getElementById('story-article');
  const storyTitle = document.getElementById('story-title');
  const storyBody = document.getElementById('story-body');
  const storyTagCat = document.getElementById('story-tag-cat');
  const storyTagInt = document.getElementById('story-tag-int');
  const storyTagWords = document.getElementById('story-tag-words');
  const storyTagTime = document.getElementById('story-tag-time');
  const readerTools = document.getElementById('reader-tools');

  // Actions
  const copyBtn = document.getElementById('copy-btn');
  const saveBtn = document.getElementById('save-btn');
  const ttsBtn = document.getElementById('tts-btn');
  const ttsIcon = document.getElementById('tts-icon');
  const fontIncBtn = document.getElementById('font-inc-btn');
  const fontDecBtn = document.getElementById('font-dec-btn');

  // Status & Alerts
  const healthDot = document.getElementById('health-dot');
  const privacyStatusText = document.getElementById('privacy-status-text');
  const privacyBtn = document.getElementById('privacy-btn');
  const privacyModal = document.getElementById('privacy-modal');
  const closePrivacyBtn = document.getElementById('close-privacy-btn');
  const privacyDoneBtn = document.getElementById('privacy-done-btn');
  const ollamaAlert = document.getElementById('ollama-alert');
  const alertTitle = document.getElementById('alert-title');
  const alertDesc = document.getElementById('alert-desc');
  const alertInstructions = document.getElementById('alert-instructions');
  const retryHealthBtn = document.getElementById('retry-health-btn');

  // Saved Drawer Elements
  const toggleSavedBtn = document.getElementById('toggle-saved-btn');
  const grimoireDrawer = document.getElementById('grimoire-drawer');
  const drawerOverlay = document.getElementById('drawer-overlay');
  const closeDrawerBtn = document.getElementById('close-drawer-btn');
  const savedStoriesList = document.getElementById('saved-stories-list');
  const savedCountEl = document.getElementById('saved-count');
  const savedStatsCount = document.getElementById('saved-stats-count');
  const exportJsonBtn = document.getElementById('export-json-btn');
  const clearAllBtn = document.getElementById('clear-all-btn');

  // Toast Container
  const toastContainer = document.getElementById('toast-container');

  // =========================================================================
  // Initial Setup
  // =========================================================================

  function init() {
    setupAtmosphereParticles();
    setupCategorySelection();
    setupIntensityAndLengthControls();
    setupPromptField();
    setupSavedStories();
    checkHealth();

    // Auto-refresh health every 30 seconds
    setInterval(checkHealth, 30000);

    // Render initial example chips based on default category
    renderPromptChips('haunted_house');

    // Attach Event Listeners
    form.addEventListener('submit', handleStorySubmit);
    randomPromptBtn.addEventListener('click', handleRandomPrompt);
    copyBtn.addEventListener('click', handleCopyStory);
    saveBtn.addEventListener('click', handleSaveCurrentStory);
    ttsBtn.addEventListener('click', handleToggleSpeech);
    fontIncBtn.addEventListener('click', () => changeFontSize(1));
    fontDecBtn.addEventListener('click', () => changeFontSize(-1));

    privacyBtn.addEventListener('click', openPrivacyModal);
    closePrivacyBtn.addEventListener('click', closePrivacyModal);
    privacyDoneBtn.addEventListener('click', closePrivacyModal);

    toggleSavedBtn.addEventListener('click', openGrimoireDrawer);
    closeDrawerBtn.addEventListener('click', closeGrimoireDrawer);
    drawerOverlay.addEventListener('click', closeGrimoireDrawer);
    exportJsonBtn.addEventListener('click', handleExportJson);
    clearAllBtn.addEventListener('click', handleClearAllSaved);
    retryHealthBtn.addEventListener('click', checkHealth);

    // Global keyboard shortcut: Ctrl+Enter or Cmd+Enter to generate
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!generateBtn.disabled) {
          form.requestSubmit();
        }
      }
      if (e.key === 'Escape') {
        closePrivacyModal();
        closeGrimoireDrawer();
      }
    });
  }

  // =========================================================================
  // Health & Offline Status
  // =========================================================================

  async function checkHealth() {
    try {
      const res = await fetch('/health');
      const data = await res.json();

      const modalHost = document.getElementById('modal-ollama-host');
      const modalStatus = document.getElementById('modal-ollama-status');
      const modalModels = document.getElementById('modal-installed-models');
      if (modalHost) modalHost.textContent = data.ollama_host || 'http://localhost:11434';

      if (data.status === 'online') {
        if (data.model_available) {
          // All good!
          healthDot.className = 'status-dot dot-online';
          privacyStatusText.textContent = `Offline AI Ready (${data.configured_model})`;
          hideAlert();
          if (modalStatus) modalStatus.innerHTML = '<span style="color:#00ffb3;">● Online & Local Model Ready</span>';
        } else {
          // Ollama running, but model missing
          healthDot.className = 'status-dot dot-warning';
          privacyStatusText.textContent = `Model Missing (${data.configured_model})`;
          showAlert(
            'Model Not Found in Ollama',
            `Ollama is running, but model "${data.configured_model}" is not installed yet.`,
            `Run in your terminal: ollama pull ${data.configured_model}`,
            'warning'
          );
          if (modalStatus) modalStatus.innerHTML = '<span style="color:#f59e0b;">● Ollama Online, Model Missing</span>';
        }
      } else {
        // Ollama offline
        healthDot.className = 'status-dot dot-offline';
        privacyStatusText.textContent = 'Ollama Service Offline';
        showAlert(
          'Ollama Local Engine Required',
          'GhostGPT generates horror stories completely offline on your computer. Please start Ollama.',
          '1. Install Ollama from ollama.com if needed\n2. Run: ollama serve\n3. Run: ollama pull gemma3:1b',
          'offline'
        );
        if (modalStatus) modalStatus.innerHTML = '<span style="color:#ff4757;">● Ollama Offline</span>';
      }

      if (modalModels) {
        modalModels.textContent = data.installed_models && data.installed_models.length > 0
          ? data.installed_models.join(', ')
          : 'None detected';
      }
    } catch (err) {
      healthDot.className = 'status-dot dot-offline';
      privacyStatusText.textContent = 'Backend Connection Error';
      showAlert(
        'Flask Server Connection Issue',
        'Could not communicate with the local GhostGPT backend.',
        'Ensure python app.py is running on http://127.0.0.1:5000',
        'offline'
      );
    }
  }

  function showAlert(title, desc, instructions, type) {
    alertTitle.textContent = title;
    alertDesc.textContent = desc;
    alertInstructions.textContent = instructions;
    ollamaAlert.className = `status-alert ${type === 'warning' ? 'alert-warning' : ''}`;
    ollamaAlert.classList.remove('hidden');
  }

  function hideAlert() {
    ollamaAlert.classList.add('hidden');
  }

  function openPrivacyModal() {
    privacyModal.classList.remove('hidden');
  }

  function closePrivacyModal() {
    privacyModal.classList.add('hidden');
  }

  // =========================================================================
  // Category & Atmosphere Controls
  // =========================================================================

  function setupCategorySelection() {
    const cards = document.querySelectorAll('.category-card');
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        cards.forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) {
          radio.checked = true;
          renderPromptChips(radio.value);
        }
      });
    });
  }

  function setupIntensityAndLengthControls() {
    // Setup Segmented Buttons active toggling
    document.querySelectorAll('.segmented-control').forEach((control) => {
      const segments = control.querySelectorAll('.segment-btn');
      segments.forEach((seg) => {
        seg.addEventListener('click', () => {
          segments.forEach((s) => s.classList.remove('active'));
          seg.classList.add('active');
          const radio = seg.querySelector('input[type="radio"]');
          if (radio) radio.checked = true;
        });
      });
    });
  }

  function setupPromptField() {
    promptInput.addEventListener('input', () => {
      const len = promptInput.value.length;
      charCount.textContent = `${len} / 1000`;
      if (len >= 3) {
        promptHint.textContent = 'The spirits are attentive.';
        promptHint.style.color = 'var(--ghost-green)';
      } else {
        promptHint.textContent = 'Minimum 3 characters';
        promptHint.style.color = 'var(--text-dim)';
      }
    });
  }

  function renderPromptChips(category) {
    const prompts = PROMPT_DATABASE[category] || PROMPT_DATABASE['haunted_house'];
    promptChipsContainer.innerHTML = '';

    prompts.forEach((pText) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'prompt-chip';
      chip.textContent = pText;
      chip.title = 'Click to use this prompt seed';
      chip.addEventListener('click', () => {
        promptInput.value = pText;
        promptInput.dispatchEvent(new Event('input'));
        promptInput.focus();
        showToast('Seed transferred to the parchment! ✨', 'info');
      });
      promptChipsContainer.appendChild(chip);
    });
  }

  function handleRandomPrompt() {
    const categories = Object.keys(PROMPT_DATABASE);
    const randomCat = categories[Math.floor(Math.random() * categories.length)];
    const list = PROMPT_DATABASE[randomCat];
    const randomPrompt = list[Math.floor(Math.random() * list.length)];

    // Select category card
    const targetCard = document.querySelector(`.category-card[data-cat="${randomCat}"]`);
    if (targetCard) {
      targetCard.click();
    }

    // Set text
    promptInput.value = randomPrompt;
    promptInput.dispatchEvent(new Event('input'));
    promptInput.focus();

    showToast('Dark inspiration summoned! 🎲', 'info');
  }

  // =========================================================================
  // Story Generation Logic
  // =========================================================================

  async function handleStorySubmit(e) {
    e.preventDefault();
    stopSpeech();

    const prompt = promptInput.value.trim();
    if (prompt.length < 3) {
      showToast('Please provide a seed of at least 3 characters.', 'error');
      promptInput.focus();
      return;
    }

    const categoryRadio = document.querySelector('input[name="category"]:checked');
    const intensityRadio = document.querySelector('input[name="intensity"]:checked');
    const lengthRadio = document.querySelector('input[name="length"]:checked');

    const payload = {
      prompt: prompt,
      category: categoryRadio ? categoryRadio.value : 'haunted_house',
      intensity: intensityRadio ? intensityRadio.value : 'eerie',
      length: lengthRadio ? lengthRadio.value : 'medium'
    };

    setGeneratingState(true);

    try {
      const response = await fetch('/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to summon story.');
      }

      currentStory = data;
      renderStory(data);
      showToast('The horror tale has manifested! 👻', 'success');

      // Auto scroll down to the story on mobile
      if (window.innerWidth <= 1024) {
        storyArticle.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      showToast(err.message, 'error');
      displayErrorInGrimoire(err.message);
    } finally {
      setGeneratingState(false);
    }
  }

  function setGeneratingState(isGenerating) {
    generateBtn.disabled = isGenerating;

    if (isGenerating) {
      btnLabelText.textContent = 'Summoning Spirits...';
      emptyState.classList.add('hidden');
      storyArticle.classList.add('hidden');
      loadingState.classList.remove('hidden');
      readerTools.style.display = 'none';

      // Cycle loading phrases
      let phraseIdx = 0;
      loadingPhrase.textContent = LOADING_PHRASES[0];
      loadingInterval = setInterval(() => {
        phraseIdx = (phraseIdx + 1) % LOADING_PHRASES.length;
        loadingPhrase.textContent = LOADING_PHRASES[phraseIdx];
      }, 3500);

      // Elapsed seconds counter
      let elapsedSeconds = 0;
      elapsedTimeEl.textContent = 'Summoning: 0s';
      timerInterval = setInterval(() => {
        elapsedSeconds++;
        elapsedTimeEl.textContent = `Summoning: ${elapsedSeconds}s (Local Inference)`;
      }, 1000);
    } else {
      btnLabelText.textContent = 'Summon Horror Story';
      loadingState.classList.add('hidden');
      if (loadingInterval) clearInterval(loadingInterval);
      if (timerInterval) clearInterval(timerInterval);
    }
  }

  function renderStory(data) {
    storyTitle.textContent = data.title || 'Untitled Haunting';
    storyTagCat.textContent = data.category_label || data.category;
    storyTagInt.textContent = data.intensity_label || data.intensity;
    storyTagWords.textContent = `${data.word_count || 0} words`;
    storyTagTime.textContent = `${data.read_time_minutes || 1} min read`;

    // Format paragraphs
    const paragraphs = data.story.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    storyBody.innerHTML = '';
    paragraphs.forEach((pText) => {
      const p = document.createElement('p');
      p.textContent = pText.trim();
      storyBody.appendChild(p);
    });

    emptyState.classList.add('hidden');
    loadingState.classList.add('hidden');
    storyArticle.classList.remove('hidden');
    readerTools.style.display = 'flex';
    readingChamber.className = `reading-chamber ${currentFontSize}`;

    // Update Save button label
    saveBtn.innerHTML = '<span>⭐</span> Save';
    saveBtn.disabled = false;
  }

  function displayErrorInGrimoire(message) {
    emptyState.classList.remove('hidden');
    storyArticle.classList.add('hidden');
    readerTools.style.display = 'none';

    emptyState.querySelector('.empty-title').textContent = 'The Portal Sealed Abruptly';
    emptyState.querySelector('.empty-desc').textContent = message;
    emptyState.querySelector('.empty-candle').textContent = '⚠️';
  }

  // =========================================================================
  // Reading & Action Tools
  // =========================================================================

  async function handleCopyStory() {
    if (!currentStory) return;

    const fullText = `${currentStory.title}\n\n${currentStory.story}\n\n---\nCategory: ${currentStory.category_label || currentStory.category}\nIntensity: ${currentStory.intensity_label || currentStory.intensity}\nGenerated locally with GhostGPT & Gemma 3.`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullText);
      } else {
        const dummy = document.createElement('textarea');
        dummy.value = fullText;
        document.body.appendChild(dummy);
        dummy.select();
        document.execCommand('copy');
        document.body.removeChild(dummy);
      }
      showToast('Copied story to clipboard! 📋', 'success');
    } catch (e) {
      showToast('Failed to copy story.', 'error');
    }
  }

  function changeFontSize(delta) {
    const sizes = ['font-size-sm', 'font-size-md', 'font-size-lg'];
    let idx = sizes.indexOf(currentFontSize);
    let nextIdx = idx + delta;
    if (nextIdx >= 0 && nextIdx < sizes.length) {
      currentFontSize = sizes[nextIdx];
      readingChamber.className = `reading-chamber ${currentFontSize}`;
    }
  }

  // =========================================================================
  // Text to Speech (Spooky Whispers)
  // =========================================================================

  function handleToggleSpeech() {
    if (!('speechSynthesis' in window)) {
      showToast('Text-to-speech not supported in this browser.', 'info');
      return;
    }

    if (isSpeaking) {
      stopSpeech();
    } else {
      if (!currentStory) return;
      startSpeech(`${currentStory.title}. ${currentStory.story}`);
    }
  }

  function startSpeech(text) {
    window.speechSynthesis.cancel();
    speechUtterance = new SpeechSynthesisUtterance(text);
    speechUtterance.rate = 0.88; // Slightly slow and measured
    speechUtterance.pitch = 0.75; // Low and eerie

    speechUtterance.onstart = () => {
      isSpeaking = true;
      ttsIcon.textContent = '⏹️';
      ttsBtn.classList.add('btn-primary-outline');
    };

    speechUtterance.onend = () => {
      stopSpeech();
    };

    speechUtterance.onerror = () => {
      stopSpeech();
    };

    window.speechSynthesis.speak(speechUtterance);
  }

  function stopSpeech() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isSpeaking = false;
    ttsIcon.textContent = '🔊';
    ttsBtn.classList.remove('btn-primary-outline');
  }

  // =========================================================================
  // LocalStorage Saved Grimoire
  // =========================================================================

  const STORAGE_KEY = 'ghostgpt_saved_stories';

  function getSavedStories() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveStoriesList(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      updateSavedBadgeCount(list.length);
    } catch (e) {
      showToast('Could not write to localStorage.', 'error');
    }
  }

  function setupSavedStories() {
    const list = getSavedStories();
    updateSavedBadgeCount(list.length);
  }

  function updateSavedBadgeCount(count) {
    savedCountEl.textContent = count;
    savedStatsCount.textContent = `${count} ${count === 1 ? 'tale' : 'tales'} archived`;
  }

  function handleSaveCurrentStory() {
    if (!currentStory) return;

    const list = getSavedStories();
    const alreadySaved = list.some((item) => item.story === currentStory.story);

    if (alreadySaved) {
      showToast('This tale is already recorded in your Grimoire.', 'info');
      return;
    }

    const storyRecord = {
      id: 'story_' + Date.now(),
      title: currentStory.title || 'Untitled Haunting',
      story: currentStory.story,
      category: currentStory.category,
      category_label: currentStory.category_label,
      intensity: currentStory.intensity,
      intensity_label: currentStory.intensity_label,
      word_count: currentStory.word_count,
      read_time_minutes: currentStory.read_time_minutes,
      model: currentStory.model,
      savedAt: new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    };

    list.unshift(storyRecord);
    saveStoriesList(list);

    saveBtn.innerHTML = '<span>✔️</span> Saved!';
    saveBtn.disabled = true;
    showToast('Tale bound into your Grimoire! ⭐', 'success');
  }

  function openGrimoireDrawer() {
    renderSavedStoriesList();
    grimoireDrawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeGrimoireDrawer() {
    grimoireDrawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function renderSavedStoriesList() {
    const list = getSavedStories();
    savedStoriesList.innerHTML = '';

    if (list.length === 0) {
      savedStoriesList.innerHTML = `
        <div class="empty-archive">
          <div class="empty-archive-icon">🕯️</div>
          <p>Your Grimoire is devoid of tales.</p>
          <small>Generate stories and save them here for offline reading.</small>
        </div>
      `;
      return;
    }

    list.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'saved-story-card';
      card.tabIndex = 0;

      card.innerHTML = `
        <div class="saved-card-header">
          <span class="saved-card-title">${escapeHtml(item.title)}</span>
          <button class="btn-del-story" title="Delete tale" aria-label="Delete tale">🗑️</button>
        </div>
        <p class="saved-card-preview">${escapeHtml(item.story.slice(0, 140))}...</p>
        <div class="saved-card-footer">
          <span>${escapeHtml(item.category_label || item.category)} • ${item.word_count || 0}w</span>
          <span>${item.savedAt}</span>
        </div>
      `;

      // Click card to load story
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-del-story')) return;
        currentStory = item;
        renderStory(item);
        closeGrimoireDrawer();
        showToast(`Loaded "${item.title}" into reading chamber.`, 'info');
      });

      // Delete button
      const delBtn = card.querySelector('.btn-del-story');
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSavedStory(item.id);
      });

      savedStoriesList.appendChild(card);
    });
  }

  function deleteSavedStory(id) {
    let list = getSavedStories();
    list = list.filter((s) => s.id !== id);
    saveStoriesList(list);
    renderSavedStoriesList();
    showToast('Tale expunged from the archive.', 'info');
  }

  function handleClearAllSaved() {
    const list = getSavedStories();
    if (list.length === 0) return;

    if (window.confirm('Are you certain you wish to purge all tales from your local Grimoire?')) {
      saveStoriesList([]);
      renderSavedStoriesList();
      showToast('All stories purged from Grimoire.', 'info');
    }
  }

  function handleExportJson() {
    const list = getSavedStories();
    if (list.length === 0) {
      showToast('No stories to export.', 'info');
      return;
    }

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(list, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `GhostGPT_Grimoire_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Grimoire exported as JSON! 📦', 'success');
  }

  // =========================================================================
  // Atmospheric Background Canvas Particles
  // =========================================================================

  function setupAtmosphereParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'spectral-mote';
      const size = Math.random() * 4 + 2;
      const posX = Math.random() * 100;
      const duration = Math.random() * 15 + 10;
      const delay = Math.random() * 10;

      particle.style.cssText = `
        position: absolute;
        bottom: -20px;
        left: ${posX}%;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(0, 255, 179, 0.7) 0%, rgba(168, 85, 247, 0) 70%);
        pointer-events: none;
        animation: floatMote ${duration}s linear infinite;
        animation-delay: -${delay}s;
      `;
      container.appendChild(particle);
    }

    // Inject mote keyframe into document
    const style = document.createElement('style');
    style.textContent = `
      @keyframes floatMote {
        0% { transform: translateY(0) translateX(0); opacity: 0; }
        20% { opacity: 0.8; }
        80% { opacity: 0.6; }
        100% { transform: translateY(-110vh) translateX(${Math.random() > 0.5 ? 40 : -40}px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // =========================================================================
  // Toast Notifications
  // =========================================================================

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '👻';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'all 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
