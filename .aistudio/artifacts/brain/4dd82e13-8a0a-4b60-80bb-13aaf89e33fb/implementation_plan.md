# Qorshaha Hirgelinta: Analytics, Xawaaraha, & Balaarinta Xogta

Qorshahani wuxuu qeexayaa tallaabooyinka aan ku horumarinayno app-kaaga saddexda qaybood ee aad dooratay.

## 1. Analytics Integration (Firebase)
- **Ujeedka**: Inaan fahamno sida dadku u isticmaalaan app-ka (Salaadaha, Alaarm-ka, iyo qaybaha kale).
- **Tallaabooyinka**:
    - Waxaan ku xirayaa `firebase/analytics` app-kaaga.
    - Waxaan sameynayaa *event tracker* yar oo xogta u diri doona Firebase.
    - Waxaan bilaabi doonaa daba-galka (tracking) ee salaadaha la tukaday iyo alaarm-ka la isticmaalay.

## 2. App Performance Optimization (Offline-first)
- **Ujeedka**: In app-ku si degdeg ah u shaqeeyo xitaa marka internet-ku uu daciif yahay ama maqanyahay.
- **Tallaabooyinka**:
    - **Service Worker Tuning**: Waxaan hagaajinayaa `sw.js` si uu u kaydiyo (cache) xogta si fiican (Stale-while-revalidate).
    - **Code Splitting**: Waxaan u kala qaadayaa qaybaha app-ka (Salaad, Tasbeex, Quran) si app-ku u soo dajisto keliya waxa loo baahan yahay marka la isticmaalayo.

## 3. Content Expansion (Ducooyin & Adhkaar)
- **Ujeedka**: Inaad dadka u soo bandhigto maktabad weyn oo Ducooyin iyo Adhkaar ah oo ay si sahlan u raadin karaan.
- **Tallaabooyinka**:
    - **Firestore Schema**: Waxaan samaynayaa collection cusub oo lagu magacaabo `content_library`.
    - **UI Search**: Waxaan sameynayaa bar raadin (Search bar) oo u saamaxaysa isticmaalaha inuu ku raadiyo ducooyin magac ama qayb ahaan.

## Maxaad jeceshahay inaan ku bilowno?
1. **Analytics** (Si aan u bilowno xog-ururinta).
2. **Performance** (Si aan u dedejinno app-ka).
3. **Content Expansion** (Si aan u bilowno qorista ducooyinka).

Fadlan dooro qaybta aad rabto inaan ku bilowno!
