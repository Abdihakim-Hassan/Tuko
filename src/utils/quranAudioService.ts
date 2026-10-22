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
    id: 'sudais',
    name: 'Cabdiraxmaan As-Sudais',
    arabicName: 'عبد الرحمن السديس',
    subfolder: 'Abdurrahmaan_As-Sudais_192kbps',
    description: 'Imaamka Masjidka Xaramka ee Maka',
  },
  {
    id: 'ghamadi',
    name: 'Sacd Al-Ghamdi',
    arabicName: 'سعد الغامدي',
    subfolder: 'Ghamadi_40kbps',
    description: 'Akhris xasiloon oo qiiro leh (Sucuudiga)',
  },
  {
    id: 'minshawi',
    name: 'Maxamed Siddiiq Al-Minshawi',
    arabicName: 'محمد صديق المنشاوي',
    subfolder: 'Minshawy_Murattal_128kbps',
    description: 'Murattal aad u sarreeya oo xushmad leh',
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
  const reciter = QURAN_RECITERS.find((r) => r.id === reciterId) || QURAN_RECITERS[0];
  const surahStr = String(surahNumber).padStart(3, '0');
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

/**
 * Fetches the full Arabic text and Somali translation of any surah (1-114).
 * Caches in localStorage for instant offline replay.
 */
export async function fetchSurahWithTranslation(surahNumber: number): Promise<SurahDetails> {
  const cacheKey = `tuko_surah_cache_v1_${surahNumber}`;

  // 1. Check local cache first
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as SurahDetails;
      if (parsed && Array.isArray(parsed.ayahs) && parsed.ayahs.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    // Ignore cache parse failure
  }

  // 2. Fetch from high availability Quran Cloud API (Uthmani Arabic + Somali Mahmud Abduh translation)
  try {
    const response = await fetch(
      `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,so.abduh`
    );

    if (!response.ok) {
      throw new Error(`Failed to load surah from API: ${response.status}`);
    }

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

      try {
        localStorage.setItem(cacheKey, JSON.stringify(result));
      } catch (err) {
        // LocalStorage quota may be reached, ignore safely
      }

      return result;
    }
  } catch (error) {
    console.warn(`Quran fetch error for surah ${surahNumber}:`, error);
  }

  // 3. Fallback to offline store if available
  if (OFFLINE_SURAHS[surahNumber]) {
    return OFFLINE_SURAHS[surahNumber];
  }

  // 4. Fallback skeleton if totally offline and not pre-cached
  throw new Error(`Lama soo celin karo Suuradda #${surahNumber}. Fadlan hubi khadkaaga internet-ka.`);
}
