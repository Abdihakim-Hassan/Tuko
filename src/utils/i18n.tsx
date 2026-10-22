import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type AppLanguage = 'so' | 'en';

const LANGUAGE_STORAGE_KEY = 'tuko_app_language';

// Arabic Unicode range detector — NEVER translate any text containing Arabic script (Qur'an, Duas, Adhkaar)
const ARABIC_SCRIPT_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

// 1. Exact Full-String Dictionary (Somali -> English)
const EXACT_TRANSLATIONS: Record<string, string> = {
  // Brand & Header
  '– Dhawr-Salaad & Adkaar': '– Prayer & Adhkaar Tracker',
  'Saaxiibkaaga Cibaadada Maalinlaha ah • Waqtiyada Salaadda Soomaaliya':
    'Your Daily Worship Companion • Somalia & Global Prayer Times',
  'Salaad & Diiwaan': 'Prayers & Log',
  'Aadaan & Alaarm ⏰': 'Adhan & Alarm ⏰',
  'Cusub': 'New',
  'Qibla': 'Qibla',
  'Tasbeex': 'Tasbeeh',
  'To-Do 📸': 'To-Do 📸',
  'Adhkaar & Duco': 'Adhkaar & Duas',
  'Soon & Sakada 💰': 'Fasting & Zakat 💰',
  "Qur'aan": "Qur'an",
  'Kalandar': 'Calendar',
  'Tirakoob': 'Analytics',
  'Dejin': 'Settings',
  'Qaybaha': 'Sections',
  'Aadaanka (Furan)': 'Adhan (Active)',
  'Furo Aadaanka': 'Enable Adhan',
  'Gal Koontada': 'Sign In',
  'Koontada': 'Account',
  'Soo Deji & Online': 'Install & Online',
  'Install Tuko': 'Install Tuko',
  'Maalin': 'Day',
  'Maalmood': 'Days',

  // All Sections Modal
  'Dhammaan Qaybaha App-ka': 'All App Sections',
  '11 Qaybood': '11 Sections',
  'Wax walba oo ku jira Mobile, Tablet iyo Laptop hal meel ka hel':
    'Access all features across Mobile, Tablet, and Laptop in one place',
  'Salaad & Cibaado': 'Prayer & Worship',
  "Qur'aanka & Adhkaarta": "Qur'an & Adhkaar",
  'Qorsheynta & Horumarka': 'Planning & Progress',
  'Dejinta & Nidaamka': 'Settings & System',
  '5-ta Salaadood, Waqtiyada, Xisaabinta & Diiwaangeli':
    '5 Daily Prayers, Times, Countdown & Daily Logging',
  'Codadka 8 Shiiq salaad kasta, Saacadda nool & Alaarmyo':
    '8 Sheikh Adhan voices per prayer, Live Clock & Alarms',
  'Jiheeyaha Qiblada': 'Qibla Compass',
  'Jiheeyaha tooska ah ee Kacbada Muxarramah': 'Live compass direction toward the Holy Kaaba',
  'Tasbeex Dijitaal': 'Digital Tasbeeh',
  'Tiro koobka tasbeexda, Sujuud & Dhawaaq': 'Digital dhikr counter with sound & haptic feedback',
  "Qur'aan Kariim": "Holy Qur'an",
  'Akhriska 114 Suuradood, Khatam & Diiwaanka Bogagga':
    'Read all 114 Surahs, Khatm planner & daily page tracker',
  'Subax, Galab, Salaadda dabadeed & Ducooyin gaar ah':
    'Morning, Evening, Post-Prayer Adhkaar & Personal Duas',
  'Soon, Afur & Sakada 💰': 'Fasting, Iftar & Zakat 💰',
  'Soonka Ramadaan, Xisaabiyaha Sakada & Nisaabka Dahabka':
    'Fasting tracker, Qadaa log, Zakat Calculator & Gold Nisab',
  'Sakada': 'Zakat',
  'To-Do & Hawlo 📸': 'To-Do & Tasks 📸',
  'Hawlaha maalinlaha ah, Masawirrada caddeynta & Xasuusin':
    'Daily tasks, photo proof attachments & reminders',
  'Kamarad': 'Camera',
  'Kalandar Hijri & Miladi': 'Hijri & Gregorian Calendar',
  'Xilliyada bisha, maalmaha soonka & taariikhda':
    'Monthly prayer logs, fasting days & Hijri dates',
  'Tirakoob & Horumar': 'Statistics & Progress',
  'Jaantusyada diiwaanka salaadda, streak & heerkaaga':
    'Prayer charts, streaks, reasons analysis & progress reports',
  'Dejinta App-ka': 'App Settings',
  'Bedel Magaalada, Codadka Aadaanka, Hab-ka Rag/Dumar':
    'Change City, Adhan Voices, Language & Brother/Sister Mode',
  'Furan': 'Active',
  'Xir': 'Close',
  '✕ Xir': '✕ Close',
  'Daawo': 'Watch',
  'Degso': 'Download',
  '🎬 Daawo Hadda': '🎬 Watch Now',
  'Cloud Database waa ku xiran tahay': 'Cloud Database Connected',
  'Ku xir Koontadaada Cloud Database': 'Connect Your Account to Cloud Database',
  'Maamul Koontada': 'Manage Account',
  'Gal Koontada Hadda': 'Sign In Now',
  'Tuko App • Mobile, Tablet & Laptop waafaqsan': 'Tuko App • Compatible with Mobile, Tablet & Laptop',

  // Prayers & Statuses
  'Subax (Fajr)': 'Fajr (Dawn)',
  'Duxa (Qorrax)': 'Sunrise (Duha)',
  'Qorrax-soo-bax': 'Sunrise (Duha)',
  'Duhur': 'Dhuhr (Noon)',
  'Casar': 'Asr (Afternoon)',
  'Maqrib': 'Maghrib (Sunset)',
  'Magrib': 'Maghrib (Sunset)',
  'Cishe': 'Isha (Night)',
  'Cisha': 'Isha (Night)',
  'Masaajid': 'Mosque',
  '🕌 Masaajid': '🕌 Mosque',
  'Waqtiga Hore': 'Early on Time',
  '🌟 Waqtiga Hore': '🌟 Early on Time',
  'Waqtiga Hore (Guriga)': 'Early on Time (Home)',
  'Guriga': 'At Home',
  '🏠 Guriga': '🏠 Home',
  'I Dhaaftay': 'Missed',
  'I dhaaftay': 'Missed',
  'Dhaaftay': 'Missed',
  '❌ I Dhaaftay': '❌ Missed',
  'Cudurdaran': 'Excused',
  '🌸 Cudurdaran': '🌸 Excused',
  'Waa Waqtigii!': "It's Prayer Time!",
  'Maanta': 'Today',
  'Shalay': 'Yesterday',

  // Reasons chips
  'Masaajidka oo fogaa': 'Mosque was far away',
  'Xanuun / Cudur': 'Illness / Sickness',
  'Howlo shaqo / Mashquul': 'Busy with work / duties',
  'Roob / Cimilo adag': 'Rain / Severe weather',
  'Jidka / Safar ayaan ku jiray': 'Traveling / On the road',
  'Daryeelka qoyska / Carruurta': 'Caring for family / children',
  'Hurdo ayaa i qaadday': 'Overslept',
  'Waqtiga ayaa iga baxay / I dhaafay': 'Ran out of time / Missed time',
  'Shaqo mashquul ah': 'Busy at work',
  'Jidka ayaan ku xannibnaa': 'Stuck in traffic / transit',
  'Ilaaway xilliga salaadda': 'Forgot the prayer time',

  // Calendar Months & Days
  'Janaayo': 'January',
  'Febraayo': 'February',
  'Maarso': 'March',
  'Abriil': 'April',
  'Maajo': 'May',
  'Juun': 'June',
  'Luuliyo': 'July',
  'Ogosto': 'August',
  'Sebteembar': 'September',
  'Oktoobar': 'October',
  'Nofeembar': 'November',
  'Diseembar': 'December',
  'Axad': 'Sunday',
  'Isniin': 'Monday',
  'Talaado': 'Tuesday',
  'Arbaco': 'Wednesday',
  'Khamiis': 'Thursday',
  'Jimco': 'Friday',
  'Sabti': 'Saturday',
  'Ax': 'Su',
  'Is': 'Mo',
  'Ta': 'Tu',
  'Ar': 'We',
  'Kh': 'Th',
  'Ji': 'Fr',
  'Sa': 'Sa',

  // To-Do Categories & Presets
  'Diini & Cibaado': 'Religion & Worship',
  'Shaqo & Ganacsi': 'Work & Business',
  'Qoyska & Guriga': 'Family & Home',
  'Waxbarasho': 'Education & Study',
  'Caafimaad & Jimicsi': 'Health & Fitness',
  'Guud & Kale': 'General & Other',
  'Akhrinta Suuratul Kahf (Jumcaha)': 'Read Surah Al-Kahf (Friday)',
  'Iftiin labada Jimco u dhaxeeya.': 'Light between the two Fridays.',
  '100 Salawaat ku sali Nabiga ﷺ': 'Send 100 Salawat upon the Prophet ﷺ',
  'Adhkaarta & Wardiga Subaxa & Galabta': 'Morning & Evening Adhkaar',
  'Ilaalinta Alle iyo xasilooni.': 'Divine protection and peace of mind.',
  "Akhrinta Hal Juz oo Qur'aan ah": "Read One Juz of the Qur'an",
  "Qur'aanka maalinlaha ah.": "Daily Qur'an recitation.",
  'Sadaqo bixin ama caawin qof danyar ah': 'Give charity (Sadaqah) or help someone in need',
  'Sadaqadu waxay damisaa carada Rabbi.': 'Charity extinguishes the wrath of the Lord.',
  'Booqasho & Xiriirin Ehelka ama Waalidiinta': 'Visit & connect with family or parents',

  // Tasbeeh Somali explanations (Arabic stays Arabic!)
  'Ceebeysanaan Allaah baa ka fog': 'Glory be to Allah (Free from all imperfection)',
  'Mahad iyo ammaan Allaah baa iska leh': 'All praise and thanks belong to Allah',
  'Allaah baa wax kasta ka weyn': 'Allah is the Greatest above all things',
  'Ilaah xaq lagu caabudo ma jiro Allaah mooyee': 'There is no deity worthy of worship except Allah',
  'Waxaan dambi-dhaaf weydiisanayaa Allaah waana u toobad keenayaa':
    'I seek forgiveness from Allah and repent to Him',
  'Ilaahow u naxariiso Nabiga iyo reerkiisa': 'O Allah, send blessings upon Prophet Muhammad and his family',
  'Xoog iyo xeelad ma jirto Allaah mooyee': 'There is no power and no strength except through Allah',
  'Labo kalimadood oo carabka u fudud, miizaankana ku culus':
    'Two phrases light on the tongue, heavy on the scales',

  // Daily Wisdoms Somali translations (Arabic verses/hadiths stay 100% Arabic)
  'Aayadda Maalinta': 'Verse of the Day',
  'Xadiiska Maalinta': 'Hadith of the Day',
  'Ducada Maalinta': 'Supplication of the Day',
  'Oo oog salaadda labada daraf ee maalinta iyo qaybo ka mid ah habeenka, runtii wanaaggu wuxuu tirtiraa xumaanta.':
    'And establish prayer at the two ends of the day and at the approach of the night. Indeed, good deeds do away with misdeeds.',
  'Qofkii tukada labada salaadood ee qabowga (Subaxa iyo Casarka) wuxuu galayaa Jannada.':
    'Whoever prays the two cool prayers (Fajr and Asr) will enter Paradise.',
  'Ogaada! Xuska Allaah oo kaliya ayaa quluubtu ku degtaa.':
    'Unquestionably, by the remembrance of Allah do hearts find peace and tranquility.',
  'Shanta salaadood iyo Jimcada ilaa Jimcada xigta waa dambi-dhaafka waxa u dhexeeya haddii laga fogaado dambiyada waaweyn.':
    'The five daily prayers and from one Friday prayer to the next are expiation for whatever sins come in between, so long as major sins are avoided.',
  'Rabbiyow na sii adduunyada wanaag, aakhirona wanaag, nagana badbaadi cadaabka naarta.':
    'Our Lord, grant us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.',
  "Kiinna ugu khayrka badan waa qofka barta Qur'aanka dadkana bara.":
    "The best among you are those who learn the Qur'an and teach it to others.",
  'Kaalmaysta samirka iyo salaadda, runtii taasi way ku weyn tahay kuwa qalbiga ka khushuuca mooyee.':
    'And seek help through patience and prayer; indeed, it is difficult except for the humbly submissive.',
};

