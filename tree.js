// 全分岐ツリーの表示。data/trees/<id>/meta.json と、局面を CHUNK 個ずつに分けた c<k>.json を、開いた枝の分だけ読む。
// 局面：[種類, 局面, 夜番号, 村勝率, 見出し, 公開情報, 狼視点, 最善の子, 子]
// 子：[確率 | null, ラベル, 子の局面番号, 種類, 子の村勝率]  種類 c 確率 / w 人外の選択 / v 村の選択 / f 固定
(function () {
  const $ = (s, e = document) => e.querySelector(s);
  const pct = (x) => (x * 100).toFixed(x > 0 && x < 0.001 ? 3 : 1) + '%';
  const id = new URLSearchParams(location.search).get('t');
  const base = `data/trees/${encodeURIComponent(id || '')}`;
  let M = null;
  const chunks = new Map();

  function chunk(k) {
    if (!chunks.has(k)) {
      chunks.set(k, fetch(`${base}/c${k}.json`).then((r) => {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      }));
    }
    return chunks.get(k);
  }
  async function node(i) {
    const c = await chunk(Math.floor(i / M.chunk));
    const nd = c.nodes[i % M.chunk];
    const s = (j) => c.strs[j];
    return { k: nd[0], ph: nd[1], d: nd[2], v: nd[3], t: s(nd[4]), pub: s(nd[5]), hid: s(nd[6]), best: nd[7],
             ch: nd[8].map(([p, lab, cid, kind, v]) => ({ p, lab: s(lab), cid, kind, v })) };
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function vspan(v) {
    const s = el('span', 'v' + (v >= 1 - 1e-9 ? ' win' : v <= 1e-9 ? ' lose' : ''), pct(v));
    s.title = '村勝率';
    return s;
  }
  function dayLabel(ph, d) {
    if (d < 0) return '';
    if (ph === 'n') return d === 0 ? '初日の夜' : `${d + 1}日目の夜`;
    if (ph === 'd') return `${d + 1}日目の昼`;
    return '';
  }

  async function renderNode(i, host, depth) {
    const loading = el('div', 'pub', '読み込み中…');
    host.append(loading);
    let n;
    try { n = await node(i); } catch (e) { loading.textContent = '読み込めませんでした（' + e.message + '）'; return; }
    loading.remove();
    const box = el('div', 'node');
    const nh = el('div', 'nh');
    const dl = dayLabel(n.ph, n.d);
    if (dl) nh.append(el('span', 'lbl acc', dl), ' ');
    nh.append(el('span', 't', n.t), ' ', vspan(n.v));
    if (n.k === 'w') nh.append(el('span', 'lbl bad', '人外が選ぶ'));
    if (n.k === 'e') nh.append(el('span', 'lbl ' + (n.v >= 0.5 ? 'good' : 'bad'), '終局'));
    box.append(nh);
    if (n.pub) box.append(el('div', 'pub', n.pub));
    if (n.hid) {
      const det = el('details', 'hid');
      det.append(el('summary', null, '狼から見た情報'), el('div', null, n.hid));
      box.append(det);
    }
    if (n.ch.length) {
      const ul = el('ul', 'kids');
      n.ch.forEach((c, j) => ul.append(renderKid(c, n.k === 'w' ? (j === n.best ? 'best' : 'alt') : '', n.ch.length === 1, depth)));
      box.append(ul);
    }
    host.append(box);
  }

  function renderKid(c, mark, only, depth) {
    const li = el('li', 'kid' + (mark === 'alt' ? ' alt' : ''));
    const row = el('div', 'row');
    const tg = el('span', 'tg', '▸');
    row.append(tg, el('span', 'p', c.p == null ? '' : pct(c.p)));
    const l = el('span', 'lab', c.lab);
    if (mark === 'best') l.append(el('span', 'lbl bad', '人外の最善'));
    row.append(l, vspan(c.v));
    li.append(row);
    let body = null;
    const toggle = () => {
      if (body) { body.remove(); body = null; tg.textContent = '▸'; return; }
      tg.textContent = '▾';
      body = el('div'); li.append(body);
      renderNode(c.cid, body, depth + 1);
    };
    row.addEventListener('click', toggle);
    // 1本道と人外の最善はあらかじめ開いておく（深くなりすぎないよう制限）
    if ((only || mark === 'best') && depth < 6) toggle();
    return li;
  }

  async function main() {
    const host = $('#tree');
    if (!id) { host.textContent = 'ツリーが指定されていません。'; return; }
    try {
      const r = await fetch(`${base}/meta.json`);
      if (!r.ok) throw new Error(r.status);
      M = await r.json();
    } catch (e) { host.textContent = 'ツリーを読み込めませんでした（' + e.message + '）。'; return; }
    const m = M.meta;
    document.title = `${m.board} ${m.label}｜10a狩人ツリー`;
    $('#ttl').textContent = `${m.board}（${m.label}）の全分岐ツリー`;
    $('#meta').textContent = '';
    $('#meta').append('進行：', el('b', null, m.policy), '　村勝率：');
    if (m.frac) $('#meta').append(vspan(m.v), `（${m.frac[0]}${m.frac[1] !== 1 ? '/' + m.frac[1] : ''}）`);
    else $('#meta').append(vspan(m.v));
    $('#meta').append(`　局面数：${M.n.toLocaleString()}`);
    if (m.sym && m.sym.length) {
      const sy = el('div', 'pub');
      sy.append('表記：', el('b', null, m.frac ? `${pct(m.v)}（${m.frac[0]}${m.frac[1] !== 1 ? '/' + m.frac[1] : ''}）` : pct(m.v)));
      const det = el('details', 'symd'), tot = {};
      for (const [t, , , p] of m.sym) tot[t] = (tot[t] || 0) + p;
      det.append(el('summary', null, ['D', 'A'].filter((t) => t in tot).map((t) => `+ ${tot[t].toFixed(2)}·${t}`).join(' ')));
      for (const [t, g, n, p] of m.sym) {
        const x = el('span', 'sy', `+ ${p.toFixed(2)}·${t}`);
        x.append(el('sub', null, `${g}:${n}`));
        det.append(' ', x);
      }
      sy.append(' ', det);
      $('#meta').append(sy);
    }
    renderNode(M.root, host, 0);
    $('#alt').addEventListener('change', (e) => host.classList.toggle('hideAlt', e.target.checked));
    $('#collapse').addEventListener('click', () => { host.innerHTML = ''; renderNode(M.root, host, 0); });
  }
  main();
})();
