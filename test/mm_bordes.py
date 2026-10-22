# Module maker: bordestrap tekenen (gereedschap U) in een vak, met een gat in de vloer erboven; in 3D bekijken
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
        c=await pg.evaluate("()=>{const r=document.getElementById('mm_cv').getBoundingClientRect(); return [r.left+r.width/2, r.top+r.height/2]}")
        s=await pg.evaluate("()=>window.__MME.view.s")
        m=pg.mouse
        # kamer en vloer
        await pg.keyboard.press('m'); await m.click(c[0], c[1]); await pg.keyboard.press('g'); await m.click(c[0], c[1]); await pg.wait_for_timeout(300)
        # bordestrap: van (-3, 3) naar rechts (langs x), 4,5 m
        await pg.keyboard.press('u'); x0,y0=c[0]-3*s, c[1]+3.9*s
        await m.move(x0,y0); await m.down()
        for i in range(1,11): await m.move(x0+5.2*s*i/10, y0-3*s*i/10*0.0); await pg.wait_for_timeout(30)
        await m.up(); await pg.wait_for_timeout(400)
        st=await pg.evaluate("()=>window.__MME.m.lv[0].s")
        print('trappen', json.dumps(st))
        # verdieping erboven met vloer en een gat boven de trap: vloer vullen, dan gum op de trap
        await pg.evaluate("()=>document.getElementById('mm_lvUp').click()"); await pg.keyboard.press('m'); await m.click(c[0], c[1]); await pg.keyboard.press('g'); await m.click(c[0], c[1]-3*s); await pg.wait_for_timeout(300)
        await pg.keyboard.press('f'); await pg.evaluate("()=>{window.__MME.brush='tri'}")
        for yy in [3.0,3.5,4.0,4.5,5.0]:
            for xx in [-2.5,-1.5,-0.5,0.5,1.5,2.5,3.2]:
                await m.click(c[0]+xx*s, c[1]+yy*s, button='right')
        await pg.evaluate("()=>{const E=window.__MME; E.lv=1; E.upto=true; E.th=0.5; E.ph=0.8;}")
        await pg.keyboard.press('3'); await pg.wait_for_timeout(2500)
        await pg.screenshot(path='mm_bordes_3d.png', timeout=90000)
        await pg.evaluate("()=>{const E=window.__MME; E.upto=false; document.getElementById('mm_lvDn').click(); E.th=2.2; E.ph=0.9;}"); await m.move(500,400); await m.wheel(0,-100); await pg.wait_for_timeout(2500)
        await pg.screenshot(path='mm_bordes_3d2.png', timeout=90000)
        print('fouten:',errs[:5]); await b.close()
asyncio.run(main())
