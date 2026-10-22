# Muren onder 90°: in het bovenaanzicht een muur recht naar rechts (0°, haaks op het raster) en dan recht naar beneden (90°)
import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','hexstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1100,"height":760}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>window.__SC().openSchets()"); await pg.wait_for_timeout(1500)
        await pg.evaluate("()=>document.getElementById('mm_bNew').click()"); await pg.wait_for_timeout(400)
        await pg.keyboard.press('2'); await pg.wait_for_timeout(400)
        await pg.evaluate("()=>{const e=document.getElementById('mm_area'); e.value='1'; e.dispatchEvent(new Event('change'));}"); await pg.wait_for_timeout(500)
        c=await pg.evaluate("()=>{const r=document.getElementById('mm_cv').getBoundingClientRect(); return [r.left+r.width/2, r.top+r.height/2]}")
        m=pg.mouse
        async def drag(a,b):
            await m.move(*a); await m.down()
            for i in range(1,11): await m.move(a[0]+(b[0]-a[0])*i/10, a[1]+(b[1]-a[1])*i/10); await pg.wait_for_timeout(30)
            await m.up(); await pg.wait_for_timeout(300)
        await pg.keyboard.press('w')
        s=await pg.evaluate("()=>window.__MME.view.s")
        x0,y0=c[0]-4*s, c[1]-3*s
        await drag((x0,y0),(x0+8*s,y0))        # recht naar rechts
        await drag((x0+8*s,y0),(x0+8*s,y0+7*s))  # recht naar beneden
        await drag((x0,y0),(x0,y0+7*s))
        await drag((x0,y0+7*s),(x0+8*s,y0+7*s))
        w=await pg.evaluate("()=>Object.keys(window.__MME.m.lv[0].w)")
        print('muren', len(w), sorted(set(k.split(',')[2] for k in w)))
        await pg.screenshot(path='mm_haaks_2d.png', timeout=90000)
        await pg.keyboard.press('3'); await pg.wait_for_timeout(2500)
        await pg.screenshot(path='mm_haaks_3d.png', timeout=90000)
        print('fouten:',errs[:5]); await b.close()
asyncio.run(main())