// 2. Ordered Longest-Match Phrase & Sentence Replacements (Somali -> English)
const PHRASE_REPLACEMENTS: [string, string][] = [
  // Long sentences & banners
  [
    'Waad ka baxday koontadaadii si nabad ah. Dhammaan xogtaadii hore waxay si sugan ugu xafidan tahay Cloud Database-ka.',
    'You have safely signed out. All your previous records remain securely saved in the Cloud Database.',
  ],
  [
    'Xogtaadu waxay si sugan ugu kaydsantahay qalabkaaga iyo Cloud Database-ka',
    'Your data is securely stored on your device and synced with the Cloud Database',
  ],
  ['Ku xiran koontada:', 'Connected to account:'],
  [
    'Codka Aadaanka & Alaarm-ka wuxuu u baahan yahay ogolaansho hal-taabasho ah!',
    'Adhan & Alarm audio requires a one-tap browser permission!',
  ],
  [
    'Biraawsarku wuxuu xannibaa codka ilaa aad shaashadda taabato. Taabo badhankan si aad u tijaabiso oo u shido:',
    'Browsers block audio until you tap the screen. Tap this button to test and enable sound:',
  ],
  ['Shid Codka (Enable Audio)', 'Enable Audio Now'],
  ['Waad Ka Baxday Koontada (Log Out)', 'Signed Out Successfully (Log Out)'],
  ['Ku Soo Dhowow Koontadaada (Log In)', 'Welcome to Your Account (Log In)'],
  ['Guul ✓', 'Success ✓'],
  [
    'Si aad xogtaada uga hesho mobile, tablet iyo laptop isku mid ah, gal koontadaada',
    'Sign in to sync and access your data across mobile, tablet, and laptop',
  ],
  ['Xogtaada waxay toos ugu kaydsan tahay:', 'Your data is automatically backed up to:'],

  // SalaadView phrases
  ['Digniin Aadaan', 'Pre-Adhan Alert'],
  ['Isu Diyaari Salaadda', 'Prepare for Prayer'],
  ['ayaa ka dhiman Salaadda', 'remaining until'],
  ['Waa xilligii weesada, u diyaar-garowga jamaacada, ama salaadda waqtigeeda hore.', 'Time for Wudu (ablution) and preparing for congregation or early prayer.'],
  ['Dhageyso Chime 🔔', 'Play Chime 🔔'],
  ['Salaadda Xigta', 'Next Prayer'],
  ['Salaadda Hadda', 'Current Prayer'],
  ['Waqtiga Aadaanka:', 'Adhan Time:'],
  ['Salaadda waxaa ka dhiman', 'Time until prayer'],
  ['(Saacadda waxaa ka dhiman)', '(Countdown remaining)'],
  ['Fur Shaashadda Adhkaarta', 'Open Full Adhkaar Screen'],
  ['Fur Shaashadda Aadaanka & Adhkaarta oo dhan', 'Open Fullscreen Adhan & Adhkaar View'],
  ['Taxanaha (Streaks)', 'Prayer Streaks'],
  ['Maalin taxane ah', 'Day Streak'],
  ['Maalmood xiriir ah', 'Days Streak'],
  ['Ugu fiicnaa:', 'Best Streak:'],
  ['Wadaag', 'Share'],
  ['🌸 Maalmo Udhur (Cudur Sharci) — Ajarkaagu wuu socdaa!', '🌸 Excused Days (Sister Mode) — Your reward & streak continue!'],
  ['🔥 5/5 waa la wada tukaday! Taxanuhu waa badbaado.', '🔥 5/5 Prayers Completed! Your streak is protected.'],
  ['Waa maxay Streak?', 'What is a Streak?'],
  ['Bilow / Deji', 'Start / Set'],
  ['Diiwaanka Maanta:', "Today's Log:"],
  ['la tukaday', 'prayed'],
  ['🌸 Qaybta Gabdhaha', '🌸 Sister Mode'],
  ['🕌 Qaybta Wiilasha', '🕌 Brother Mode'],
  ['🌸 Maanta Waa Fasax ✓', '🌸 Today is Excused ✓'],
  ['🌸 Maanta Fasax Waaye (Udhur)', '🌸 Mark Today Excused (Udhur)'],
  ['Dhammaan Waqtiga Hore', 'All Early on Time'],
  ['Dhammaan Masaajid', 'All at Mosque'],
  ['Dhammaan Guriga', 'All at Home'],
  ['Dhammaan Dhaaftay', 'All Missed'],
  ['Dib u Bilaab', 'Reset All'],
  ['Dib u bilaab', 'Reset'],
  ['Fadliga Diinta Islaamka:', 'Mercy of Islam:'],
  ['Maanta waxaad calaamadisay', 'Today you marked'],
  ['Maalin Fasax ah (Cudur Sharci)', 'an Excused Day (Legal Exemption)'],
  ['. Salaaddu ma waajibayso maanta, taxanahaaguna (Streak 🔥) sidii buu kuu xafidan yahay!', '. Prayer is not obligatory today, and your Streak 🔥 remains fully protected!'],
  ['Sababta aad Guriga ugu tukatay', 'Reason for praying at home'],
  ['Sababta ay kuu dhaaftay salaaddu', 'Reason for missing the prayer'],
  ['Qor sababta...', 'Write the reason...'],
  ['Keydi Sababta', 'Save Reason'],
  ['Waa la keydiyay', 'Saved'],

  // FridaySpecialCard phrases
  ['Sayidka Maalmaha • Jimce Mubaarak', 'Master of Days • Jumuah Mubarak'],
  ['Hab-ka Gaarka ah ee Jimcaha', 'Friday (Jumuah) Special Sunnahs'],
  ['✨ Nuur u dhexeeya labada Jimco', '✨ Light between the two Fridays'],
  ['Akhriska Suuratul Al-Kahf', 'Reciting Surah Al-Kahf'],
  ['Sunno mu’akada ah maalinta Jimcaha', 'Confirmed Sunnah on Friday'],
  ['Waan Akhriyay ✓', 'Completed ✓'],
  ['Ma Akhriyay?', 'Mark as Read'],
  ['Alxamdulillah! Nuurka Jimcaha ayaad xaqiijisay.', 'Alhamdulillah! You have achieved the light of Friday.'],
  ['Ha moogaanin ajaraka weyn ee Suuratul Kahf maanta.', 'Do not miss the immense reward of Surah Al-Kahf today.'],
  ['Fadliga', 'Virtue'],
  ['Qari', 'Hide'],
  ['Ku Saliga Nabiga (SCW)', 'Salawat upon the Prophet ﷺ'],
  ['Ugu yaraan 100 jeer maanta', 'At least 100 times today'],
  ['+1 Sali', '+1 Salawat'],

  // StreakInfoModal phrases
  ['Waa Maxay Taxanaha (Streak)?', 'What is a Prayer Streak?'],
  ['Sidee buu u shaqeeyaa & sideed ku bilaabi kartaa', 'How it works & how to set your starting streak'],
  ['Taxanahaaga Hadda', 'Your Current Streak'],
  ['Ugu Sarreeyay', 'All-Time Best'],
  ['Waa tirada maalmaha xiriirka ah ee aad', 'The number of consecutive days you have prayed all'],
  ['5-taada salaadood', '5 daily prayers'],
  ['(Fajr, Duhur, Casar, Maqrib, Cishe) si joogto ah u wada tukatay adigoon hal salaadna ka tegin.', '(Fajr, Dhuhr, Asr, Maghrib, Isha) consistently without missing a single prayer.'],
  ['Sidee buu u kordhaa?', 'How does it increase?'],
  ['Maalin kasta oo aad 5-ta salaadood wada tukato (Masaajid ama Guriga, ama Dumarka udhurka ku jira), taxanahaagu wuxuu kordhayaa', 'Every day you complete all 5 prayers (at the Mosque, at Home, or on Excused days for sisters), your streak increases by'],
  ['Goorma ayuu bilaabmaa / dib u bilaabmaa?', 'When does it reset?'],
  ['Haddii maalin dhan aadan 5-ta salaadood wada tukan, maalinta xigta taxanuhu wuxuu dib uga bilaabmaa 0.', 'If an entire day passes without completing all 5 prayers, the streak resets to 0 the next day.'],
  ['Laakiin maalinta hadda socota', 'However, the current day in progress'],
  ['(sida Duhurka ama Casarka) ma jabiso taxanahaaga ilaa maalintu dhammaato!', '(such as Dhuhr or Asr) will never break your streak until the day ends!'],
  ['Bilow ama Sax Taxanahaaga (Starting Streak)', 'Set or Adjust Your Starting Streak'],
  ['Haddii aad horey u tukanaysay maalmo badan ka hor inta aadan app-ka soo degsan (tusaale 10, 20 ama 30 maalmood), waxaad halkan toos uga bilaabi kartaa taxanahaaga:', 'If you were already praying consistently before installing the app (e.g., 10, 20, or 30 days), enter your starting streak below:'],
  ['Geli tirada maalmaha (tusaale: 14)', 'Enter number of days (e.g., 14)'],
  ['Keydi & Bilow', 'Save & Start'],
  ['Taxanahaaga si guul leh ayaa loo bilaabay oo loo cusboonaysiiyay!', 'Your streak has been successfully updated!'],
  ['Haddii aad rabto inaad eber ka bilowdo:', 'If you want to start fresh from zero:'],
  ['Dib ugu celi 0', 'Reset to 0'],
  ['Waayahay, Waan Fahmay ✓', 'Got It, Understood ✓'],

  // GenderModal phrases
  ["Su'aal Muhiim ah (Hal Mar Oo Keliya)", 'Important One-Time Setup'],
  ['Ma Wiil baad tahay mise Gabar?', 'Are you a Brother or a Sister?'],
  ['Fadlan dooro qaybtaada si aan u kala saarno xogta salaadaha', 'Please choose your mode so we can tailor prayer tracking for'],
  ['Wiilasha (Masaajidka)', 'Brothers (Mosque Focus)'],
  ['Gabdhaha (Guriga & Maalmaha Fasaxa)', 'Sisters (Home & Excused Days)'],
  ['Wiil (Walaal)', 'Brother (Male)'],
  ['Salaadda Masaajidka, Jamaacada & Guriga', 'Mosque Congregation & Home Prayer Tracking'],
  ['Dooro Wiil', 'Select Brother'],
  ['Gabar (Walaashay)', 'Sister (Female)'],
  ['Waqtiga Hore, Guriga & Maalmaha Fasaxa (Udhur)', 'Early Home Prayer & Excused Days (Udhur) Protection'],
  ['Dooro Gabar', 'Select Sister'],
  ['🔒 Doorashadaada waxaa lagu xafidayaa koontadaada gaarka ah, mar dambe laguma weydiin doono.', '🔒 Your preference is saved to your profile and will not be asked again.'],

  // NotificationPromptModal phrases
  ['Aadaanka Shiiqyada Kala Duwan', 'Multiple Sheikh Adhan Voices'],
  ['Aadaanka & Codadka Shiiqyada', 'Adhan Voices & Notifications'],
  ['Ogaysiisyada Aadaanku Way Furan Yihiin (Active)', 'Adhan Notifications are Active'],
  ['Ogaysiisyadu Waa Xiran Yihiin (Lama Furo)', 'Notifications are Currently Disabled'],
  ['Furo Hadda', 'Enable Now'],
  ['Furaya...', 'Enabling...'],
  ['Shiiqyada', 'Sheikhs'],
  ['5-ta Salaad', '5 Prayers'],
  ['Taleefanka', 'Phone Setup'],
  ['Taabo Shiiq kasta si uu isla markiiba u yeero:', 'Tap any Sheikh below to preview their Adhan immediately:'],
  ['8 Shiiq ✓', '8 Sheikhs ✓'],
  ['Dooro Shiiq aad dhagaysato', 'Select a Sheikh to listen'],
  ['Hadda wuu yeerayaa (Playing)...', 'Now Playing Adhan...'],
  ['Guji mid kasta si uu markiiba u shaqeeyo', 'Tap any card below for instant playback'],
  ['Codka:', 'Volume:'],
  ['Xulan', 'Selected'],
  ['Dooro', 'Select'],
  ['Tijaabi Shaashadda Buuxda ee Aadaanka (Overlay Preview)', 'Preview Fullscreen Adhan Overlay'],
  ['Aadaanka 5-ta Salaadood ee Maanta:', "Today's 5 Daily Prayer Adhan Times:"],
  ['Aadaanku wuxuu gelayaa:', 'Adhan time:'],
  ['Sida Aadaanku ugu yeeri karo Markaad Baxdo:', 'How to Keep Adhan Working in the Background:'],
  ['Ilaalinta Batariga (Taleefan Kasta):', 'Battery Optimization (All Phones):'],
  ['Dhammaan Biraawsarrada (Any Browser):', 'All Web Browsers:'],
  ['Ogaysiisyada Aadaanka Way Furan Yihiin (ON) ✓', 'Adhan Notifications Enabled (ON) ✓'],
  ['Furo Aadaanka & Ogaysiisyada Hadda', 'Enable Adhan & Notifications Now'],
  ['Waan Fahmay • Xir', 'Understood • Close'],

  // SoonView & Zakat phrases
  ['Soonka & Afurka', 'Fasting & Iftar'],
  ['Xisaabiyaha Sakada & Nisaabka 💰', 'Zakat & Nisab Calculator 💰'],
  ['Soonka, Afurka & Qadaa-ga', 'Fasting, Iftar & Qadaa Tracker'],
  ['La soco xilliyada Suxuurta, Afurka, iyo Diiwaanka Qadaa-ga Soonka & Salaadaha', 'Track Suhoor, Iftar countdowns, and missed Fasting & Prayer Qadaa'],
  ['Maanta Waan Soomanahay ✓', 'I Am Fasting Today ✓'],
  ['Maanta Ma Sooman Tahay?', 'Are You Fasting Today?'],
  ['Fadliga Soonka Maanta', "Virtue of Fasting Today"],
  ['Waxaa sunno ah in la soomo maalmaha Isniinta iyo Khamiista, maadaama camallada loo bandhigo Allaah (SWT).', 'It is a confirmed Sunnah to fast on Mondays and Thursdays, as deeds are presented to Allah (SWT).'],
  ['Waqtiga Afurka', 'Iftar Time (Breaking Fast)'],
  ['Afurka waxaa ka dhiman:', 'Time until Iftar:'],
  ['Waqtigii Afurka wuu dhaafay', 'Iftar time has passed for today'],
  ['Waqtiga Suxuurta', 'Suhoor Time (Pre-Dawn)'],
  ['Suxuurta waxaa ka dhiman:', 'Time until Suhoor ends:'],
  ['Diiwaanka Qadaa-ga (Soonka & Salaadaha)', 'Qadaa Tracker (Missed Fasts & Prayers)'],
  ['🌸 Qaybta Gabdhaha: La soco maalmaha Soonka Ramadaan ee kugu waajibay xilliga fasaxa (Udhurka) iyo salaadaha u baahan qallaynta. (Xusuusin: Salaadaha xilliga Udhurka laguma qalleeyo diinta Islaamka, keliya Soonka ayaa la qalleeyaa).', '🌸 Sister Mode: Track Ramadan fasting days missed during excused periods (Udhur) and any missed prayers needing make-up. (Note: Prayers during menstruation are excused and not made up in Islam; only fasts are made up).'],
  ['La soco maalmaha Soonka iyo Salaadaha kaa tegay ee aad rabto inaad soo qallayso.', 'Track missed fasting days and prayers that you need to make up (Qadaa).'],
  ['🌸 Gaar u ah Gabdhaha & Qadaa', '🌸 Sister & Qadaa Tracker'],
  ['🕌 Xisaabiyaha Qadaa-ga', '🕌 Qadaa Calculator'],
  ['🌙 Qadaa-ga Soonka (Ramadaan / Waajib)', '🌙 Fasting Qadaa (Ramadan / Obligatory)'],
  ['Geli tirada maalmaha lagugu leeyahay oo calaamadee maalin kasta oo aad soonto', 'Enter the total days owed and mark each day as you complete your fast'],
  ['Guud ahaan Lagugu Leeyahay', 'Total Days Owed'],
  ['Waxa Aad Gudatay', 'Completed'],
  ['Waxa Kuu Dhiman', 'Remaining'],
  ['Xisaabiyaha Sakada (Zakatul Maal & Fidriga)', 'Zakat Calculator (Zakat al-Maal & Zakat al-Fitr)'],
  ['Sakada Maalka (Zakatul Maal - 2.5%)', 'Wealth Zakat (Zakat al-Maal - 2.5%)'],
  ['Sakada Fidriga (Zakatul Fitr)', 'Fitr Zakat (Zakat al-Fitr)'],
  ['Lacagta Caddaan ah & Bangiga ($)', 'Cash on Hand & Bank Balance ($)'],
  ['Dahabka aad haysato (Grams)', 'Gold Owned (Grams)'],
  ['Qiimaha 1 Gram oo Dahab ah ($)', 'Gold Price per Gram ($)'],
  ['Qalinka / Fiddada aad haysato (Grams)', 'Silver Owned (Grams)'],
  ['Qiimaha 1 Gram oo Qalin ah ($)', 'Silver Price per Gram ($)'],
  ['Hantida Ganacsiga & Badeecadda ($)', 'Business Inventory & Merchandise ($)'],
  ['Deynta lagugu leeyahay ee hadda la bixinayo ($)', 'Immediate Debts Owed ($)'],
  ['Wadarta Hantida Saafiga ah', 'Total Net Zakatable Wealth'],
  ['Heerka Nisaabka (85g Dahab)', 'Gold Nisab Threshold (85g)'],
  ['Sakada kugu waajibtay (2.5%)', 'Mandatory Zakat Due (2.5%)'],
  ['Sakadu waa kugu waajib!', 'Zakat is Mandatory on Your Wealth!'],
  ['Weli ma gaarin Nisaabka', 'Below Nisab Threshold (No Zakat Due)'],

  // Adhkaar & Duas phrases (Arabic text stays 100% Arabic)
  ['Qofkii akhriya Aayatul Kursi salaad kasta kadib, wax u diidaya inuu jannada galo ma jiraan geerida mooyee.', 'Whoever recites Ayatul Kursi after every obligatory prayer, nothing prevents them from entering Paradise except death.'],
  ['Ilaahow adaa nabad ah, xaggaagana nabad baa ka timaada, waxaadna barakeysantahay kan weynaanta iyo sharafta leh.', 'O Allah, You are Peace and from You comes peace; blessed are You, O Possessor of Majesty and Honor.'],
  ['Waxaan dambi-dhaaf weydiisanayaa Allaah-ka weyn ee uusan jirin ilaah xaq ah Isaga mooyee (33 jeer).', 'I seek forgiveness from Allah the Almighty, besides Whom there is no deity, the Ever-Living, the Sustainer, and I repent to Him (33 times).'],
  ['Ilaahow igu caawi xuskaaga, mahadnaqaaga, iyo wanaajinta cibaadadaada.', 'O Allah, help me to remember You, give thanks to You, and worship You in the best manner.'],
  ['Ceebeysanaan oo dhan Allaah baa ka fog (33 jeer).', 'Glory be to Allah, free from all imperfection (33 times).'],
  ['Mahad iyo ammaan oo dhan Allaah baa iska leh (33 jeer).', 'All praise and gratitude belong to Allah (33 times).'],
  ['Allaah baa weyn wax kasta (33 jeer).', 'Allah is the Greatest above all things (33 times).'],
  ['Ma jiro ilaah xaq lagu caabudo Allaah mooyee, wax wadaag la leh ma jiro (33 jeer).', 'There is no deity worthy of worship except Allah alone, with no partner; His is the dominion and praise, and He is over all things Omnipotent (33 times).'],
  ['Allaah ayaa igu filan, ma jiro ilaah xaq ah Isaga mooyee, xagiisaan talo saartay, waana Rabbiga Carshiga Weyn leh.', 'Allah is sufficient for me; there is no deity except Him. On Him I rely, and He is the Lord of the Mighty Throne.'],
  ['Ilaahow naarta cadaabteeda iga nabadgeli.', 'O Allah, protect me from the punishment of the Hellfire.'],
  ['Ilaahow waxaan ku weydiisanayaa Jannadaada sare.', 'O Allah, I ask You for Paradise.'],
  ['Ilaahow waxaan ku weydiisanayaa cilmi anfaca, rizqi xalaal oo wanaagsan, iyo camal la aqbalo.', 'O Allah, I ask You for beneficial knowledge, goodly provision, and acceptable deeds.'],
  ['Ducada soo toosidda (Kacaanka)', 'Supplication Upon Waking Up'],
  ['Mahad waxaa leh Allaah ee na nooleeyay dhimasho kadib, xagiisana loo noqon doonaa.', 'All praise is for Allah who gave us life after having taken it from us, and unto Him is the resurrection.'],
  ['Ducada bixitaanka guriga', 'Supplication When Leaving the Home'],
  ["Magaca Allaah ayaan ku baxayaa, Allaah ayaan talo saartay, mana jirto tabar iyo xeelad Allaah la'aantiis.", 'In the name of Allah, I place my trust in Allah, and there is no might nor power except with Allah.'],
  ['Ducada gelitaanka masaajidka', 'Supplication When Entering the Mosque'],
  ['Ilaahow ii fur albaabada naxariistaada.', 'O Allah, open for me the doors of Your mercy.'],
  ['Ducada waalidiinta', 'Supplication for Parents'],
  ['Rabbiyow ii dambi dhaaf aniga iyo waalidiinteyda, una naxariiso sidii ay iigu soo barbaariyeen yaraanteydii.', 'My Lord, forgive me and my parents, and have mercy on them as they brought me up when I was small.'],
  ['Ducada Weeso-qaadka (Markaad dhammayso)', 'Supplication After Completing Wudu (Ablution)'],

  // SettingsView phrases
  ['Dejinta App-ka & Goobta (Location)', 'App Settings & Location'],
  ['Dooro magaaladaada Soomaaliya, dariiqa xisaabinta salaadaha, iyo soo dejinta xogta', 'Choose your city, prayer calculation method, language, and data backup'],
  ['Magaalada & Goobtaada (Somalia & Global)', 'Your City & Location (Somalia & Global)'],
  ['Dooro Magaaladaada Soomaaliya:', 'Select Your City:'],
  ['📍 Hel Location-kayga Hadda (GPS)', '📍 Detect My Current Location (GPS)'],
  ['Ama gacanta ku geli Latitude & Longitude:', 'Or manually enter Latitude & Longitude:'],
  ['Keydi (OK)', 'Save (OK)'],
  ['Hab-ka Cibaadada & Jinsiga (Gender Mode)', 'Worship & Gender Mode'],
  ['Dhaqan Islaami ah', 'Islamic Practice'],
  ['Diintu waxay dumarka u jideysay in salaadda guriga ku tukashadeedu ay leedahay ajar u dhigma ama ka khayr badan masaajidka ragga. Dooro qaabka kugu habboon si taxanahaagu (streaks) u noqdo mid sax ah:', 'In Islam, a woman praying at home on time earns reward equal to or greater than congregation at the mosque. Choose your mode for accurate streak tracking:'],
  ['Hab-ka Ragga (Masaajidka)', 'Brother Mode (Mosque Focus)'],
  ['Xoogga saar salaadda jamaacada masaajidka', 'Emphasizes congregational prayers at the mosque'],
  ['Hab-ka Dumarka (Guriga / Sharaf)', 'Sister Mode (Home / Excused Protection)'],
  ['Waqtiga hore ee guriga wuxuu helayaa ajarka ugu sarreeya ee Taxanaha (Streaks), waxaana jira badhanka cudurka sharciga ah (udhur).', 'Early prayer at home counts for top streak excellence, and includes the Excused Day (Udhur) protection toggle.'],
  ['Bilow / Deji Taxanahaaga (Starting Streak Offset)', 'Set Starting Streak Offset'],
  ['Haddii aad horey u tukanaysay maalmo badan, ku dar tirada si taxanahaagu halkan uga bilowdo.', 'If you already had an active prayer streak, enter the number of days to start from.'],
  ['Jadwalkaaga Gaarka ah ee Aadaanka & Aqinka', 'Your Custom Adhan & Iqamah Timetable'],
  ['Waqtiyada saxda ah ee aadaanka iyo aqinka ee adiga kuu gaarka ah', 'Customize exact Adhan and Iqamah times for your local mosque'],
  ['✓ Jadwalka Gaarka ah (Shidan)', '✓ Custom Schedule (Active)'],
  ['Xisaabinta Magaalada', 'City Calculation'],

  // AdhanView phrases
  ['Codka caanka ah ee taariikhiga ah ee Kacbada sharafta leh.', 'The iconic historical Adhan from the Holy Kaaba in Makkah.'],
  ['Cod degan oo qalbiga taabanaya oo ka baxa Masjidka Nabiga ﷺ.', 'Peaceful, heart-touching Adhan from the Prophet’s Mosque ﷺ in Madinah.'],
  ['Cod macaan oo aad looga yaqaan dhammaan caalamka Islaamka.', 'Melodious voice renowned across the entire Islamic world.'],
  ['Codkii caanka ahaa ee qarniga, dhawaaq xooggan oo xiiso gaar ah leh.', 'Legendary voice of the century with powerful spiritual resonance.'],
  ['Aadaan heer sare ah oo casri ah oo xasilooni badan.', 'High-clarity modern Adhan filled with tranquility.'],
  ['Cod qiiro leh oo dhiirrigelinaya xaadiritaanka salaadda.', 'Moving recitation inspiring prompt attendance to prayer.'],
  ['Cod qadiimi ah oo leh xushmad iyo cabsi Eebbe oo qoto dheer.', 'Classic, reverent recitation with deep spiritual humility.'],
  ['Waxaa ku jira: "As-Salaatu Khayrun Mina Al-Nawm" (Salaadda hurdo ayaa ka khayr badan).', 'Includes: "As-Salatu Khayrun Minan-Nawm" (Prayer is better than sleep).'],

  // CalendarView & StatsView phrases
  ['Kalandarka Salaadaha', 'Prayer Calendar'],
  ['Eeg rikoodhka salaadaha bishaan iyo maalin kasta xaaladdeeda', 'View monthly prayer logs and daily completion status'],
  ['Bishii hore', 'Previous Month'],
  ['Bisha dambe', 'Next Month'],

  // Additional SoonView & Zakat Calculator phrases
  ['La Guday (La Soomay)', 'Completed (Fasted)'],
  ['Kugu Haray (Waxa ka dhiman Soonka)', 'Remaining (Fasts Owed)'],
  ['🎉 Alxamdulillaah! Waad dhammaystirtay dhammaan maalmaha Qadaa-ga Soonka!', '🎉 Alhamdulillah! You have completed all your Fasting Qadaa days!'],
  ['waa la guday', 'completed'],
  ['maalmood ayaa dhiman', 'days remaining'],
  ['-1 Ka noqo', '-1 Undo'],
  ['Maanta 1 Maalin Qadaa ah Waan Guday', 'Completed 1 Qadaa Fast Today'],
  ['Qadaa-ga Salaadaha Dhaafay', 'Missed Prayers Qadaa'],
  ['salaadood dhiman', 'prayers remaining'],
  ['Salaad kasta oo kaa tagtay oo aad rabto inaad soo qallayso halkan ku xisaabi', 'Track and make up each missed obligatory prayer here'],
  ['Soo gali', 'Import'],
  ['salaadood oo diiwaanka ku jiray', 'missed prayers from log'],
  ['+Deyn', '+Owed'],
  ['✓ Gud 1', '✓ Pray 1'],
  ['Ducooyinka Soonka & Afurka ee Sunnada ah:', 'Authentic Sunnah Supplications for Fasting & Iftar:'],
  ['1. Ducada Markaad Afurayso (Sunnah)', '1. Supplication Upon Breaking Fast (Sunnah)'],
  ['2. Ducada labaad ee Afurka', '2. Second Iftar Supplication'],
  ['Waa la guuriyay', 'Copied'],
  ['Guuri', 'Copy'],
  ['« Harraadkii wuu tagay, xididdadiina way qoyeen, ajarkuna wuu sugnaaday hadduu Allaah yiraahdo. » (Abu Daawuud).', '« The thirst has gone, the veins are moistened, and the reward is confirmed, if Allah wills. » (Abu Dawud).'],
  ['« Ilaahow adiga dartaad ayaan u soomay, rizqigaagana waxaan ku afuray. »', '« O Allah, for You I have fasted, and with Your provision I have broken my fast. »'],
  ['Xisaabiyaha Sakada & Nisaabka', 'Zakat & Nisab Calculator'],
  ['Tiirka 3-aad ee Islaamka • Xisaabi Sakadaada Maalka & Fitriga', '3rd Pillar of Islam • Calculate Your Wealth & Fitr Zakat'],
  ['Geli hantidaada (lacag, dahab, badeeco) si aad u ogaato haddii ay Nisaabka gaartay iyo inta sako ee kugu waajibka ah.', 'Enter your assets (cash, gold, silver, inventory) to check if they reach the Nisab threshold and calculate your mandatory Zakat.'],
  ['Xaaladda Nisaabka Hantidaada:', 'Your Wealth Nisab Status:'],
  ['Hantidu waxay gaartay Nisaabka!', 'Your wealth has reached the Nisab threshold!'],
  ['Hantidu weli ma gaarin Nisaabka', 'Your wealth has not yet reached the Nisab threshold'],
  ['Nisaabka Dahabka (85g):', 'Gold Nisab Threshold (85g):'],
  ['Wadarta Hantidaada Sakada ku jirta', 'Total Net Zakatable Wealth'],
  ['(Caddaan + Dahab + Qalin + Badeeco - Deyn)', '(Cash + Gold + Silver + Business Goods - Debts)'],
  ['Sakada Kugu Waajibka ah (2.5%)', 'Mandatory Zakat Due (2.5%)'],
  ['Waa 2.5% (ama 1/40) ee hantidaada, marka ay sannad buuxa (Hawl) kuu joogto.', '2.5% (or 1/40) of your net wealth held for one full lunar year (Hawl).'],
  ['Sakada waxaa ka dhiman:', 'Remaining to reach Zakat Nisab:'],
  ['Hantidaadu weli ma gaarin Nisaabka', 'Your wealth is currently below the Nisab threshold'],
  ['Waxaa ka dhiman lacagtan si ay sako kuugu waajabto.', 'This remaining amount is needed before Zakat becomes obligatory.'],
  ['Geli Xisaabta Hantidaada:', 'Enter Your Wealth Breakdown:'],
  ['💵 Lacag Caddaan ah & Bankiga ($)', '💵 Cash on Hand & Bank Savings ($)'],
  ['Lacagta guriga, jeebka, xawaaladda ama bangiga kuu taalla', 'Money saved at home, in mobile money, remittance, or bank accounts'],
  ['🥇 Dahab (Garaam ahaan)', '🥇 Gold (in Grams)'],
  ['Dahabka kaydka ah ama ganacsiga (Nisaabku waa 85 garaam)', 'Saved or investment gold (Nisab threshold is 85 grams)'],
  ['🥈 Qalin / Silver (Garaam ahaan)', '🥈 Silver (in Grams)'],
  ['Qalinka kaydsan (Nisaabka qalinku waa 595 garaam)', 'Saved silver (Silver Nisab threshold is 595 grams)'],
  ['📦 Hantida Ganacsiga / Badeecada ($)', '📦 Business Inventory / Goods ($)'],
  ['Qiimaha jumlad ahaan ee alaabta ganacsiga kuu taalla', 'Current market value of business merchandise and inventory'],
  ['🧾 Deymaha lagugu leeyahay ee hadda bixintoodu joogto ($ laga jarayo)', '🧾 Immediate Debts Owed by You ($ deducted)'],
  ['Deymaha dhabta ah ee laguugu leeyahay oo la rabo inaad degdeg u bixiso', 'Confirmed immediate debts due to be paid now'],
  ['Xisaabiyaha Zakaatul Fitriga (Sakada Soon-furka)', 'Zakat al-Fitr Calculator (End of Ramadan Charity)'],
  ['Waa waajib qof kasta oo Muslim ah ka bixinayo naftiisa iyo dadka uu quudiyo', 'Obligatory upon every Muslim for themselves and their dependents'],
  ['Tirada Xubnaha Qoyska:', 'Number of Family Members:'],
  ['Qiimaha Qofkiiba ($):', 'Amount per Person ($):'],
  ['Ama 2.5 kg oo raashinka magaalada ah (Bariis, Bur, iwm.)', 'Or 2.5 kg of staple food (Rice, Flour, Dates, etc.)'],
  ['Wadarta Zakaatul Fitriga:', 'Total Zakat al-Fitr Due:'],
  ['xubnood', 'members'],
  ['Xusuusin Muhiim ah oo ku saabsan Sakada:', 'Important Fiqh Notes on Zakat:'],

  // AdhkaarView phrases
  ['Magaca ama Ujeeddada Ducada *', 'Dua Title or Purpose *'],
  ['Qeybta (Category)', 'Category'],
  ['Duco Guud', 'General Dua'],
  ['Adhkaarta Subaxa', 'Morning Adhkaar'],
  ['Adhkaarta Galabta', 'Evening Adhkaar'],
  ['Salaadaha Kadib', 'After Prayers'],
  ['Qoraalka Carabiga (Ikhtiyaari)', 'Arabic Text (Optional)'],
  ['Macnaha ama Qoraalka Ducada (Soomaali)', 'Dua Meaning or Translation'],
  ['Tirada (Jeer)', 'Count (Times)'],
  ['Ka Noqo', 'Cancel'],
  ['Keydi Ducada Cusub', 'Save New Dua'],
  ['Wax ka beddel Qoraalka & Tirada', 'Edit Text & Count'],
  ['Keydi Isbeddelka', 'Save Changes'],
  ['✓ Waan Akhriyay', '✓ Completed'],
  ['✕ Ma Akhrinin', '✕ Not Read'],
  ['Ducooyinka Gaarka ah', 'Personal Duas'],
  ['Sax', 'Done'],
  ['Qalad', 'Missed'],

  // QuranView phrases
  ["Diiwaanka Qur'aanka Kariimka", "Holy Qur'an Reading Tracker"],
  [
    'Daba-gal bogagga aad maalin walba akhriso, tirtir ama jar waxaad ku dartay, arag tirada rasmiga ah ee bogagga suurad kasta, oo gaadh Khatmooyin barakaysan.',
    'Track your daily pages read, adjust your progress, view official page counts for all 114 Surahs, and complete blessed Khatms.',
  ],
  ["Ra'yi & Talo", 'Tips & Notes'],
  ['Bogagga Maanta', 'Pages Today'],
  ['bog ayaa la akhriyay maanta', 'pages read today'],
  ['Hadafka maanta: 20 bog', "Today's target: 20 pages"],
  ['Suuradaha Maanta', 'Surahs Today'],
  ['Dooro suuradaha aad maanta akhriday', 'Select Surahs you read today'],
  ['suuradood ayaa la dhammeeyay maanta', 'Surahs completed today'],
  ['Khatmada Socota', 'Current Khatm'],
  ['Dhammaystiran', 'Completed'],
  ['Suuradaha Guud ee La Akhriyay', 'Total Surahs Completed'],
  ['suuradood la dhammeeyay', 'Surahs completed'],
  ['Alxamdulillaah • Guud ahaan:', 'Alhamdulillah • Total:'],
  ['Heerka Khatmada Hadda:', 'Current Khatm Progress:'],
  ['bog ayaa dhiman', 'pages remaining'],
  ["Jadwalka Khatinka Qur'aanka (30-Day Khatm Planner)", "Qur'an Khatm Planner (15 / 30 / 60 / 90 Days)"],
  [
    "Dooro muddada aad rabto inaad ku dhammayso Qur'aanka Kariimka (604 bog) — xisaabiyuhu wuxuu kuu sheegayaa inta bog ee aad salaad kasta ka dib akhrinayso!",
    "Choose your target days to complete the Holy Qur'an (604 pages) — the planner calculates how many pages to read after each prayer!",
  ],
  ['30 Maalmood (Bil)', '30 Days (1 Month)'],
  ['Hadafka Maalintii', 'Daily Target'],
  ['Salaad Kasta Ka Dib', 'After Each Prayer'],
  ['Maanta La Akhriyay', 'Read Today'],
  ['Maalmaha Kuugu Haray', 'Days Remaining'],
  ['Qorshaha 5-ta Salaadood ee Maanta', "Today's 5-Prayer Reading Plan"],
  ['Riix salaad kasta markaad akhriso', 'Tap each prayer after reading'],
  ['🎉 Hadafkii Maanta Waa La Gaaray!', "🎉 Today's Reading Goal Reached!"],

  // ToDoView phrases
  ['Liiska Hawlaha & Qorshaha (To-Do)', 'Daily Tasks & Planner (To-Do)'],
  ['Hawlahaaga, Waqtiga & Sawirrada', 'Your Tasks, Reminders & Photos'],
  [
    'Qorsheyso cibaadadaada iyo shaqadaada, u xiro saacad xusuusin ah (⏰), kuna lifaaq sawirro.',
    'Plan your worship and daily work, set reminder alarms (⏰), and attach photo proof.',
  ],
  ['Ku Dar Hawl Faahfaahsan', 'Add Detailed Task'],
  ['Wadarta Hawlaha', 'Total Tasks'],
  ['La Qabtay ✓', 'Completed ✓'],
  ['Qabyo ah', 'Pending'],
  ['Heerka Guusha', 'Completion Rate'],
  ['Ku Dar Hawl Cusub, Waqti & Sawir 📸', 'Add New Task, Time & Photo 📸'],
  ['Degdeg', 'Quick Add'],
  [
    'Ku qor hawshaada hoose, u xulo waqtiga la rabo, oo ku dar liiskaaga hal taabasho.',
    'Write your task below, choose a reminder time, and add it to your list in one tap.',
  ],
  [
    '✍️ Qor magaca hawsha... (Tusaale: Akhrinta Suuradda Al-Mulk, Shaqo...)',
    '✍️ Enter task title... (e.g., Read Surah Al-Mulk, Work task...)',
  ],
  ['Lifaaq Sawir 📸', 'Attach Photo 📸'],
  ['✓ Sawir Diyaar', '✓ Photo Ready'],
  ['Diyaarin...', 'Preparing...'],
  ['KUSOO DAR ➕', 'ADD TASK ➕'],
  ['📝 Faahfaahin kooban (Ikhtiyaari)...', '📝 Short description (Optional)...'],
  ['Maalinta:', 'Due Date:'],
  ['Saacadda & Alaarm-ka Mobile-ka:', 'Mobile Reminder Time & Alarm:'],
  ['12-Hour AM/PM Selector (Sida Alaarm-ka)', '12-Hour AM/PM Alarm Selector'],
];

