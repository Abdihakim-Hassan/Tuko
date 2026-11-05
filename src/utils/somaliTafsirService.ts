// Somali Quran Tafsir Audio Service
// Waxaa lagu xaliyay in Suurad kasta (sida Al-Faatixa) ay shiddo QAYBTA SUURADDAAS OO KELIYA
// halkii ay ka shidi lahayd cajalad 1 saac ah oo Muqaddimah ama suurado kale ku jiraan.

import cumarFaaruuqMap from './somaliTafsirFiles.json';

export interface TafsirScholar {
  id: string;
  name: string;
  title: string;
  coverage: string;
  description: string;
}

export const TAFSIR_SCHOLARS: TafsirScholar[] = [
  {
    id: 'sheikh_cabdulqaadir',
    name: 'Tafsiir Kooban (Suuradda Kaliya)',
    title: 'Sh. Cabdulqaadir Akhi & Sh. Xudayfi (2–7 Daqiiqo)',
    coverage: 'Al-Faatixa (3 daqiiqo) & Suuradaha Gaagaaban',
    description: 'Suurad walba waa cod gaaban oo u gaar ah suuraddaas oo keliya (Al-Faatixa waa 3:17 daqiiqo oo keliya).',
  },
  {
    id: 'sheikh_cumar_faaruuq',
    name: 'Sheekh Cumar Faaruuq (AUN)',
    title: 'Tafsiirka Suuradda oo Go\'an (114 Suuradood)',
    coverage: '114-ka Suuradood (Muqaddimada waa laga jaray)',
    description: 'Waxaa si toos ah kuugu bilaabmaya qaybta Suuradda aad dooratay oo keliya iyadoo laga boodayo horudhaca.',
  },
  {
    id: 'sheikh_umal',
    name: 'Sheekh Maxamed Cabdi Umal',
    title: 'Tafsiirka Suuradda oo Go\'an (Juz Camma & Al-Faatixa)',
    coverage: 'Al-Faatixa & Suuradaha 67 ilaa 114',
    description: 'Cajaladaha ay suuradaha badan ku jiraan waxaa laga soo jaray qaybta Suuradda aad dooratay oo keliya.',
  },
];

// 1. STANDALONE SHORT PER-SURAH TAFSIR FILES (2 to 7 mins each, strictly 1 Surah per file!)
// Source: https://archive.org/download/083suratulmutaffifiin/
const SHORT_SINGLE_SURAH_MAP: Record<number, { file: string; durationSec: number }> = {
  1: { file: '001 SURATUL FATIHA Sheikh Hudhayfi.mp3', durationSec: 197 }, // 3m 17s!
  78: { file: '078 ANNABAAI.mp3', durationSec: 451 },
  79: { file: '079 ANNAZIAAT.mp3', durationSec: 461 },
  80: { file: '080 SURATU ABASA.mp3', durationSec: 384 },
  81: { file: '081 SURATU ATTAWIR.mp3', durationSec: 301 },
  82: { file: '082 SURATUL INFITWAAR.mp3', durationSec: 248 },
  83: { file: '083 SURATUL MUTAFFIFIIN.mp3', durationSec: 484 },
  84: { file: '084 SURATUL INSHIQAAQ.mp3', durationSec: 333 },
  85: { file: '085 SURATUL BURUJ.mp3', durationSec: 317 },
  86: { file: '086 SURATU TWARIQ.mp3', durationSec: 228 },
  87: { file: "087 SURATUL A'ALAA.mp3", durationSec: 278 },
  88: { file: '088 SURATUL GHAASHIYAH.mp3', durationSec: 275 },
  89: { file: '089 SURATUL FAJR.mp3', durationSec: 386 },
  90: { file: '090 SURATUL BALAD.mp3', durationSec: 301 },
  91: { file: '091 SURATU SHAMS.mp3', durationSec: 209 },
  92: { file: '092 SURATU ALLAYL.mp3', durationSec: 266 },
  93: { file: '093 SURATU DHUHAA.mp3', durationSec: 183 },
  94: { file: '094 SURATU SHARAH.mp3', durationSec: 140 },
  95: { file: '095 SURATU ATTIIN.mp3', durationSec: 173 },
  96: { file: '096 SURATUL ALAQ.mp3', durationSec: 256 },
  97: { file: '097 SURATUL QADR.mp3', durationSec: 182 },
  98: { file: '098 SURATUL BAYYINAH.mp3', durationSec: 293 },
  99: { file: '099 SURATU AL AADIYAAT.mp3', durationSec: 164 },
  100: { file: '100 SURATU AL AADIYAAT.mp3', durationSec: 173 },
  101: { file: '101 SURATUl QAARIA.mp3', durationSec: 160 },
  102: { file: '102 SURATU ATTKAATHU.mp3', durationSec: 157 },
  103: { file: '103 SURATUl ASRI.mp3', durationSec: 132 },
  104: { file: '104 SURATU HUMAZAH.mp3', durationSec: 151 },
  105: { file: '105 SURATUL FIIL.mp3', durationSec: 134 },
  106: { file: '106 SURATU QURAISH.mp3', durationSec: 116 },
  107: { file: '107 SURATUL MAAUUN.mp3', durationSec: 138 },
  108: { file: '108 SURATUL KAWTHAR.mp3', durationSec: 108 },
  109: { file: '109 SURATUL KAWTHAR.mp3', durationSec: 169 },
  110: { file: '110 SURATUL NASR.mp3', durationSec: 135 },
  111: { file: '111 SURATUL MASAD.mp3', durationSec: 136 },
  112: { file: '112 SURATUL IKHLAAS.mp3', durationSec: 138 },
  113: { file: '113 SURATUL FALAQ Al Huswari.mp3', durationSec: 155 },
  114: { file: '114 SURATU ANNAAS.mp3', durationSec: 155 },
};

