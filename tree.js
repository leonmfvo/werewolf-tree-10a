// 全分岐ツリーの表示。data/trees/<id>.json を読み、開いた枝だけ描く。
// ノード：[種類, 局面, 夜番号, 村勝率, 見出し, 公開情報, 狼視点, 最善の子, 子]
// 子：[確率 | null, ラベル, 子ノード番号, 種類]  種類 c 確率 / w 人外の選択 / v 村の選択 / f 固定
(function () {
  const $ = (s, e = document) => e.querySelector(s);
  const pct = (x) => (x * 100).toFixed(x > 0 && x < 0.001 ? 3 : 1) + '%';
  const id = new URLSearchParams(location.search).get('t');
  let D = null;

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

  function renderNode(i, host) {
    const [k, ph, d, v, t, pub, hid, best, ch] = D.nodes[i];
    const box = el('div', 'node');
    const nh = el('div', 'nh');
    const dl = dayLabel(ph, d);
    if (dl) nh.append(el('span', 'lbl acc', dl), ' ');
    nh.append(el('span', 't', D.strs[t]), ' ', vspan(v));
    if (k === 'w') nh.append(el('span', 'lbl bad', '人外が選ぶ'));
    if (k === 'e') nh.append(el('span', 'lbl ' + (v >= 0.5 ? 'good' : 'bad'), '終局'));
    box.append(nh);
    if (D.strs[pub]) box.append(el('div', 'pub', D.strs[pub]));
    if (D.strs[hid]) {
      const det = el('details', 'hid');
      det.append(el('summary', null, '狼から見た情報'), el('div', null, D.strs[hid]));
      box.append(det);
    }
    if (ch.length) {
      const ul = el('ul', 'kids');
      ch.forEach((c, j) => ul.append(renderKid(c, k === 'w' ? (j === best ? 'best' : 'alt') : '', ch.length === 1)));
      box.append(ul);
    }
    host.append(box);
  }

  function renderKid(c, mark, only) {
    const [p, lab, cid] = c;
    const li = el('li', 'kid' + (mark === 'alt' ? ' alt' : ''));
    const row = el('div', 'row');
    const tg = el('span', 'tg', '▸');
    row.append(tg);
    row.append(el('span', 'p', p == null ? '' : pct(p)));
    const l = el('span', 'lab', D.strs[lab]);
    if (mark === 'best') l.append(el('span', 'lbl bad', '人外の最善'));
    row.append(l, vspan(D.nodes[cid][3]));
    li.append(row);
    let open = false, body = null;
    const toggle = () => {
      open = !open;
      tg.textContent = open ? '▾' : '▸';
      if (open) { body = el('div'); renderNode(cid, body); li.append(body); }
      else if (body) { body.remove(); body = null; }
    };
    row.addEventListener('click', toggle);
    // 1本道と人外の最善はあらかじめ開いておく（深くなりすぎないよう、表示中の深さで制限）
    if ((only || mark === 'best') && depth < 6) { depth++; toggle(); depth--; }
    return li;
  }
  let depth = 0;

  async function main() {
    const host = $('#tree');
    if (!id) { host.textContent = 'ツリーが指定されていません。'; return; }
    try {
      const r = await fetch(`data/trees/${encodeURIComponent(id)}.json`);
      if (!r.ok) throw new Error(r.status);
      D = await r.json();
    } catch (e) { host.textContent = 'ツリーを読み込めませんでした（' + e.message + '）。'; return; }
    const m = D.meta;
    document.title = `${m.board} ${m.label}｜10a狩人ツリー`;
    $('#ttl').textContent = `${m.board}（${m.label}）の全分岐ツリー`;
    $('#meta').innerHTML = '';
    $('#meta').append('進行：', el('b', null, m.policy), '　村勝率：', vspan(m.v), `　局面数：${D.nodes.length.toLocaleString()}`);
    renderNode(D.root, host);
    $('#alt').addEventListener('change', (e) => host.classList.toggle('hideAlt', e.target.checked));
    $('#collapse').addEventListener('click', () => { host.innerHTML = ''; renderNode(D.root, host); });
  }
  main();
})();
