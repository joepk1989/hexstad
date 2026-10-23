import asyncio, os, json, math
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","hexstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<head>","<head><meta charset=\"utf-8\">",1)); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":900,"height":600}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'zacht',tv:1})); localStorage.setItem('hexstad-mensen','0')}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true; window.__SC().doAct('mall')}"); await pg.wait_for_timeout(5000)
        # midden van de trap: lokaal (3.9,-6.75) in vak van 'trap · breed'
        c=await pg.evaluate("()=>{const L=window.__SC().getCells().inst.filter(I=>/^Winkelcentrum · trap( · \\d+L)?$/.test(I.m.name)); const P=L.map(I=>[9*Math.sqrt(3)*(I.q+I.r/2), 13.5*I.r]); return [(P[0][0]+P[1][0])/2,(P[0][1]+P[1][1])/2, L.length]}")
        await pg.evaluate("()=>{const S=window.__SC(); for(const o of S.scene.children) if(o.userData&&o.userData.inst&&(o.userData.inst.lv||0)>=3) o.visible=false;}")
        for i,(th,ph,d) in enumerate([(-1.57,0.02,40),(-2.2,0.9,26),(0.9,0.9,26),(2.6,0.7,26)]):
            await pg.evaluate("([x,z,th,ph,d])=>{const S=window.__SC(); S.orbit.target.set(x,4.5,z); S.orbit.phi=ph; S.orbit.dist=d; S.orbit.theta=th; S.applyOrbit();}",[c[0],c[1],th,ph,d]); await pg.wait_for_timeout(2500)
            await pg.screenshot(path='breed_%d.png'%i,timeout=300000)
        print(c, errs[:3]); await b.close()
asyncio.run(main())
