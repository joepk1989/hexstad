# Lucht en wolken: schermafbeeldingen op een paar tijden van de dag (test/out/lucht_*.png)
import asyncio, os
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','hexstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.makedirs(os.path.join(HERE,'out'),exist_ok=True); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1000,"height":620}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        print('start:',errs[:3])
        await pg.evaluate("()=>{window.__SC().doAct('random'); const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true;}"); await pg.wait_for_timeout(1500)
        for tod in [7, 12, 18.8, 20.2, 23]:
            await pg.evaluate("t=>{const S=window.__SC(); S.orbit.phi=1.42; S.orbit.dist=90; S.applyOrbit(); S.camera.position.set(0,60,0); S.camera.lookAt(800,190,-300); window.__DN.set(t);}",tod)
            await pg.wait_for_timeout(1500); await pg.screenshot(path=f'lucht_{tod}.png')
        print('fouten:',errs[:3]); await b.close()
asyncio.run(main())
