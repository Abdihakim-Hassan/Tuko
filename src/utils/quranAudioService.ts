import { getSomaliTafsirAudio } from './somaliTafsirService';
import { QURAN_SURAHS } from './quranData';

// Quran Audio & Text Service for Tuko App
// Supports 5 famous reciters, Uthmani Arabic script, and Somali translation

export interface Reciter {
  id: string;
  name: string;
  arabicName: string;
  subfolder: string;
  description: string;
}

export const QURAN_RECITERS: Reciter[] = [
  {
    id: 'alafasy',
    name: 'Mishary Rashid Al-Afasy',
    arabicName: 'مشاري راشد العفاسي',
    subfolder: 'Alafasy_128kbps',
    description: 'Cod aad u macaan oo deggan (Kuwait)',
  },
  {
    id: 'abdulbasit',
    name: 'Cabdulbaasid Cabdussamad',
    arabicName: 'عبد الباسط عبد الصمد',
    subfolder: 'Abdul_Basit_Murattal_192kbps',
    description: 'Murattal caan ah oo taariikhi ah (Masar)',
  },
  {
    id: 'maher',
    name: 'Maher Al-Muaiqly',
    arabicName: 'ماهر المعيقلي',
    subfolder: 'MaherAlMuaiqly128kbps',
    description: 'Imaamka Masjidka Xaramka ee Maka (Cod xooggan oo qiiro leh)',
  },
  {
    id: 'minshawi',
    name: 'Maxamed Siddiiq Al-Minshawi',
    arabicName: 'محمد صديق المنشاوي',
    subfolder: 'Minshawy_Murattal_128kbps',
    description: 'Murattal aad u sarreeya oo xushmad leh (Masar)',
  },
  {
    id: 'sudais',
    name: 'Cabdiraxmaan As-Sudais',
    arabicName: 'عبد الرحمن السديس',
    subfolder: 'Abdurrahmaan_As-Sudais_192kbps',
    description: 'Imaamka Guud ee Labada Xaramayn',
  },
  {
    id: 'alijaber',
    name: 'Sheikh Cali Jaabir (Ali Jaber)',
    arabicName: 'علي عبد الله جابر',
    subfolder: 'Ali_Jaber_64kbps',
    description: 'Imaamkii caanka ahaa ee Masjidka Xaramka (Cod qalbi-taabasho & khushuuc badan)',
  },
  {
    id: 'ayyub',
    name: 'Sheikh Maxamed Ayuub (Muhammad Ayyub)',
    arabicName: 'محمد أيوب',
    subfolder: 'Muhammad_Ayyoub_128kbps',
    description: 'Imaamkii caanka ahaa ee Masjidka Nabiga ﷺ ee Madiina (Cod macaan oo xasilloon)',
  },
  {
    id: 'badralturki',
    name: 'Sheikh Badr Al-Turki (Badr Al-Turkey)',
    arabicName: 'بدر التركي',
    subfolder: 'Nasser_Alqatami_128kbps',
    description: 'Imaamka Masjidka Xaramka ee Makkah — cod aad u qiiro iyo khushuuc badan',
  },
  {
    id: 'umarsildinskiy',
    name: 'Umar Sildinskiy (Cumar Al-Sildinski)',
    arabicName: 'عمر سيلدينسكي',
    subfolder: 'Yasser_Ad-Dussary_128kbps',
    description: 'Tilmaamaha codka dhalinyarada ee aadka u macaan oo qiiro badan',
  },
  {
    id: 'ghamadi',
    name: 'Sacd Al-Ghamdi',
    arabicName: 'سعد الغامدي',
    subfolder: 'Ghamadi_40kbps',
    description: 'Akhris xasiloon oo deggan (Sucuudiga)',
  },
];

export interface AyahDetail {
  number: number;
  numberInSurah: number;
  juz: number;
  page: number;
  textArabic: string;
  textSomali: string;
  audioUrl?: string;
}

export interface SurahDetails {
  number: number;
  nameArabic: string;
  nameEnglish: string;
  revelationType: string;
  numberOfAyahs: number;
  bismillahPre: boolean;
  ayahs: AyahDetail[];
}

/**
 * Returns the direct MP3 audio stream for a specific ayah and reciter
 */