// 3. Common Word & Short-Token Replacements (for dynamic labels, counters, badges, and sentences)
const WORD_REPLACEMENTS: [RegExp, string][] = [
  [/\b(\d+)\s*Maalmood\b/gi, '$1 Days'],
  [/\b(\d+)\s*Maalin\b/gi, '$1 Day'],
  [/\b(\d+)\s*saac\s+iyo\s+(\d+)\s*daqiiqo\b/gi, '$1 hr $2 min'],
  [/\b(\d+)\s*daqiiqo\b/gi, '$1 min'],
  [/\b(\d+)\s*sek\b/gi, '$1 sec'],
  [/\b(\d+)s\s+(\d+)d\s+(\d+)sek\b/gi, '$1h $2m $3s'],
  [/\b(\d+)\s*Bog\b/gi, '$1 Pages'],
  [/\b(\d+)\s*Suuradood\b/gi, '$1 Surahs'],
  [/\b(\d+)\s*Aayadood\b/gi, '$1 Verses'],
  [/\b(\d+)\s*jeer\b/gi, '$1 times'],
  [/\b(\d+)\s*Qaybood\b/gi, '$1 Sections'],
  [/\bBogga\s+(\d+)\b/gi, 'Page $1'],
  [/\bJuzka\s+(\d+)\b/gi, 'Juz $1'],
  [/\bGobolka\b/gi, 'Region'],
  [/\bSalaadaha\b/g, 'Prayers'],
  [/\bSalaadda\b/g, 'Prayer'],
  [/\bSalaad\b/g, 'Prayer'],
  [/\bMasaajidka\b/g, 'Mosque'],
  [/\bMasaajid\b/g, 'Mosque'],
  [/\bGuriga\b/g, 'Home'],
  [/\bSubax\b/g, 'Fajr / Morning'],
  [/\bGalab\b/g, 'Afternoon / Evening'],
  [/\bHabeen\b/g, 'Night'],
  [/\bMaanta\b/g, 'Today'],
  [/\bShalay\b/g, 'Yesterday'],
  [/\bBerri\b/g, 'Tomorrow'],
  [/\bFuran\b/g, 'Active'],
  [/\bXiran\b/g, 'Closed'],
  [/\bCusub\b/g, 'New'],
  [/\bKeydi\b/g, 'Save'],
  [/\bTirtir\b/g, 'Delete'],
  [/\bWax ka beddel\b/gi, 'Edit'],
  [/\bXir\b/g, 'Close'],
  [/\bHaa\b/g, 'Yes'],
  [/\bMaya\b/g, 'No'],
  [/\bGuud\b/g, 'General'],
  [/\bDhammaan\b/g, 'All'],
  [/\bDiiwaangeli\b/g, 'Log'],
  [/\bDiiwaanka\b/g, 'Log'],
  [/\bXisaabiyaha\b/g, 'Calculator'],
  [/\bXisaabi\b/g, 'Calculate'],
  [/\bTijaabi\b/g, 'Test'],
  [/\bDhageyso\b/g, 'Listen'],
  [/\bJooji\b/g, 'Stop'],
  [/\bAkhri\b/g, 'Read'],
  [/\bAkhriska\b/g, 'Reading'],
  [/\bSuuradda\b/g, 'Surah'],
  [/\bSuuradaha\b/g, 'Surahs'],
  [/\bAadaanka\b/g, 'Adhan'],
  [/\bAqinka\b/g, 'Iqamah'],
  [/\bIqaamada\b/g, 'Iqamah'],
  [/\bSoonka\b/g, 'Fasting'],
  [/\bAfurka\b/g, 'Iftar'],
  [/\bSuxuurta\b/g, 'Suhoor'],
  [/\bSakada\b/g, 'Zakat'],
  [/\bTirakoobka\b/g, 'Statistics'],
  [/\bDejinta\b/g, 'Settings'],
  [/\bKoontada\b/g, 'Account'],
  [/\bMagaalada\b/g, 'City'],
  [/\bWadarta\b/g, 'Total'],
  [/\bHadafka\b/g, 'Target'],
  [/\bDhiman\b/g, 'Remaining'],
];

