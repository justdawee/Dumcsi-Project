# Project Agents.md Útmutató AI Ágensek Számára

Ez az `AGENTS.md` fájl átfogó útmutatást nyújt a kódbázissal dolgozó mesterséges intelligencia ágensek számára.

## Projekt Struktúra a Könnyebb Navigációért

-   `/src`: A forráskód, amelyet az AI ágenseknek elemezniük kell.
    -   `/Dumcsi.Api`: A .NET backend API, controllerekkel és a beállításokkal.
    -   `/Dumcsi.Application`: Az alkalmazás logikai rétege, DTO-kkal és service interfészekkel.
    -   `/Dumcsi.Domain`: A domain réteg, entitásokkal, enumokkal és a domain logikával.
    -   `/Dumcsi.Infrastructure`: Az infrastrukturális réteg, adatbázis-kezeléssel, külső szolgáltatásokkal.
    -   `/Dumcsi.Frontend`: A Vue.js alapú frontend alkalmazás.
        -   `/src/components`: Újrafelhasználható Vue komponensek.
        -   `/src/views`: Oldalakat reprezentáló komponensek.
        -   `/src/stores`: Pinia store-ok az állapotkezeléshez.
        -   `/src/services`: API-kommunikációért felelős service-ek.
    -   `/Dumcsi.Tests`: Backend tesztek a projekt helyes működésének ellenőrzésére.
-   `Dockerfile`: A backend alkalmazás konténerizálására szolgáló konfiguráció.

## Kódolási Konvenciók

### Általános Irányelvek

-   **Backend**: Használj C# és .NET konvenciókat az új kódok írásakor.
-   **Frontend**: Használj TypeScriptet minden új frontend kódhoz.
-   Kövesd a meglévő kódstílust az egyes fájlokban.
-   Használj beszédes változó- és függvén neveket.
-   Komplex logikai részeket láss el magyarázó kommentekkel.

### Backend Irányelvek (.NET)

-   Kövesd a meglévő rétegzett architektúrát (Domain, Application, Infrastructure, Api).
-   Használj `async/await` mintákat az aszinkron műveletekhez.
-   Az adatbázis-interakciókhoz a `DbContextFactory`-t használd a `DbContext` közvetlen injektálása helyett.

### Frontend Irányelvek (Vue.js)

-   Használj `<script setup>` szintaxist a Vue 3 komponensekhez a jobb olvashatóság és teljesítmény érdekében.
-   Az állapotkezeléshez a Pinia store-okat részesítsd előnyben.
-   A komponensek legyenek kicsik és egyetlen felelősségi körre fókuszáljanak.
-   Használj Tailwind CSS-t a stílusozáshoz a `style.css`-ben definiált témának megfelelően.

## Tesztelési Követelmények

A kód módosítása előtt és után futtasd a megfelelő teszteket:

```bash
# Backend tesztek futtatása a solution gyökeréből
dotnet test

# Frontend build ellenőrzése a Dumcsi.Frontend mappából
npm run build
```

## Pull Request Irányelvek

Amikor egy Pull Requestet (PR) hozol létre:
-   Tartalmazzon egyértelmű leírást a változásokról.
-   Hivatkozzon a kapcsolódó issue-kra.
-   Győződjön meg róla, hogy minden teszt sikeresen lefut.
-   UI változások esetén mellékeljen képernyőképeket.
-   A PR egyetlen funkcióra vagy hibajavításra fókuszáljon.

## Programozott Ellenőrzések

A kód beküldése előtt futtasd a következő parancsokat a megfelelő mappákból:

```bash
# Backend build ellenőrzése a solution gyökeréből
dotnet build

# Frontend type-check és build ellenőrzése a src/Dumcsi.Frontend mappából
npm run build
```

Minden ellenőrzésnek sikeresnek kell lennie a kód beolvasztása előtt.

