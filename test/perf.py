import asyncio
from playwright.async_api import async_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','hexstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.makedirs(os.path.join(HERE,'out'),exist_ok=True); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":900,"height":560}); await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>document.querySelector('[data-act=ring]').click()"); await pg.wait_for_timeout(4000)
        await pg.evaluate("()=>{const S=window.__SC(); S.cars.setOn(true); S.people.setOn(true); document.querySelectorAll('.pal-tab')[2].click(); document.getElementById('tool-woning').click();}")
        await pg.wait_for_timeout(3000)
        await pg.evaluate("()=>{window.__SC().renderer.render=()=>{}}"); await pg.wait_for_timeout(2500)
        info=await pg.evaluate("()=>({cells:window.__SC().getCells().size})"); print(info)
        for i in range(4):
            r=await pg.evaluate("""async (i)=>{const S=window.__SC(); const t0=performance.now(); S.place(40+i*3,40); const t1=performance.now();
              const fr=[]; let last=performance.now(); for(let k=0;k<6;k++){ await new Promise(r=>requestAnimationFrame(r)); const n=performance.now(); fr.push(Math.round(n-last)); last=n;} return {place:Math.round(t1-t0), frames:fr}}""",i)
            print(r)
        await b.close()
asyncio.run(main())
