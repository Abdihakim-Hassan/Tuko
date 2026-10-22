export interface SurahInfo {
  number: number;
  nameSomali: string;
  nameArabic: string;
  meaningSomali: string;
  verses: number;
  type: 'Makki' | 'Madani';
  page: number;
  juz: number;
}

export const QURAN_SURAHS: SurahInfo[] = [
  { number: 1, nameSomali: 'Al-Faatixa', nameArabic: 'الفاتحة', meaningSomali: 'Furitaanka', verses: 7, type: 'Makki', page: 1, juz: 1 },
  { number: 2, nameSomali: 'Al-Baqarah', nameArabic: 'البقرة', meaningSomali: 'Saca', verses: 286, type: 'Madani', page: 2, juz: 1 },
  { number: 3, nameSomali: 'Aali-Cimraan', nameArabic: 'آل عمران', meaningSomali: 'Reer Cimraan', verses: 200, type: 'Madani', page: 50, juz: 3 },
  { number: 4, nameSomali: 'An-Nisaa', nameArabic: 'النساء', meaningSomali: 'Haweenka', verses: 176, type: 'Madani', page: 77, juz: 4 },
  { number: 5, nameSomali: 'Al-Maa\'idah', nameArabic: 'المائدة', meaningSomali: 'Miiska Cuntada', verses: 120, type: 'Madani', page: 106, juz: 6 },
  { number: 6, nameSomali: 'Al-Ancaam', nameArabic: 'الأنعام', meaningSomali: 'Xoolaha', verses: 165, type: 'Makki', page: 128, juz: 7 },
  { number: 7, nameSomali: 'Al-Acraaf', nameArabic: 'الأعراف', meaningSomali: 'Derbiga Dhexe', verses: 206, type: 'Makki', page: 151, juz: 8 },
  { number: 8, nameSomali: 'Al-Anfaal', nameArabic: 'الأنفال', meaningSomali: 'Qaniimada', verses: 75, type: 'Madani', page: 177, juz: 9 },
  { number: 9, nameSomali: 'At-Tawbah', nameArabic: 'التوبة', meaningSomali: 'Toobada', verses: 129, type: 'Madani', page: 187, juz: 10 },
  { number: 10, nameSomali: 'Yuunus', nameArabic: 'يونس', meaningSomali: 'Nabi Yuunus', verses: 109, type: 'Makki', page: 208, juz: 11 },
  { number: 11, nameSomali: 'Huud', nameArabic: 'هود', meaningSomali: 'Nabi Huud', verses: 123, type: 'Makki', page: 221, juz: 11 },
  { number: 12, nameSomali: 'Yuusuf', nameArabic: 'يوسف', meaningSomali: 'Nabi Yuusuf', verses: 111, type: 'Makki', page: 235, juz: 12 },
  { number: 13, nameSomali: 'Ar-Racdi', nameArabic: 'الرعد', meaningSomali: 'Onkodka', verses: 43, type: 'Madani', page: 249, juz: 13 },
  { number: 14, nameSomali: 'Ibraahiim', nameArabic: 'إبراهيم', meaningSomali: 'Nabi Ibraahiim', verses: 52, type: 'Makki', page: 255, juz: 13 },
  { number: 15, nameSomali: 'Al-Xijr', nameArabic: 'الحجر', meaningSomali: 'Dooxada Dhagaxa', verses: 99, type: 'Makki', page: 262, juz: 14 },
  { number: 16, nameSomali: 'An-Naxli', nameArabic: 'النحل', meaningSomali: 'Shinnida', verses: 128, type: 'Makki', page: 267, juz: 14 },
  { number: 17, nameSomali: 'Al-Israa', nameArabic: 'الإسراء', meaningSomali: 'Socodkii Habeenkii', verses: 111, type: 'Makki', page: 282, juz: 15 },
  { number: 18, nameSomali: 'Al-Kahf', nameArabic: 'الكهف', meaningSomali: 'Godka', verses: 110, type: 'Makki', page: 293, juz: 15 },
  { number: 19, nameSomali: 'Maryam', nameArabic: 'مريم', meaningSomali: 'Maryam C.S.', verses: 98, type: 'Makki', page: 305, juz: 16 },
  { number: 20, nameSomali: 'Daahaa', nameArabic: 'طه', meaningSomali: 'Daahaa', verses: 135, type: 'Makki', page: 312, juz: 16 },
  { number: 21, nameSomali: 'Al-Anbiyaa', nameArabic: 'الأنبياء', meaningSomali: 'Nebiyada', verses: 112, type: 'Makki', page: 322, juz: 17 },
  { number: 22, nameSomali: 'Al-Xaj', nameArabic: 'الحج', meaningSomali: 'Xajka', verses: 78, type: 'Madani', page: 332, juz: 17 },
  { number: 23, nameSomali: 'Al-Mu\'minuun', nameArabic: 'المؤمنون', meaningSomali: 'Mu\'miniinta', verses: 118, type: 'Makki', page: 342, juz: 18 },
  { number: 24, nameSomali: 'An-Nuur', nameArabic: 'النور', meaningSomali: 'Iftiinka', verses: 64, type: 'Madani', page: 350, juz: 18 },
  { number: 25, nameSomali: 'Al-Furqaan', nameArabic: 'الفرقان', meaningSomali: 'Kala Saaraha Xaqa iyo Baadilka', verses: 77, type: 'Makki', page: 359, juz: 18 },
  { number: 26, nameSomali: 'Ash-Shucaraa', nameArabic: 'الشعراء', meaningSomali: 'Gabayaaga', verses: 227, type: 'Makki', page: 367, juz: 19 },
  { number: 27, nameSomali: 'An-Naml', nameArabic: 'النمل', meaningSomali: 'Qudhaanjada', verses: 93, type: 'Makki', page: 377, juz: 19 },
  { number: 28, nameSomali: 'Al-Qasas', nameArabic: 'القصص', meaningSomali: 'Qisooyinka', verses: 88, type: 'Makki', page: 385, juz: 20 },
  { number: 29, nameSomali: 'Al-Cankabuut', nameArabic: 'العنكبوت', meaningSomali: 'Caarada', verses: 69, type: 'Makki', page: 396, juz: 20 },
  { number: 30, nameSomali: 'Ar-Ruum', nameArabic: 'الروم', meaningSomali: 'Roomaanka', verses: 60, type: 'Makki', page: 404, juz: 21 },
  { number: 31, nameSomali: 'Luqmaan', nameArabic: 'لقمان', meaningSomali: 'Luqmaan Xakiim', verses: 34, type: 'Makki', page: 411, juz: 21 },
  { number: 32, nameSomali: 'As-Sajdah', nameArabic: 'السجدة', meaningSomali: 'Sujuudda', verses: 30, type: 'Makki', page: 415, juz: 21 },
  { number: 33, nameSomali: 'Al-Axzaab', nameArabic: 'الأحزاب', meaningSomali: 'Xulafada / Qabiillada', verses: 73, type: 'Madani', page: 418, juz: 21 },
  { number: 34, nameSomali: 'Saba\'', nameArabic: 'سبإ', meaningSomali: 'Reer Saba\'', verses: 54, type: 'Makki', page: 428, juz: 22 },
  { number: 35, nameSomali: 'Faadir', nameArabic: 'فاطر', meaningSomali: 'Abuuraha', verses: 45, type: 'Makki', page: 434, juz: 22 },
  { number: 36, nameSomali: 'Yaa-Siin', nameArabic: 'يس', meaningSomali: 'Yaa-Siin (Wadnaha Qur\'aanka)', verses: 83, type: 'Makki', page: 440, juz: 22 },
  { number: 37, nameSomali: 'As-Saaffaat', nameArabic: 'الصافات', meaningSomali: 'Saf-Saf Galayaasha', verses: 182, type: 'Makki', page: 446, juz: 23 },
  { number: 38, nameSomali: 'Saad', nameArabic: 'ص', meaningSomali: 'Xarafka Saad', verses: 88, type: 'Makki', page: 453, juz: 23 },
  { number: 39, nameSomali: 'Az-Zumar', nameArabic: 'الزمر', meaningSomali: 'Kooxaha', verses: 75, type: 'Makki', page: 458, juz: 23 },
  { number: 40, nameSomali: 'Ghaafir', nameArabic: 'غافر', meaningSomali: 'Dambi Dhaafaha', verses: 85, type: 'Makki', page: 467, juz: 24 },
  { number: 41, nameSomali: 'Fussilat', nameArabic: 'فصلت', meaningSomali: 'Kala Caddaysay', verses: 54, type: 'Makki', page: 477, juz: 24 },
  { number: 42, nameSomali: 'Ash-Shuuraa', nameArabic: 'الشورى', meaningSomali: 'Wadatashiga', verses: 53, type: 'Makki', page: 483, juz: 25 },
  { number: 43, nameSomali: 'Az-Zukhruf', nameArabic: 'الزخرف', meaningSomali: 'Dahabka & Qurxinta', verses: 89, type: 'Makki', page: 489, juz: 25 },
  { number: 44, nameSomali: 'Ad-Dukhaan', nameArabic: 'الدخان', meaningSomali: 'Qiiqa', verses: 59, type: 'Makki', page: 496, juz: 25 },
  { number: 45, nameSomali: 'Al-Jaathiyah', nameArabic: 'الجاثية', meaningSomali: 'Jilba-joogsadayaasha', verses: 37, type: 'Makki', page: 499, juz: 25 },
  { number: 46, nameSomali: 'Al-Axqaaf', nameArabic: 'الأحقاف', meaningSomali: 'Tuulmooyinka Ciidda', verses: 35, type: 'Makki', page: 502, juz: 26 },
  { number: 47, nameSomali: 'Muxammad', nameArabic: 'محمد', meaningSomali: 'Nabi Muxammad S.C.W.', verses: 38, type: 'Madani', page: 507, juz: 26 },
  { number: 48, nameSomali: 'Al-Fatxi', nameArabic: 'الفتح', meaningSomali: 'Guusha Weyn', verses: 29, type: 'Madani', page: 511, juz: 26 },
  { number: 49, nameSomali: 'Al-Xujuraat', nameArabic: 'الحجرات', meaningSomali: 'Qolalka', verses: 18, type: 'Madani', page: 515, juz: 26 },
  { number: 50, nameSomali: 'Qaaf', nameArabic: 'ق', meaningSomali: 'Xarafka Qaaf', verses: 45, type: 'Makki', page: 518, juz: 26 },
  { number: 51, nameSomali: 'Adh-Dhaariyaat', nameArabic: 'الذاريات', meaningSomali: 'Dabaysha Firdhisa', verses: 60, type: 'Makki', page: 520, juz: 26 },
  { number: 52, nameSomali: 'At-Duur', nameArabic: 'الطور', meaningSomali: 'Buurta Duur', verses: 49, type: 'Makki', page: 523, juz: 27 },
  { number: 53, nameSomali: 'An-Najm', nameArabic: 'النجم', meaningSomali: 'Xiddigta', verses: 62, type: 'Makki', page: 526, juz: 27 },
  { number: 54, nameSomali: 'Al-Qamar', nameArabic: 'القمر', meaningSomali: 'Dayaxa', verses: 55, type: 'Makki', page: 528, juz: 27 },
  { number: 55, nameSomali: 'Ar-Raxmaan', nameArabic: 'الرحمن', meaningSomali: 'Naxariistaha Guud', verses: 78, type: 'Madani', page: 531, juz: 27 },
  { number: 56, nameSomali: 'Al-Waaqicah', nameArabic: 'الواقعة', meaningSomali: 'Dhacdada Lama Huraanka ah', verses: 96, type: 'Makki', page: 534, juz: 27 },
  { number: 57, nameSomali: 'Al-Xadiid', nameArabic: 'الحديد', meaningSomali: 'Birta', verses: 29, type: 'Madani', page: 537, juz: 27 },
  { number: 58, nameSomali: 'Al-Mujaadilah', nameArabic: 'المجادلة', meaningSomali: 'Doodi-tada', verses: 22, type: 'Madani', page: 542, juz: 28 },
  { number: 59, nameSomali: 'Al-Xashr', nameArabic: 'الحشر', meaningSomali: 'Soo Kulminta', verses: 24, type: 'Madani', page: 545, juz: 28 },
  { number: 60, nameSomali: 'Al-Mumtaxanah', nameArabic: 'الممتحنة', meaningSomali: 'Haweenayda la Imtixaamay', verses: 13, type: 'Madani', page: 549, juz: 28 },
  { number: 61, nameSomali: 'As-Saff', nameArabic: 'الصف', meaningSomali: 'Saf-ka Dagaalka', verses: 14, type: 'Madani', page: 551, juz: 28 },
  { number: 62, nameSomali: 'Al-Jumucah', nameArabic: 'الجمعة', meaningSomali: 'Maalinta Jimcaha', verses: 11, type: 'Madani', page: 553, juz: 28 },
  { number: 63, nameSomali: 'Al-Munaafiquun', nameArabic: 'المنافقون', meaningSomali: 'Munaafaqiinta', verses: 11, type: 'Madani', page: 554, juz: 28 },
  { number: 64, nameSomali: 'At-Taghaabun', nameArabic: 'التغابن', meaningSomali: 'Khasaarihii Muuqday', verses: 18, type: 'Madani', page: 556, juz: 28 },
  { number: 65, nameSomali: 'At-Dalaaq', nameArabic: 'الطلاق', meaningSomali: 'Furiinka', verses: 12, type: 'Madani', page: 558, juz: 28 },
  { number: 66, nameSomali: 'At-Taxriim', nameArabic: 'التحريم', meaningSomali: 'Reebidda', verses: 12, type: 'Madani', page: 560, juz: 28 },
  { number: 67, nameSomali: 'Al-Mulk', nameArabic: 'الملك', meaningSomali: 'Boqortooyada (Badbaadada Qabriga)', verses: 30, type: 'Makki', page: 562, juz: 29 },
  { number: 68, nameSomali: 'Al-Qalam', nameArabic: 'القلم', meaningSomali: 'Qalinka', verses: 52, type: 'Makki', page: 564, juz: 29 },
  { number: 69, nameSomali: 'Al-Xaaqqah', nameArabic: 'الحاقة', meaningSomali: 'Xaqiiqada Qiyaamaha', verses: 52, type: 'Makki', page: 566, juz: 29 },
  { number: 70, nameSomali: 'Al-Macaarij', nameArabic: 'المعارج', meaningSomali: 'Jaranjarooyinka Samooyinka', verses: 44, type: 'Makki', page: 568, juz: 29 },
  { number: 71, nameSomali: 'Nuux', nameArabic: 'نوح', meaningSomali: 'Nabi Nuux', verses: 28, type: 'Makki', page: 570, juz: 29 },
  { number: 72, nameSomali: 'Al-Jinn', nameArabic: 'الجن', meaningSomali: 'Jinniga', verses: 28, type: 'Makki', page: 572, juz: 29 },
  { number: 73, nameSomali: 'Al-Muzzammil', nameArabic: 'المزمل', meaningSomali: 'Iskudadahey', verses: 20, type: 'Makki', page: 574, juz: 29 },
  { number: 74, nameSomali: 'Al-Muddaththir', nameArabic: 'المدثر', meaningSomali: 'Isku Huwadey', verses: 56, type: 'Makki', page: 575, juz: 29 },
  { number: 75, nameSomali: 'Al-Qiyaamah', nameArabic: 'القيامة', meaningSomali: 'Maalinta Qiyaame', verses: 40, type: 'Makki', page: 577, juz: 29 },
  { number: 76, nameSomali: 'Al-Insaan', nameArabic: 'الإنسان', meaningSomali: 'Aadamaha', verses: 31, type: 'Madani', page: 578, juz: 29 },
  { number: 77, nameSomali: 'Al-Mursalaat', nameArabic: 'المرسلات', meaningSomali: 'Dabaylaha la Diray', verses: 50, type: 'Makki', page: 580, juz: 29 },
  { number: 78, nameSomali: 'An-Naba\'', nameArabic: 'النبأ', meaningSomali: 'Warka Weyn', verses: 40, type: 'Makki', page: 582, juz: 30 },
  { number: 79, nameSomali: 'An-Naazicaat', nameArabic: 'النازعات', meaningSomali: 'Malaa\'igta Ruuxa Siibta', verses: 46, type: 'Makki', page: 583, juz: 30 },
  { number: 80, nameSomali: 'Cabasa', nameArabic: 'عبس', meaningSomali: 'Wejigii Cadhooday', verses: 42, type: 'Makki', page: 585, juz: 30 },
  { number: 81, nameSomali: 'At-Takwiir', nameArabic: 'التكوير', meaningSomali: 'Duubitaanka Qorraxda', verses: 29, type: 'Makki', page: 586, juz: 30 },
  { number: 82, nameSomali: 'Al-Infidaar', nameArabic: 'الانفطار', meaningSomali: 'Dilaaca Samada', verses: 19, type: 'Makki', page: 587, juz: 30 },
  { number: 83, nameSomali: 'Al-Mudaffifiin', nameArabic: 'المطففين', meaningSomali: 'Miisaanka Dhimaalka', verses: 36, type: 'Makki', page: 587, juz: 30 },
  { number: 84, nameSomali: 'Al-Inshiqaaq', nameArabic: 'الانشقاق', meaningSomali: 'Dildilaaca Samada', verses: 25, type: 'Makki', page: 589, juz: 30 },
  { number: 85, nameSomali: 'Al-Buruuj', nameArabic: 'البروج', meaningSomali: 'Qasriyada Xiddigaha', verses: 22, type: 'Makki', page: 590, juz: 30 },
  { number: 86, nameSomali: 'At-Daariq', nameArabic: 'الطارق', meaningSomali: 'Xiddigta Habeenkii Ifta', verses: 17, type: 'Makki', page: 591, juz: 30 },
  { number: 87, nameSomali: 'Al-Aclaa', nameArabic: 'الأعلى', meaningSomali: 'Kan Ugu Sarreeya', verses: 19, type: 'Makki', page: 591, juz: 30 },
  { number: 88, nameSomali: 'Al-Ghaashiyah', nameArabic: 'الغاشية', meaningSomali: 'Masiibada Daboolaysa', verses: 26, type: 'Makki', page: 592, juz: 30 },
  { number: 89, nameSomali: 'Al-Fajr', nameArabic: 'الفجر', meaningSomali: 'Waaberiga', verses: 30, type: 'Makki', page: 593, juz: 30 },
  { number: 90, nameSomali: 'Al-Balad', nameArabic: 'البلد', meaningSomali: 'Magaalada (Makka)', verses: 20, type: 'Makki', page: 594, juz: 30 },
  { number: 91, nameSomali: 'Ash-Shams', nameArabic: 'الشمس', meaningSomali: 'Qorraxda', verses: 15, type: 'Makki', page: 595, juz: 30 },
  { number: 92, nameSomali: 'Al-Layl', nameArabic: 'الليل', meaningSomali: 'Habeenka', verses: 21, type: 'Makki', page: 595, juz: 30 },
  { number: 93, nameSomali: 'Ad-Duxaa', nameArabic: 'الضحى', meaningSomali: 'Barqada', verses: 11, type: 'Makki', page: 596, juz: 30 },
  { number: 94, nameSomali: 'Ash-Sharx', nameArabic: 'الشرح', meaningSomali: 'Fasaxa Laabta', verses: 8, type: 'Makki', page: 596, juz: 30 },
  { number: 95, nameSomali: 'At-Tiin', nameArabic: 'التين', meaningSomali: 'Geedka Tiinka', verses: 8, type: 'Makki', page: 597, juz: 30 },
  { number: 96, nameSomali: 'Al-Calaq', nameArabic: 'العلق', meaningSomali: 'Xinjirta (Aayadihii ugu horeeyay)', verses: 19, type: 'Makki', page: 597, juz: 30 },
  { number: 97, nameSomali: 'Al-Qadr', nameArabic: 'القدر', meaningSomali: 'Laylatul Qadriga', verses: 5, type: 'Makki', page: 598, juz: 30 },
  { number: 98, nameSomali: 'Al-Bayyinah', nameArabic: 'البينة', meaningSomali: 'Caddaynta Cad', verses: 8, type: 'Madani', page: 598, juz: 30 },
  { number: 99, nameSomali: 'Az-Zalzalah', nameArabic: 'الزلزلة', meaningSomali: 'Dhulgariirka', verses: 8, type: 'Madani', page: 599, juz: 30 },
  { number: 100, nameSomali: 'Al-Caadiyaat', nameArabic: 'العاديات', meaningSomali: 'Fardaha Xawaaraha ku Orodka', verses: 11, type: 'Makki', page: 599, juz: 30 },
  { number: 101, nameSomali: 'Al-Qaaricah', nameArabic: 'القارعة', meaningSomali: 'Dhawaaqa Naxdinta Leh', verses: 11, type: 'Makki', page: 600, juz: 30 },
  { number: 102, nameSomali: 'At-Takaathur', nameArabic: 'التكاثر', meaningSomali: 'Ku Faanka Badashada', verses: 8, type: 'Makki', page: 600, juz: 30 },
  { number: 103, nameSomali: 'Al-Casr', nameArabic: 'العصر', meaningSomali: 'Waqtiga / Casarka', verses: 3, type: 'Makki', page: 601, juz: 30 },
  { number: 104, nameSomali: 'Al-Humazah', nameArabic: 'الهمزة', meaningSomali: 'Xanta iyo Ceebeynta', verses: 9, type: 'Makki', page: 601, juz: 30 },
  { number: 105, nameSomali: 'Al-Fiil', nameArabic: 'الفيل', meaningSomali: 'Maroodiga', verses: 5, type: 'Makki', page: 601, juz: 30 },
  { number: 106, nameSomali: 'Quraysh', nameArabic: 'قريش', meaningSomali: 'Reer Quraysh', verses: 4, type: 'Makki', page: 602, juz: 30 },
  { number: 107, nameSomali: 'Al-Maacuun', nameArabic: 'الماعون', meaningSomali: 'Caawinta Dadka', verses: 7, type: 'Makki', page: 602, juz: 30 },
  { number: 108, nameSomali: 'Al-Kawthar', nameArabic: 'الكوثر', meaningSomali: 'Webiga Khayrka Badan', verses: 3, type: 'Makki', page: 602, juz: 30 },
  { number: 109, nameSomali: 'Al-Kaafiruun', nameArabic: 'الكافرون', meaningSomali: 'Gaalada', verses: 6, type: 'Makki', page: 603, juz: 30 },
  { number: 110, nameSomali: 'An-Nasr', nameArabic: 'النصر', meaningSomali: 'Gargaarka Alle', verses: 3, type: 'Madani', page: 603, juz: 30 },
  { number: 111, nameSomali: 'Al-Masad', nameArabic: 'المسد', meaningSomali: 'Xadhigga Xabalka ah (Abuu Lahab)', verses: 5, type: 'Makki', page: 603, juz: 30 },
  { number: 112, nameSomali: 'Al-Ikhlaas', nameArabic: 'الإخلاص', meaningSomali: 'Tawxiidka Alle', verses: 4, type: 'Makki', page: 604, juz: 30 },
  { number: 113, nameSomali: 'Al-Falaq', nameArabic: 'الفلق', meaningSomali: 'Waaberiga / Magangalka', verses: 5, type: 'Makki', page: 604, juz: 30 },
  { number: 114, nameSomali: 'An-Naas', nameArabic: 'الناس', meaningSomali: 'Dadka', verses: 6, type: 'Makki', page: 604, juz: 30 },
];