export function getAyahAudioUrl(reciterId: string, surahNumber: number, ayahNumber: number): string {
  const surahStr = String(surahNumber).padStart(3, '0');
  if (reciterId === 'badralturki') {
    return `https://server10.mp3quran.net/badr/${surahStr}.mp3`;
  }
  const reciter = QURAN_RECITERS.find((r) => r.id === reciterId) || QURAN_RECITERS[0];
  const ayahStr = String(ayahNumber).padStart(3, '0');
  return `https://everyayah.com/data/${reciter.subfolder}/${surahStr}${ayahStr}.mp3`;
}

// Built-in offline fallbacks for key short surahs in case offline or API is unreachable
const OFFLINE_SURAHS: Record<number, SurahDetails> = {
  1: {
    number: 1,
    nameArabic: 'سُورَةُ ٱلْفَاتِحَةِ',
    nameEnglish: 'Al-Faatiha',
    revelationType: 'Meccan',
    numberOfAyahs: 7,
    bismillahPre: false,
    ayahs: [
      {
        number: 1,
        numberInSurah: 1,
        juz: 1,
        page: 1,
        textArabic: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
        textSomali: 'Magaca Eebe yaan kubillaabaynaa ee Naxariis guud iyo mid gaaraba Naxariista.',
      },
      {
        number: 2,
        numberInSurah: 2,
        juz: 1,
        page: 1,
        textArabic: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ',
        textSomali: 'Mahad Eebaa iska leh ee Barbaariyaha Caalamka ah (Koonka).',
      },
      {
        number: 3,
        numberInSurah: 3,
        juz: 1,
        page: 1,
        textArabic: 'ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
        textSomali: 'Ee Naxariis guud iyo mid gaaraba Naxariista.',
      },
      {
        number: 4,
        numberInSurah: 4,
        juz: 1,
        page: 1,
        textArabic: 'مَٰلِكِ يَوْمِ ٱلدِّينِ',
        textSomali: 'Ee Hantiyaha Maalinta Abaalmarinta (Qiyaamada).',
      },
      {
        number: 5,
        numberInSurah: 5,
        juz: 1,
        page: 1,
        textArabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
        textSomali: 'Adiga kaliya yaan ku caabudaynaa, Adigana kaligaa yaan kaalmo waydiisanaynaa.',
      },
      {
        number: 6,
        numberInSurah: 6,
        juz: 1,
        page: 1,
        textArabic: 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ',
        textSomali: 'Nagu hanuuni Jidka Toosan.',
      },
      {
        number: 7,
        numberInSurah: 7,
        juz: 1,
        page: 1,
        textArabic: 'صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ',
        textSomali: 'Jidka kuwii aad u Nicmaysay, oon ahayn kuwa lagu cadhooday iyo kuwa lunsan midna.',
      },
    ],
  },
  112: {
    number: 112,
    nameArabic: 'سُورَةُ الإِخْلَاصِ',
    nameEnglish: 'Al-Ikhlaas',
    revelationType: 'Meccan',
    numberOfAyahs: 4,
    bismillahPre: true,
    ayahs: [
      {
        number: 6222,
        numberInSurah: 1,
        juz: 30,
        page: 604,
        textArabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
        textSomali: 'Waxaad dhahdaa: Eebe waa Kow (kali ah).',
      },
      {
        number: 6223,
        numberInSurah: 2,
        juz: 30,
        page: 604,
        textArabic: 'اللَّهُ الصَّمَدُ',
        textSomali: 'Eebe waa kan loo baahanyahay (ee aan cidna u baahnayn).',
      },
      {
        number: 6224,
        numberInSurah: 3,
        juz: 30,
        page: 604,
        textArabic: 'لَمْ يَلِدْ وَلَمْ يُولَدْ',
        textSomali: 'Waxna ma dhalin, Isagana lama dhalin.',
      },
      {
        number: 6225,
        numberInSurah: 4,
        juz: 30,
        page: 604,
        textArabic: 'وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ',
        textSomali: 'Cid la mid ahina ma jirto.',
      },
    ],
  },
  113: {
    number: 113,
    nameArabic: 'سُورَةُ الفَلَقِ',
    nameEnglish: 'Al-Falaq',
    revelationType: 'Meccan',
    numberOfAyahs: 5,
    bismillahPre: true,
    ayahs: [
      {
        number: 6226,
        numberInSurah: 1,
        juz: 30,
        page: 604,
        textArabic: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ',
        textSomali: 'Waxaad dhahdaa: Waxaan Magan galay Barbaariyaha Waaberiga.',
      },
      {
        number: 6227,
        numberInSurah: 2,
        juz: 30,
        page: 604,
        textArabic: 'مِن شَرِّ مَا خَلَقَ',
        textSomali: 'Shar waxuu abuuray.',
      },
      {
        number: 6228,
        numberInSurah: 3,
        juz: 30,
        page: 604,
        textArabic: 'وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ',
        textSomali: 'Iyo shar habeennimo markay mugdigeeda fidiso.',
      },
      {
        number: 6229,
        numberInSurah: 4,
        juz: 30,
        page: 604,
        textArabic: 'وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ',
        textSomali: 'Iyo sharka kuwa guntimaha wax ku afuufa (saaxiriinta).',
      },
      {
        number: 6230,
        numberInSurah: 5,
        juz: 30,
        page: 604,
        textArabic: 'وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ',
        textSomali: 'Iyo sharka midka xaasidka ah markuu xaasidnimo falayo.',
      },
    ],
  },
  114: {
    number: 114,
    nameArabic: 'سُورَةُ النَّاسِ',
    nameEnglish: 'An-Naas',
    revelationType: 'Meccan',
    numberOfAyahs: 6,
    bismillahPre: true,
    ayahs: [
      {
        number: 6231,
        numberInSurah: 1,
        juz: 30,
        page: 604,
        textArabic: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ',
        textSomali: 'Waxaad dhahdaa: Waxaan Magan galay Barbaariyaha Dadka.',
      },
      {
        number: 6232,
        numberInSurah: 2,
        juz: 30,
        page: 604,
        textArabic: 'مَلِكِ النَّاسِ',
        textSomali: 'Boqorka Dadka.',
      },
      {
        number: 6233,
        numberInSurah: 3,
        juz: 30,
        page: 604,
        textArabic: 'إِلَٰهِ النَّاسِ',
        textSomali: 'Ilaaha Dadka.',
      },
      {
        number: 6234,
        numberInSurah: 4,
        juz: 30,
        page: 604,
        textArabic: 'مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ',
        textSomali: 'Sharka Waswaas-bixiyaha dib u guranaya (Shaydaanka).',
      },
      {
        number: 6235,
        numberInSurah: 5,
        juz: 30,
        page: 604,
        textArabic: 'الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ',
        textSomali: 'Kee wax ku waswaasiya laabaha Dadka.',
      },
      {
        number: 6236,
        numberInSurah: 6,
        juz: 30,
        page: 604,
        textArabic: 'مِنَ الْجِنَّةِ وَالنَّاسِ',
        textSomali: 'Kuu doono ha ahaado mid Jinni iyo mid Dadba.',
      },
    ],
  },
};

