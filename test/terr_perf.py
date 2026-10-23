# Hoe snel is één boetseerstap (19 vakken) met hertekenen?
import asyncio, os
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','hexstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":800,"height":600}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{window.__SC().doAct('random');}"); await pg.wait_for_timeout(1500)
        r=await pg.evaluate("""()=>{const S=window.__SC(); const t=[]; for(let n=0;n<10;n++){ const L=[]; for(let dq=-2;dq<=2;dq++) for(let dr=-2;dr<=2;dr++) if(Math.abs(dq+dr)<=2) L.push([dq+3,dr-8,S.gH(dq+3,dr-8)+0.3]); const t0=performance.now(); S.terrSet(L); S.terrFlush(); t.push(performance.now()-t0);} return [t.map(x=>x.toFixed(1))]}""")
        print("ms per stap:", r, errs[:3]); await b.close()
asyncio.run(main())