/**
 * Translates any Somali UI string into English while strictly preserving Arabic script
 * (Qur'an verses, Arabic Duas, Arabic Adhkaar, Arabic Surah titles).
 */
export function translateSomaliToEnglish(input: string): string {
  if (!input) return input;
  // Never modify strings containing Arabic script
  if (ARABIC_SCRIPT_REGEX.test(input)) {
    return input;
  }

  const trimmed = input.trim();
  if (!trimmed) return input;

  // Preserve leading/trailing whitespace
  const leadingSpace = input.match(/^\s*/)?.[0] || '';
  const trailingSpace = input.match(/\s*$/)?.[0] || '';

  // 1. Check exact match first
  if (EXACT_TRANSLATIONS[trimmed]) {
    return leadingSpace + EXACT_TRANSLATIONS[trimmed] + trailingSpace;
  }

  // 2. Apply longest phrase replacements
  let result = trimmed;
  for (const [soPhrase, enPhrase] of PHRASE_REPLACEMENTS) {
    if (result.includes(soPhrase)) {
      result = result.split(soPhrase).join(enPhrase);
    }
  }

  // 3. Apply regex word/pattern replacements
  for (const [pattern, replacement] of WORD_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  return leadingSpace + result + trailingSpace;
}

interface CustomTextNode extends Text {
  __tukoSo?: string;
  __tukoEn?: string;
}

interface CustomElement extends HTMLElement {
  __tukoSoAttrs?: Record<string, string>;
  __tukoEnAttrs?: Record<string, string>;
}

const TRANSLATABLE_ATTRS = ['placeholder', 'title', 'aria-label'] as const;

function shouldSkipElement(el: Element | null): boolean {
  if (!el) return true;
  const tag = el.tagName;
  if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'CODE' || tag === 'PRE') {
    return true;
  }
  if (
    el.closest('.font-arabic') ||
    el.closest('[lang="ar"]') ||
    el.closest('[dir="rtl"]') ||
    el.closest('[data-no-translate="true"]')
  ) {
    return true;
  }
  return false;
}

