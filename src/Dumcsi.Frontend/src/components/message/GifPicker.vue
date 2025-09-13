<template>
  <div
      v-if="modelValue"
      ref="pickerContainer"
      class="absolute bottom-full right-0 mb-2 w-full max-w-sm rounded-lg shadow-xl bg-bg-base border border-main-700 z-50 flex flex-col"
  >
    <!-- Fejléc a keresőmezővel -->
    <div class="p-2 border-b border-bg-surface">
      <div class="relative">
        <input
            ref="searchInput"
            v-model="searchQuery"
            class="w-full bg-bg-input text-text-default p-2 pl-8 rounded-md border border-main-700  focus:ring-2 focus:ring-primary focus:outline-none"
            :placeholder="t('chat.gif.searchPlaceholder')"
            type="text"
        />
        <Search class="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"/>
      </div>
    </div>

    <!-- Kategóriák -->
    <div class="p-2 border-b border-bg-surface">
      <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
        <button
            :class="activeCategory === 'trending' ? 'bg-primary text-white' : 'bg-bg-surface hover:bg-main-700'"
            class="px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
            @click="showTrending"
        >
          {{ t('chat.gif.trending') }}
        </button>
        <button
            v-for="category in categories"
            :key="category.searchterm"
            :class="activeCategory === category.searchterm ? 'bg-primary text-white' : 'bg-bg-surface hover:bg-main-700'"
            class="px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors"
            @click="searchByCategory(category.searchterm)"
        >
          {{ category.searchterm }}
        </button>
      </div>
    </div>

    <!-- GIF rács -->
    <div
        ref="scrollableGrid"
        class="h-80 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800"
        @scroll="handleScroll"
    >
      <div v-if="loading && gifs.length === 0" class="flex justify-center items-center h-full">
        <Loader2 class="w-8 h-8 animate-spin text-primary"/>
      </div>
      <div v-else-if="error" class="text-center text-danger p-4">
        {{ error }}
      </div>
      <div v-else-if="gifs.length > 0" class="grid grid-cols-3 gap-1">
        <div
            v-for="gif in gifs"
            :key="gif.id"
            class="relative aspect-square bg-bg-surface rounded-md overflow-hidden cursor-pointer group"
            @click="selectGif(gif)"
            @mouseenter="playGif"
            @mouseleave="pauseGif"
        >
          <img
              :alt="gif.description"
              :data-animated-url="gif.animatedPreviewUrl"
              :data-preview-url="gif.previewUrl"
              :src="gif.previewUrl"
              class="w-full h-full object-cover pointer-events-none"
              loading="lazy"
          />
          <div
              class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span class="text-white font-bold text-xs">GIF</span>
          </div>
        </div>
      </div>
      <div v-else class="text-center text-text-muted p-4">{{ t('chat.gif.noResults') }}</div>
      <div v-if="loading && gifs.length > 0" class="flex justify-center items-center py-4">
        <Loader2 class="w-6 h-6 animate-spin text-primary"/>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref, watch, onUnmounted} from 'vue';
import { useI18n } from 'vue-i18n';
import {Loader2, Search} from 'lucide-vue-next';

// --- TÍPUSDEFINÍCIÓK ---
interface TenorMediaFormat {
  url: string;
}

interface TenorResult {
  id: string;
  media_formats: {
    gif: TenorMediaFormat;
    nanogif: TenorMediaFormat;
    tinygif: TenorMediaFormat;
  };
  content_description: string;
}

interface TenorCategory {
  searchterm: string;
}

interface Gif {
  id: string;
  url: string;
  previewUrl: string;
  animatedPreviewUrl: string;
  description: string;
}

// --- PROPS & EMITS ---
const props = defineProps({
  modelValue: {type: Boolean, required: true},
  toggleButton: {type: Object as () => HTMLElement | null, default: null},
});
const emit = defineEmits(['update:modelValue', 'select']);

// --- API KONFIGURÁCIÓ ---
const API_KEY = import.meta.env.VITE_TENOR_API_KEY || 'LIVDSRZULELA';
const CLIENT_KEY = 'dumcsi_app';
const BASE_URL = 'https://tenor.googleapis.com/v2';

