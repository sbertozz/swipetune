# SwipeTune — versione senza Premium

Web app mobile-first/PWA che aiuta a scegliere brani uno alla volta con swipe:

- swipe a sinistra: **scarta**;
- swipe a destra: **approva**;
- clip breve quando viene trovato;
- CSV finale dei brani approvati o di tutte le decisioni.

Questa edizione **non richiede Spotify Premium, Client ID o login**. È pensata per essere pubblicata gratuitamente su GitHub Pages e usata da Safari su iPhone.

## Come inserire i brani

SwipeTune riceve un file **CSV**. Le due colonne obbligatorie sono:

```csv
titolo;artista
Flowers;Miley Cyrus
Italodisco;The Kolors
```

Sono supportati sia il punto e virgola (`;`) sia la virgola (`,`), le righe con virgolette e queste intestazioni equivalenti:

- titolo: `titolo`, `title`, `track`, `track name`, `brano`, `song`, `name`
- artista: `artista`, `artist`, `artists`, `artist name`, `autore`
- facoltativo: `album`, `url`, `spotify url`
- **raccomandato:** `ISRC` e/o `Spotify Track Id`

La schermata di import permette anche di scaricare un CSV di esempio.

## Anteprime affidabili

Se il file contiene la colonna **ISRC**, SwipeTune cerca prima quel codice nel catalogo Deezer. L'ISRC identifica la registrazione precisa: così evita di confondere l'originale con cover, remix e brani omonimi. Se trova il record, mostra anche la sua copertina e riproduce un clip MP3 di circa 30 secondi.

Il file `gngsta rap.csv` fornito dall'utente contiene sia `ISRC` sia `Spotify Track Id` per tutti i 503 brani: con questa versione ogni carta userà prima l'ISRC, mentre il pulsante **Apri in Spotify** porterà al brano Spotify esatto, non a una ricerca generica.

Se un CSV non ha ISRC, l'app fa una ricerca titolo/artista molto più prudente: preferisce non riprodurre alcun audio piuttosto che mostrare la canzone sbagliata. Alcuni cataloghi non offrono preview per tutti i brani.

Nel CSV finale trovi la colonna **ricerca Spotify**. Con un `Spotify Track Id` nel file sorgente, il link punta già direttamente alla traccia esatta.

Senza Spotify Web API non è possibile importare una playlist da un suo link o crearne una nuova automaticamente. Queste funzioni richiedono una Spotify Developer app e, per nuove app personali, Spotify richiede Premium.

## Usarla su iPhone

1. Pubblica il progetto con GitHub Pages seguendo [GITHUB-PAGES.md](GITHUB-PAGES.md).
2. Apri l'indirizzo GitHub Pages da **Safari** su iPhone.
3. Premi **Condividi → Aggiungi a Home**.
4. Apri SwipeTune dalla schermata Home e carica il tuo CSV.
5. Al primo brano tocca Play: iOS richiede un gesto esplicito per autorizzare l'audio.

## File principali

```text
index.html              interfaccia
app.js                  import CSV, swipe, audio e export
styles.css              grafica mobile
assets/                 icone e audio demo
manifest.webmanifest    installazione PWA
sw.js                   cache offline
swipetune-esempio.csv   modello CSV
```
