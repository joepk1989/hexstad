import asyncio, os, json, sys
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','raatstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.makedirs(os.path.join(HERE,'out'),exist_ok=True); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
# berg: midden 5 hoog, elke ring 1 lager
cells={}
def hd(q,r): return max(abs(q),abs(r),abs(-q-r))
for q in range(-6,7):
    for r in range(-6,7):
        d=hd(q,r)
        n=5-d
        if n>0: cells[f"{q},{r}"]=['heuvel']*n
cells["0,6"]=['woning','dak']
paths=[{'t':'weg','l':0,'r':0,'p':[[-110,0],[110,0]]},{'t':'weg','l':0,'r':0,'p':[[0,-100],[0,100]]},{'t':'weg','l':0,'r':0,'p':[[-110,30],[110,30]],'y':[0,0]}]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1000,"height":640}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)+' '+(e.stack or '')[:300]))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>window.__SC().doAct('empty')"); await pg.wait_for_timeout(400)
        await pg.evaluate("([c,P])=>{const S=window.__SC(); S.setCells(c); const m=S.getCells(); m.paths=P; S.buildPathNet(); S.cars.setOn(true); S.cars.setForce(10); S.people.setOn(true);}",[cells,paths])
        await pg.wait_for_timeout(1500)
        print('cols', await pg.evaluate("()=>{const S=window.__SC(); return {roadTopMid: S.roadTop?S.roadTop(0,0,0):null}}"))
        shots=[('berg_overzicht',[0,0,0],0.85,190,0.5),('berg_weg',[25,8,0],0.6,60,0.9),('berg_kruis',[0,14,0],0.5,45,2.2)]
        for name,t,phi,dist,th in shots:
            await pg.evaluate("([t,phi,dist,th])=>{const S=window.__SC(); S.orbit.target.set(t[0],t[1],t[2]); S.orbit.phi=phi; S.orbit.dist=dist; S.orbit.theta=th; S.applyOrbit();}",[t,phi,dist,th])
            await pg.wait_for_timeout(3000); await pg.screenshot(path=name+'.png')
        await pg.evaluate("()=>{window.__SC().renderer.render=()=>{}}")
        await pg.wait_for_timeout(15000)
        st=await pg.evaluate("()=>{const S=window.__SC(); return {cars:S.cars.vecStats(), ys:S.cars.list.map(c=>[+c.x.toFixed(0),+c.z.toFixed(0),+(c.sy||0).toFixed(2)]).slice(0,10), peds:S.people.vecStats()}}")
        print(json.dumps(st))
        print(errs[:3]); await b.close()
asyncio.run(main())