const SURAH_MEMORY_CACHE: Record<number, SurahDetails> = {};
const QURAN_DATA_CACHE_NAME = 'tuko-quran-data-v1';
const QURAN_AUDIO_CACHE_NAME = 'tuko-audio-cache-v2';

/**
 * Fetches the full Arabic text and Somali translation of any surah (1-114).
 * 100% Offline-first:
 * 1. In-memory cache (0ms)
 * 2. Browser CacheStorage (unlimited quota, stores all 114 surahs)
 * 3. localStorage cache
 * 4. Built-in offline JSON package (/data/quran/{surahNumber}.json)
 * 5. Remote API fallback
 */
export async function fetchSurahWithTranslation(surahNumber: number): Promise<SurahDetails> {
  if (SURAH_MEMORY_CACHE[surahNumber]) {
    return SURAH_MEMORY_CACHE[surahNumber];
  }

  const cacheKey = `tuko_surah_cache_v1_${surahNumber}`;
  const localJsonUrl = `/data/quran/${surahNumber}.json`;

  // 1. Check CacheStorage first (holds all 114 Surahs without 5MB localStorage limit)
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const matched = await caches.match(localJsonUrl);
      if (matched && matched.ok) {
        const data = (await matched.json()) as SurahDetails;
        if (data && Array.isArray(data.ayahs) && data.ayahs.length > 0) {
          SURAH_MEMORY_CACHE[surahNumber] = data;
          return data;
        }
      }
    } catch (_) {}
  }

  // 2. Check localStorage cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as SurahDetails;
      if (parsed && Array.isArray(parsed.ayahs) && parsed.ayahs.length > 0) {
        SURAH_MEMORY_CACHE[surahNumber] = parsed;
        return parsed;
      }
    }
  } catch (e) {
    // Ignore cache parse failure
  }

  // 3. Fetch from built-in offline Quran dataset (/data/quran/{n}.json) and store in CacheStorage
  try {
    const localRes = await fetch(localJsonUrl);
    if (localRes.ok) {
      const clone = localRes.clone();
      const localData = (await localRes.json()) as SurahDetails;
      if (localData && Array.isArray(localData.ayahs) && localData.ayahs.length > 0) {
        SURAH_MEMORY_CACHE[surahNumber] = localData;
        if (typeof window !== 'undefined' && 'caches' in window) {
          caches
            .open(QURAN_DATA_CACHE_NAME)
            .then((cache) => cache.put(localJsonUrl, clone))
            .catch(() => {});
        }
        try {
          localStorage.setItem(cacheKey, JSON.stringify(localData));
        } catch (_) {}
        return localData;
      }
    }
  } catch (localErr) {
    console.warn(`Local offline quran file fetch notice for surah ${surahNumber}:`, localErr);
  }

  // 4. Fallback to high availability Quran Cloud API if online
  try {
    const response = await fetch(
      `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,so.abduh`
    );

    if (response.ok) {
      const json = await response.json();
      if (json.code === 200 && Array.isArray(json.data) && json.data.length >= 2) {
        const arabicData = json.data[0];
        const somaliData = json.data[1];

        const ayahs: AyahDetail[] = arabicData.ayahs.map((arabicAyah: any, index: number) => {
          const somaliAyah = somaliData.ayahs[index];
          let textArabic = arabicAyah.text || '';

          // Clean leading bismillah in surah 2-114 if it comes combined in ayah 1 text except Al-Faatiha
          if (surahNumber !== 1 && surahNumber !== 9 && arabicAyah.numberInSurah === 1) {
            const bismillahStr = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
            if (textArabic.startsWith(bismillahStr)) {
              textArabic = textArabic.replace(bismillahStr, '').trim();
            }
          }

          return {
            number: arabicAyah.number,
            numberInSurah: arabicAyah.numberInSurah,
            juz: arabicAyah.juz,
            page: arabicAyah.page,
            textArabic,
            textSomali: somaliAyah?.text || '',
          };
        });

        const result: SurahDetails = {
          number: arabicData.number,
          nameArabic: arabicData.name,
          nameEnglish: arabicData.englishName,
          revelationType: arabicData.revelationType,
          numberOfAyahs: arabicData.numberOfAyahs,
          bismillahPre: surahNumber !== 1 && surahNumber !== 9,
          ayahs,
        };

        SURAH_MEMORY_CACHE[surahNumber] = result;
        if (typeof window !== 'undefined' && 'caches' in window) {
          caches
            .open(QURAN_DATA_CACHE_NAME)
            .then((cache) =>
              cache.put(
                localJsonUrl,
                new Response(JSON.stringify(result), {
                  headers: { 'Content-Type': 'application/json' },
                })
              )
            )
            .catch(() => {});
        }
        try {
          localStorage.setItem(cacheKey, JSON.stringify(result));
        } catch (err) {}

        return result;
      }
    }
  } catch (error) {
    console.warn(`Quran remote fetch notice for surah ${surahNumber}:`, error);
  }

  // 5. Fallback to hardcoded offline store if available
  if (OFFLINE_SURAHS[surahNumber]) {
    return OFFLINE_SURAHS[surahNumber];
  }

  // 6. Fallback error
  throw new Error(`Lama soo celin karo Suuradda #${surahNumber}. Fadlan hubi khadkaaga internet-ka.`);
}

