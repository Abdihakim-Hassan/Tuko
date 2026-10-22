# Qorshaha Hirgelinta: Ammaanka & Saarista Online

Qorshahani wuxuu qeexayaa tallaabooyinka lagu adkeynayo amniga app-ka iyo sida loo saarayo online oo loogu xirayo Domain.

## 1. Ammaanka (Security Audit & Hardening)
- **Firestore Rules**: Waxaan tirtirayaa `match /test/` si aan loo oggolaan qof kasta inuu arko xogta, waxaana hubinayaa in dhammaan xogta ay ku xiran tahay `isOwner` (UserID).
- **Hardcoded Secrets**: Waxaan hubiyay `src/` oo dhan, ma jiraan furayaal sir ah (Secrets/API Keys) oo koodhka ku jira; dhammaan waxaa loo isticmaalayaa `/api/` ama Firebase SDK.

## 2. Saarista Online (Deployment Plan)
App-kan waxaa lagu martigelin doonaa **Firebase Hosting**, waana qaabka ugu fudud uguna ammaan badan ee loogu xiri karo Domain gaar ah (.so, .com, .net).

### Tallaabooyinka:
1. **Dhisidda (Build)**: Waxaan horay u tijaabiyay `npm run build`, wuxuuna u diyaarsan yahay wax soo saar (production).
2. **Saarista (Deploy)**: Waxaad isticmaali kartaa `deploy_firebase` si aan u dirno koodhka server-ka Firebase.
3. **Domain-ka (Domain Setup)**: 
   - Waxaan kuu tilmaami doonaa sida loogu daro `domain` gaar ah oo aad iibsatay gudaha **Firebase Console**.
   - Firebase wuxuu bixinayaa SSL (HTTPS) si toos ah oo bilaash ah.

## 3. Maxaad doonaysaa?
- **Ma rabtaa inaan hadda tirtiro `test` collection-ka (si aan u adkeyno amniga)?**
- **Ma diyaarsatay Domain-ka (sida: `tuko.so`)?** 
- **Ma rabtaa inaan hadda dhisno qaabka `deploy`?**

Fadlan dooro **Proceed** haddii aad diyaar u tahay inaan fuliyo qorshaha amniga (tirtiridda test rule-ka) iyo inaan kuu diyaariyo tallaabooyinka saarista.