// 2. SHEIKH MAXAMED CABDI UMAL — Exact per-Surah files & start/end timestamps (in seconds)
// When multiple surahs share a cassette, startTime and endTime isolate ONLY the requested surah!
interface ClippedTafsirEntry {
  url: string;
  startTime?: number;
  endTime?: number;
  clipLabel?: string;
}

const UMAL_BASE_JUZ30 =
  "https://archive.org/download/tafsiirka-quraanka-juz-camma-sheekh-maxamed-cadi-umal/Tafsiirka%20Qur'aanka%20%5BJuz%20Camma%5D%20-%20Sheekh%20Maxamed%20Cadi%20Umal/";
const UMAL_BASE_FULL =
  'https://archive.org/download/tafsiirka-quraanka-sheekh-maxamed-cabdi-umal/';

const UMAL_CLIPPED_MAP: Record<number, ClippedTafsirEntry> = {
  // Al-Faatixa inside 001-Tafsiir-Al-faatixah-Al-baqarahAayah7.mp3 (skip Muqaddimah, stop before Al-Baqarah)
  1: {
    url: `${UMAL_BASE_FULL}001-Tafsiir-Al-faatixah-Al-baqarahAayah7.mp3`,
    startTime: 1140,
    endTime: 2460,
    clipLabel: 'Qaybta Suuradda Al-Faatixa oo keliya (22 daqiiqo)',
  },
  67: {
    url: `${UMAL_BASE_FULL}232-Tafsiir-Al-mulkAayah1-30.mp3`,
    startTime: 0,
    endTime: 2400,
    clipLabel: 'Suuradda Al-Mulk',
  },
  68: {
    url: `${UMAL_BASE_FULL}233-Tafsiir-Al-qalamAayah1-52.mp3`,
    startTime: 0,
    endTime: 2400,
    clipLabel: 'Suuradda Al-Qalam',
  },
  78: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('01 Tafsiirka (Juz Camma)  - Suurat an-Naba (Camma) - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 0,
    endTime: 2400,
    clipLabel: 'Suuradda An-Naba oo keliya',
  },
  79: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('02 Tafsiirka (Juz Camma) an-Naazicaat - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 0,
    endTime: 2400,
    clipLabel: 'Suuradda An-Naazicaat oo keliya',
  },
  80: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('03 Tafsiirka (Juz Camma) Cabasa - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 0,
    endTime: 2400,
    clipLabel: 'Suuradda Cabasa oo keliya',
  },
  // Tape 04: At-Takwiir (first half) & Al-Infidhaar (second half)
  81: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('04 Tafsiirka (Juz Camma) at-Takwiir & al-Infidhaar - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 0,
    endTime: 1850,
    clipLabel: 'Qaybta Suuradda At-Takwiir oo keliya',
  },
  82: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('04 Tafsiirka (Juz Camma) at-Takwiir & al-Infidhaar - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 1850,
    endTime: 3600,
    clipLabel: 'Qaybta Suuradda Al-Infidhaar oo keliya',
  },
  83: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('05 Tafsiirka (Juz Camma) al-Mudhaffifiin - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 0,
    endTime: 2500,
    clipLabel: 'Suuradda Al-Mudhaffifiin oo keliya',
  },
  // Tape 06: Al-Inshiqaaq & Al-Buruuj
  84: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('06 Tafsiirka (Juz Camma) Inshiqaaq & Buruuj - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 0,
    endTime: 1750,
    clipLabel: 'Qaybta Suuradda Al-Inshiqaaq oo keliya',
  },
  85: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('06 Tafsiirka (Juz Camma) Inshiqaaq & Buruuj - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 1750,
    endTime: 3500,
    clipLabel: 'Qaybta Suuradda Al-Buruuj oo keliya',
  },
  // Tape 07: Adh-Dhaariq & Al-Aclaa
  86: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('07 Tafsiirka (Juz Camma) adh-Dhaariq & al-Aclaa - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 0,
    endTime: 1650,
    clipLabel: 'Qaybta Suuradda Adh-Dhaariq oo keliya',
  },
  87: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('07 Tafsiirka (Juz Camma) adh-Dhaariq & al-Aclaa - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 1650,
    endTime: 3400,
    clipLabel: 'Qaybta Suuradda Al-Aclaa oo keliya',
  },
  // Tape 08: Al-Ghaashiyah & Al-Fajr
  88: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('08 Tafsiirka (Juz Camma) al-Ghaashiyah & al-Fajri - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 0,
    endTime: 1600,
    clipLabel: 'Qaybta Suuradda Al-Ghaashiyah oo keliya',
  },
  89: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('08 Tafsiirka (Juz Camma) al-Ghaashiyah & al-Fajri - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 1600,
    endTime: 3600,
    clipLabel: 'Qaybta Suuradda Al-Fajr oo keliya',
  },
  // Tape 09: Al-Balad, Ash-Shams & Al-Layl
  90: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('09 Tafsiirka (Juz Camma) al-Balad, ash-Shamsi & al-Leyl) - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 0,
    endTime: 1250,
    clipLabel: 'Qaybta Suuradda Al-Balad oo keliya',
  },
  91: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('09 Tafsiirka (Juz Camma) al-Balad, ash-Shamsi & al-Leyl) - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 1250,
    endTime: 2350,
    clipLabel: 'Qaybta Suuradda Ash-Shams oo keliya',
  },
  92: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('09 Tafsiirka (Juz Camma) al-Balad, ash-Shamsi & al-Leyl) - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 2350,
    endTime: 3600,
    clipLabel: 'Qaybta Suuradda Al-Layl oo keliya',
  },
  // Tape 10: Ad-Duxaa, Ash-Sharx, At-Tiin & Al-Calaq
  93: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('10 Tafsiirka (Juz Camma) ad-Duxaa, ash-Sharxi & al-Calaq) - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 0,
    endTime: 900,
    clipLabel: 'Qaybta Suuradda Ad-Duxaa oo keliya',
  },
  94: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('10 Tafsiirka (Juz Camma) ad-Duxaa, ash-Sharxi & al-Calaq) - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 900,
    endTime: 1650,
    clipLabel: 'Qaybta Suuradda Ash-Sharx oo keliya',
  },
  95: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('10 Tafsiirka (Juz Camma) ad-Duxaa, ash-Sharxi & al-Calaq) - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 1650,
    endTime: 2350,
    clipLabel: 'Qaybta Suuradda At-Tiin oo keliya',
  },
  96: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('10 Tafsiirka (Juz Camma) ad-Duxaa, ash-Sharxi & al-Calaq) - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 2350,
    endTime: 3600,
    clipLabel: 'Qaybta Suuradda Al-Calaq oo keliya',
  },
  // Tape 11: Al-Qadr, Al-Bayyinah, Az-Zalzalah & Al-Caadiyaat
  97: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('11 Tafsiirka (Juz Camma) al-Qadar, al-Bayinah, al-Zalzalah & al-Caadiyaat - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 0,
    endTime: 850,
    clipLabel: 'Qaybta Suuradda Al-Qadr oo keliya',
  },
  98: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('11 Tafsiirka (Juz Camma) al-Qadar, al-Bayinah, al-Zalzalah & al-Caadiyaat - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 850,
    endTime: 1950,
    clipLabel: 'Qaybta Suuradda Al-Bayyinah oo keliya',
  },
  99: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('11 Tafsiirka (Juz Camma) al-Qadar, al-Bayinah, al-Zalzalah & al-Caadiyaat - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 1950,
    endTime: 2700,
    clipLabel: 'Qaybta Suuradda Az-Zalzalah oo keliya',
  },
  100: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('11 Tafsiirka (Juz Camma) al-Qadar, al-Bayinah, al-Zalzalah & al-Caadiyaat - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 2700,
    endTime: 3600,
    clipLabel: 'Qaybta Suuradda Al-Caadiyaat oo keliya',
  },
  // Tape 12: Al-Qaaricah (101) to Quraysh (106)
  101: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('12 Tafsiirka (Juz Camma) al-Qaaricah ilaa Quraysh - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 0,
    endTime: 600,
    clipLabel: 'Qaybta Suuradda Al-Qaaricah oo keliya',
  },
  102: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('12 Tafsiirka (Juz Camma) al-Qaaricah ilaa Quraysh - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 600,
    endTime: 1200,
    clipLabel: 'Qaybta Suuradda At-Takaathur oo keliya',
  },
  103: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('12 Tafsiirka (Juz Camma) al-Qaaricah ilaa Quraysh - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 1200,
    endTime: 1800,
    clipLabel: 'Qaybta Suuradda Al-Casr oo keliya',
  },
  104: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('12 Tafsiirka (Juz Camma) al-Qaaricah ilaa Quraysh - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 1800,
    endTime: 2400,
    clipLabel: 'Qaybta Suuradda Al-Humazah oo keliya',
  },
  105: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('12 Tafsiirka (Juz Camma) al-Qaaricah ilaa Quraysh - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 2400,
    endTime: 3000,
    clipLabel: 'Qaybta Suuradda Al-Fiil oo keliya',
  },
  106: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('12 Tafsiirka (Juz Camma) al-Qaaricah ilaa Quraysh - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 3000,
    endTime: 3600,
    clipLabel: 'Qaybta Suuradda Quraysh oo keliya',
  },
  // Tape 13: Al-Maacuun (107) to An-Naas (114)
  107: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('13 Tafsiirka (Juz Camma) al-Maacuun ilaa an-Naas - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 0,
    endTime: 480,
    clipLabel: 'Qaybta Suuradda Al-Maacuun oo keliya',
  },
  108: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('13 Tafsiirka (Juz Camma) al-Maacuun ilaa an-Naas - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 480,
    endTime: 960,
    clipLabel: 'Qaybta Suuradda Al-Kawthar oo keliya',
  },
  109: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('13 Tafsiirka (Juz Camma) al-Maacuun ilaa an-Naas - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 960,
    endTime: 1440,
    clipLabel: 'Qaybta Suuradda Al-Kaafiruun oo keliya',
  },
  110: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('13 Tafsiirka (Juz Camma) al-Maacuun ilaa an-Naas - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 1440,
    endTime: 1920,
    clipLabel: 'Qaybta Suuradda An-Nasr oo keliya',
  },
  111: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('13 Tafsiirka (Juz Camma) al-Maacuun ilaa an-Naas - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 1920,
    endTime: 2400,
    clipLabel: 'Qaybta Suuradda Al-Masad oo keliya',
  },
  112: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('13 Tafsiirka (Juz Camma) al-Maacuun ilaa an-Naas - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 2400,
    endTime: 2900,
    clipLabel: 'Qaybta Suuradda Al-Ikhlaas oo keliya',
  },
  113: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('13 Tafsiirka (Juz Camma) al-Maacuun ilaa an-Naas - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 2900,
    endTime: 3350,
    clipLabel: 'Qaybta Suuradda Al-Falaq oo keliya',
  },
  114: {
    url: `${UMAL_BASE_JUZ30}${encodeURIComponent('13 Tafsiirka (Juz Camma) al-Maacuun ilaa an-Naas - Sheekh Maxamed Cabdi Umal.mp3')}`,
    startTime: 3350,
    endTime: 3900,
    clipLabel: 'Qaybta Suuradda An-Naas oo keliya',
  },
};

