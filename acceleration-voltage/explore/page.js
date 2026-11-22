// The explorer of Acceleration Voltage (explore.js, the module's Explore mode) on a page of its own:
// a particle in a field, its start A dragged, any point P clicked, the potential and the energies at
// A and at P. Only the page around it is here: the title, the EN/DE switch.
(function () {
  'use strict';

  const Lang = window.Lang, Explore = window.Explore;
  const APP = { en: 'Acceleration Voltage', de: 'Beschleunigungsspannung' };
  function init() {
    Lang.init();
    const apply = () => {
      const t = Explore.TEXTS[Lang.get()];
      document.title = t.pageTitle;
      Lang.apply({ ...t, app: APP[Lang.get()] });
    };
    apply();
    Explore.mount(document.querySelector('#explore'), { standalone: true });
    Lang.wire(() => { apply(); Explore.relabel(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