function applyTranslationToDOM(root: HTMLElement, lang: AppLanguage) {
  // 1. Process all Text nodes
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let current = walker.nextNode() as CustomTextNode | null;

  while (current) {
    const parent = current.parentElement;
    if (!shouldSkipElement(parent)) {
      const val = current.nodeValue || '';
      // Skip purely numeric/punctuation or Arabic text
      if (val.trim().length > 0 && !ARABIC_SCRIPT_REGEX.test(val)) {
        if (lang === 'en') {
          if (current.__tukoEn !== val) {
            // Either first visit or React updated the text node with new Somali text
            current.__tukoSo = val;
            const translated = translateSomaliToEnglish(val);
            current.__tukoEn = translated;
            if (translated !== val) {
              current.nodeValue = translated;
            }
          }
        } else {
          // Restore original Somali text if we previously translated it
          if (current.__tukoSo !== undefined && val === current.__tukoEn && current.__tukoSo !== val) {
            current.nodeValue = current.__tukoSo;
          }
        }
      }
    }
    current = walker.nextNode() as CustomTextNode | null;
  }

  // 2. Process translatable attributes (placeholder, title, aria-label)
  const elements = root.querySelectorAll<CustomElement>('[placeholder], [title], [aria-label]');
  elements.forEach((el) => {
    if (shouldSkipElement(el)) return;
    if (!el.__tukoSoAttrs) el.__tukoSoAttrs = {};
    if (!el.__tukoEnAttrs) el.__tukoEnAttrs = {};

    for (const attr of TRANSLATABLE_ATTRS) {
      const val = el.getAttribute(attr);
      if (!val || ARABIC_SCRIPT_REGEX.test(val)) continue;

      if (lang === 'en') {
        if (el.__tukoEnAttrs[attr] !== val) {
          el.__tukoSoAttrs[attr] = val;
          const translated = translateSomaliToEnglish(val);
          el.__tukoEnAttrs[attr] = translated;
          if (translated !== val) {
            el.setAttribute(attr, translated);
          }
        }
      } else {
        if (
          el.__tukoSoAttrs[attr] !== undefined &&
          val === el.__tukoEnAttrs[attr] &&
          el.__tukoSoAttrs[attr] !== val
        ) {
          el.setAttribute(attr, el.__tukoSoAttrs[attr]);
        }
      }
    }
  });
}

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  toggleLanguage: () => void;
  t: (soText: string, enText?: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'so',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (soText) => soText,
});

