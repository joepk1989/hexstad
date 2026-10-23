# Wegvormen bekijken: graaf (knopen/takken) en schermafbeeldingen van boven en schuin. python wegen_beeld.py lus P acht ...
import asyncio, os, sys, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','hexstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
def C(q,r): return [round(9*3**0.5*(q+r/2),2), round(13.5*r,2)]
SC={
 'lus':  [{'t':'weg','p':[C(0,0),C(4,0),C(0,4),C(0,0)]}],
 'P':    [{'t':'weg','p':[C(0,-4),C(0,0),C(4,0),C(4,-4),C(0,-2)]}],
 'acht': [{'t':'weg','p':[C(-3,0),C(3,0),C(3,-3),C(0,-3),C(0,3),C(-3,3),C(-3,0)]}],
 'blok': [{'t':'weg','p':[C(-3,0),C(3,0)]},{'t':'weg','p':[C(3,0),C(3,-4)]},{'t':'weg','p':[C(3,-4),C(-1,-4)]},{'t':'weg','p':[C(-1,-4),C(-3,0)]}],
 'rot':  [{'t':'rot','p':[C(0,0)]},{'t':'weg','p':[C(0,0),C(6,0)]},{'t':'weg','p':[C(0,0),C(-6,0)]},{'t':'weg','p':[C(0,0),C(0,5)]},{'t':'brd','p':[C(0,0),C(3,-6)]}],
 'snel': [{'t':'snel','p':[C(-8,0),C(8,0)]},{'t':'weg','p':[C(-2,0),C(-2,5)]}],
 'snelx':[{'t':'snel','p':[C(-10,0),C(10,0)]},{'t':'weg','p':[C(-1,-7),C(-1,7)]},{'t':'brd','p':[C(8,-7),C(5,7)]}],
 'klinker':[{'t':'klink','p':[C(-5,0),C(5,0)]},{'t':'klink','p':[C(0,0),C(0,4)]},{'t':'fiets','p':[C(-5,2),C(5,-2)]}],
 'kruis':[{'t':'weg','p':[C(-5,0),C(5,0)]},{'t':'weg','p':[C(0,-5),C(0,5)]},{'t':'brd','p':[C(-5,3),C(5,3)]}],
}
for k in SC:
    for p in SC[k]: p.setdefault('l',0); p.setdefault('r',0)
async def main():
    names=sys.argv[1:] or list(SC)
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":900,"height":700}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{window.__SC().doAct('empty'); const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true; document.getElementById('palette').style.display='none'; for (const id of ['optBar','hud']) { const e=document.getElementById(id); if(e) e.style.display='none'; } }")
        for name in names:
            await pg.evaluate("(P)=>{const S=window.__SC(), c=S.getCells(); c.paths=JSON.parse(JSON.stringify(P)); S.buildPathNet(); S.cars.setOn(true); S.cars.setForce(10);}", SC[name])
            g=await pg.evaluate("()=>{const d=window.__SC().cars.vecGraph(); return {nodes:d.nodes.map(n=>[Math.round(n.x),Math.round(n.z),n.edges.length]), edges:[...d.edges.values()].map(e=>[e.t,e.a,e.b,Math.round(e.len)])}}")
            print(name, json.dumps(g))
            pts=[q for pth in SC[name] for q in pth['p']]; cx=sum(q[0] for q in pts)/len(pts); cz=sum(q[1] for q in pts)/len(pts)
            for v,phi,d in ([('boven',0.25,170),('schuin',0.9,120)] + ([('dicht',0.75,45),('laag',1.3,60)] if os.environ.get('DICHT') else [])):
                await pg.evaluate("([x,z,phi,d])=>{const S=window.__SC(); S.orbit.target.set(x,0,z); S.orbit.phi=phi; S.orbit.dist=d; S.orbit.theta=0.4; S.applyOrbit();}",[cx,cz,phi,d])
                await pg.wait_for_timeout(1800); await pg.screenshot(path=f'weg_{name}_{v}.png')
            if len(sys.argv)>1 and '--sim' in os.environ.get('SIM',''): pass
        await pg.wait_for_timeout(8000)
        st=await pg.evaluate("()=>window.__SC().cars.vecStats()")
        print('auto-stat (laatste)', json.dumps(st))
        print('fouten:',errs[:5]); await b.close()
asyncio.run(main())
