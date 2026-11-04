# Star Cadet Math Patrol: art wiring

Final art from Canvas (`/workspace/canvas/urwin-homeschool/games/star-cadet/`) is wired in. Only the .webp files the game uses are copied here (about 2.9 MB).
All art is 2x and is drawn at half size on a 1180x820 field (letterboxed on other screens). To swap art, replace the file with the same path and name.

| Path in `assets/` | Drawn at | Used for |
|---|---|---|
| `title/title_bg.webp` | cover | Title, map and results background |
| `logo/star-cadet-logo.webp` | up to 640 wide | Title wordmark |
| `backgrounds/sector{1,2,3}_{far,mid,near}.webp` | 1180x820 | Parallax: far 0.1x (mirrored tile), mid 0.35x, near 0.8x. Sector art cycles 1, 2, 3 by sector number |
| `sprites/ship_{idle,thrust,hit}_{a,b}.webp` | 180x100, center anchor, nose right | Idle 120 ms, thrust 80 ms while moving, hit blink 80 ms for 0.6 s |
| `sprites/asteroid_lg{,_ember,_ice}.webp` | 110x110, rotates | Normal, ember, ice by sector. Hitbox radius 42% plus 26 px tap slack. Number drawn live in Exo 2 800, white, #0A1430 stroke |
| `sprites/laser_bolt.webp` | 48x12, right tip anchor | Player shot |
| `sprites/explosion_sheet.webp` | 8 frames, 128 (boss 256) | 50 ms per frame |
| `sprites/impact_sheet.webp` | 4 frames, 48 | Boss hit spark, 40 ms |
| `bosses/boss{1,2,3}.webp`, `_damaged` | 260x260, 280x210, 270x230 | Faces left. Swaps to damaged at 50% HP |
| `ui/hud_frame.webp` | full field | HUD overlay |
| `ui/score_plate.webp` (12,-3), `ui/lives_plate.webp` (958,-3), `ui/life_icon.webp`, `ui/pause_button.webp` (590,32), `ui/question_panel.webp` (260,85) | ASSETS.md positions | HUD. Question text Exo 2 800 42px #F6C453 |
| `ui/results_screen.webp` | 1180x820 | Results. Badge in the ring, values on the 3 rows. A loss covers the title with BASE OVERRUN |
| `ui/button_blank_{,red_}{normal,pressed}.webp` | 240x70 | All buttons, labels rendered live |
| `badges/rank_{1..6}_*.webp` | 64 to 128 | Cadet, Ensign, Lieutenant, Commander, Captain, Admiral |
| `fonts/exo2-800.woff`, `fonts/orbitron-900.woff` | | Self-hosted (Google Fonts, OFL). Falls back to Trebuchet MS |
| `tokens.css` | | Canvas tokens. Google Fonts @import removed, self-hosted @font-face added |

Not used yet: power-ups, boss bolt, ship_sheet, pause_screen, home_card, colored labeled buttons.
