<template>
  <!-- A v-if="modelValue" biztosítja, hogy a komponens csak akkor legyen a DOM-ban, ha látható. -->
  <div
      v-if="modelValue"
      ref="pickerContainer"
      class="absolute bottom-full mb-2 w-full max-w-sm rounded-lg shadow-xl bg-bg-main border border-bg-light z-50 flex flex-col"
  >
    <!-- Fejléc a keresőmezővel -->
    <div class="p-2 border-b border-bg-surface">
      <div class="relative">
        <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            placeholder="Search Tenor"
            class="w-full bg-bg-input text-text-default p-2 pl-8 rounded-md border border-bg-light focus:ring-2 focus:ring-primary focus:outline-none"
        />
        <Search class="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
      </div>
    </div>

    <!-- Kategóriák vagy fülválasztók -->
    <div class="p-2 border-b border-bg-surface">
      <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        <button
            @click="showTrending"
            :class="activeCategory === 'trending' ? 'bg-primary text-white' : 'bg-bg-surface hover:bg-bg-light'"
            class="px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
        >
          Trending
        </button>
        <button
            v-for="category in categories"
            :key="category.searchterm"
            @click="searchByCategory(category.searchterm)"
            :class="activeCategory === category.searchterm ? 'bg-primary text-white' : 'bg-bg-surface hover:bg-bg-light'"
            class="px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors"
        >
          {{ category.searchterm }}
        </button>
      </div>
    </div>

    <!-- GIF rács -->
    <div
        ref="scrollableGrid"
        class="h-80 overflow-y-auto p-2"
        @scroll="handleScroll"
    >
      <!-- Betöltés jelzése -->
      <div v-if="loading && gifs.length === 0" class="flex justify-center items-center h-full">
        <Loader2 class="w-8 h-8 animate-spin text-primary" />
      </div>
      <!-- Hibaüzenet -->
      <div v-else-if="error" class="text-center text-danger p-4">
        {{ error }}
      </div>
      <!-- GIF-ek megjelenítése -->
      <div v-else-if="gifs.length > 0" class="grid grid-cols-3 gap-1">
        <div
            v-for="gif in gifs"
            :key="gif.id"
            class="relative aspect-square bg-bg-surface rounded-md overflow-hidden cursor-pointer group"
            @click="selectGif(gif)"
            @mouseenter="playGif"
            @mouseleave="pauseGif"
        >
          <!-- A `data-src` attribútumokat használjuk a statikus és animált verziók közötti váltáshoz -->
          <img
              :src="gif.previewUrl"
              :data-preview-url="gif.previewUrl"
              :data-animated-url="gif.animatedPreviewUrl"
              :alt="gif.description"
              class="w-full h-full object-cover pointer-events-none"
              loading="lazy"
          />
          <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span class="text-white font-bold text-xs">GIF</span>
          </div>
        </div>
      </div>
      <!-- Ha nincs találat -->
      <div v-else class="text-center text-text-muted p-4">
        No GIFs found. Try another search.
      </div>
      <!-- További elemek betöltésekor megjelenő spinner -->
      <div v-if="loading && gifs.length > 0" class="flex justify-center items-center py-4">
        <Loader2 class="w-6 h-6 animate-spin text-primary" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, onUnmounted } from 'vue';
import { Loader2, Search } from 'lucide-vue-next';

// --- TÍPUSDEFINÍCIÓK ---

interface TenorMediaFormat {
  url: string;
  dims: number[];
  duration: number;
  size: number;
}

interface TenorResult {
  id: string;
  title: string;
  media_formats: {
    gif: TenorMediaFormat;
    nanogif: TenorMediaFormat;
    tinygif: TenorMediaFormat;
  };
  content_description: string;
}

interface TenorCategory {
  searchterm: string;
  path: string;
  image: string;
  name: string;
}

interface Gif {
  id: string;
  url: string;
  previewUrl: string;
  animatedPreviewUrl: string;
  description: string;
}

// --- PROPS ÉS EMITS ---

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  toggleButton: {
    type: Object as () => HTMLElement | null,
    default: null,
  },
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
const debounceTimer = ref<number | null>(null);
const activeCategory = ref('trending');
const nextPos = ref<string | null>(null);

// DOM referenciák
const scrollableGrid = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);
const pickerContainer = ref<HTMLElement | null>(null);

// --- API HÍVÁSOK ---

async function fetchFromApi(endpoint: string, params: Record<string, any>): Promise<{ results: TenorResult[], next: string }> {
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
    console.error('Failed to fetch GIFs:', e);
    error.value = 'Could not load GIFs. Please try again later.';
  } finally {
    loading.value = false;
  }
}

async function fetchCategories() {
  try {
    const url = new URL(`${BASE_URL}/categories`);
    url.search = new URLSearchParams({
      key: API_KEY,
      client_key: CLIENT_KEY,
      type: 'featured',
      contentfilter: 'medium',
    }).toString();

    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }
    const data: { tags: TenorCategory[] } = await response.json();
    categories.value = (data.tags || []).slice(0, 10);
  } catch (e: any) {
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
  emit('select', gif.url);
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

/**
 * Kezeli a kattintásokat az ablakon, hogy bezárja a pickert, ha mellé kattintunk.
 */
function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node;

  // Bezárjuk, ha a kattintás a következőkön kívül esik:
  // 1. Maga a picker komponens
  // 2. A gomb, ami megnyitja (a szülőtől kapjuk prop-ként)
  const isOutsidePicker = pickerContainer.value && !pickerContainer.value.contains(target);
  const isOutsideToggleButton = props.toggleButton && !props.toggleButton.contains(target);

  if (isOutsidePicker && isOutsideToggleButton) {
    closePicker();
  }
}

// --- ÉLETCIKLUS HORGOK ÉS WATCHEREK ---

// Figyeli a láthatóságot (v-model)
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    if (gifs.value.length === 0) loadGifs('trending');
    if (categories.value.length === 0) fetchCategories();

    // Késleltetve adjuk hozzá az eseményfigyelőt, hogy a megnyitó kattintás ne zárja be azonnal.
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
  // Biztonsági okokból eltávolítjuk a listenert, ha a komponens megszűnik.
  window.removeEventListener('click', handleClickOutside);
});

</script>

<style scoped>
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: var(--color-text-muted) transparent;
}
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: var(--color-text-muted);
  border-radius: 3px;
}
</style>