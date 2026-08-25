/* ============================================================
   UNIRES · Photo Evidence Data + Scene SVG Generator
   ============================================================ */

export interface PhotoRecord {
  scene: string;
  t: string;
  ll: string;
  acc: string;
  unit: string;
  agency: string;
  inc: string;
  hash: string;
  note: string;
}

export const PHOTOS: Record<string, PhotoRecord[]> = {
  karippodu: [
    { scene: 'collapse', t: '20 Aug 2026 · 14:32:11 IST', ll: '11.86420° N, 75.37114° E', acc: '±6 m', unit: 'NDRF-11', agency: 'NDRF', inc: 'INC-2041', hash: 'a91f2c…7d3c', note: 'Initial report — north face, 6 voids marked' },
    { scene: 'collapse', t: '20 Aug 2026 · 15:04:47 IST', ll: '11.86438° N, 75.37102° E', acc: '±4 m', unit: 'NDRF-11', agency: 'NDRF', inc: 'INC-2041', hash: '5b7e10…22af', note: 'Cutting access opened at slab 2' },
    { scene: 'fire', t: '20 Aug 2026 · 13:18:02 IST', ll: '11.83091° N, 75.34020° E', acc: '±8 m', unit: 'FIRE-04', agency: 'FIRE', inc: 'INC-2033', hash: 'c40dd8…9e51', note: 'Transformer yard, wind pushing east' },
    { scene: 'flood', t: '20 Aug 2026 · 11:55:30 IST', ll: '11.84702° N, 75.40655° E', acc: '±5 m', unit: 'FIRE-09', agency: 'FIRE', inc: 'INC-2022', hash: '71aa93…04bd', note: 'Perimeter road, bottling unit gate 3' },
    { scene: 'night', t: '20 Aug 2026 · 04:12:55 IST', ll: '11.84690° N, 75.40602° E', acc: '±9 m', unit: 'FIRE-09', agency: 'FIRE', inc: 'INC-2022', hash: '0fe6b1…8c20', note: 'Night cordon, gas detector reading logged' },
    { scene: 'camp', t: '20 Aug 2026 · 09:40:19 IST', ll: '11.85510° N, 75.35880° E', acc: '±7 m', unit: 'POL-04', agency: 'POLICE', inc: '—', hash: 'e2c775…16fa', note: 'Camp 7 intake — 412 registered' },
  ],
  vellamunda: [
    { scene: 'flood', t: '20 Aug 2026 · 13:47:20 IST', ll: '12.01840° N, 75.29073° E', acc: '±5 m', unit: 'SDRF-02', agency: 'SDRF', inc: 'INC-2038', hash: '8d3a41…b709', note: 'Rooftops, Cheruvatta colony — 11 visible' },
    { scene: 'flood', t: '20 Aug 2026 · 14:19:58 IST', ll: '12.01822° N, 75.29110° E', acc: '±6 m', unit: 'SDRF-02', agency: 'SDRF', inc: 'INC-2038', hash: '2fb096…c31e', note: 'Boat 1 approach lane, current 2.1 m/s' },
    { scene: 'road', t: '20 Aug 2026 · 12:02:41 IST', ll: '12.06201° N, 75.33551° E', acc: '±4 m', unit: 'MED-05', agency: 'MEDICAL', inc: 'INC-2030', hash: 'ba5517…7702', note: 'PHC approach submerged, 0.9 m depth' },
    { scene: 'camp', t: '20 Aug 2026 · 10:26:03 IST', ll: '12.00915° N, 75.31240° E', acc: '±7 m', unit: 'SDRF-02', agency: 'SDRF', inc: '—', hash: '44c9ee…d158', note: 'Camp 2 — 268 registered, 3 medical needs' },
    { scene: 'night', t: '20 Aug 2026 · 03:58:14 IST', ll: '12.01799° N, 75.29201° E', acc: '±11 m', unit: 'SDRF-02', agency: 'SDRF', inc: 'INC-2038', hash: '9917ac…3f4d', note: 'Night sweep, thermal contact at block C' },
  ],
  thodupara: [
    { scene: 'road', t: '20 Aug 2026 · 15:22:36 IST', ll: '11.71880° N, 75.88941° E', acc: '±5 m', unit: 'POL-17', agency: 'POLICE', inc: 'INC-2044', hash: '6ad230…91cc', note: 'Debris face across bypass, 40 m wide' },
    { scene: 'collapse', t: '20 Aug 2026 · 15:31:09 IST', ll: '11.71905° N, 75.88902° E', acc: '±6 m', unit: 'POL-17', agency: 'POLICE', inc: 'INC-2044', hash: 'ff0821…5ab3', note: 'Two vehicles partially buried, tail visible' },
    { scene: 'road', t: '20 Aug 2026 · 12:41:52 IST', ll: '11.70020° N, 75.92150° E', acc: '±4 m', unit: 'POL-17', agency: 'POLICE', inc: 'INC-2027', hash: '31de77…0b64', note: 'Bridge approach scour, closure barricaded' },
    { scene: 'night', t: '20 Aug 2026 · 05:44:31 IST', ll: '11.74110° N, 75.86205° E', acc: '±9 m', unit: 'POL-17', agency: 'POLICE', inc: 'INC-2049', hash: '7c40b9…ee12', note: 'Hamlet track blocked — foot recce only' },
  ],
  chandragiri: [
    { scene: 'camp', t: '20 Aug 2026 · 08:14:07 IST', ll: '12.04480° N, 75.61200° E', acc: '±6 m', unit: 'SDRF-07', agency: 'SDRF', inc: 'INC-2018', hash: 'aa19f4…c8d0', note: 'Camp 3 stores — bedding shortfall' },
    { scene: 'camp', t: '20 Aug 2026 · 08:20:44 IST', ll: '12.04471° N, 75.61188° E', acc: '±5 m', unit: 'SDRF-07', agency: 'SDRF', inc: 'INC-2018', hash: '5e8b23…41a7', note: 'Occupancy board — 189 of 250' },
  ],
  nedumbara: [
    { scene: 'flood', t: '20 Aug 2026 · 09:58:12 IST', ll: '11.86200° N, 75.55880° E', acc: '±5 m', unit: 'SDRF-07', agency: 'SDRF', inc: 'INC-2015', hash: 'd10c65…9b2e', note: 'Closure evidence — Ward 4 drained' },
  ],
  ottakkal: [],
  manalvayal: [],
  kanjirode: [],
  poovathur: [],
};

