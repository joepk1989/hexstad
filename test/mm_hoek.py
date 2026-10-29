# Muren die onder een hoek aansluiten: dichtbij een hoek van een kamer (schermafbeelding mm_hoek.png)
import asyncio, os, sys
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','raatstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
out=sys.argv[1] if len(sys.argv)>1 else 'mm_hoek.png'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1100,"height":760}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>window.__SC().openSchets()"); await pg.wait_for_timeout(1500)
        await pg.evaluate("()=>document.getElementById('mm_bNew').click()"); await pg.wait_for_timeout(500)
        box=await pg.evaluate("()=>{const r=document.getElementById('mm_cv').getBoundingClientRect(); return [r.left+r.width/2, r.top+r.height/2]}")
        await pg.evaluate("()=>{window.__MME.wmat='plaster'}")
        await pg.keyboard.press('m'); await pg.mouse.click(box[0], box[1]); await pg.wait_for_timeout(300)
        # een binnenmuur onder 60 graden vanaf een hoek
        await pg.keyboard.press('w'); await pg.mouse.move(box[0], box[1]); await pg.mouse.down()
        for i in range(8): await pg.mouse.move(box[0]+i*25, box[1]-i*5); await pg.wait_for_timeout(30)
        await pg.mouse.up(); await pg.wait_for_timeout(400)
        # camera dichtbij een buitenhoek (hoek op 30 graden: x = R cos30, z = R sin30)
        await pg.evaluate("()=>{const E=window.__MME; E.view.x=7.8; E.view.z=4.5; E.view.s=90; E.th=1.1; E.ph=1.05; }"); await pg.mouse.move(500,400); await pg.mouse.wheel(0,-100); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=out, timeout=90000)
        await pg.evaluate("()=>{const E=window.__MME; E.view.x=0; E.view.z=0; E.view.s=40; E.th=0.3; E.ph=0.5;}"); await pg.mouse.wheel(0,-100); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=out.replace('.png','_boven.png'), timeout=90000)
        print('fouten:',errs[:5]); await b.close()
asyncio.run(main())