let isPreCachingQuran = false;

/**
 * Ensures all 114 Surahs (Arabic text + Somali translation) are stored in CacheStorage
 * so the user can read any Surah 100% offline at any time.
 */
export async function ensureAll114SurahsCachedOffline(
  onProgress?: (cachedCount: number, total: number) => void
): Promise<number> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return 114;
  }

  try {
    const cache = await caches.open(QURAN_DATA_CACHE_NAME);
    const keys = await cache.keys();
    const cachedSet = new Set<number>();

    for (const req of keys) {
      const m = req.url.match(/\/data\/quran\/(\d+)\.json$/);
      if (m) cachedSet.add(Number(m[1]));
    }

    if (cachedSet.size >= 114) {
      onProgress?.(114, 114);
      try {
        localStorage.setItem('tuko_all_114_quran_offline_ready', 'true');
      } catch {}
      return 114;
    }

    if (isPreCachingQuran) {
      onProgress?.(cachedSet.size, 114);
      return cachedSet.size;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      onProgress?.(cachedSet.size, 114);
      return cachedSet.size;
    }

    isPreCachingQuran = true;
    const missing: number[] = [];
    for (let i = 1; i <= 114; i++) {
      if (!cachedSet.has(i)) missing.push(i);
    }

    let count = cachedSet.size;
    onProgress?.(count, 114);

    // Fetch in small batches of 8 so we never block the UI thread or network
    const BATCH_SIZE = 8;
    for (let idx = 0; idx < missing.length; idx += BATCH_SIZE) {
      const batch = missing.slice(idx, idx + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (sNum) => {
          const url = `/data/quran/${sNum}.json`;
          const res = await fetch(url);
          if (res.ok) {
            await cache.put(url, res);
            count++;
          }
        })
      );
      onProgress?.(count, 114);
    }

    if (count >= 114) {
      try {
        localStorage.setItem('tuko_all_114_quran_offline_ready', 'true');
      } catch {}
    }
    isPreCachingQuran = false;
    return count;
  } catch {
    isPreCachingQuran = false;
    return 0;
  }
}

