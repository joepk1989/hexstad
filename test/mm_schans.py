# Module maker: schans (S) in een vak, penseel-cyclus (N) met kern en rand, glazen dak, winkelvoorwerpen; 3D-beeld
import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','raatstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.chdir(os.path.join(HERE,'out'))
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
        s=await pg.evaluate("()=>window.__MME.view.s"); m=pg.mouse
        # schans: klik links in het vak (instap aan de −x-zijde)
        await pg.keyboard.press('s'); await m.click(c[0]-6*s, c[1]); await pg.wait_for_timeout(300)
        print('trappen:', await pg.evaluate("()=>JSON.stringify(window.__MME.m.lv[0].s)"))
        # verdieping erboven: penseel → rand (ring) met glazen dak in de kern
        await pg.evaluate("()=>document.getElementById('mm_lvUp').click()"); await pg.keyboard.press('f')
        await pg.evaluate("()=>{window.__MME.brush='ring'; window.__MME.fmat='roof'}"); await m.click(c[0]+2*s, c[1]); await pg.wait_for_timeout(200)
        await pg.evaluate("()=>{window.__MME.brush='core'; window.__MME.fmat='glass'}"); await m.click(c[0]+2*s, c[1]); await pg.wait_for_timeout(200)
        f=await pg.evaluate("()=>{const F=window.__MME.m.lv[1].f; const c={}; for(const k in F) c[F[k]]=(c[F[k]]||0)+1; return c}"); print('vloer verdieping 1:', f)
        # voorwerp: stelling op de begane grond
        await pg.evaluate("()=>document.getElementById('mm_lvDn').click()"); await pg.keyboard.press('b'); await pg.evaluate("()=>{window.__MME.obj='shelf'}"); await m.click(c[0]+3*s, c[1]+4*s)
        # rechtsklik op de schans haalt hem weg? eerst 3D-beeld
        await pg.evaluate("()=>{const E=window.__MME; E.th=0.8; E.ph=0.9;}"); await pg.keyboard.press('3'); await pg.wait_for_timeout(2500)
        await pg.screenshot(path='mm_schans_3d.png', timeout=300000)
        await pg.keyboard.press('2'); await pg.keyboard.press('s'); await m.click(c[0], c[1], button='right'); await pg.wait_for_timeout(300)
        print('na rechtsklik:', await pg.evaluate("()=>window.__MME.m.lv[0].s.length"), 'voorwerpen:', await pg.evaluate("()=>window.__MME.m.lv[0].o.length"))
        print('fouten:',errs[:5]); await b.close()
asyncio.run(main())
