import asyncio
from playwright.async_api import async_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','hexstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.makedirs(os.path.join(HERE,'out'),exist_ok=True); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
paths=[{'t':'weg','l':0,'r':0,'p':[[-80,0],[80,0]]},{'t':'weg','l':0,'r':0,'p':[[0,0],[40,-69]]},{'t':'laan','l':0,'r':3,'p':[[-30,0],[-30,90]]},{'t':'weg','l':0,'r':0,'p':[[40,0],[40,50],[80,60]]}]
shots=[('kruising_laag',[8,0,-4],0.25,30),('bocht',[40,0,50],0.3,30),('doodeind',[80,0,0],0.3,28),('laanberm',[-30,0,40],0.28,30),('stoep_woning',[20,0,-16],0.3,26),('laan_T',[-30,0,2],0.35,40),('laan_eind',[-30,0,90],0.4,45),('weg_eind2',[40,0,-69],0.5,26)]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":900,"height":560}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>document.querySelector('[data-act=empty]').click()"); await pg.wait_for_timeout(500)
        await pg.evaluate("(P)=>{const S=window.__SC(), c=S.getCells(); c.paths=P; S.buildPathNet(); document.querySelectorAll('.pal-tab')[2].click(); document.getElementById('tool-woning').click(); S.place(1,-1); S.place(2,-2); S.cars.setOn(true); S.cars.setForce(6); S.people.setOn(true);}", paths)
        await pg.wait_for_timeout(1500)
        for name,t,phi,dist in shots:
            await pg.evaluate("([t,phi,dist])=>{const S=window.__SC(); S.orbit.target.set(t[0],t[1],t[2]); S.orbit.phi=phi; S.orbit.dist=dist; S.orbit.theta=0.7; S.applyOrbit();}", [t,phi,dist])
            await pg.wait_for_timeout(2500); await pg.screenshot(path=f'close_{name}.png')
        print(errs[:2]); await b.close()
asyncio.run(main())
