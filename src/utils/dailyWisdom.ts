export interface DailyWisdom {
  id: string;
  arabic: string;
  somali: string;
  source: string;
  type: 'aayad' | 'xadiis' | 'duco';
}

export const DAILY_WISDOMS: DailyWisdom[] = [
  {
    id: 'w1',
    arabic: 'وَأَقِمِ الصَّلَاةَ طَرَفَيِ النَّهَارِ وَزُلَفًا مِّنَ اللَّيْلِ ۚ إِنَّ الْحَسَنَاتِ يُذْهِبْنَ السَّيِّئَاتِ',
    somali: 'Oo oog salaadda labada daraf ee maalinta iyo qaybo ka mid ah habeenka, runtii wanaaggu wuxuu tirtiraa xumaanta.',
    source: 'Suurat Huud: 114',
    type: 'aayad',
  },
  {
    id: 'w2',
    arabic: 'مَنْ صَلَّى الْبَرْدَيْنِ دَخَلَ الْجَنَّةَ',
    somali: 'Qofkii tukada labada salaadood ee qabowga (Subaxa iyo Casarka) wuxuu galayaa Jannada.',
    source: 'Saxiix Al-Bukhaari (574)',
    type: 'xadiis',
  },
  {
    id: 'w3',
    arabic: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
    somali: 'Ogaada! Xuska Allaah oo kaliya ayaa quluubtu ku degtaa.',
    source: 'Suurat Ar-Racdi: 28',
    type: 'aayad',
  },
  {
    id: 'w4',
    arabic: 'الصَّلَوَاتُ الْخَمْسُ وَالْجُمُعَةُ إِلَى الْجُمُعَةِ كَفَّارَاتٌ لِمَا بَيْنَهُنَّ مَا لَمْ تُغْشَ الْكَبَائِرُ',
    somali: 'Shanta salaadood iyo Jimcada ilaa Jimcada xigta waa dambi-dhaafka waxa u dhexeeya haddii laga fogaado dambiyada waaweyn.',
    source: 'Saxiix Muslim (233)',
    type: 'xadiis',
  },
  {
    id: 'w5',
    arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    somali: 'Rabbiyow na sii adduunyada wanaag, aakhirona wanaag, nagana badbaadi cadaabka naarta.',
    source: 'Suurat Al-Baqarah: 201',
    type: 'duco',
  },
  {
    id: 'w6',
    arabic: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ',
    somali: 'Kiinna ugu khayrka badan waa qofka barta Qur\'aanka dadkana bara.',
    source: 'Saxiix Al-Bukhaari (5027)',
    type: 'xadiis',
  },
  {
    id: 'w7',
    arabic: 'وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ وَإِنَّهَا لَكَبِيرَةٌ إِلَّا عَلَى الْخَاشِعِينَ',
    somali: 'Kaalmaysta samirka iyo salaadda, runtii taasi way ku weyn tahay kuwa qalbiga ka khushuuca mooyee.',
    source: 'Suurat Al-Baqarah: 45',
    type: 'aayad',
  },
];

export function getDailyWisdom(dateKey: string): DailyWisdom {
  // Use dateKey (YYYY-MM-DD) to deterministically select a daily item
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) % DAILY_WISDOMS.length;
  }
  return DAILY_WISDOMS[Math.abs(hash)];
}
