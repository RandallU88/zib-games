/* Logic Lane art slots.
   Drop Canvas's final files on these exact names in logic-lane/assets/.
   Puzzle headers live in assets/headers/ as header-<puzzle-id>.webp.
   Item icons live in assets/icons/ as icon-*.svg, mapped from assets/icons/map.json.
   Person items stay text only.
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
    return "assets/headers/header-" + id + ".webp?v=3";
  },
  iconSrc: function (file) {
    if (!file) return "";
    var name = String(file).replace(/^.*\//, "").replace(/@2x/g, "");
    name = name.replace(/\.png$/i, ".svg");
    if (!/\.svg$/i.test(name)) name += ".svg";
    return "assets/icons/" + name + "?v=3";
  }
};
