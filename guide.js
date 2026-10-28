// 作戦ガイド：陣営（村側・人外側）と盤面を選ぶと、その組み合わせのまとめだけを表示する。選んだものは URL の #guide-村側-2-1 のように残す
(function () {
  const sides = document.querySelectorAll('.sg');
  const picks = document.querySelectorAll('.bp');
  const panels = document.querySelectorAll('.gp');
  const extras = document.querySelectorAll('.gside');
  if (!picks.length) return;
  let side = 'v', board = picks[0].dataset.b;
  function show() {
    sides.forEach((x) => { x.classList.toggle('on', x.dataset.side === side); x.setAttribute('aria-selected', x.dataset.side === side); });
    picks.forEach((x) => x.classList.toggle('on', x.dataset.b === board));
    panels.forEach((x) => { x.hidden = !(x.dataset.side === side && x.dataset.b === board); });
    extras.forEach((x) => { x.hidden = x.dataset.side !== side; });
  }
  function save() { try { history.replaceState(null, '', `#g-${side}-${board}`); } catch (e) {} }
  sides.forEach((x) => x.addEventListener('click', () => { side = x.dataset.side; show(); save(); }));
  picks.forEach((x) => x.addEventListener('click', () => { board = x.dataset.b; show(); save(); }));
  const m = location.hash.match(/^#g-([vw])-(\d-\d)$/);
  if (m && document.querySelector(`.bp[data-b="${m[2]}"]`)) { side = m[1]; board = m[2]; setTimeout(() => document.getElementById('guide').scrollIntoView(), 0); }
  show();
})();