export const DAILY_RECOMMENDED_SURAHS: { number: number; reason: string; badge: string }[] = [
  { number: 18, reason: 'Sunno maalinta Jimcaha', badge: 'Jimce' },
  { number: 67, reason: 'Badbaadada Qabriga - Habeenkii', badge: 'Habeen' },
  { number: 36, reason: 'Wadnaha Qur\'aanka', badge: 'Fadli' },
  { number: 56, reason: 'Barakada Rizqiga', badge: 'Rizqi' },
  { number: 32, reason: 'Habeenkii ka hor hurdada', badge: 'Hurdo' },
  { number: 112, reason: 'U dhiganta 1/3 Qur\'aanka', badge: '1/3 Qur\'aan' },
  { number: 113, reason: 'Magangalka Sharta', badge: 'Xifdi' },
  { number: 114, reason: 'Magangalka Waswaaska', badge: 'Xifdi' },
];

/**
 * Calculates exact page count and range for any surah in the standard 604-page Madinah Mushaf.
 */
export function getSurahPageRange(surahNumber: number): { start: number; end: number; count: number } {
  const current = QURAN_SURAHS.find((s) => s.number === surahNumber);
  if (!current) return { start: 1, end: 1, count: 1 };
  const next = QURAN_SURAHS.find((s) => s.number === surahNumber + 1);
  const end = next ? (next.page > current.page ? next.page - 1 : current.page) : 604;
  const count = Math.max(1, end - current.page + 1);
  return { start: current.page, end, count };
}

export function getSurahPageCount(surahNumber: number): number {
  return getSurahPageRange(surahNumber).count;
}

export function getSurahsRangeInfo(startNum: number, endNum: number): {
  surahs: SurahInfo[];
  startPage: number;
  endPage: number;
  totalPages: number;
} {
  const min = Math.max(1, Math.min(startNum, endNum));
  const max = Math.min(114, Math.max(startNum, endNum));
  const surahs = QURAN_SURAHS.filter((s) => s.number >= min && s.number <= max);
  if (surahs.length === 0) {
    return { surahs: [], startPage: 1, endPage: 1, totalPages: 0 };
  }
  const first = surahs[0];
  const last = surahs[surahs.length - 1];
  const lastRange = getSurahPageRange(last.number);
  const startPage = first.page;
  const endPage = lastRange.end;
  const totalPages = Math.max(1, endPage - startPage + 1);
  return { surahs, startPage, endPage, totalPages };
}

