# Moderne gevels: een toren met per verdieping een ander gevelmateriaal (kamer-gereedschap), plus vloeren
import asyncio, os
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','hexstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1200,"height":800}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>window.__SC().openSchets()"); await pg.wait_for_timeout(1500)
        await pg.evaluate("()=>document.getElementById('mm_bNew').click()"); await pg.wait_for_timeout(500)
        box=await pg.evaluate("()=>{const r=document.getElementById('mm_cv').getBoundingClientRect(); return [r.left+r.width/2, r.top+r.height/2]}")
        mats=['panel','slats','curtain','corten','darkbrick','concrete','plaster']
        floors=['parquet','polished','stonetile','parquet','polished','stonetile','parquet']
        for i,(wm,fm) in enumerate(zip(mats,floors)):
            await pg.evaluate("([w,f])=>{const E=window.__MME; E.wmat=w; E.fmat=f;}",[wm,fm])
            await pg.keyboard.press('g'); await pg.mouse.click(box[0], box[1]); await pg.wait_for_timeout(300)
            await pg.keyboard.press('m'); await pg.mouse.click(box[0], box[1]); await pg.wait_for_timeout(300)
            if i < len(mats)-1: await pg.evaluate("()=>document.getElementById('mm_lvUp').click()"); await pg.wait_for_timeout(300)
        await pg.evaluate("()=>{const E=window.__MME; E.upto=false; E.ph=1.2; E.th=0.4; E.view.s*=0.55; E.lv=2;}")
        await pg.evaluate("()=>document.getElementById('mm_lvDn').click()"); await pg.wait_for_timeout(2500)
        print(await pg.evaluate("()=>window.__MME.m.lv.map(L=>[Object.keys(L.w).length, Object.keys(L.f).length])"))
        await pg.screenshot(path='mm_gevels.png', timeout=90000)
        print('fouten:',errs[:5]); await b.close()
asyncio.run(main())
