import asyncio, os, json, math
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","raatstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<head>","<head><meta charset=\"utf-8\">",1)); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":900,"height":600}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script("try{localStorage.setItem('raatstad-set',JSON.stringify({terr:'laag',shadow:'zacht',tv:1})); localStorage.setItem('raatstad-mensen','0')}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true; window.__SC().doAct('mall')}"); await pg.wait_for_timeout(5000)
        # midden van de trap: lokaal (3.9,-6.75) in vak van 'trap · breed'
        c=await pg.evaluate("()=>{const I=window.__SC().getCells().inst.find(I=>/^Winkelcentrum · trap( · \d+L)?$/.test(I.m.name)); return [9*Math.sqrt(3)*(I.q+I.r/2)+3.9, 13.5*I.r-6.75]}")
        for i,(th,ph,d) in enumerate([(-2.2,1.0,22),(0.9,1.0,22),(2.5,1.3,18),(-0.6,1.25,18)]):
            await pg.evaluate("([x,z,th,ph,d])=>{const S=window.__SC(); S.orbit.target.set(x,4.5,z); S.orbit.phi=ph; S.orbit.dist=d; S.orbit.theta=th; S.applyOrbit();}",[c[0],c[1],th,ph,d]); await pg.wait_for_timeout(2500)
            await pg.screenshot(path='breed_%d.png'%i,timeout=300000)
        print(c, errs[:3]); await b.close()
asyncio.run(main())
