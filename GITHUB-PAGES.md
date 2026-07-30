# Aggiornare SwipeTune su GitHub Pages

Il sito è già pubblicato qui:

```text
https://sbertozz.github.io/swipetune/
```

Questa nuova versione non usa più Client ID o Spotify Premium: importa un CSV di brani e sfrutta, quando disponibile, l’ISRC nel file per trovare la preview corretta.

## Aggiorna il repository con i nuovi file

1. Scarica il file **`swipetune-github.zip`** da Arena e decomprimilo.
2. Apri il repository GitHub `sbertozz/swipetune`.
3. Carica/sostituisci tutti i file della cartella estratta, compresa la cartella `assets`.
   - `index.html` deve restare nella root del repository.
   - Il modo più semplice è rimuovere i vecchi file dal repository e caricare il contenuto della nuova cartella.
4. Premi **Commit changes**.
5. Attendi 1–3 minuti e apri di nuovo:

   ```text
   https://sbertozz.github.io/swipetune/
   ```

GitHub Pages è già configurato, quindi non devi creare un nuovo repository né cambiare le impostazioni Pages.

## Se su iPhone appare ancora la vecchia schermata Spotify

SwipeTune è una PWA e Safari può avere in cache la versione vecchia.

1. Chiudi la web app dalla schermata multitasking.
2. Apri l'URL in Safari e ricarica la pagina.
3. Se ancora non cambia: Impostazioni iPhone → Safari → Avanzate → Dati dei siti web → cerca `github.io` → elimina i dati di `github.io`.
4. Riapri il link e, se vuoi, fai di nuovo **Condividi → Aggiungi a Home**.

## Formato CSV minimo

Crea un file di testo chiamato, ad esempio, `mia-playlist.csv`:

```csv
titolo;artista
Supereroi;Mahmood
Italodisco;The Kolors
Flowers;Miley Cyrus
```

Poi lo scegli nell'app con **Carica un file CSV**. Puoi anche scaricare il modello direttamente dalla schermata di SwipeTune.