const BLOB_URL_MEMORY_CACHE = new Map<string, string>();

function getOfflineSurahSetKey(reciterId: string): string {
  return `tuko_offline_surahs_v2_${reciterId}`;
}

export function getMarkedOfflineSurahs(reciterId: string = 'alafasy'): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(getOfflineSurahSetKey(reciterId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.map(Number).filter((n) => n >= 1 && n <= 114));
  } catch {}
  return new Set();
}

export function markSurahOfflineReady(reciterId: string, surahNumber: number): void {
  if (typeof window === 'undefined') return;
  try {
    const set = getMarkedOfflineSurahs(reciterId);
    set.add(surahNumber);
    localStorage.setItem(getOfflineSurahSetKey(reciterId), JSON.stringify(Array.from(set)));
  } catch {}
}

/**
 * Fetches an audio MP3 with CORS (status 200 Blob) and stores it in CacheStorage.
 * Automatically replaces any legacy opaque (status 0) cache entry so offline <audio> playback works 100%.
 */
async function fetchAndCacheAudioBlob(
  cache: Cache,
  url: string,
  timeoutMs: number = 12000,
  parentSignal?: AbortSignal
): Promise<boolean> {
  if (!url) return false;
  try {
    const existing = await cache.match(url);
    if (existing && existing.status === 200) {
      return true;
    }
  } catch {}

  for (let attempt = 0; attempt < 2; attempt++) {
    if (parentSignal?.aborted) return false;
    const controller = new AbortController();
    const onParentAbort = () => controller.abort();
    parentSignal?.addEventListener('abort', onParentAbort, { once: true });
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal,
      });
      if (res && res.ok) {
        const blob = await res.blob();
        if (blob && blob.size > 200) {
          const cleanResponse = new Response(blob, {
            status: 200,
            headers: {
              'Content-Type': 'audio/mpeg',
              'Content-Length': String(blob.size),
            },
          });
          await cache.put(url, cleanResponse);
          return true;
        }
      }
    } catch {
      // Retry once if first attempt timed out or dropped
    } finally {
      clearTimeout(timer);
      parentSignal?.removeEventListener('abort', onParentAbort);
    }
  }

  return false;
}

/**
 * Resolves a playable audio URL for <audio src="...">.
 * If cached in CacheStorage as a 200 OK Blob, returns a local blob: URL so it plays 100% offline
 * in Android WebView, Chrome, and Safari without any network or Range-header failures!
 */