/* ---- Synthetic photo scenes ---- */
let __uid = 0;

export function sceneSVG(kind: string, ix: number): string {
  const u = 'p' + (++__uid);
  const j = ((ix || 0) % 3) * 9;
  const open = '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">';
  const grain =
    `<rect width="400" height="300" fill="url(#vg${u})"/>` +
    `<defs><radialGradient id="vg${u}" cx=".5" cy=".45" r=".78">` +
    `<stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient></defs>`;

  if (kind === 'flood')
    return (
      open +
      `<defs><linearGradient id="s${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4E6070"/><stop offset="1" stop-color="#93A4B0"/></linearGradient>` +
      `<linearGradient id="w${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#71806F"/><stop offset="1" stop-color="#3A4540"/></linearGradient></defs>` +
      `<rect width="400" height="300" fill="url(#s${u})"/>` +
      `<g fill="#2B3641"><rect x="${10 + j}" y="106" width="54" height="46"/><rect x="${74 + j}" y="86" width="40" height="66"/>` +
      `<rect x="126" y="114" width="68" height="38"/><rect x="206" y="94" width="46" height="58"/>` +
      `<rect x="264" y="120" width="56" height="32"/><rect x="330" y="100" width="58" height="52"/></g>` +
      `<g fill="#3E4C58"><rect x="82" y="96" width="8" height="9"/><rect x="96" y="96" width="8" height="9"/><rect x="216" y="104" width="9" height="10"/><rect x="232" y="104" width="9" height="10"/><rect x="344" y="112" width="10" height="10"/></g>` +
      `<rect y="152" width="400" height="148" fill="url(#w${u})"/>` +
      `<path d="M28 196 L74 164 L120 196 Z" fill="#33404B"/><path d="M244 214 L288 180 L332 214 Z" fill="#2E3A45"/>` +
      `<g stroke="#B9CAD2" stroke-opacity=".24" stroke-width="2.4" stroke-linecap="round">` +
      `<path d="M4 172h124M168 176h84M36 202h122M232 208h150M14 236h176M236 252h144M60 274h130"/></g>` +
      `<g fill="#2C3A34"><ellipse cx="150" cy="230" rx="20" ry="5"/><ellipse cx="320" cy="270" rx="26" ry="6"/><ellipse cx="70" cy="258" rx="14" ry="4"/></g>` +
      `<g stroke="#D3E1EA" stroke-opacity=".18" stroke-width="1.3"><path d="M30 0l-12 60M110 10l-12 60M190 0l-12 70M270 14l-12 58M350 0l-12 66M70 40l-10 50M230 44l-10 46"/></g>` +
      grain +
      '</svg>'
    );

  if (kind === 'collapse')
    return (
      open +
      `<defs><linearGradient id="s${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#77838E"/><stop offset="1" stop-color="#AEB7BF"/></linearGradient></defs>` +
      `<rect width="400" height="300" fill="url(#s${u})"/>` +
      `<rect y="206" width="400" height="94" fill="#4B5057"/>` +
      `<path d="M0 206 L96 206 L96 84 L20 84 L20 206 Z" fill="#3A4048"/>` +
      `<path d="M${96 + j} 206 L96 120 L188 96 L206 206 Z" fill="#464C54"/>` +
      `<path d="M206 206 L214 132 L300 152 L296 206 Z" fill="#383E45"/>` +
      `<path d="M300 206 L304 108 L392 88 L400 206 Z" fill="#434951"/>` +
      `<g fill="#2E343B"><path d="M120 206 L176 168 L232 206 Z"/><path d="M232 206 L268 184 L306 206 Z"/><path d="M40 214 L92 190 L142 214 Z"/></g>` +
      `<g fill="#565C64"><path d="M150 214 L184 196 L214 214 Z"/><path d="M254 220 L288 202 L320 220 Z"/></g>` +
      `<g stroke="#71787F" stroke-width="2.2" stroke-linecap="round"><path d="M168 178l14-22M186 176l10-26M256 190l12-18M118 200l-14-18"/></g>` +
      `<g fill="#FFFFFF" fill-opacity=".10"><ellipse cx="196" cy="150" rx="96" ry="46"/><ellipse cx="300" cy="168" rx="70" ry="34"/></g>` +
      `<g fill="#2A3037"><rect x="0" y="252" width="400" height="10" opacity=".5"/></g>` +
      grain +
      '</svg>'
    );

  if (kind === 'fire')
    return (
      open +
      `<rect width="400" height="300" fill="#150F0C"/>` +
      `<defs><radialGradient id="g${u}" cx=".55" cy=".72" r=".62">` +
      `<stop offset="0" stop-color="#FF9A3C" stop-opacity=".85"/><stop offset=".55" stop-color="#C2451A" stop-opacity=".38"/><stop offset="1" stop-color="#150F0C" stop-opacity="0"/></radialGradient></defs>` +
      `<rect width="400" height="300" fill="url(#g${u})"/>` +
      `<g fill="#0E0A08"><rect x="0" y="150" width="86" height="150"/><rect x="96" y="122" width="70" height="178"/>` +
      `<rect x="248" y="138" width="64" height="162"/><rect x="322" y="118" width="78" height="182"/></g>` +
      `<rect x="176" y="176" width="64" height="124" fill="#120C09"/>` +
      `<g fill="#E8641C"><path d="M${198 + j} 260c-4-22 10-34 12-52 4 14 16 20 18 38 2 16-8 28-18 28s-10-8-12-14z"/>` +
      `<path d="M162 268c-3-16 8-24 9-38 3 10 12 15 13 28 2 12-6 21-13 21s-8-6-9-11z"/></g>` +
      `<g fill="#FFC24D"><path d="M${206 + j} 262c-2-12 6-18 7-28 2 8 9 11 10 21 1 9-5 15-10 15s-6-4-7-8z"/>` +
      `<path d="M168 272c-2-8 4-12 5-19 1 6 6 8 7 14 1 6-4 11-7 11s-5-3-5-6z"/></g>` +
      `<g fill="#241C18" opacity=".85"><circle cx="200" cy="118" r="40"/><circle cx="250" cy="96" r="30"/><circle cx="152" cy="92" r="26"/><circle cx="300" cy="70" r="34"/></g>` +
      `<g stroke="#3A2B22" stroke-width="2"><path d="M0 150h400M0 214h176M240 214h160"/></g>` +
      grain +
      '</svg>'
    );

  if (kind === 'road')
    return (
      open +
      `<defs><linearGradient id="s${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8CA0AE"/><stop offset="1" stop-color="#C3CDD4"/></linearGradient></defs>` +
      `<rect width="400" height="300" fill="url(#s${u})"/>` +
      `<path d="M0 132 L120 66 L232 108 L330 62 L400 96 L400 300 L0 300 Z" fill="#4F6146"/>` +
      `<path d="M120 66 L232 108 L214 300 L96 300 Z" fill="#6A5A44"/>` +
      `<path d="M${130 + j} 78 L206 112 L196 300 L120 300 Z" fill="#7E6B50"/>` +
      `<path d="M0 214 L400 178 L400 246 L0 286 Z" fill="#3C4147"/>` +
      `<g stroke="#D8D3B4" stroke-width="4" stroke-dasharray="26 22"><path d="M0 250 L400 212"/></g>` +
      `<g fill="#5D4F3C"><ellipse cx="150" cy="238" rx="58" ry="26"/><ellipse cx="214" cy="256" rx="40" ry="18"/><ellipse cx="96" cy="226" rx="30" ry="14"/></g>` +
      `<g fill="#6E5F49"><ellipse cx="140" cy="228" rx="20" ry="10"/><ellipse cx="196" cy="248" rx="15" ry="8"/></g>` +
      `<g fill="#D9432F"><rect x="300" y="196" width="9" height="34" rx="2"/><rect x="356" y="188" width="9" height="34" rx="2"/></g>` +
      `<rect x="296" y="188" width="74" height="9" rx="3" fill="#E8E2CE"/>` +
      `<g stroke="#3C4147" stroke-width="2.4"><path d="M0 286 L400 246"/></g>` +
      grain +
      '</svg>'
    );

  if (kind === 'camp')
    return (
      open +
      `<defs><linearGradient id="s${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7E90A0"/><stop offset="1" stop-color="#BCC6CD"/></linearGradient></defs>` +
      `<rect width="400" height="300" fill="url(#s${u})"/>` +
      `<rect y="150" width="400" height="150" fill="#5A5B46"/>` +
      `<rect y="150" width="400" height="16" fill="#6B6C54"/>` +
      `<g fill="#D6D8C2"><path d="M${20 + j} 214 L58 150 L96 214 Z"/><path d="M116 214 L154 150 L192 214 Z"/><path d="M212 214 L250 150 L288 214 Z"/><path d="M308 214 L346 150 L384 214 Z"/></g>` +
      `<g fill="#A9AC91"><path d="M58 150 L96 214 L78 214 Z"/><path d="M154 150 L192 214 L174 214 Z"/><path d="M250 150 L288 214 L270 214 Z"/><path d="M346 150 L384 214 L366 214 Z"/></g>` +
      `<g fill="#8E9179"><path d="M46 214 L58 178 L70 214 Z"/><path d="M142 214 L154 178 L166 214 Z"/><path d="M238 214 L250 178 L262 214 Z"/><path d="M334 214 L346 178 L358 214 Z"/></g>` +
      `<g fill="#4A4B3A"><rect x="0" y="240" width="400" height="60"/></g>` +
      `<g fill="#2E3A45"><rect x="24" y="248" width="86" height="34" rx="4"/><rect x="96" y="256" width="34" height="26" rx="3"/></g>` +
      `<g fill="#1F2731"><circle cx="46" cy="284" r="9"/><circle cx="96" cy="284" r="9"/></g>` +
      `<g fill="#39413A"><ellipse cx="220" cy="272" rx="10" ry="16"/><ellipse cx="248" cy="276" rx="9" ry="14"/><ellipse cx="300" cy="270" rx="11" ry="17"/></g>` +
      grain +
      '</svg>'
    );

  // night (default)
  return (
    open +
    `<rect width="400" height="300" fill="#080C12"/>` +
    `<defs><linearGradient id="t${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE9A8" stop-opacity=".22"/><stop offset="1" stop-color="#FFE9A8" stop-opacity="0"/></linearGradient></defs>` +
    `<path d="M${40 + j} 24 L150 300 L58 300 Z" fill="url(#t${u})"/>` +
    `<circle cx="${40 + j}" cy="22" r="7" fill="#FFF3C9" opacity=".9"/>` +
    `<rect y="228" width="400" height="72" fill="#0C1219"/>` +
    `<g fill="#04070B"><path d="M96 228 L120 186 L146 228 Z"/><path d="M240 228 L272 176 L306 228 Z"/><rect x="326" y="182" width="58" height="46"/></g>` +
    `<g fill="#0A0F16"><ellipse cx="150" cy="262" rx="46" ry="12"/><ellipse cx="290" cy="278" rx="60" ry="14"/></g>` +
    `<g fill="#050A10"><path d="M138 258 a7 7 0 1 1 14 0 v18 h-14 z"/><path d="M166 264 a6 6 0 1 1 12 0 v14 h-12 z"/></g>` +
    `<g stroke="#9FB6C6" stroke-opacity=".22" stroke-width="1.2"><path d="M20 0l-10 54M92 12l-10 52M164 0l-10 60M236 16l-10 50M308 0l-10 58M372 20l-10 48M56 40l-8 44M270 48l-8 40"/></g>` +
    `<circle cx="352" cy="196" r="4" fill="#7FD8A6" opacity=".85"/>` +
    grain +
    '</svg>'
  );
}
