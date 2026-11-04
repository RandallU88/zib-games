# The Hollow Oak Detectives: art wiring

Canvas's art kit (`/workspace/canvas/urwin-homeschool/games/hollow-oak/`) is wired in. Only the .webp files used are copied to `assets/` (same folder layout as the kit). Everything is drawn at half the 2x pixel size on a 1180x820 stage that scales to fit the screen (letterboxed in --ho-night).
To swap art, replace the file at the same path.

| Slot | Used for |
|---|---|
| `scenes/title-scene` | Title background. `logo/hollow-oak-logo` top right at 620 wide |
| `scenes/bg-ch1-farm`, `bg-ch2-woods`, `bg-ch3-mill-interior` | Chapter scenes. Hotspot x,y are in `data.js` (HO_CHAPTERS[].spots) |
| `ui/chapter-card-{1,2,3}` | Chapter title cards and case board thumbnails. Chapter names follow the cards |
| `ui/dialogue-box` + `characters/*-bust` | Dialogue (bust circle-cropped in the well). `june-point`, `biscuit-sniff` stand beside it |
| `ui/clue-notebook` | Notebook: list on the left page, detail on the right |
| `ui/inventory-tray`, `inventory-slot`, `inventory-slot-selected` | 8-slot clue tray. Found clues show their item sprite |
| `clues/clue-*` | One item per hotspot (see `item` in data.js) |
| `ui/case-file`, `ui/stamp-case-solved`, `characters/*-celebrate` | End of chapter case file, stamp animates 1.4 to 1 |
| `ui/btn-{back,next,solve,notebook,casefile}-{normal,pressed}`, `ui/icon-{close,hint,menu,sound}-*` | Buttons (pressed state on touch) |
| `ui/textures/*`, `tokens.css`, `fonts.css` + `fonts/` | Tokens from Canvas, fonts self-hosted (Google Fonts, OFL) |

Hotspots use the `--ho-glow` lantern glow and pulse until found.

Clue and character art from Canvas's additions (Nov 3) is wired in: bell, clapper, diary, sign-out sheet, paint can, ledger page, polish rags, campers' sketch, plus Wes and Grandpa Ole (bust for dialogue, Ole idle and Wes point stand beside the dialogue).
Puzzles use `ui/btn-solve-plain-*` (SOLVE). `ui/btn-solve-*` (SOLVE CASE) is used only for the chapter 3 final case file button.
