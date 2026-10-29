import asyncio, json, sys
from playwright.async_api import async_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','raatstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.makedirs(os.path.join(HERE,'out'),exist_ok=True); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
E=15.588
SC={
 'recht':  [{'t':'weg','p':[[-80,0],[80,0]]}],
 'kruis':  [{'t':'weg','p':[[-80,0],[80,0]]},{'t':'weg','p':[[0,-80],[0,80]]}],
 'T':      [{'t':'weg','p':[[-80,0],[80,0]]},{'t':'weg','p':[[0,0],[0,80]]}],
 'Y':      [{'t':'weg','p':[[0,0],[80,0]]},{'t':'weg','p':[[0,0],[-40,69]]},{'t':'weg','p':[[0,0],[-40,-69]]}],
 'bocht60':[{'t':'weg','p':[[-80,0],[0,0],[40,69]]}],
 'bocht120':[{'t':'weg','p':[[-80,0],[0,0],[-40,69]]}],
 'bocht90':[{'t':'weg','p':[[-80,0],[0,0],[0,80]]}],
 'laan':   [{'t':'laan','p':[[-100,0],[100,0]]},{'t':'weg','p':[[-30,0],[-30,60]]},{'t':'weg','p':[[30,-60],[30,0]]}],
 'laanX':  [{'t':'laan','p':[[-100,0],[100,0]]},{'t':'laan','p':[[0,-100],[0,100]]}],
 'breed':  [{'t':'brd','p':[[-100,0],[100,0]]},{'t':'weg','p':[[0,0],[0,70]]}],
 'bijna':  [{'t':'weg','p':[[-80,0],[80,5]]},{'t':'weg','p':[[-5,-80],[3,80]]},{'t':'weg','p':[[-60,-50],[60,55]]}],
 'raster': [{'t':'weg','p':[[-60,z],[60,z]]} for z in (-40,0,40)]+[{'t':'weg','p':[[x,-60],[x,60]]} for x in (-40,0,40)],
 'lus':    [{'t':'weg','p':[[0,0],[62.35,0],[31.18,54],[0,0]]}],
 'acht':   [{'t':'weg','p':[[-46.8,0],[46.8,0],[70.1,-40.5],[23.4,-40.5],[-23.4,40.5],[-70.1,40.5],[-46.8,0]]}],
 'rotonde':[{'t':'rot','p':[[0,0]]},{'t':'weg','p':[[0,0],[94,0]]},{'t':'weg','p':[[0,0],[-94,0]]},{'t':'weg','p':[[0,0],[39,67.5]]},{'t':'brd','p':[[0,0],[-15.6,-81]]}],
 'snelweg':[{'t':'snel','p':[[-156,0],[156,0]]},{'t':'weg','p':[[-70,-94],[39,95]]},{'t':'weg','p':[[60,0],[80,70]]}],
 'klinker':[{'t':'klink','p':[[-80,0],[80,0]]},{'t':'klink','p':[[0,0],[0,70]]},{'t':'fiets','p':[[-80,20],[80,20]]}],
 'kort':   [{'t':'weg','p':[[0,0],[20,0]]},{'t':'weg','p':[[20,0],[30,12]]},{'t':'weg','p':[[30,12],[30,40]]},{'t':'weg','p':[[0,0],[0,-40]]}],
}
# vec paths use segs with l/r 0
for k in SC:
    for p in SC[k]: p.setdefault('l',0); p.setdefault('r',0)
async def main():
    names=sys.argv[1:] or list(SC)
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":480,"height":320}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2000)
        await pg.evaluate("()=>{window.__SC().renderer.render=()=>{};}")
        await pg.evaluate("()=>{window.__SC().doAct('empty'); const S=window.__SC(); S.orbit.dist=300; S.orbit.phi=1.2; S.applyOrbit();}"); await pg.wait_for_timeout(500)
        for name in names:
            n0=len(errs)
            await pg.evaluate("(P)=>{const S=window.__SC(), c=S.getCells(); c.paths=P; S.buildPathNet(); S.cars.setOn(true); S.cars.setForce(14); S.people.setOn(true);}", SC[name])
            # houses along first path for population
            await pg.evaluate("()=>{const S=window.__SC(); document.querySelectorAll('.pal-tab')[2].click(); document.getElementById('tool-woning').click(); for(const [q,r] of [[2,2],[-3,2],[3,-3],[-2,-3]]) S.place(q,r);}")
            await pg.wait_for_timeout(600)
            stats=[]
            for k in range(10):
                await pg.wait_for_timeout(4000)
                stats.append(await pg.evaluate("()=>{const S=window.__SC(); return {c:S.cars.vecStats(), p:S.people.vecStats()}}"))
            last=stats[-1]; worst=max(s['c']['off'] for s in stats)
            cl=await pg.evaluate("()=>{const L=window.__SC().cars.crashLog; const c=L.slice(); L.length=0; return c;}")
            for c in cl: print('  CRASH', c)
            d=await pg.evaluate("()=>{const d=window.__SC().cars.vecDbg(); return [d.nodes.length,d.edges.length]}")
            print(f"{name:9s} nodes/edges {d} cars {last['c']['n']} off(max) {worst} stuck {last['c']['stuck']} nan {last['c']['nan']} crash {last['c']['crash']} slow {last['c']['slow']} why {last['c']['why']} | peds {last['p']} | errs {errs[n0:][:2]}")
            await pg.evaluate("()=>window.__SC().doAct('empty')"); await pg.wait_for_timeout(400)
        await b.close()
asyncio.run(main())