// --- REAKTÍV ÁLLAPOTOK ---
const searchQuery = ref('');
const gifs = ref<Gif[]>([]);
const categories = ref<TenorCategory[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const { t } = useI18n();
const debounceTimer = ref<number | null>(null);
const activeCategory = ref('trending');
const nextPos = ref<string | null>(null);
const scrollableGrid = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);
const pickerContainer = ref<HTMLElement | null>(null);

// --- API HÍVÁSOK ---
async function fetchFromApi(endpoint: string, params: Record<string, any>) {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.search = new URLSearchParams({
    key: API_KEY,
    client_key: CLIENT_KEY,
    limit: '21',
    media_filter: 'tinygif,nanogif,gif',
    contentfilter: 'medium',
    ...params,
  }).toString();
  const response = await fetch(url.toString());
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
  }
  return response.json();
}

function mapResultsToGifs(results: TenorResult[]): Gif[] {
  return results.map(r => ({
    id: r.id,
    url: r.media_formats.gif.url,
    previewUrl: r.media_formats.tinygif.url,
    animatedPreviewUrl: r.media_formats.nanogif.url,
    description: r.content_description,
  }));
}

async function loadGifs(mode: 'trending' | 'search', query?: string, loadMore = false) {
  if (loading.value) return;
  loading.value = true;
  error.value = null;
  if (!loadMore) {
    gifs.value = [];
    nextPos.value = null;
    if (scrollableGrid.value) scrollableGrid.value.scrollTop = 0;
  }
  try {
    const endpoint = mode === 'search' ? 'search' : 'featured';
    const params: Record<string, any> = {};
    if (mode === 'search' && query) params.q = query;
    if (loadMore && nextPos.value) params.pos = nextPos.value;
    const data = await fetchFromApi(endpoint, params);
    const newGifs = mapResultsToGifs(data.results || []);
    gifs.value = loadMore ? [...gifs.value, ...newGifs] : newGifs;
    nextPos.value = data.next || null;
  } catch (e: any) {
    error.value = t('chat.gif.loadError');
  } finally {
    loading.value = false;
  }
}

async function fetchCategories() {
  try {
    const data = await fetchFromApi('categories', {type: 'featured'});
    categories.value = (data.tags || []).slice(0, 10);
  } catch (e) {
    console.error('Failed to fetch categories:', e);
  }
}

// --- ESEMÉNYKEZELŐK ---
function showTrending() {
  activeCategory.value = 'trending';
  searchQuery.value = '';
  loadGifs('trending');
}

function searchByCategory(term: string) {
  activeCategory.value = term;
  searchQuery.value = term;
}

function selectGif(gif: Gif) {
  emit('select', gif.url); // A teljes méretű GIF URL-jét küldjük
  closePicker();
}

function playGif(event: MouseEvent) {
  const img = event.target as HTMLImageElement;
  const animatedUrl = img.dataset.animatedUrl;
  if (animatedUrl) img.src = animatedUrl;
}

function pauseGif(event: MouseEvent) {
  const img = event.target as HTMLImageElement;
  const previewUrl = img.dataset.previewUrl;
  if (previewUrl) img.src = previewUrl;
}

function handleScroll() {
  const el = scrollableGrid.value;
  if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 200 && !loading.value && nextPos.value) {
    loadGifs(searchQuery.value ? 'search' : 'trending', searchQuery.value || undefined, true);
  }
}

function closePicker() {
  emit('update:modelValue', false);
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node;
  const isOutsidePicker = pickerContainer.value && !pickerContainer.value.contains(target);
  const isOutsideToggleButton = props.toggleButton && !props.toggleButton.contains(target);
  if (isOutsidePicker && isOutsideToggleButton) {
    closePicker();
  }
}

// --- WATCHEREK & ÉLETCIKLUS ---
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    if (gifs.value.length === 0) loadGifs('trending');
    if (categories.value.length === 0) fetchCategories();
    setTimeout(() => {
      window.addEventListener('click', handleClickOutside);
      searchInput.value?.focus();
    }, 0);
  } else {
    window.removeEventListener('click', handleClickOutside);
  }
});
watch(searchQuery, (newQuery) => {
  if (debounceTimer.value) clearTimeout(debounceTimer.value);
  debounceTimer.value = window.setTimeout(() => {
    const trimmedQuery = newQuery.trim();
    if (trimmedQuery) {
      activeCategory.value = trimmedQuery;
      loadGifs('search', trimmedQuery);
    } else if (activeCategory.value !== 'trending') {
      showTrending();
    }
  }, 350);
});
onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside);
});
</script>
