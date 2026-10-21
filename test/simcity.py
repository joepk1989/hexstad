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
        for act in sys.argv[1:]:
            await pg.evaluate(f"()=>{{document.querySelector('[data-act={act}]').click(); const S=window.__SC(); S.orbit.dist=250; S.orbit.phi=1.3; S.applyOrbit(); S.cars.setOn(true); S.cars.setForce({sys.argv[1]=='sample' and 8 or 40}); S.people.setOn(true);}}"); await pg.wait_for_timeout(1500)
            for k in range(8):
                await pg.wait_for_timeout(5000)
                st=await pg.evaluate("()=>{const S=window.__SC(); return {c:S.cars.vecStats(), p:S.people.vecStats()}}")
                cl=await pg.evaluate("()=>{const L=window.__SC().cars.crashLog; const c=L.slice(); L.length=0; return c;}")
                print(act,k,st['c'],st['p'],errs[:2]); fl=await pg.evaluate("()=>window.__SC().people.agents.filter(a=>a.state==='rag').map(a=>[+a.x.toFixed(1),+a.z.toFixed(1),+a.y.toFixed(2),a.node&&a.node.key,a.ragWhy||''])"); print('  fallen',fl) if fl else None; [print('  CRASH',c) for c in cl]
        await b.close()
asyncio.run(main())
