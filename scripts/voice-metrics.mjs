// 말투 측정: node scripts/voice-metrics.mjs <mdx가 든 폴더>  (docs/CLAUDE_VOICE_ANALYSIS.md)
import fs from 'fs'; import path from 'path';
const dir = process.argv[2];
const clean = l => l.replace(/<[^>]+>/g,'').replace(/\*\*/g,'').replace(/\$[^$]*\$/g,'X');
const isProse = l => /^[^\s<{}\[\]()#|>\-`]/.test(l) && !/^(import|export)/.test(l);
const screens = [], paras = [];
for (const f of fs.readdirSync(dir)) { const body = fs.readFileSync(path.join(dir,f),'utf8').split(/^---$/m).slice(2).join('---');
  for (const sc of body.split(/<Screen\b/).slice(1)) { const ps = sc.split('\n').filter(isProse).map(clean)
      .map(p => p.split(/(?<=[.?!])\s+/).map(s=>s.trim()).filter(s => s.length>3 && /[가-힣]/.test(s))).filter(p=>p.length);
    screens.push(ps); paras.push(...ps); } }
const S = paras.flat(), N = S.length;
const endingOf = t => { const e = t.replace(/["'”’)\]」』.?!\s]+$/,'');
  if (/\?$/.test(t.replace(/["'”’)\]]+$/,''))) return '물음';
  for (const [k,re] of [['거든요',/거든요$/],['잖아요',/잖아요$/],['죠',/죠$/],['니까요',/니까요$/],['이에요',/(이에|예)요$/],['게요',/게요$/],['네요',/네요$/],['래요',/래요$/],['어요',/요$/],
    ['것이다',/것이다$/],['이다',/이다$/],['었다',/[었았였했]다$/],['는다',/(는다|ㄴ다|[한된간온본준진친든는른운룬]다)$/],['다(기타)',/다$/]]) if (re.test(e)) return k;
  return e.slice(-1) || '?'; };
const ends = {}; for (const s of S) { const e = endingOf(s); ends[e] = (ends[e]||0)+1; }
const H = -Object.values(ends).reduce((h,c)=>h+(c/N)*Math.log2(c/N),0);
let maxRun=0, runs4=0; for (const sc of screens) { let prev='', run=0; for (const s of sc.flat()) { const e=endingOf(s); run = e===prev? run+1:1; prev=e; if(run===4) runs4++; maxRun=Math.max(maxRun,run);} }
const len = S.map(s=>s.length), mean = len.reduce((a,b)=>a+b,0)/N, sd = Math.sqrt(len.reduce((a,b)=>a+(b-mean)**2,0)/N);
const spS = screens.map(sc=>sc.flat().length).filter(n=>n);
const ppl = paras.map(p=>p.length);
const per = re => +(100*S.reduce((c,s)=>{const m=s.match(re); return c+(m? (re.global?m.length:1):0)},0)/N).toFixed(1);
let qa=0; for (const p of paras) for (let i=0;i<p.length-1;i++) if (/\?["'”)]*$/.test(p[i]) && !/\?["'”)]*$/.test(p[i+1])) qa++;
console.log(JSON.stringify({
 문장:N, 평균길이:+mean.toFixed(1), 길이변동계수:+(sd/mean).toFixed(2), '15자이하%':+(100*len.filter(l=>l<=15).length/N).toFixed(1), '60자이상%':+(100*len.filter(l=>l>=60).length/N).toFixed(1),
 어미엔트로피bit:+H.toFixed(2), 어미상위:Object.entries(ends).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`${k} ${(100*v/N).toFixed(0)}%`).join(', '),
 '같은어미4연속/100문장':+(100*runs4/N).toFixed(1), 같은어미최장:maxRun,
 '화면당문장 평균':+(spS.reduce((a,b)=>a+b,0)/spS.length).toFixed(1), '화면당문장 최대':Math.max(...spS), '6문장이상 화면%':+(100*spS.filter(n=>n>=6).length/spS.length).toFixed(0),
 '2문장 문단%':+(100*ppl.filter(n=>n===2).length/ppl.length).toFixed(0), '1문장 문단%':+(100*ppl.filter(n=>n===1).length/ppl.length).toFixed(0),
 '쉼표/문장':+(S.reduce((c,s)=>c+(s.match(/,/g)||[]).length,0)/N).toFixed(2), '쉼표2개이상%':per(/,.*,/),
 '고, 나열/100':per(/고, /g), '것/100':per(/것/g), '라고 해요·한다/100':per(/라고 (한다|해요|불러요|부른다|부르죠)/g),
 '말맛 표지/100':per(/(^|\s)(자,|아,|음,|어\?|그러니까|근데|있잖아요|맞아요|글쎄요|솔직히|그쵸|잠깐|사실 저|저도)/g),
 '물음→바로 답/100':+(100*qa/N).toFixed(1), '물음표/100':per(/\?/g), '수 있/100':per(/수 (있|없)/g), '우리/100':per(/우리/g), '저·제/100':per(/(^|\s)(저는|제가|저도|저한테|제)\s/g),
}));
