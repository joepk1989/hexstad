import asyncio, json
from playwright.async_api import async_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','raatstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.makedirs(os.path.join(HERE,'out'),exist_ok=True); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":900,"height":560}); await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>window.__SC().doAct('ring')"); await pg.wait_for_timeout(4000)
        await pg.evaluate("()=>{const S=window.__SC(); S.renderer.render=()=>{}; S.cars.setOn(true); S.people.setOn(true); document.querySelectorAll('.pal-tab')[2].click(); document.getElementById('tool-woning').click();}")
        await pg.wait_for_timeout(5000)
        cdp=await pg.context.new_cdp_session(pg); await cdp.send('Profiler.enable'); await cdp.send('Profiler.start')
        await pg.evaluate("()=>window.__SC().place(40,40)"); await pg.wait_for_timeout(6000)
        prof=(await cdp.send('Profiler.stop'))['profile']
        nodes={n['id']:n for n in prof['nodes']}; self={}
        dt=prof['timeDeltas']; 
        for s,d in zip(prof['samples'],dt): self[s]=self.get(s,0)+d
        agg={}
        for i,t in self.items():
            cf=nodes[i]['callFrame']; k=f"{cf['functionName'] or '(anon)'}:{cf['lineNumber']}"; agg[k]=agg.get(k,0)+t
        for k,v in sorted(agg.items(),key=lambda x:-x[1])[:14]: print(round(v/1000),'ms',k)
        await b.close()
asyncio.run(main())
