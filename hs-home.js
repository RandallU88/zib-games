/* Urwin Homeschool: confirm before leaving a game in progress. */
(function () {
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.hs-home');
    if (!a || a.getAttribute('data-hs-playing') !== '1') return;
    e.preventDefault();
    if (window.confirm('Leave this game and go back to the Urwin Homeschool home page?')) {
      window.location.href = a.getAttribute('href');
    }
  }, true);
})();
