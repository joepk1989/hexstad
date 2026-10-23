import asyncio, os
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','hexstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.makedirs(os.path.join(HERE,'out'),exist_ok=True); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        ctx=await b.new_context(viewport={"width":900,"height":600}); pg=await ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>window.__SC().doAct('sample')"); await pg.wait_for_timeout(1500)
        await pg.evaluate("()=>{document.querySelectorAll('.pal-tab')[5].click(); const cs=[...document.querySelectorAll('.modcard')]; cs.find(x=>x.title.startsWith('Villa met tuin')).click(); window.__SC().place(5,5); cs.find(x=>x.title.startsWith('Blok')).click(); window.__SC().place(7,7);}")
        await pg.wait_for_timeout(500)
        await pg.evaluate("()=>window.__SC().doAct('adopt')"); await pg.wait_for_timeout(500)
        st=await pg.evaluate("()=>({cells:window.__SC().getCells().size, inst:(window.__SC().getCells().inst||[]).length, ls:Object.keys(localStorage)})"); print('voor reload',st, errs)
        await pg.reload(); await pg.wait_for_timeout(4000)
        st=await pg.evaluate("()=>({cells:window.__SC().getCells().size, inst:(window.__SC().getCells().inst||[]).length, mods:window.__mods.length, txt:document.getElementById('stats').textContent})"); print('na reload',st, errs)
        await pg.screenshot(path='reload.png')
        await b.close()
asyncio.run(main())
