# Module maker in 3D: standaardweergave, raster en hoogtemeter, tekenen op een verdieping, modules verwijderen
import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','hexstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1200,"height":760}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        # een standaardmodule met verdiepingen openen
        name=await pg.evaluate("()=>{const M=window.__mods; const i=M.findIndex(m=>m.v===2&&m.lv.length>=3&&(m.k||0)===0); window.__SC().openSchets(M[i]); return M[i].name}")
        print('module:', name); await pg.wait_for_timeout(2500)
        await pg.screenshot(path='mm3d_1.png', timeout=90000)
        # verdieping omhoog en een muur tekenen in 3D
        await pg.evaluate("()=>document.getElementById('mm_lvUp').click()"); await pg.wait_for_timeout(500)
        nW0=await pg.evaluate("()=>Object.keys(window.__MME.m.lv[window.__MME.lv].w).length")
        await pg.keyboard.press('w'); m=pg.mouse
        await m.move(420,380); await m.down()
        for i in range(10): await m.move(420+i*18,380+i*2); await pg.wait_for_timeout(40)
        await m.up(); await pg.wait_for_timeout(1500)
        nW1=await pg.evaluate("()=>Object.keys(window.__MME.m.lv[window.__MME.lv].w).length")
        print('muren op verdieping', await pg.evaluate("()=>window.__MME.lv"), ':', nW0, '->', nW1)
        await m.move(600,300); await pg.wait_for_timeout(800)
        await pg.screenshot(path='mm3d_2.png', timeout=90000)
        # verwijderen in de bibliotheek: twee keer klikken
        n0=await pg.evaluate("()=>document.querySelectorAll('#mm_lib .mod').length")
        r1=await pg.evaluate("()=>{const b=document.querySelectorAll('#mm_lib .mod button')[3]; b.click(); return [b.textContent, document.getElementById('mm_msg').textContent]}")
        r2=await pg.evaluate("()=>{const b=document.querySelectorAll('#mm_lib .mod button')[3]; b.click(); return [b.textContent, document.getElementById('mm_msg').textContent]}")
        print(r1, r2); await pg.wait_for_timeout(800)
        n1=await pg.evaluate("()=>document.querySelectorAll('#mm_lib .mod').length")
        print('modules', n0, '->', n1)
        print('fouten:',errs[:5]); await b.close()
asyncio.run(main())
