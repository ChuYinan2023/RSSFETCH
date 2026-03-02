const fs = require('fs');
const data = JSON.parse(fs.readFileSync('raw_feeds.json','utf8'));

// 最近3天
const now = new Date();
const threeDaysAgo = new Date(now);
threeDaysAgo.setDate(now.getDate() - 3);
threeDaysAgo.setHours(0, 0, 0, 0);

let articles = data.articles.filter(a => {
  if (!a.pubDate) return false;
  const d = new Date(a.pubDate);
  if (isNaN(d.getTime())) return false;
  return d >= threeDaysAgo;
});

// 按链接去重
const seen = new Set();
const unique = [];
articles.forEach(a => {
  if (a.link && !seen.has(a.link)) {
    seen.add(a.link);
    unique.push(a);
  }
});

unique.sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate));

console.log('最近3天（' + threeDaysAgo.toISOString().slice(0,10) + ' 至今）');
console.log('总计: ' + unique.length + ' 篇（去重后，原 ' + articles.length + ' 篇）\n');

// 按日期分组输出
const groups = {};
unique.forEach(a => {
  const date = new Date(a.pubDate).toISOString().slice(0,10);
  if (!groups[date]) groups[date] = [];
  groups[date].push(a);
});

for (const date of Object.keys(groups).sort().reverse()) {
  const dayArticles = groups[date];
  console.log('## ' + date + ' (' + dayArticles.length + '篇)\n');
  dayArticles.forEach((a,i) => {
    console.log((i+1) + '. [' + a.category + '/' + (a.feedNameZh || a.feedName) + '] ' + a.title);
    console.log('   ' + a.link);
  });
  console.log('');
}