export async function resolvePlayableAudioSrc(audioUrl: string): Promise<string> {
  if (typeof window === 'undefined' || !audioUrl) return audioUrl;

  const existingBlobUrl = BLOB_URL_MEMORY_CACHE.get(audioUrl);
  if (existingBlobUrl) return existingBlobUrl;

  if ('caches' in window) {
    try {
      const cache = await caches.open(QURAN_AUDIO_CACHE_NAME);
      const matched = await cache.match(audioUrl);
      if (matched && matched.status === 200) {
        const blob = await matched.blob();
        if (blob && blob.size > 200) {
          if (BLOB_URL_MEMORY_CACHE.size >= 45) {
            const oldestKey = BLOB_URL_MEMORY_CACHE.keys().next().value;
            if (oldestKey) {
              const oldUrl = BLOB_URL_MEMORY_CACHE.get(oldestKey);
              if (oldUrl) {
                try {
                  URL.revokeObjectURL(oldUrl);
                } catch {}
              }
              BLOB_URL_MEMORY_CACHE.delete(oldestKey);
            }
          }
          const blobUrl = URL.createObjectURL(blob);
          BLOB_URL_MEMORY_CACHE.set(audioUrl, blobUrl);
          return blobUrl;
        }
      }
    } catch {}
  }

  // If online and not yet cached, cache in the background for next time
  if (typeof navigator !== 'undefined' && navigator.onLine && 'caches' in window) {
    caches
      .open(QURAN_AUDIO_CACHE_NAME)
      .then((cache) => fetchAndCacheAudioBlob(cache, audioUrl, 15000))
      .catch(() => {});
  }

  return audioUrl;
}

/**
 * Checks if a single audio URL (e.g. Somali Tafsir MP3) is cached as a valid 200 OK Blob for offline playback.
 */
export async function isAudioUrlCachedOffline(audioUrl: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window) || !audioUrl) return false;
  try {
    const cache = await caches.open(QURAN_AUDIO_CACHE_NAME);
    const matched = await cache.match(audioUrl);
    return !!(matched && matched.status === 200);
  } catch {
    return false;
  }
}

/**
 * Downloads and caches a single audio URL (e.g. Somali Tafsir MP3) into CacheStorage for offline playback.
 */
export async function downloadAudioUrlForOffline(audioUrl: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window) || !audioUrl) return false;
  try {
    const cache = await caches.open(QURAN_AUDIO_CACHE_NAME);
    return await fetchAndCacheAudioBlob(cache, audioUrl, 25000);
  } catch {
    return false;
  }
}

/**
 * Checks if a Surah's Ayah recitations for a given reciter are cached offline.
 */
export async function isSurahRecitationCachedOffline(
  reciterId: string,
  surahNumber: number,
  totalAyahs: number
): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window) || totalAyahs <= 0) return false;
  try {
    const cache = await caches.open(QURAN_AUDIO_CACHE_NAME);
    const firstUrl = getAyahAudioUrl(reciterId, surahNumber, 1);
    const lastUrl = getAyahAudioUrl(reciterId, surahNumber, totalAyahs);
    const [m1, m2] = await Promise.all([cache.match(firstUrl), cache.match(lastUrl)]);
    const isReady = !!(m1 && m1.status === 200 && m2 && m2.status === 200);
    if (isReady) {
      markSurahOfflineReady(reciterId, surahNumber);
    }
    return isReady;
  } catch {
    return false;
  }
}

/**
 * Downloads all Ayah MP3s of a Surah for a specific reciter into CacheStorage so it works 100% offline.
 */
export async function downloadSurahRecitationOffline(
  reciterId: string,
  surahNumber: number,
  totalAyahs: number,
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal
): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window) || totalAyahs <= 0) return false;
  try {
    const cache = await caches.open(QURAN_AUDIO_CACHE_NAME);
    let successCount = 0;
    let processedCount = 0;
    onProgress?.(0, totalAyahs);

    const BATCH_SIZE = 8;
    for (let start = 1; start <= totalAyahs; start += BATCH_SIZE) {
      if (signal?.aborted) return false;
      const urls: string[] = [];
      for (let a = start; a < start + BATCH_SIZE && a <= totalAyahs; a++) {
        urls.push(getAyahAudioUrl(reciterId, surahNumber, a));
      }
      await Promise.all(
        urls.map(async (u) => {
          const ok = await fetchAndCacheAudioBlob(cache, u, 12000, signal);
          if (ok) successCount++;
          processedCount++;
          onProgress?.(processedCount, totalAyahs);
        })
      );
    }
    const allOk = successCount >= totalAyahs;
    if (allOk) {
      markSurahOfflineReady(reciterId, surahNumber);
    }
    return allOk;
  } catch {
    return false;
  }
}

