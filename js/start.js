'use strict';
// ---------- Start ----------
initPages();
applyTheme(false);
renderBoard();
syncSettingsForm();
tick();
setInterval(tick, 1000);
loadWeather();
setInterval(loadWeather, 5 * 60e3);
loadGitHub();
setInterval(loadGitHub, 5 * 60e3);
loadAlerts();
setInterval(loadAlerts, 5 * 60e3);
loadNews();
setInterval(loadNews, 5 * 60e3);
loadExtras();
setInterval(loadExtras, 30e3);
