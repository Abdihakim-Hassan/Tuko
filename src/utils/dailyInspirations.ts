import { DailyInspiration } from '../types';

export const DAILY_INSPIRATIONS: DailyInspiration[] = [
  {
    id: 'salaad-1',
    arabic: 'إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا',
    source: 'Suuratul An-Nisaa: 103',
    somali: 'Hubaal, salaaddu waxay ku tahay mu’miniinta waajib waqtiyo go’an loo xaddiday.',
    category: 'salaad',
  },
  {
    id: 'salaad-2',
    arabic: 'وَأَقِمِ الصَّلَاةَ طَرَفَيِ النَّهَارِ وَزُلَفًا مِّنَ اللَّيْلِ ۚ إِنَّ الْحَسَنَاتِ يُذْهِبْنَ السَّيِّئَاتِ',
    source: 'Suuratul Huud: 114',
    somali: 'Oog salaadda labada daraf ee maalinta iyo qaybo ka mid ah habeenka, runtii wanaaggu wuxuu tirtiraa xumaanta.',
    category: 'salaad',
  },
  {
    id: 'hadith-1',
    arabic: 'عَهْدُ الَّذِي بَيْنَنَا وَبَيْنَهُمُ الصَّلَاةُ فَمَنْ تَرَكَهَا فَقَدْ كَفَرَ',
    source: 'Xadiis Saxiix ah (Tirmadi & Axmed)',
    somali: 'Ballanka noo dhexeeya annaga iyo iyaga waa salaadda, qofkii ka tagaana wuu ku kufriyay.',
    category: 'salaad',
  },
  {
    id: 'hadith-2',
    arabic: 'أَحَبُّ الأَعْمَالِ إِلَى اللَّهِ تَعَالَى الصَّلاَةُ عَلَى وَقْتِهَا',
    source: 'Saxiix Al-Bukhaari & Muslim',
    somali: 'Camalka Eebbe ugu jecelyahay waa: Salaadda la tukado waqtigeeda koowaad ee hore.',
    category: 'salaad',
  },
  {
    id: 'dumar-1',
    arabic: 'صَلاَةُ الْمَرْأَةِ فِي بَيْتِهَا خَيْرٌ لَهَا مِنْ صَلاَتِهَا فِي حُجْرَتِهَا، وَصَلاَتُهَا فِي مَخْدَعِهَا خَيْرٌ لَهَا مِنْ صَلاَتِهَا فِي بَيْتِهَا',
    source: 'Xadiis Saxiix ah (Abuu Daa’uud)',
    somali: 'Fadliga Dumarka: Salaadda haweeneydu gurigeeda ku tukato ayaa ugu ajar iyo dhowrsanaan badan xagga Eebbe, waana mid u dhiganta ama ka khayr badan masaajidka.',
    category: 'dumar',
  },
  {
    id: 'jumcah-1',
    arabic: 'مَنْ قَرَأَ سُورَةَ الْكَهْفِ فِي يَوْمِ الْجُمُعَةِ أَضَاءَ لَهُ مِنَ النُّورِ مَا بَيْنَ الْجُمُعَتَيْنِ',
    source: 'Saxiix Al-Jaamic (Al-Albaani)',
    somali: 'Fadliga Jimcaha: Qofkii akhriya Suuradda Al-Kahf maalinta Jimcaha, waxaa u ifaya nuur u dhexeeya labada Jimco.',
    category: 'jumcah',
  },
  {
    id: 'jumcah-2',
    arabic: 'إِنَّ مِنْ أَفْضَلِ أَيَّامِكُمْ يَوْمَ الْجُمُعَةِ فَأَكْثِرُوا عَلَيَّ مِنَ الصَّلَاةِ فِيهِ',
    source: 'Abuu Daa’uud & Nasaa’i',
    somali: 'Runtii maalmihiinna tan ugu fadliga badan waa maalinta Jimcaha, ee badsada ku saliga Nabiga (NNKH).',
    category: 'jumcah',
  },
  {
    id: 'istighfaar-1',
    arabic: 'فَقُلْتُ اسْتَغْفِرُوا رَبَّكُمْ إِنَّهُ كَانَ غَفَّارًا * يُرْسِلِ السَّمَاءَ عَلَيْكُم مِّدْرَارًا',
    source: 'Suuratu Nuux: 10-11',
    somali: 'Waxaan ku idhi: Dambi-dhaaf weydiista Rabbigiin, hubaal Isagu waa mid aad u dambi-dhaaf badane, wuxuu idiin soo shubi doonaa roob mahiigaan ah.',
    category: 'istighfaar',
  },
  {
    id: 'dhikr-1',
    arabic: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
    source: 'Suuratul Racad: 28',
    somali: 'Ogaada! Xusuusta Eebbe (Adkaarta) oo kaliya ayaa qalbiyadu ku degaan kuna qaboobaan.',
    category: 'salaad',
  },
];

export function getTodayInspiration(dateKey?: string, isFriday?: boolean): DailyInspiration {
  if (isFriday) {
    // Pick Jumcah inspiration
    const jumcahItems = DAILY_INSPIRATIONS.filter((item) => item.category === 'jumcah');
    return jumcahItems[Math.floor(Date.now() / 86400000) % jumcahItems.length] || jumcahItems[0];
  }

  const key = dateKey || new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % DAILY_INSPIRATIONS.length;
  return DAILY_INSPIRATIONS[index];
}
