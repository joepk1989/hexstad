// controle: geluid aan, alle effecten afspelen, bouwen/slopen/ongedaan; log welke fx afgaan en of er fouten zijn
const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 900, height: 600 });
 let err = 0; p.on('pageerror', e => { err++; console.log('ERR', e.message); });
 await p.evaluate(() => document.getElementById('soundBtn').click()); await p.waitForTimeout(800);
 const log = await p.evaluate(async () => {
   const S = window.__SC(), out = []; const f0 = S.sound.fx; S.sound.fx = (n, ...a) => { out.push(n); return f0(n, ...a); };
   for (const n of ['place','rotate','remove','deny','click','undo','whoosh','gen','coin','jump','door','squeal','crunch','cricket','splash','roar']) f0(n, 0, 1, 0, 0.8);
   await new Promise(r => setTimeout(r, 900));
   S.doAct('empty'); await new Promise(r => setTimeout(r, 1500));
   S.selectTool && S.selectTool('woning'); S.place(0, 0); await new Promise(r => setTimeout(r, 300)); S.place(3, 0); await new Promise(r => setTimeout(r, 300));
   S.doAct('gen:dorp:2'); await new Promise(r => setTimeout(r, 4000));
   return out; });
 console.log('afgespeeld via haken:', log.join(' '), '| fouten', err); await b.close(); })();