export function getInitialLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'so';
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'en' || saved === 'so') return saved;
  } catch {}
  return 'so';
}

export const LanguageProvider: React.FC<{
  children: React.ReactNode;
  externalLanguage?: AppLanguage;
  onLanguageChange?: (lang: AppLanguage) => void;
}> = ({ children, externalLanguage, onLanguageChange }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => externalLanguage || getInitialLanguage());

  useEffect(() => {
    if (externalLanguage && (externalLanguage === 'so' || externalLanguage === 'en')) {
      setLanguageState(externalLanguage);
    }
  }, [externalLanguage]);

  const setLanguage = useCallback(
    (nextLang: AppLanguage) => {
      setLanguageState(nextLang);
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLang);
        document.documentElement.setAttribute('lang', nextLang);
      } catch {}
      if (onLanguageChange) {
        onLanguageChange(nextLang);
      }
    },
    [onLanguageChange]
  );

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'so' ? 'en' : 'so');
  }, [language, setLanguage]);

  const t = useCallback(
    (soText: string, enText?: string) => {
      if (language === 'so') return soText;
      if (enText) return enText;
      return translateSomaliToEnglish(soText);
    },
    [language]
  );

  // Real-time DOM translation observer so 100% of views/modals switch immediately
  // while strictly preserving all Arabic text (Qur'an & Duas).
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;

    let rafId: number | null = null;
    let isApplying = false;

    const runPass = () => {
      if (isApplying) return;
      isApplying = true;
      try {
        applyTranslationToDOM(root, language);
      } finally {
        isApplying = false;
      }
    };

    runPass();

    const observer = new MutationObserver(() => {
      if (isApplying) return;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        runPass();
      });
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
