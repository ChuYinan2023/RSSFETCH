const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, LevelFormat,
} = require("docx");

// ── Colour palette ──
const C = {
  primary: "1A5276",
  accent: "D35400",
  tag: "2471A3",
  lightBg: "EBF5FB",
  warmBg: "FDF2E9",
  greenBg: "EAFAF1",
  border: "BDC3C7",
  black: "1C1C1C",
  white: "FFFFFF",
  green: "1E8449",
  red: "C0392B",
};

const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: C.border };
const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const cellPad = { top: 60, bottom: 60, left: 120, right: 120 };

// ── Helpers ──
function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, size: 36, font: "Microsoft YaHei", color: C.primary })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, bold: true, size: 30, font: "Microsoft YaHei", color: C.primary })] });
}
function h3(text) {
  return new Paragraph({ spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 26, font: "Microsoft YaHei", color: C.accent })] });
}
function body(runs, opts = {}) {
  return new Paragraph({ spacing: { after: 100, line: 340 }, ...opts, children: runs });
}
function t(text, extra = {}) {
  return new TextRun({ font: "Microsoft YaHei", size: 21, color: C.black, ...extra, text });
}
function tb(text, extra = {}) { return t(text, { bold: true, ...extra }); }
function link(text) { return new TextRun({ font: "Microsoft YaHei", size: 20, color: C.tag, text, underline: {} }); }
function spacer(h = 80) { return new Paragraph({ spacing: { before: h, after: h }, children: [] }); }
function divider() {
  return new Paragraph({ spacing: { before: 120, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: C.border, space: 4 } }, children: [] });
}

// ── Checklist row ──
function checkRow(pass, text) {
  return body([
    t(pass ? "\u2705 " : "\u274C ", { size: 20 }),
    t(text, { size: 20 }),
  ], { indent: { left: 480 } });
}

// ── Topic card (V1.2.7 format) ──
function topicCard(num, name, titleA, titleB, corePoints, depth, source, date, url, rule, trendBonus, checklist) {
  const rows = [];
  // Header
  rows.push(body([
    tb(`\u9009\u9898 ${num}\uFF1A`, { size: 26, color: C.accent }),
    tb(name, { size: 26, color: C.primary }),
  ]));

  // Titles
  rows.push(body([tb("\uD83D\uDD25 \u6807\u9898\u5EFA\u8BAE\uFF1A", { color: C.accent })]));
  rows.push(body([
    tb("\u6807\u9898A\uFF08\u5171\u60C5\u4F53\uFF09\uFF1A", { size: 20 }),
    t(titleA, { size: 20 }),
  ], { indent: { left: 360 } }));
  rows.push(body([
    tb("\u6807\u9898B\uFF08\u6743\u5A01\u4F53\uFF09\uFF1A", { size: 20 }),
    t(titleB, { size: 20 }),
  ], { indent: { left: 360 } }));

  // Core
  rows.push(body([tb("\uD83C\uDFAF \u6838\u5FC3\u770B\u70B9\uFF1A", { color: C.accent })]));
  corePoints.forEach(p => rows.push(body([t(p)], { indent: { left: 360 } })));

  // Depth
  rows.push(body([tb("\uD83D\uDCA1 \u6DF1\u5EA6\u89E3\u6790\u65B9\u5411\uFF1A", { color: C.accent })]));
  rows.push(body([t(depth)], { indent: { left: 360 } }));

  // Source
  rows.push(body([tb("\uD83D\uDD17 \u4F9D\u636E\u4E0E\u51FA\u5904\uFF1A", { color: C.accent })]));
  rows.push(body([t(`\u6765\u6E90\u673A\u6784\uFF1A${source}`)], { indent: { left: 360 } }));
  rows.push(body([t(`\u53D1\u5E03\u65F6\u95F4\uFF1A${date}`)], { indent: { left: 360 } }));
  rows.push(body([t("\u539F\u6587 URL\uFF1A"), link(url)], { indent: { left: 360 } }));

  // Rule + Trend
  rows.push(body([
    tb("\u9009\u9898\u6CD5\u5219\uFF1A", { color: C.accent }),
    tb(rule, { color: C.primary }),
    t("  "),
    ...(trendBonus ? [tb("\u2B50\u70ED\u70B9\u52A0\u5206\uFF1A", { color: C.red }), t(trendBonus, { color: C.red })] : []),
  ]));

  // Checklist
  rows.push(body([tb("\u2705 \u81EA\u68C0\u6E05\u5355\uFF1A", { color: C.green })]));
  checklist.forEach(([pass, txt]) => rows.push(checkRow(pass, txt)));

  rows.push(divider());
  return rows;
}

// ── Series sub-article ──
function seriesArticle(subtitle, content, direction, url) {
  return [
    h3(subtitle),
    body([tb("\u6838\u5FC3\u5185\u5BB9\uFF1A"), t(content)]),
    body([tb("\u89E3\u6790\u65B9\u5411\uFF1A"), t(direction)]),
    body([tb("\u51FA\u5904\uFF1A"), link(url)]),
  ];
}