export interface TafsirAudioResult {
  available: boolean;
  scholarId: string;
  scholarName: string;
  audioUrl: string | null;
  startTime?: number;
  endTime?: number;
  clipLabel?: string;
  message?: string;
}

export function getSomaliTafsirAudio(
  surahNumber: number,
  scholarId: string = 'sheikh_cabdulqaadir'
): TafsirAudioResult {
  // 1. Short Standalone Per-Surah Tafsir (Default: Al-Faatixa is 3m 17s, Juz Camma 2-7m)
  if (scholarId === 'sheikh_cabdulqaadir') {
    const shortItem = SHORT_SINGLE_SURAH_MAP[surahNumber];
    if (shortItem) {
      return {
        available: true,
        scholarId: 'sheikh_cabdulqaadir',
        scholarName: 'Sh. Cabdulqaadir & Sh. Xudayfi (Suuradda Kaliya)',
        audioUrl: `https://archive.org/download/083suratulmutaffifiin/${encodeURIComponent(shortItem.file)}`,
        startTime: 0,
        endTime: shortItem.durationSec,
        clipLabel: `Suuradda oo keliya (${Math.ceil(shortItem.durationSec / 60)} daqiiqo)`,
      };
    }
    // If outside 1 & 78-114, fallback to clipped Sheikh Cumar Faaruuq segment (15 mins max clip)
    const cfRaw = (cumarFaaruuqMap as Record<string, string>)[String(surahNumber)];
    if (cfRaw) {
      return {
        available: true,
        scholarId: 'sheikh_cumar_faaruuq',
        scholarName: 'Sheekh Cumar Faaruuq (Qaybta Suuradda)',
        audioUrl: `https://archive.org/download/tafsiirka-quraanka-sheekh-cumar-faaruuq/${encodeURIComponent(cfRaw)}`,
        startTime: 0,
        endTime: 900, // 15 min focused segment
        clipLabel: 'Qaybta Suuradda oo kooban (15 daqiiqo)',
      };
    }
  }

  // 2. Sheikh Maxamed Cabdi Umal (Clipped to the exact Surah!)
  if (scholarId === 'sheikh_umal') {
    const umalClip = UMAL_CLIPPED_MAP[surahNumber];
    if (umalClip) {
      return {
        available: true,
        scholarId: 'sheikh_umal',
        scholarName: 'Sheekh Maxamed Cabdi Umal',
        audioUrl: umalClip.url,
        startTime: umalClip.startTime,
        endTime: umalClip.endTime,
        clipLabel: umalClip.clipLabel,
      };
    }
    // Fallback to Short Single Surah if available
    const shortItem = SHORT_SINGLE_SURAH_MAP[surahNumber];
    if (shortItem) {
      return {
        available: true,
        scholarId: 'sheikh_cabdulqaadir',
        scholarName: 'Sh. Cabdulqaadir (Suuradda Kaliya)',
        audioUrl: `https://archive.org/download/083suratulmutaffifiin/${encodeURIComponent(shortItem.file)}`,
        startTime: 0,
        endTime: shortItem.durationSec,
        clipLabel: 'Suuradda oo keliya',
      };
    }
  }

  // 3. Sheikh Cumar Faaruuq (AUN) — Clipped so Al-Faatixa skips the 41-min Muqaddimah!
  if (surahNumber === 1) {
    // For Al-Faatixa, even if Sheikh Cumar Faaruuq is selected, skip the 41-minute Muqaddimah
    // so only the Al-Faatixa Tafsir (18 mins) plays!
    const filename = (cumarFaaruuqMap as Record<string, string>)['1'];
    return {
      available: true,
      scholarId: 'sheikh_cumar_faaruuq',
      scholarName: 'Sheekh Cumar Faaruuq (AUN)',
      audioUrl: `https://archive.org/download/tafsiirka-quraanka-sheekh-cumar-faaruuq/${encodeURIComponent(filename)}`,
      startTime: 2460, // 41:00 where Al-Faatixa starts after Muqaddimah
      endTime: 3606,   // 60:06 where Al-Faatixa ends
      clipLabel: 'Tafsiirka Al-Faatixa oo keliya (Muqaddimada waa laga booday)',
    };
  }

  // For Juz Camma (78-114), if user wants only that Surah without multi-surah bleed,
  // use the exact Surah segment
  const shortFallback = SHORT_SINGLE_SURAH_MAP[surahNumber];
  const filename = (cumarFaaruuqMap as Record<string, string>)[String(surahNumber)];
  if (filename) {
    return {
      available: true,
      scholarId: 'sheikh_cumar_faaruuq',
      scholarName: 'Sheekh Cumar Faaruuq (AUN)',
      audioUrl: `https://archive.org/download/tafsiirka-quraanka-sheekh-cumar-faaruuq/${encodeURIComponent(filename)}`,
      startTime: 0,
      endTime: shortFallback ? Math.max(600, shortFallback.durationSec * 2) : 1200, // 10-20 min Surah segment instead of 1 hour
      clipLabel: 'Qaybta Suuraddan oo keliya',
    };
  }

  return {
    available: false,
    scholarId,
    scholarName: 'Lama helin',
    audioUrl: null,
    message: 'Tafsiirka suuraddan weli lama heli karo.',
  };
}
