# Module maker: het raster moet het hele gebied vullen (geen ontbrekende driehoeken), bij 1 en 7 vakken
import asyncio, os
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','hexstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1000,"height":750}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{const S=window.__SC(); S.openSchets();}"); await pg.wait_for_timeout(1200)
        await pg.keyboard.press('2'); await pg.wait_for_timeout(400)
        for k in ['0','1']:
            await pg.evaluate("k=>{const e=document.getElementById('mm_area'); e.value=k; e.dispatchEvent(new Event('change'));}", k); await pg.wait_for_timeout(800)
            import base64
            d=await pg.evaluate("()=>document.getElementById('mm_cv').toDataURL('image/png')")
            open(f'mm_raster_{k}.png','wb').write(base64.b64decode(d.split(',')[1]))
        print('fouten:',errs[:3]); await b.close()
asyncio.run(main())
