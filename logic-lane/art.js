/* Logic Lane art slots.
   Drop Canvas's final files on these exact names in logic-lane/assets/.
   Puzzle headers live in assets/headers/ as header-<puzzle-id>.webp.
   Item art stays as emoji on each puzzle item in puzzles.js.
*/
window.LOGIC_LANE_ART = {
  cabinetLogo: "assets/cabinet-logo.png",
  titleLogo: "assets/title-logo.png",
  markCheck: "assets/mark-check.svg",
  markX: "assets/mark-x.svg",
  winBadge: "assets/win-badge.svg",
  bgLandscape: "assets/bg-landscape.webp",
  bgPortrait: "assets/bg-portrait.webp",
  headerFor: function (id) {
    if (!id) return "";
    return "assets/headers/header-" + id + ".webp?v=2";
  }
};
