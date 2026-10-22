import asyncio, os
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','hexstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.makedirs(os.path.join(HERE,'out'),exist_ok=True); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
import random
random.seed(3)
cells={}
def hd(q,r): return max(abs(q),abs(r),abs(-q-r))
for q in range(-7,8):
    for r in range(-7,8):
        d=hd(q,r); n=5-d+(1 if (q*7+r*3)%5==0 else 0)
        if d>=3 and (q+2*r)%4==0: n-=1
        if n>0: cells[f"{q},{r}"]=['heuvel']*n
for q,r in [(-9,2),(-9,3),(-8,3),(-10,3)]: cells[f"{q},{r}"]=['heuvel']
paths=[{'t':'weg','l':0,'r':0,'p':[[-130,-20],[130,-20]]}]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":900,"height":700}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{document.querySelector('[data-act=empty]').click(); const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true;}"); await pg.wait_for_timeout(300)
        await pg.evaluate("([c,P])=>{const S=window.__SC(); S.setCells(c); const m=S.getCells(); m.paths=P; S.buildPathNet();}",[cells,paths])
        for name,t,phi,dist,th in [('mooi_laag',[-40,4,40],1.15,120,2.6),('mooi_boven',[0,0,0],0.8,230,0.4),('mooi_dicht',[-80,2,30],1.0,70,2.2)]:
            await pg.evaluate("([t,phi,dist,th])=>{const S=window.__SC(); S.orbit.target.set(t[0],t[1],t[2]); S.orbit.phi=phi; S.orbit.dist=dist; S.orbit.theta=th; S.applyOrbit();}",[t,phi,dist,th])
            await pg.wait_for_timeout(3000); await pg.screenshot(path=name+'.png')
        print(errs[:3]); await b.close()
asyncio.run(main())
