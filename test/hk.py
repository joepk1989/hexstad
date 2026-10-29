import asyncio, os
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','raatstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.makedirs(os.path.join(HERE,'out'),exist_ok=True); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
import random
random.seed(3)
cells={}
paths=[{'t':'weg','l':0,'r':0,'p':[[-60,0],[60,0]]},{'t':'weg','l':0,'r':0,'p':[[0,-60],[0,0]]},{'t':'weg','l':0,'r':0,'p':[[30,-50],[30,50]]},{'t':'weg','l':0,'r':0,'p':[[-40,10],[-30,25],[-40,45]]},{'t':'weg','l':0,'r':0,'p':[[80,40],[80.15,40]]}]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":900,"height":700}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{window.__SC().doAct('empty'); try{localStorage.setItem('raatstad-welkom','1')}catch(e){} document.getElementById('welcomeSheet').hidden=true; const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true;}"); await pg.wait_for_timeout(300)
        await pg.evaluate("([c,P])=>{const S=window.__SC(); S.setCells(c); const m=S.getCells(); m.paths=P; S.buildPathNet();}",[cells,paths])
        for name,t,phi,dist,th in [('hk',[5,0,-6],1.15,12,2.4)]:
            await pg.evaluate("([t,phi,dist,th])=>{const S=window.__SC(); S.orbit.target.set(t[0],t[1],t[2]); S.orbit.phi=phi; S.orbit.dist=dist; S.orbit.theta=th; S.applyOrbit();}",[t,phi,dist,th])
            await pg.wait_for_timeout(2500); await pg.screenshot(path='/tmp/claude-0/-home-claude/a9c426b4-318e-5e8e-b268-3cfa354d5acb/scratchpad/'+name+'.png')
        print(errs[:3]); await b.close()
asyncio.run(main())