export interface BatchDownloadProgress {
  currentSurahIndex: number;
  totalSurahs: number;
  currentSurahNumber: number;
  currentSurahName: string;
  percent: number;
  isDone: boolean;
  statusText: string;
  completedSurahs?: number;
  failedSurahs?: number;
}

export interface BatchDownloadOptions {
  reciterId?: string;
  downloadRecitation?: boolean;
  downloadTafsir?: boolean;
  tafsirScholarId?: string;
  onProgress?: (progress: BatchDownloadProgress) => void;
  signal?: AbortSignal;
}

export const OFFLINE_PRESET_FAST_16: number[] = [
  1, // Al-Faatixa
  36, // Yaa-Siin
  67, // Al-Mulk
  102,
  103,
  104,
  105,
  106,
  107,
  108,
  109,
  110,
  111,
  112,
  113,
  114,
];

export const OFFLINE_PRESET_DAILY_SURAHS: number[] = [
  1, // Al-Faatixa
  18, // Al-Kahf
  36, // Yaa-Siin
  55, // Ar-Raxmaan
  56, // Al-Waaqica
  67, // Al-Mulk
  // Juz Camma (78 to 114)
  ...Array.from({ length: 37 }, (_, i) => 78 + i),
];

export const OFFLINE_PRESET_JUZ_AMMA: number[] = Array.from({ length: 37 }, (_, i) => 78 + i);
export const OFFLINE_PRESET_ALL_114: number[] = Array.from({ length: 114 }, (_, i) => i + 1);

/**
 * Downloads multiple Surahs (Audio, Text, Somali Tafsir) into CacheStorage as real 200 OK Blobs
 * so they play 100% offline via blob: URLs in Android WebView and mobile browsers.
 */
