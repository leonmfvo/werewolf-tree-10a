// 全分岐ツリーの表示。data/trees/<id>/meta.json と、局面を CHUNK 個ずつに分けた c<k>.json を、開いた枝の分だけ読む。
// 局面：[種類, 区分, 夜番号, 村勝率, 村勝率の分数, 見出し, 公開情報, 狼視点, 最善の子, 子]
//   区分 n 夜（人外の選択）/ m 朝（結果）/ d 昼（真置き）/ v 投票・吊り / e 終局
// 子：[出現率 | null, 出現率の分数, ラベル, 子の局面番号, 種類, 子の村勝率, 村勝率の分数]  種類 c 確率 / w 人外の選択 / v 村の選択 / f 固定
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
    const s = (j) => (j == null ? null : c.strs[j]);
    return { k: nd[0], cat: nd[1], d: nd[2], v: nd[3], vf: s(nd[4]), t: s(nd[5]), pub: s(nd[6]), hid: s(nd[7]), best: nd[8],
             ch: nd[9].map(([p, pf, lab, cid, kind, v, vf]) => ({ p, pf: s(pf), lab: s(lab), cid, kind, v, vf: s(vf) })) };
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  // 村勝率（青）と分数
  function vspan(v, f) {
    const s = el('span', 'v');
    s.append(pct(v));
    if (f && f !== '0' && f !== '1') s.append(el('span', 'fr', `(${f})`));
    s.title = '村勝率';
    return s;
  }
  // 出現率（白）と分数
  function pspan(p, f) {
    const s = el('span', 'p');
    if (p == null) return s;
    s.append(pct(p));
    if (f && f !== '1') s.append(el('span', 'fr', `(${f})`));
    s.title = '出現率';
    return s;
  }
  // 日付と区分（夜番号 d：初日の夜 = 0、2日目の昼・夜 = 1 …）
  const CAT = { n: '夜', m: '朝', d: '昼', v: '投票', e: '終局' };
  function dayText(cat, d) {
    if (d < 0) return CAT[cat] || '';
    if (cat === 'n') return d === 0 ? '初日 夜' : `${d + 1}日目 夜`;
    if (cat === 'm') return `${d + 2}日目 朝`;   // 朝は前の夜の番号を引き継ぐ
    if (cat === 'e') return '終局';
    return `${d + 1}日目 ${CAT[cat]}`;
  }

  async function renderNode(i, host, dctx) {
    const loading = el('div', 'pub', '読み込み中…');
    host.append(loading);
    let n;
    try { n = await node(i); } catch (e) { loading.textContent = '読み込めませんでした（' + e.message + '）'; return; }
    loading.remove();
    const d = n.d >= 0 ? n.d : dctx;   // 番号を持たない局面（朝・投票）は親の日付を引き継ぐ
    const box = el('div', `node ph-${n.cat}`);
    const nh = el('div', 'nh');
    nh.append(el('span', `day ph-${n.cat}`, dayText(n.cat, d)), ' ', el('span', 't', n.t), ' ', vspan(n.v, n.vf));
    if (n.k === 'w') nh.append(el('span', 'lbl bad', '人外が選ぶ'));
    if (n.k === 'e') nh.append(el('span', 'lbl ' + (n.v >= 0.5 ? 'good' : 'bad'), n.v >= 0.5 ? '村勝ち' : '狼勝ち'));
    box.append(nh);
    if (n.pub) box.append(el('div', 'pub', n.pub));
    if (n.hid) {
      const det = el('details', 'hid');
      det.append(el('summary', null, '狼から見た情報'), el('div', null, n.hid));
      box.append(det);
    }
    if (n.ch.length) {
      const ul = el('ul', 'kids');
      n.ch.forEach((c, j) => ul.append(renderKid(c, n.k === 'w' ? (j === n.best ? 'best' : 'alt') : '', d)));
      box.append(ul);
    }
    host.append(box);
  }

  function renderKid(c, mark, d) {
    const li = el('li', 'kid' + (mark === 'alt' ? ' alt' : ''));
    const row = el('div', 'row');
    const tg = el('span', 'tg', '▸');
    row.append(tg, pspan(c.p, c.pf));
    const l = el('span', 'lab', c.lab);
    if (mark === 'best') l.append(el('span', 'lbl bad', '人外の最善'));
    row.append(l, vspan(c.v, c.vf));
    li.append(row);
    let body = null;
    row.addEventListener('click', () => {
      if (body) { body.remove(); body = null; tg.textContent = '▸'; return; }
      tg.textContent = '▾';
      body = el('div'); li.append(body);
      renderNode(c.cid, body, d);
    });
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
    const mf = m.frac ? (m.frac[1] !== 1 ? `${m.frac[0]}/${m.frac[1]}` : `${m.frac[0]}`) : null;
    document.title = `${m.board} ${m.label}｜10a狩人ツリー`;
    $('#ttl').textContent = `${m.board}（${m.label}）の全分岐ツリー`;
    $('#meta').textContent = '';
    $('#meta').append('進行：', el('b', null, m.policy), '　村勝率：', vspan(m.v, mf), `　局面数：${M.n.toLocaleString()}`);
    if (m.sym && m.sym.length) {
      const sy = el('div', 'pub');
      sy.append('表記：', vspan(m.v, mf));
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
