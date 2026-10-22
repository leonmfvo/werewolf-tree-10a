// 騙り率の計算機：data/calc.json（盤面ごとの進行の候補・内訳ごとの村勝率）から、
// 入れた騙り率での盤面の出現率と、盤面ごとに村が取るべき進行を出す。式はページの「内訳の出現率の式」と同じ。
(function () {
  const $ = (s) => document.querySelector(s);
  const WOLF = [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2], [1, 1]];
  let D = null;

  function keyProb(key, q, w) {
    const [sp, mp] = key.split('-');
    const fs = (sp.match(/W/g) || []).length, fm = (mp.match(/W/g) || []).length;
    const wi = WOLF.findIndex(([a, b]) => a === fs && b === fm);
    const pw = wi < 0 ? 0 : w[wi];
    const madc = sp.includes('M') ? 's' : mp.includes('M') ? 'm' : 'h';
    const pm = q[madc];
    if (sp.includes('T') && mp.includes('T')) return pw * (5 / 8 * pm + (madc === 'h' ? 1 / 8 : 0));
    return pw * (1 / 8) * pm;
  }
  function read() {
    const n = (id) => Math.max(0, parseFloat($(id).value) || 0);
    let q = { s: n('#q_s'), m: n('#q_m'), h: n('#q_h') };
    const qt = q.s + q.m + q.h || 1;
    q = { s: q.s / qt, m: q.m / qt, h: q.h / qt };
    let w = [0, 1, 2, 3, 4, 5].map((i) => n('#w' + i));
    const wt = w.reduce((a, b) => a + b, 0) || 1;
    w = w.map((x) => x / wt);
    return { q, w };
  }
  function set(q, w) {
    $('#q_s').value = +q.s.toFixed(4); $('#q_m').value = +q.m.toFixed(4); $('#q_h').value = +q.h.toFixed(4);
    w.forEach((x, i) => { $('#w' + i).value = +x.toFixed(4); });
    render();
  }
  function render() {
    const { q, w } = read();
    const tb = $('#c_out tbody');
    tb.innerHTML = '';
    let total = 0;
    for (const [b, B] of Object.entries(D.boards)) {
      let pb = 0;
      const vec = new Array(B.pols.length).fill(0);
      for (const k of B.keys) {
        const p = keyProb(k, q, w);
        if (!p) continue;
        pb += p;
        D.V[k].forEach((v, i) => { vec[i] += p * v; });
      }
      if (pb < 1e-12) continue;
      let bi = 0;
      vec.forEach((v, i) => { if (v > vec[bi] + 1e-12) bi = i; });
      total += vec[bi];
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${b}</td><td class="n">${(pb * 100).toFixed(2)}%</td><td></td><td class="n">${(vec[bi] / pb * 100).toFixed(1)}%</td>`;
      tr.children[2].textContent = B.pols[bi];
      tb.append(tr);
    }
    $('#c_total').textContent = `全体の村勝率 ${(total * 100).toFixed(1)}%`;
  }
  fetch('data/calc.json').then((r) => r.json()).then((d) => {
    D = d;
    document.querySelectorAll('#calcbox input').forEach((e) => e.addEventListener('input', render));
    $('#c_eq').addEventListener('click', () => set(D.eq, D.eq.w));
    $('#c_typ').addEventListener('click', () => set({ s: 0.8, m: 0, h: 0.2 }, [1, 0, 0, 0, 0, 0]));
    set(D.eq, D.eq.w);
  });
})();