export async function batchDownloadQuranOffline(
  surahNumbers: number[],
  options: BatchDownloadOptions = {}
): Promise<{ success: boolean; completedCount: number }> {
  if (typeof window === 'undefined' || !('caches' in window) || surahNumbers.length === 0) {
    return { success: false, completedCount: 0 };
  }

  const {
    reciterId = 'alafasy',
    downloadRecitation = true,
    downloadTafsir = false,
    tafsirScholarId = 'sheikh_cabdulqaadir',
    onProgress,
    signal,
  } = options;

  try {
    const audioCache = await caches.open(QURAN_AUDIO_CACHE_NAME);
    const dataCache = await caches.open(QURAN_DATA_CACHE_NAME);
    const totalSurahs = surahNumbers.length;
    let completedCount = 0;
    let failedCount = 0;

    // Calculate total ayah steps for smooth 1%..100% progress bar movement
    const totalAyahSteps = surahNumbers.reduce((acc, sNum) => {
      const m = QURAN_SURAHS.find((s) => s.number === sNum);
      return acc + (downloadRecitation ? (m?.verses || 7) : 1) + (downloadTafsir ? 2 : 0);
    }, 0);
    let completedSteps = 0;

    for (let i = 0; i < totalSurahs; i++) {
      if (signal?.aborted) {
        return { success: false, completedCount };
      }

      const surahNum = surahNumbers[i];
      const meta = QURAN_SURAHS.find((s) => s.number === surahNum);
      const surahName = meta ? `${meta.number}. ${meta.nameSomali}` : `Suuradda ${surahNum}`;
      const totalVerses = meta?.verses || 7;

      const calcPercent = () =>
        Math.min(99, Math.max(2, Math.round((completedSteps / Math.max(1, totalAyahSteps)) * 100)));

      onProgress?.({
        currentSurahIndex: i + 1,
        totalSurahs,
        currentSurahNumber: surahNum,
        currentSurahName: surahName,
        percent: calcPercent(),
        isDone: false,
        statusText: `Waxaa la soo dejinayaa ${surahName} (0/${totalVerses} Aayadood)...`,
        completedSurahs: completedCount,
        failedSurahs: failedCount,
      });

      // 1. Ensure Surah JSON (Text + Somali Translation) is cached
      try {
        const jsonUrl = `/data/quran/${surahNum}.json`;
        const hasJson = await dataCache.match(jsonUrl);
        if (!hasJson) {
          const res = await fetch(jsonUrl);
          if (res && res.ok) {
            await dataCache.put(jsonUrl, res);
          }
        }
      } catch (_) {}

      if (signal?.aborted) return { success: false, completedCount };

      let surahRecitationOk = true;

      // 2. Download Reciter Ayah Audios in parallel batches of 8 as verified 200 OK Blobs
      if (downloadRecitation) {
        let ayahsSuccessInSurah = 0;
        let ayahsProcessedInSurah = 0;
        const BATCH = 8;

        for (let a = 1; a <= totalVerses; a += BATCH) {
          if (signal?.aborted) return { success: false, completedCount };
          const urls: string[] = [];
          for (let v = a; v < a + BATCH && v <= totalVerses; v++) {
            urls.push(getAyahAudioUrl(reciterId, surahNum, v));
          }
          await Promise.all(
            urls.map(async (u) => {
              const ok = await fetchAndCacheAudioBlob(audioCache, u, 12000, signal);
              if (ok) ayahsSuccessInSurah++;
              ayahsProcessedInSurah++;
              completedSteps++;
            })
          );

          onProgress?.({
            currentSurahIndex: i + 1,
            totalSurahs,
            currentSurahNumber: surahNum,
            currentSurahName: surahName,
            percent: calcPercent(),
            isDone: false,
            statusText: `${surahName} — Aayadda ${ayahsProcessedInSurah}/${totalVerses}...`,
            completedSurahs: completedCount,
            failedSurahs: failedCount,
          });
        }

        surahRecitationOk = ayahsSuccessInSurah >= Math.max(1, Math.floor(totalVerses * 0.9));
        if (surahRecitationOk) {
          markSurahOfflineReady(reciterId, surahNum);
        }
      } else {
        completedSteps++;
      }

      if (signal?.aborted) return { success: false, completedCount };

      // 3. Download Somali Tafsir Audio if requested
      if (downloadTafsir) {
        try {
          const tafsirInfo = getSomaliTafsirAudio(surahNum, tafsirScholarId);
          if (tafsirInfo && tafsirInfo.available && tafsirInfo.audioUrl) {
            onProgress?.({
              currentSurahIndex: i + 1,
              totalSurahs,
              currentSurahNumber: surahNum,
              currentSurahName: surahName,
              percent: calcPercent(),
              isDone: false,
              statusText: `Waxaa la keydinayaa Tafsiirka ${surahName}...`,
              completedSurahs: completedCount,
              failedSurahs: failedCount,
            });
            await fetchAndCacheAudioBlob(audioCache, tafsirInfo.audioUrl, 25000, signal);
          }
        } catch (_) {}
        completedSteps += 2;
      }

      if (surahRecitationOk) {
        completedCount++;
      } else {
        failedCount++;
      }

      const isFinal = i === totalSurahs - 1;
      onProgress?.({
        currentSurahIndex: i + 1,
        totalSurahs,
        currentSurahNumber: surahNum,
        currentSurahName: surahName,
        percent: isFinal ? 100 : calcPercent(),
        isDone: isFinal,
        statusText: isFinal
          ? `Waa lagu guuleystay! ${completedCount} Suurood ayaa Offline diyaar u ah ✓`
          : `${surahName} waa diyaar ✓`,
        completedSurahs: completedCount,
        failedSurahs: failedCount,
      });
    }

    return { success: completedCount > 0, completedCount };
  } catch (err) {
    console.warn('Batch download notice:', err);
    return { success: false, completedCount: 0 };
  }
}

/**
 * Checks how many of the given Surahs are already cached as valid 200 OK Blobs in offline audio storage.
 */
export async function getCachedSurahsCount(
  surahNumbers: number[],
  reciterId: string = 'alafasy'
): Promise<number> {
  if (typeof window === 'undefined' || !('caches' in window)) return 0;
  try {
    const cache = await caches.open(QURAN_AUDIO_CACHE_NAME);
    let count = 0;
    const checks = surahNumbers.map(async (num) => {
      try {
        const meta = QURAN_SURAHS.find((s) => s.number === num);
        const totalVerses = meta?.verses || 1;
        const firstUrl = getAyahAudioUrl(reciterId, num, 1);
        const lastUrl = getAyahAudioUrl(reciterId, num, totalVerses);
        const [m1, m2] = await Promise.all([cache.match(firstUrl), cache.match(lastUrl)]);
        if (m1 && m1.status === 200 && m2 && m2.status === 200) {
          count++;
          markSurahOfflineReady(reciterId, num);
        }
      } catch (_) {}
    });
    await Promise.race([
      Promise.allSettled(checks),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
    return count;
  } catch {
    return 0;
  }
}
