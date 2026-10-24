import asyncio, sys
from playwright.async_api import async_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','hexstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.makedirs(os.path.join(HERE,'out'),exist_ok=True); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":480,"height":320}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2000)
        await pg.evaluate("()=>{window.__SC().renderer.render=()=>{};}")
        await pg.evaluate("()=>{const S=window.__SC(); S.doAct('start'); S.cars.setOn(true); S.cars.setForce(40); S.people.setOn(false); window.__ov={max:0,pairs:new Set(),samples:0}; setInterval(()=>{const L=S.cars.vecDbg().cars; window.__ov.samples++; for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){const d=Math.hypot(L[i][0]-L[j][0],L[i][1]-L[j][1]); if(d<2.4){const k=i+'-'+j; if(!window.__ov.pairs.has(k)){(window.__ov.info=window.__ov.info||[]).push([L[i],L[j],S.cars.vecDbg().nodes.map(n=>n).filter(n=>Math.hypot(n[0]-L[i][0],n[1]-L[i][1])<25)]);} window.__ov.pairs.add(k); window.__ov.max++;}}},400);}")
        for k in range(10):
            await pg.wait_for_timeout(6000)
            st=await pg.evaluate("()=>{const S=window.__SC(); const v=S.cars.vecStats(); return {n:v.n,stuck:v.stuck,slow:v.slow,off:v.off,why:v.why,ov:window.__ov.max,pairs:window.__ov.pairs.size,smp:window.__ov.samples, sl:v.stuckL}}")
            print(k,(st['stuck'],st['slow'],st['pairs'])); 
        print(await pg.evaluate('()=>JSON.stringify(window.__ov.info)')); print(errs)
        await b.close()
asyncio.run(main())
