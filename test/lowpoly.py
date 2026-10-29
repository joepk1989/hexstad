# Low poly terrein op het driehoeksrooster: los vak, groepje, dijk met een weg erlangs en een weg eroverheen
import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','raatstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
T=[[-8,0,4],  # los vak
   [-5,-2,4],[-4,-2,4],[-5,-1,4]]  # groepje van drie
for q in range(-3,9):
    for r in (3,4,5): T.append([q-(r//2),r,5])   # dijk, twee rijen
PATHS=[{"t":"weg","p":[[60,-30],[60,110]]},{"t":"weg","p":[[-40,22],[150,22]]}]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1100,"height":720}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script("try{localStorage.setItem('raatstad-set',JSON.stringify({terr:'laag'}))}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{window.__SC().doAct('empty'); const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true;}"); await pg.wait_for_timeout(400)
        await pg.evaluate("(T)=>{const S=window.__SC(); S.terrSet(T); S.terrFlush();}",T); await pg.wait_for_timeout(300)
        await pg.evaluate("(P)=>{const S=window.__SC(), c=S.getCells(); c.paths=JSON.parse(JSON.stringify(P)); S.buildPathNet();}",PATHS); await pg.wait_for_timeout(1500)
        r=await pg.evaluate("""()=>{const S=window.__SC(), g=(x,z)=>+S.terrGround(x,z).toFixed(2), b=(x,z)=>+S.terrainHeightAt(x,z).toFixed(2);
          const c=(q,r)=>[9*Math.sqrt(3)*(q+r/2), 13.5*r];
          const [lx,lz]=c(-8,0), [dx,dz]=c(2,3);
          return {los_midden:g(lx,lz), los_hoek:g(lx+9*Math.cos(Math.PI/6), lz+4.5), los_half:g(lx+4,lz),
            dijk_top:g(dx,dz), dijk_tussen:g(dx,dz+6.75), weg_over_dijk:[g(60,40.5),g(60,47),b(60,40.5)], weg_langs:[g(20,27),g(20,22),g(20,32)],
            chunks:[...S.tChunks.values()].filter(c=>c.mesh).length, tris:[...S.tChunks.values()].reduce((a,c)=>a+(c.mesh?c.mesh.geometry.attributes.position.count/3:0),0)}}""")
        print(json.dumps(r))
        for name,(tx,tz,th,ph,d) in {'lp_overzicht':(40,30,0.6,0.95,150),'lp_dijk':(60,45,0.0,1.15,75),'lp_dijk2':(60,40,1.57,1.2,80),'lp_los':(-80,-20,0.4,1.0,70)}.items():
            await pg.evaluate("([tx,tz,th,ph,d])=>{const S=window.__SC(); S.orbit.target.set(tx,3,tz); S.orbit.phi=ph; S.orbit.dist=d; S.orbit.theta=th; S.applyOrbit();}",[tx,tz,th,ph,d]); await pg.wait_for_timeout(1500)
            await pg.screenshot(path=name+'.png',timeout=90000)
        print('fouten:',errs[:5]); await b.close()
asyncio.run(main())
