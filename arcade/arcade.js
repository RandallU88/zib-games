(function () {
  var games = window.URWIN_ARCADE_GAMES || [];
  var root = document.getElementById("cabinets");
  if (!root) return;

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function art(game) {
    if (game.logo) {
      return (
        '<span class="cab-art cab-art--logo">' +
        '<img src="' + esc(game.logo) + '" alt="" loading="lazy">' +
        "</span>"
      );
    }
    if (game.emoji) {
      return (
        '<span class="cab-art cab-art--emoji" aria-hidden="true"><span>' +
        game.emoji +
        "</span></span>"
      );
    }
    return (
      '<span class="cab-art cab-art--mono" aria-hidden="true"><span>' +
      esc(game.monogram || (game.title || "?").slice(0, 2).toUpperCase()) +
      "</span></span>"
    );
  }

  root.innerHTML = games
    .map(function (game) {
      return (
        '<a class="cabinet" href="' +
        esc(game.href) +
        '">' +
        art(game) +
        '<span class="cab-body">' +
        (game.kicker
          ? '<span class="cab-kicker">' + esc(game.kicker) + "</span>"
          : "") +
        '<span class="cab-title">' +
        esc(game.title) +
        "</span>" +
        '<span class="cab-blurb">' +
        esc(game.blurb) +
        "</span>" +
        '<span class="cab-go">Play</span>' +
        "</span></a>"
      );
    })
    .join("");
})();