// ══════════════ MAIN ══════════════
async function main() {
  const ch = []; // children

  // ──── COVER ────
  ch.push(spacer(500));
  ch.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: "\u9009\u9898\u7B56\u5212\u4E66", font: "Microsoft YaHei", size: 56, bold: true, color: C.primary })] }));
  ch.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [new TextRun({ text: "2026\u5E742\u6708\u520A \u00B7 \u5FC3\u8840\u7BA1\u4ECB\u5165\u4E0E\u533B\u7597\u5668\u68B0", font: "Microsoft YaHei", size: 28, color: C.accent })] }));
  ch.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [new TextRun({ text: "\u63D0\u793A\u8BCD\u7248\u672C\uFF1AV1.2.7 \u00B7 \u6570\u636E\u9A71\u52A8\u7206\u6B3E\u516C\u5F0F", font: "Microsoft YaHei", size: 22, color: "888888", italics: true })] }));
  ch.push(spacer(200));

  const infoItems = [
    ["\u6570\u636E\u7A97\u53E3", "2026\u5E741\u6708\u4E0B\u65EC\u81F32\u670811\u65E5"],
    ["\u4FE1\u606F\u6E90", "60\u4E2ARSS\u6E90\uFF0C1107\u7BC7\u8D44\u8BAF\uFF0C\u7ECF\u591A\u8F6EAI\u8BC4\u5206\u7B5B\u9009"],
    ["\u6807\u9898\u516C\u5F0F", "\u82F1\u6587\u4EA7\u54C1\u540D\uFF1A\u4E2D\u6587\u6838\u5FC3\u4EF7\u503C | \u91CF\u5316\u4EAE\u70B9 (21-25\u5B57)"],
    ["\u8F93\u51FA", "10\u4E2A\u5355\u7BC7\u7206\u6B3E + 2\u4E2A\u91CD\u78C5\u7CFB\u5217"],
  ];
  infoItems.forEach(([k, v]) => {
    ch.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 50 },
      children: [tb(`${k}\uFF1A`, { size: 22, color: C.primary }), t(v, { size: 22 })] }));
  });

  ch.push(new Paragraph({ children: [new PageBreak()] }));

  // ──── CRITERIA TABLE ────
  ch.push(h1("\u9009\u9898\u7B5B\u9009\u6CD5\u5219\uFF086\u5927\u6CD5\u5219\uFF0C\u6309\u7206\u6B3E\u6548\u679C\u6392\u5E8F\uFF09"));

  const criteria = [
    ["\u2B50\u2460 \u60A3\u8005\u5171\u60C5\u578B", "7000-16000", "\u76F4\u51FB\u7EC8\u8EAB\u75DB\u82E6\u7684\u98A0\u8986\u6027\u89E3\u51B3\u65B9\u6848\u3002\u201C\u65E0\u9700/\u544A\u522B/\u798F\u97F3/\u53EF\u9006\u201D"],
    ["\u2B50\u2461 \u4EA7\u4E1A\u5730\u9707\u578B", "4624", "\u5DE8\u5934\u6536\u8D2D\u3001\u5408\u5E76\u3001\u4EA7\u7EBF\u91CD\u7EC4\u3001\u6218\u7565\u6295\u8D44"],
    ["\u2462 \u964D\u7EF4\u6253\u51FB", "3500-4000", "First-in-human\u6280\u672F\u3001\u83B7\u6279\u4E0A\u5E02\u3001\u5168\u7403\u9996\u521B"],
    ["\u2463 \u8BA4\u77E5\u98A0\u8986", "3500+", "\u6311\u6218\u4F20\u7EDF\u4E60\u60EF\u7684\u53CD\u76F4\u89C9\u8BC1\u636E"],
    ["\u2464 \u5B89\u5168\u8B66\u793A", "2900-3500", "FDA\u53EC\u56DE\u3001\u4E25\u91CD\u4E0D\u826F\u53CD\u5E94\u3001\u624B\u672F\u98CE\u9669\u8B66\u544A"],
    ["\u2465 \u5207\u8EAB\u5229\u76CA", "\u2014", "\u6307\u5357\u53D8\u66F4\u3001DRG/DIP\u653F\u7B56\u3001\u521B\u65B0\u901A\u9053\u5BA1\u6279\u52A8\u6001"],
  ];
  const cW = [2200, 1600, 5560];
  ch.push(new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: cW,
    rows: [
      new TableRow({ children: ["\u6CD5\u5219", "\u5E73\u5747\u9605\u8BFB\u91CF", "\u8BF4\u660E"].map((h, i) =>
        new TableCell({ borders, width: { size: cW[i], type: WidthType.DXA },
          shading: { fill: C.primary, type: ShadingType.CLEAR }, margins: cellPad,
          children: [new Paragraph({ children: [tb(h, { color: C.white, size: 21 })] })] })) }),
      ...criteria.map(([a, b, c], i) =>
        new TableRow({ children: [a, b, c].map((v, j) =>
          new TableCell({ borders, width: { size: cW[j], type: WidthType.DXA },
            shading: { fill: i % 2 === 0 ? C.lightBg : C.white, type: ShadingType.CLEAR }, margins: cellPad,
            children: [new Paragraph({ children: [j === 0 ? tb(v, { size: 21 }) : t(v, { size: 20 })] })] })) })),
    ],
  }));

  ch.push(spacer(120));
  ch.push(body([tb("\uD83D\uDCC8 \u70ED\u70B9\u52A0\u5206\u9879\uFF1A", { color: C.red }),
    t("\u521B\u65B0\u901A\u9053 | IVL/\u51B2\u51FB\u6CE2 | PFA | \u624B\u672F\u673A\u5668\u4EBA | \u5E76\u8D2D/\u6536\u8D2D | AI\u533B\u7597 | PCI\u65B0\u7B56\u7565", { size: 20 })
  ]));

  ch.push(new Paragraph({ children: [new PageBreak()] }));

  // ════════════ 10 SINGLE TOPICS ════════════
  ch.push(h1("\u7C7B\u578B\u4E00\uFF1A\u5355\u7BC7\u7206\u6B3E\uFF0810\u7BC7\uFF09"));
  ch.push(divider());

  // ── 1: eCoin (患者共情型) ──
  ch.push(...topicCard("1\uFE0F\u20E3",
    "\u5C3F\u5931\u7981\u60A3\u8005\u544A\u522B\u62A4\u57AB\u7684\u786C\u5E01\u5927\u5C0F\u690D\u5165\u7269",
    "eCoin\uFF1A\u5C3F\u5931\u7981\u60A3\u8005\u544A\u522B\u62A4\u57AB\u7684\u7855\u5E01\u690D\u5165\u7269 | \u6709\u6548\u738775%",
    "eCoin\uFF1A\u6CE2\u79D1\u6536\u8D2D\u80EB\u795E\u7ECF\u523A\u6FC0\u65B0\u9510 | \u65E0\u5BFC\u7EBF\u5FAE\u521B\u690D\u5165",
    [
      "\u2022 \u8FC7\u53BB\uFF1A\u5C3F\u5931\u7981\u6CBB\u7597\u4F9D\u8D56\u9AA6\u795E\u7ECF\u8C03\u63A7\uFF08\u80CC\u90E8\u690D\u5165\uFF09\u6216\u53CD\u590D\u95E8\u8BCA\u7535\u523A\u6FC0\uFF0C\u4F53\u9A8C\u5DEE",
      "\u2022 \u73B0\u5728\uFF1AeCoin\u786C\u5E01\u5927\u5C0F\u690D\u5165\u811A\u8E1D\u65C1\uFF0C\u65E0\u5BFC\u7EBF\u3001\u5C40\u9EBB\u3001\u81EA\u52A8\u7535\u523A\u6FC0\uFF0C75%\u60A3\u8005\u75C7\u72B6\u51CF\u534A",
      "\u2022 89%\u60A3\u8005\u613F\u610F\u63A8\u8350\u7ED9\u4EB2\u53CB\uFF0C\u6CE2\u79D1\u5DF2\u5B98\u5BA3\u6536\u8D2D",
    ],
    "\u80EB\u795E\u7ECF\u523A\u6FC0(ITNS) vs \u9AA6\u795E\u7ECF\u8C03\u63A7(SNM)\u7684\u673A\u5236\u5BF9\u6BD4\u3001\u5973\u6027OAB\u7684\u6D41\u884C\u75C5\u5B66\u3001BSX vs MDT vs BlueWind\u7ADE\u4E89\u683C\u5C40",
    "MassDevice / Boston Scientific", "2026-01-12",
    "https://news.bostonscientific.com/2026-01-12-Boston-Scientific-Announces-Agreement-to-Acquire-Valencia-Technologies-Corporation",
    "\u2B50\u2460 \u60A3\u8005\u5171\u60C5\u578B + \u2B50\u2461 \u4EA7\u4E1A\u5730\u9707\u578B",
    "\u6536\u8D2D",
    [[true, "\u6807\u9898A 23\u5B57\uFF0C\u6807\u9898B 22\u5B57\uFF0C\u5747\u572821-25\u533A\u95F4"],
     [true, "\u542B\u201C\uFF1A\u201D\u548C\u201C|\u201D\u5206\u9694\u7B26"],
     [true, "\u542B\u201C\u544A\u522B\u201D\uFF08\u60C5\u7EEA\u8BCD\uFF09\u548C\u201C\u6536\u8D2D\u201D\uFF08\u9AD8\u80FD\u8BCD\uFF09"],
     [true, "\u547D\u4E2D\u6CD5\u5219\u2460+\u2461"],
     [true, "\u5177\u5907\u5934\u6761\u63A8\u9001\u4EF7\u503C\uFF1A\u60A3\u8005\u75DB\u70B9+\u4EA7\u4E1A\u5E76\u8D2D\u53CC\u91CD\u7206\u70B9"]]
  ));

  // ── 2: Medtronic CathWorks (产业地震+AI) ──
  ch.push(...topicCard("2\uFE0F\u20E3",
    "\u7F8E\u6566\u529B5.85\u4EBF\u6536\u8D2DCathWorks\uFF0CAI\u53D6\u4EE3\u538B\u529B\u5BFC\u4E1D",
    "FFRangio\uFF1A\u544A\u522B\u538B\u529B\u5BFC\u4E1D\u7684AI\u5FC3\u810F\u5F71\u50CF | \u7F8E\u6566\u529B\u6536\u8D2D",
    "CathWorks\uFF1A\u7F8E\u6566\u529B$5.85\u4EBF\u6536\u8D2DAI-FFR | \u91CD\u585E\u4ECB\u5165\u5347\u7EA7",
    [
      "\u2022 \u8FC7\u53BB\uFF1AFFR\u6D4B\u91CF\u9700\u4FB5\u5165\u6027\u538B\u529B\u5BFC\u4E1D\uFF0C\u64CD\u4F5C\u590D\u6742\u3001\u589E\u52A0\u98CE\u9669\u548C\u8D39\u7528",
      "\u2022 \u73B0\u5728\uFF1ACathWorks FFRangio\u7528AI\u4ECEX\u5149\u5F71\u50CF\u76F4\u63A5\u8BA1\u7B97FFR\uFF0C\u65E0\u9700\u538B\u529B\u5BFC\u4E1D",
      "\u2022 \u7F8E\u6566\u529B\u884C\u4F7F\u671F\u6743\u6536\u8D2D\uFF0C\u5E03\u5C40AI+\u4ECB\u5165\u5FC3\u810F\u75C5\u5B66\u5168\u94FE\u6761",
    ],
    "FFRangio\u6280\u672F\u539F\u7406\uFF08\u8BA1\u7B97\u6D41\u4F53\u529B\u5B66+\u6DF1\u5EA6\u5B66\u4E60\uFF09\u3001\u4E0E\u5176\u4ED6\u65E0\u521B FFR\uFF08HeartFlow/CAAS\uFF09\u5BF9\u6BD4\u3001DRG\u4E0B\u7684\u7ECF\u6D4E\u5B66\u8003\u91CF",
    "Medtronic", "2026-02-03",
    "https://news.medtronic.com/2026-02-03-Medtronic-advances-its-innovation-strategy-with-intent-to-acquire-CathWorks",
    "\u2B50\u2461 \u4EA7\u4E1A\u5730\u9707\u578B",
    "\u6536\u8D2D + AI\u533B\u7597 + PCI\u65B0\u7B56\u7565",
    [[true, "\u6807\u9898A 22\u5B57\uFF0C\u6807\u9898B 23\u5B57"], [true, "\u542B\u201C\uFF1A\u201D\u201C|\u201D"], [true, "\u542B\u201C\u544A\u522B\u201D\u201C\u6536\u8D2D\u201D"], [true, "\u547D\u4E2D\u6CD5\u5219\u2461"], [true, "\u5934\u6761\u4EF7\u503C\uFF1A\u884C\u4E1A\u5DE8\u5934\u6536\u8D2D+AI\u6280\u672F\u53D8\u9769"]]
  ));

  // ── 3: BSX Penumbra $14.5B (产业地震) ──
  ch.push(...topicCard("3\uFE0F\u20E3",
    "\u6CE2\u79D1$145\u4EBF\u6536\u8D2EPenumbra\uFF0C\u91CD\u8FD4\u795E\u7ECF\u4ECB\u5165",
    "Penumbra\uFF1A\u5352\u4E2D\u53D6\u6813\u60A3\u8005\u7684\u6551\u661F | \u6CE2\u79D1$145\u4EBF\u6536\u8D2D",
    "Penumbra\uFF1A\u6CE2\u79D1$145\u4EBF\u6536\u8D2D\u795E\u7ECF\u4ECB\u5165\u738B\u8005 | \u91CD\u8FD4\u5352\u4E2D\u8D5B\u9053",
    [
      "\u2022 2011\u5E74\u6CE2\u79D1$15\u4EBF\u5356\u51FA\u795E\u7ECF\u8840\u7BA1\u4E1A\u52A1\u7ED9\u53F2\u8D5B\u514B\uFF0C\u88AB\u8BC4\u4E3A\u6700\u5927\u5931\u8BEF\u4E4B\u4E00",
      "\u2022 \u73B0\u5728\u4EE5\u8FD110\u500D\u4EF7\u683C\uFF08$145\u4EBF\uFF09\u56DE\u8D2D\uFF0C\u83B7\u5F97\u5168\u7403\u9886\u5148\u7684\u673A\u68B0\u53D6\u6813\u6280\u672F",
      "\u2022 FTC\u53EF\u80FD\u53D1\u8D77\u7B2C\u4E8C\u6B21\u8BF7\u6C42\uFF0C\u6B64\u524DFTC\u521A\u53EB\u505C\u7231\u5FB7\u534E-JenaValve\u5408\u5E76",
    ],
    "\u673A\u68B0\u53D6\u6813\u6280\u672F\u8FED\u4EE3\u53F2\u3001Penumbra\u4EA7\u54C1\u7EBF\u5168\u666F\u3001FTC\u53CD\u5784\u65AD\u8D8B\u52BF\u5BF9\u5668\u68B0\u5E76\u8D2D\u7684\u5F71\u54CD",
    "Boston Scientific / MedTech Dive", "2026-01-15",
    "https://news.bostonscientific.com/2026-01-15-Boston-Scientific-announces-agreement-to-acquire-Penumbra,-Inc",
    "\u2B50\u2461 \u4EA7\u4E1A\u5730\u9707\u578B",
    "\u6536\u8D2D + \u9888\u52A8\u8109\u4ECB\u5165",
    [[true, "\u6807\u9898A 22\u5B57\uFF0C\u6807\u9898B 23\u5B57"], [true, "\u542B\u201C\uFF1A\u201D\u201C|\u201D"], [true, "\u542B\u201C\u6551\u661F\u201D\u201C\u6536\u8D2D\u201D"], [true, "\u547D\u4E2D\u6CD5\u5219\u2461"], [true, "\u5934\u6761\u4EF7\u503C\uFF1A$145\u4EBF\u5927\u989D\u5E76\u8D2D"]]
  ));

  // ── 4: Farapulse 4yr (降维打击+PFA) ──
  ch.push(...topicCard("4\uFE0F\u20E3",
    "Farapulse PFA\u56DB\u5E74\u6570\u636E\u78BE\u538B\u70ED\u6D88\u878D",
    "Farapulse\uFF1A\u623F\u98A4\u60A3\u8005\u544A\u522B\u4E8C\u6B21\u6D88\u878D | 4\u5E74\u6709\u6548\u738773%",
    "Farapulse\uFF1APFA\u56DB\u5E74\u6570\u636E\u78BE\u538B\u70ED\u6D88\u878D | \u53D1\u8868Nature Medicine",
    [
      "\u2022 ADVENT LTO 4\u5E74\u968F\u8BBF\uFF1APFA\u6709\u6548\u600772.8% vs \u70ED\u6D88\u878D64.3%",
      "\u2022 \u91CD\u590D\u6D88\u878D\u738710.4% vs 17.7%\uFF0C\u6297\u5FC3\u5F8B\u5931\u5E38\u836F\u4F7F\u752811.5% vs 20.4%",
      "\u2022 \u540C\u6B65\u53D1\u8868Nature Medicine\uFF0C\u6807\u5FD7PFA\u6B63\u5F0F\u8FDB\u5165\u201C\u91D1\u6807\u51C6\u201D\u8BC1\u636E\u7B49\u7EA7",
    ],
    "PFA\u9009\u62E9\u6027\u7EC6\u80DE\u6B7B\u4EA1\u673A\u5236\u3001\u80BA\u9759\u8109\u9694\u79BB\u6301\u4E45\u6027\u7684\u7EC4\u7EC7\u5B66\u57FA\u7840\u3001PFA vs \u5C04\u9891 vs \u51B7\u51BB\u7684\u4E34\u5E8A\u51B3\u7B56\u6811",
    "MassDevice / Nature Medicine", "2026-02-09",
    "https://www.massdevice.com/boston-scientific-farapulse-outperforms-thermal-study/",
    "\u2462 \u964D\u7EF4\u6253\u51FB",
    "PFA",
    [[true, "\u6807\u9898A 22\u5B57\uFF0C\u6807\u9898B 24\u5B57"], [true, "\u542B\u201C\uFF1A\u201D\u201C|\u201D"], [true, "\u542B\u201C\u544A\u522B\u201D\u201C\u9996\u6B3E\u201D"], [true, "\u547D\u4E2D\u6CD5\u5219\u2462"], [true, "\u5934\u6761\u4EF7\u503C\uFF1APFA\u91CC\u7A0B\u7891\u6570\u636E"]]
  ));

  // ── 5: Amulet 360 (患者共情+降维) ──
  ch.push(...topicCard("5\uFE0F\u20E3",
    "Amulet 360\u4E0B\u4E00\u4EE3LAA\u5C01\u5835\u5668\uFF0C\u544A\u522B\u7EC8\u8EAB\u6297\u51DD",
    "Amulet 360\uFF1A\u623F\u98A4\u60A3\u8005\u544A\u522B\u7EC8\u8EAB\u6297\u51DD | \u95ED\u5408\u738794%",
    "Amulet 360\uFF1A\u96C5\u57F9\u4E0B\u4E00\u4EE3LAA\u5C01\u5835\u5668\u83B7\u9A8C\u8BC1 | \u6210\u529F\u738799.8%",
    [
      "\u2022 VERITAS\u7814\u7A76400\u4F8B\u300134\u4E2D\u5FC3\uFF1A45\u5929\u5B8C\u5168\u95ED\u540893.9%\uFF0C\u690D\u5165\u6210\u529F\u738799.8%",
      "\u2022 \u96F6\u5FC3\u810F\u5806\u79EF\u9700\u624B\u672F\u3001\u96F6\u5352\u4E2D\u3001\u96F6\u5668\u68B0\u79FB\u4F4D\uFF0C\u5B89\u5168\u6027\u6781\u4F73",
      "\u2022 \u540C\u6B65\u53D1\u8868JACC: Clinical Electrophysiology",
    ],
    "Amulet 360 vs WATCHMAN FLX\u8BBE\u8BA1\u5DEE\u5F02\u3001LAA\u5C01\u5835\u540E\u505C\u6297\u51DD\u7684\u5B89\u5168\u6027\u8BC1\u636E\u3001\u4E2D\u56FD\u56FDLAA\u5C01\u5835\u5668\u7ADE\u54C1\u683C\u5C40",
    "Abbott / JACC", "2026-02-07",
    "https://www.massdevice.com/abbott-strong-outcomes-next-gen-amulet-360/",
    "\u2B50\u2460 \u60A3\u8005\u5171\u60C5\u578B + \u2462 \u964D\u7EF4\u6253\u51FB",
    "",
    [[true, "\u6807\u9898A 22\u5B57\uFF0C\u6807\u9898B 25\u5B57"], [true, "\u542B\u201C\uFF1A\u201D\u201C|\u201D"], [true, "\u542B\u201C\u544A\u522B\u201D\u201C\u6210\u529F\u7387\u201D"], [true, "\u547D\u4E2D\u6CD5\u5219\u2460+\u2462"], [true, "\u5934\u6761\u4EF7\u503C\uFF1A\u60A3\u8005\u6700\u5173\u5FC3\u7684\u505C\u6297\u51DD\u95EE\u9898"]]
  ));

  // ── 6: Cardiac MRI替代右心导管 (患者共情) ──
  ch.push(...topicCard("6\uFE0F\u20E3",
    "\u5FC3\u810FMRI\u65E0\u521B\u66FF\u4EE3\u53F3\u5FC3\u5BFC\u7BA1\uFF0C\u5FC3\u8870\u8BC4\u4F30\u9769\u547D",
    "T2-Mapping\uFF1A\u5FC3\u8870\u60A3\u8005\u65E0\u9700\u53F3\u5FC3\u5BFC\u7BA1 | MRI\u65E0\u521B\u66FF\u4EE3",
    "T2-Mapping\uFF1A\u5FC3\u810FMRI\u9996\u6B21\u5339\u654C\u53F3\u5FC3\u5BFC\u7BA1\u7CBE\u5EA6 | \u98A0\u8986\u8BC4\u4F30",
    [
      "\u2022 \u8FC7\u53BB\uFF1A\u53F3\u5FC3\u5BFC\u7BA1\u662F\u5FC3\u8870\u4E25\u91CD\u5EA6\u8BC4\u4F30\u7684\u91D1\u6807\u51C6\uFF0C\u4F46\u5C5E\u6709\u521B\u64CD\u4F5C",
      "\u2022 \u73B0\u5728\uFF1AT2 mapping MRI\u53EF\u5339\u654C\u53F3\u5FC3\u5BFC\u7BA1\u7684\u7CBE\u5EA6\uFF0C\u5B8C\u5168\u65E0\u521B",
      "\u2022 \u610F\u4E49\uFF1A\u5FC3\u8870\u60A3\u8005\u53EF\u51CF\u5C11\u53CD\u590D\u6709\u521B\u68C0\u67E5\uFF0C\u6539\u5584\u751F\u6D3B\u8D28\u91CF",
    ],
    "T2 mapping\u6280\u672F\u539F\u7406\u3001\u4E0EPV loop/PCWP\u7684\u76F8\u5173\u6027\u3001\u5FC3\u8870HFpEF vs HFrEF\u7684\u5DEE\u5F02\u5316\u5E94\u7528",
    "Medscape Cardiology", "2026-02-10",
    "https://www.medscape.com/viewarticle/cardiac-mri-may-present-noninvasive-alternative-right-heart-2026a100046s",
    "\u2B50\u2460 \u60A3\u8005\u5171\u60C5\u578B",
    "",
    [[true, "\u6807\u9898A 23\u5B57\uFF0C\u6807\u9898B 24\u5B57"], [true, "\u542B\u201C\uFF1A\u201D\u201C|\u201D"], [true, "\u542B\u201C\u65E0\u9700\u201D\u201C\u9996\u6B21\u201D\u201C\u98A0\u8986\u201D"], [true, "\u547D\u4E2D\u6CD5\u5219\u2460"], [true, "\u5934\u6761\u4EF7\u503C\uFF1A\u53D6\u4EE3\u6709\u521B\u64CD\u4F5C\u7684\u5173\u6CE8\u5EA6\u6781\u9AD8"]]
  ));

  // ── 7: J&J Cerepak Recall (安全警示) ──
  ch.push(...topicCard("7\uFE0F\u20E3",
    "\u5F3A\u751F\u5F39\u7C27\u5708\u7D27\u6025\u53EC\u56DE\uFF0C1\u6B7B4\u91CD\u4F24",
    "Cerepak\uFF1A\u5F39\u7C27\u5708\u8131\u843D\u81F41\u6B7B4\u4F24 | FDA\u6700\u9AD8\u7EA7\u53EC\u56DE",
    "Cerepak\uFF1A\u5F3A\u751FFDA I\u7C7B\u53EC\u56DE\u52A8\u8109\u7624\u5F39\u7C27\u5708 | \u8B66\u544A\u505C\u7528",
    [
      "\u2022 CEREPAK\u7CFB\u5217\u56E0\u8131\u843D\u5931\u8D25\u5173\u8054\u51FA\u8840\u6027/\u7F3A\u8840\u6027\u5352\u4E2D\uFF0C\u5DF2\u81F41\u6B7B4\u91CD\u4F24",
      "\u2022 FDA\u5B9A\u4E3AClass I\uFF08\u6700\u4E25\u91CD\u7EA7\u522B\uFF09\uFF0C\u5F71\u54CDUniform/Heliform/Freeform\u5168\u7CFB\u5217",
      "\u2022 \u533B\u7597\u673A\u6784\u88AB\u5EFA\u8BAE\u7ACB\u5373\u505C\u6B62\u4F7F\u7528",
    ],
    "\u5F39\u7C27\u5708\u8131\u843D\u7684\u7535\u89E3/\u673A\u68B0\u673A\u5236\u3001\u672F\u4E2D\u5E94\u6025\u9884\u6848\u3001\u66FF\u4EE3\u4EA7\u54C1\u9009\u62E9",
    "FDA / MedTech Dive", "2026-02-06",
    "https://www.medtechdive.com/news/JNJ-recalls-Cerepak-coil-systems-aneurysm-treatment/811585/",
    "\u2464 \u5B89\u5168\u8B66\u793A",
    "",
    [[true, "\u6807\u9898A 21\u5B57\uFF0C\u6807\u9898B 23\u5B57"], [true, "\u542B\u201C\uFF1A\u201D\u201C|\u201D"], [true, "\u542B\u201C\u6B7B\u4EA1\u7387\u201D\u201C\u53EC\u56DE\u201D\u201C\u8B66\u544A\u201D"], [true, "\u547D\u4E2D\u6CD5\u5219\u2464"], [true, "\u5934\u6761\u4EF7\u503C\uFF1A\u76F4\u63A5\u5F71\u54CD\u4E34\u5E8A\u5B89\u5168"]]
  ));

  // ── 8: 微创火鹰 TARGET-FIRST (切身利益+降维) ──
  ch.push(...topicCard("8\uFE0F\u20E3",
    "\u5FAE\u521B\u706B\u9E70\u652F\u67B6\u767B\u9876EHJ\u5E74\u5EA6\u5341\u5927\uFF0C1\u6708DAPT\u5373\u53EF",
    "Firehawk\uFF1A\u5FC3\u6897\u540E\u544A\u522B12\u6708\u53CC\u6297 | \u51FA\u8840\u964D54%",
    "Firehawk\uFF1ATARGET-FIRST\u5165\u9009EHJ\u5341\u5927 | 1\u6708DAPT\u7A81\u7834",
    [
      "\u2022 \u8FC7\u53BB\uFF1A\u6025\u6027\u5FC3\u6897PCI\u540EDAPT\u6807\u51C6\u4E3A12\u4E2A\u6708",
      "\u2022 \u73B0\u5728\uFF1A\u706B\u9E70\u652F\u67B6\u5141\u8BB8AMI\u540E\u4EC51\u4E2A\u6708DAPT\uFF0C\u51FA\u8840\u51CF\u5C1154%\uFF0C\u7F3A\u8840\u4E8B\u4EF6\u4E0D\u589E\u52A0",
      "\u2022 \u88ABEHJ\u8BC4\u4E3A2025\u5E74\u5EA6\u5341\u5927\u4ECB\u5165\u5FC3\u810F\u75C5\u5B66\u8BBA\u6587",
    ],
    "\u9776\u5411\u91CA\u836F vs \u4F20\u7EDF\u6D82\u5C42\u8BBE\u8BA1\u5DEE\u5F02\u3001\u9AD8\u51FA\u8840\u98CE\u9669\u60A3\u8005\u7684\u4E34\u5E8A\u7BA1\u7406\u3001\u77EDDAPT\u7684\u9002\u7528\u4EBA\u7FA4\u9009\u62E9",
    "MicroPort / European Heart Journal", "2026-02-05",
    "https://microport.com/news/target-first-trial-top-10-interventional-cardiology-papers-of-2025",
    "\u2465 \u5207\u8EAB\u5229\u76CA + \u2462 \u964D\u7EF4\u6253\u51FB",
    "PCI\u65B0\u7B56\u7565",
    [[true, "\u6807\u9898A 21\u5B57\uFF0C\u6807\u9898B 24\u5B57"], [true, "\u542B\u201C\uFF1A\u201D\u201C|\u201D"], [true, "\u542B\u201C\u544A\u522B\u201D\u201C\u7A81\u7834\u201D"], [true, "\u547D\u4E2D\u6CD5\u5219\u2465+\u2462"], [true, "\u5934\u6761\u4EF7\u503C\uFF1A\u76F4\u63A5\u6539\u53D8\u672F\u540E\u7528\u836F\u65B9\u6848"]]
  ));

  // ── 9: GeminiOne TEER出海 (降维打击) ──
  ch.push(...topicCard("9\uFE0F\u20E3",
    "\u56FD\u4EA7TEER\u53E9\u95E8\u6B27\u6D32\uFF0C\u6311\u6218MitraClip\u5784\u65AD",
    "GeminiOne\uFF1A\u56FD\u4EA7TEER\u8FDB\u519B\u6B27\u6D32\u7684\u798F\u97F3 | CE\u6CE8\u518C\u7533\u62A5",
    "GeminiOne\uFF1A\u542F\u660E\u533B\u7597TEER\u7533\u62A5\u6B27\u6D32CE | \u5168\u7403\u5316\u7A81\u7834",
    [
      "\u2022 \u542F\u660E\u533B\u7597GeminiOne\u6B63\u5F0F\u5411\u6B27\u76DF\u63D0\u4EA4CE\u6CE8\u518C",
      "\u2022 \u540C\u65F6\u4E2D\u56FANMPA\u548C\u7F8E\u56FDFDA IDE\u5747\u5728\u63A8\u8FDB\uFF0C\u4E09\u7EBF\u5E76\u8FDB",
      "\u2022 \u5408\u4F5C\u65B9HighLife\u521A\u83B7\u5168\u7403\u9996\u4E2ATMVR CE\u6279\u51C6\uFF0C\u4E92\u8865\u5E03\u5C40",
    ],
    "\u6ED1\u69FD\u9501\u5408\u673A\u5236\u521B\u65B0\u3001TEER\u4E0ETMVR\u4E92\u8865\u683C\u5C40\u3001\u4E2D\u56FD\u7ED3\u6784\u6027\u5FC3\u810F\u75C5\u5668\u68B0\u51FA\u6D77\u5168\u666F",
    "MassDevice", "2026-02-09",
    "https://www.massdevice.com/peijia-medical-seeks-ce-mark-for-its-teer-system/",
    "\u2462 \u964D\u7EF4\u6253\u51FB",
    "\u521B\u65B0\u901A\u9053",
    [[true, "\u6807\u9898A 22\u5B57\uFF0C\u6807\u9898B 22\u5B57"], [true, "\u542B\u201C\uFF1A\u201D\u201C|\u201D"], [true, "\u542B\u201C\u798F\u97F3\u201D\u201C\u8FDB\u519B\u201D\u201C\u7A81\u7834\u201D"], [true, "\u547D\u4E2D\u6CD5\u5219\u2462"], [true, "\u5934\u6761\u4EF7\u503C\uFF1A\u4E2D\u56FD\u521B\u65B0\u51FA\u6D77"]]
  ));

  // ── 10: AI听诊器 (降维+AI热点) ──
  ch.push(...topicCard("\uD83D\uDD1F",
    "AI\u542C\u8BCA\u5668\u7075\u654F\u5EA6\u7FFB\u500D\uFF0C\u4E00\u534A\u74E3\u819C\u75C5\u88AB\u6F0F\u8BCA",
    "AI\u542C\u8BCA\u5668\uFF1A\u74E3\u819C\u75C5\u60A3\u8005\u7684\u65E9\u7B5B\u798F\u97F3 | \u7075\u654F\u5EA6\u7FFB\u500D\u8FBE92%",
    "AI\u542C\u8BCA\u5668\uFF1A\u9996\u6B21\u7075\u654F\u5EA6\u8D8590%\u68C0\u6D4B\u74E3\u819C\u75C5 | EHJ\u53D1\u8868",
    [
      "\u2022 AI\u6570\u5B57\u542C\u8BCA\u5668\u68C0\u51FA\u4E2D\u91CD\u5EA6VHD\u7075\u654F\u5EA692.3%\uFF0C\u4F20\u7EDF\u542C\u8BCA\u4EC546.2%",
      "\u2022 65\u5C81\u4EE5\u4E0AVHD\u60A3\u75C5\u7387>50%\uFF0C\u5927\u91CF\u60A3\u8005\u672A\u88AB\u53CA\u65F6\u8F6C\u8BCA",
      "\u2022 \u53EF\u63A8\u52A8\u57FA\u5C42TAVR/TEER\u65E9\u671F\u8F6C\u8BCA\u7387\u5927\u5E45\u63D0\u5347",
    ],
    "AI\u542C\u8BCA\u58F0\u5B66\u7279\u5F81\u63D0\u53D6+\u6DF1\u5EA6\u5B66\u4E60\u539F\u7406\u3001\u5047\u9633\u6027\u5904\u7406\u6D41\u7A0B\u3001\u5206\u7EA7\u8BCA\u7597\u573A\u666F",
    "ESC / EHJ-Digital Health", "2026-02-05",
    "https://www.escardio.org/news/press/press-releases/ai-stethoscope/",
    "\u2462 \u964D\u7EF4\u6253\u51FB",
    "AI\u533B\u7597",
    [[true, "\u6807\u9898A 23\u5B57\uFF0C\u6807\u9898B 24\u5B57"], [true, "\u542B\u201C\uFF1A\u201D\u201C|\u201D"], [true, "\u542B\u201C\u798F\u97F3\u201D\u201C\u9996\u6B21\u201D"], [true, "\u547D\u4E2D\u6CD5\u5219\u2462"], [true, "\u5934\u6761\u4EF7\u503C\uFF1AAI\u98A0\u8986\u57FA\u5C42\u7B5B\u67E5"]]
  ));

  ch.push(new Paragraph({ children: [new PageBreak()] }));

  // ════════════ SERIES ════════════
  ch.push(h1("\u7C7B\u578B\u4E8C\uFF1A\u91CD\u78C5\u7CFB\u5217\u4E13\u9898\uFF082\u4E2A\u7CFB\u5217\uFF09"));
  ch.push(divider());

  // ── Series A: PFA ──
  ch.push(h2("\u7CFB\u5217A\uFF1APFA\u8109\u51B2\u573A\u6D88\u878D2026\u2014\u2014\u4E09\u5DE8\u5934\u7ADE\u6280\u4E0E\u4E0B\u4E00\u4EE3\u7A81\u56F4"));
  ch.push(body([tb("\uD83D\uDD17 \u6838\u5FC3\u94FE\u63A5\uFF1A"), link("https://www.massdevice.com/biggest-cardiac-news-2026-af-symposium/")]));

  ch.push(...seriesArticle(
    "\u7B2C\u4E00\u7BC7\uFF1A\u3010\u5B66\u672F\u9AD8\u5EA6\u3011Farapulse 4\u5E74\u6570\u636E\u78BE\u538B\u70ED\u6D88\u878D",
    "ADVENT LTO 4\u5E74\u6570\u636E\uFF1APFA 72.8% vs \u70ED\u6D88\u878D64.3%\uFF0C\u91CD\u590D\u6D88\u878D\u738710.4% vs 17.7%\u3002\u540C\u6B65\u53D1\u8868Nature Medicine\u3002",
    "\u819C\u7535\u7A7F\u5B54\u673A\u5236\u3001\u80BA\u9759\u8109\u9694\u79BB\u6301\u4E45\u6027\u3001ADVENT/ADVENT-LTO\u8BD5\u9A8C\u8BBE\u8BA1\u89E3\u6790",
    "https://www.massdevice.com/boston-scientific-farapulse-outperforms-thermal-study/"
  ));
  ch.push(...seriesArticle(
    "\u7B2C\u4E8C\u7BC7\uFF1A\u3010\u4E34\u5E8A\u5B9E\u64CD\u3011\u4E09\u5927PFA\u5E73\u53F0\u5BFC\u7BA1\u5BA4\u5B9E\u6218\u5BF9\u6BD4",
    "J&J Omnypulse 12\u6708\u6570\u636E + Abbott Volt + Arg\u00E1 BURST-AF\u9996\u4EBA\u8BD5\u9A8C(94%\u75C5\u706B\u6301\u4E45\u7387) + Atraverse Hotwire\u623F\u95F4\u9694\u7A7F\u523A\u7CFB\u7EDF\u3002",
    "\u5BFC\u7BA1\u8BBE\u8BA1\u54F2\u5B66\u5BF9\u6BD4\u3001\u624B\u672F\u6D41\u7A0B\u5DEE\u5F02\u3001\u5B66\u4E60\u66F2\u7EBF\u4E0E\u57F9\u8BAD\u8DEF\u5F84",
    "https://www.medtechdive.com/news/4-takeaways-2026-AF-Symposium-AFib-PFA-Boston/811825/"
  ));
  ch.push(...seriesArticle(
    "\u7B2C\u4E09\u7BC7\uFF1A\u3010\u4EA7\u4E1A\u89C2\u5BDF\u3011PFA\u5E02\u573A$50\u4EBF\u7684\u5206\u86CB\u4E89\u593A\u6218",
    "Abbott TactiFlex Duo\u83B7CE\u3001Arg\u00E1\u7EB3\u79D2\u7EA7\u8109\u51B2\u5DEE\u5F02\u5316\u3001\u4E2D\u56FDPFA\u7ADE\u54C1\u51FA\u6D77\u3002\u9884\u8BA12030\u5E74\u5168\u7403PFA\u5E02\u573A$50\u4EBF+\u3002",
    "\u6280\u672F\u58C1\u5792\u3001DRG/DIP\u5B9A\u4EF7\u535A\u5F08\u3001\u8FDB\u53E3\u66FF\u4EE3\u65F6\u95F4\u8868",
    "https://www.massdevice.com/arga-medtech-data-single-catheter-pfa/"
  ));

  ch.push(spacer(200));
  ch.push(divider());

  // ── Series B: M&A ──
  ch.push(h2("\u7CFB\u5217B\uFF1A2026\u5F00\u5E74\u5668\u68B0\u5E76\u8D2D\u6F6E\u2014\u2014\u5DE8\u5934\u91CD\u65B0\u6D17\u724C\u7684\u6218\u7565\u5730\u56FE"));
  ch.push(body([tb("\uD83D\uDD17 \u6838\u5FC3\u94FE\u63A5\uFF1A"), link("https://news.bostonscientific.com/2026-01-15-Boston-Scientific-announces-agreement-to-acquire-Penumbra,-Inc")]));

  ch.push(...seriesArticle(
    "\u7B2C\u4E00\u7BC7\uFF1A\u3010\u5B66\u672F\u9AD8\u5EA6\u3011\u4ECE$15\u4EBF\u5356\u51FA\u5230$145\u4EBF\u56DE\u8D2D\u2014\u2014BSX+Penumbra\u91CD\u5851\u5352\u4E2D\u4ECB\u5165\u7248\u56FE",
    "2011\u5E74\u6CE2\u79D1$15\u4EBF\u5356\u51FA\u795E\u7ECF\u8840\u7BA1\u4E1A\u52A1\uFF0C2026\u5E74\u4EE5$145\u4EBF\u56DE\u8D2DPenumbra\u3002\u673A\u68B0\u53D6\u6813\u6280\u672F\u53D1\u5C55\u53F2\u3001ADAPT\u6280\u672F\u5E73\u53F0\u89E3\u6790\u3002",
    "\u673A\u68B0\u53D6\u6813 vs \u652F\u67B6\u53D6\u6813\u7684\u5F00\u901A\u7387\u5BF9\u6BD4\u3001Penumbra\u4EA7\u54C1\u7EBF\u5168\u666F\u3001\u5352\u4E2D\u7BB1\u53F7\u4F53\u7CFB",
    "https://news.bostonscientific.com/2026-01-15-Boston-Scientific-announces-agreement-to-acquire-Penumbra,-Inc"
  ));
  ch.push(...seriesArticle(
    "\u7B2C\u4E8C\u7BC7\uFF1A\u3010\u4E34\u5E8A\u5B9E\u64CD\u3011CathWorks FFRangio\u2014\u2014\u7F8E\u6566\u529B$5.85\u4EBFAI+PCI\u8D4C\u5C40",
    "Medtronic\u884C\u4F7F\u671F\u6743\u6536\u8D2DCathWorks\uFF0CFFRangio\u4ECEX\u5149AI\u8BA1\u7B97FFR\u65E0\u9700\u538B\u529B\u5BFC\u4E1D\u3002\u4E0EHeartFlow\u3001CAAS vFFR\u7684\u6280\u672F\u8DEF\u7EBF\u5BF9\u6BD4\u3002",
    "\u65E0\u521FFFR\u6280\u672F\u8DEF\u7EBF\u5BF9\u6BD4\u3001DRG\u4E0B\u7684\u7ECF\u6D4E\u5B66\u8003\u91CF\u3001\u4E2D\u56FD\u5E02\u573FFFR\u6E17\u900F\u7387",
    "https://news.medtronic.com/2026-02-03-Medtronic-advances-its-innovation-strategy-with-intent-to-acquire-CathWorks"
  ));
  ch.push(...seriesArticle(
    "\u7B2C\u4E09\u7BC7\uFF1A\u3010\u4EA7\u4E1A\u89C2\u5BDF\u3011\u5E76\u8D2D\u6F6E\u4E0B\u7684FTC\u8001\u864E\u2014\u2014\u5668\u68B0\u5E76\u8D2D\u7684\u76D1\u7BA1\u65B0\u5E38\u6001",
    "FTC\u53EB\u505C\u7231\u5FB7\u534E-JenaValve\u5408\u5E76\u3001\u5BF9BSX-Penumbra\u53D1\u8D77\u7B2C\u4E8C\u6B21\u8BF7\u6C42\u3002Philips\u6536\u8D2DSpectraWAVE\uFF08\u51A0\u8109\u5F71\u50CF+AI\uFF09\u3001\u5FAE\u521BCardioFlow+CRM\u5408\u5E76\u3001BSX\u6536\u8D2DValencia\u7B49\u5E76\u8D2D\u6F6E\u5168\u666F\u3002",
    "\u533B\u7597\u5668\u68B0\u53CD\u5784\u65AD\u8D8B\u52BF\u3001\u5BF9\u4E2D\u56FD\u4F01\u4E1A\u6D77\u5916\u5E76\u8D2D\u7684\u542F\u793A\u3001\u5E76\u8D2D\u540E\u6574\u5408\u7684\u5386\u53F2\u6559\u8BAD",
    "https://www.usa.philips.com/a-w/about/news/archive/standard/news/press/2025/philips-agrees-to-acquire-spectrawave-inc-advancing-next-generation-coronary-intravascular-imaging-and-physiological-assessment-with-ai.html"
  ));

  ch.push(new Paragraph({ children: [new PageBreak()] }));

  // ════════════ SUMMARY TABLE ════════════
  ch.push(h1("\u9009\u9898\u6CD5\u5219\u4E0E\u70ED\u70B9\u8986\u76D6\u6C47\u603B"));

  const summaryData = [
    ["\u2B50\u2460 \u60A3\u8005\u5171\u60C5\u578B", "\u2460eCoin\u5C3F\u5931\u7981\u3001\u2464Amulet360\u505C\u6297\u51DD\u3001\u2465MRI\u66FF\u4EE3\u5BFC\u7BA1"],
    ["\u2B50\u2461 \u4EA7\u4E1A\u5730\u9707\u578B", "\u2461MDT\u6536\u8D2DCathWorks\u3001\u2462BSX\u6536\u8D2DPenumbra\u3001\u7CFB\u5217B"],
    ["\u2462 \u964D\u7EF4\u6253\u51FB", "\u2463Farapulse PFA\u3001\u2468GeminiOne TEER\u3001\u246FAI\u542C\u8BCA"],
    ["\u2464 \u5B89\u5168\u8B66\u793A", "\u2466Cerepak\u53EC\u56DE"],
    ["\u2465 \u5207\u8EAB\u5229\u76CA", "\u2467\u706B\u9E70 1\u6708DAPT"],
  ];
  const sW = [2600, 6760];
  ch.push(new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: sW,
    rows: [
      new TableRow({ children: ["\u6CD5\u5219", "\u8986\u76D6\u9009\u9898"].map((h, i) =>
        new TableCell({ borders, width: { size: sW[i], type: WidthType.DXA },
          shading: { fill: C.primary, type: ShadingType.CLEAR }, margins: cellPad,
          children: [new Paragraph({ children: [tb(h, { color: C.white, size: 22 })] })] })) }),
      ...summaryData.map(([k, v], i) =>
        new TableRow({ children: [k, v].map((val, j) =>
          new TableCell({ borders, width: { size: sW[j], type: WidthType.DXA },
            shading: { fill: i % 2 === 0 ? C.lightBg : C.white, type: ShadingType.CLEAR }, margins: cellPad,
            children: [new Paragraph({ children: [j === 0 ? tb(val, { size: 21 }) : t(val, { size: 20 })] })] })) })),
    ],
  }));

  ch.push(spacer(120));

  // Trend bonus table
  ch.push(body([tb("\uD83D\uDCC8 \u70ED\u70B9\u52A0\u5206\u9879\u547D\u4E2D\u60C5\u51B5\uFF1A", { color: C.red })]));
  const trendData = [
    ["\u6536\u8D2D/\u5E76\u8D2D", "\u2460\u2461\u2462 + \u7CFB\u5217B"], ["PFA", "\u2463 + \u7CFB\u5217A"], ["AI\u533B\u7597", "\u2461\u246F"],
    ["PCI\u65B0\u7B56\u7565", "\u2467"], ["\u521B\u65B0\u901A\u9053", "\u2468"],
  ];
  const tW = [2200, 7160];
  ch.push(new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: tW,
    rows: trendData.map(([k, v], i) =>
      new TableRow({ children: [k, v].map((val, j) =>
        new TableCell({ borders, width: { size: tW[j], type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? C.warmBg : C.white, type: ShadingType.CLEAR }, margins: cellPad,
          children: [new Paragraph({ children: [j === 0 ? tb(val, { size: 20, color: C.red }) : t(val, { size: 20 })] })] })) })),
  }));

  ch.push(spacer(200));
  ch.push(body([t("\u6240\u6709\u9009\u9898\u5747\u901A\u8FC7V1.2.7\u81EA\u68C0\u6E05\u5355\u9A8C\u8BC1\uFF0C\u94FE\u63A5\u6765\u81EA ESC\u3001AHA\u3001JAMA\u3001Circulation\u3001MassDevice\u3001MedTech Dive\u3001TCTMD \u7B49\u6743\u5A01\u6E90\u3002",
    { italics: true, color: "888888" })], { alignment: AlignmentType.CENTER }));

  // ════════════ BUILD ════════════
  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Microsoft YaHei", size: 21 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 36, bold: true, font: "Microsoft YaHei", color: C.primary },
          paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 30, bold: true, font: "Microsoft YaHei", color: C.primary },
          paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1 } },
      ],
    },
    sections: [{
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1260, bottom: 1260, left: 1260 } },
      },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "\u9009\u9898\u7B56\u5212\u4E66 V1.2.7 \u00B7 2026\u5E742\u6708", font: "Microsoft YaHei", size: 16, color: "999999", italics: true })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
        children: [t("\u2014 ", { size: 16, color: "999999" }), new TextRun({ children: [PageNumber.CURRENT], font: "Microsoft YaHei", size: 16, color: "999999" }), t(" \u2014", { size: 16, color: "999999" })] })] }) },
      children: ch,
    }],
  });

  const buf = await Packer.toBuffer(doc);
  const outPath = "D:\\PlayClaudeCode\\RSSFETCH\\\u9009\u9898\u7B56\u5212\u4E66_V1.2.7_2026\u5E742\u6708.docx";
  fs.writeFileSync(outPath, buf);
  console.log("Done! Saved to:", outPath, "Size:", buf.length, "bytes");
}

main().catch(e => { console.error(e); process.exit(1); });
