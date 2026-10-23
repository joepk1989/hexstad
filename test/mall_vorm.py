# Het winkelcentrum volgens de schets: overzicht, entreehal, straat op de tweede verdieping
import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","hexstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<head>","<head><meta charset=\"utf-8\">",1)); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1100,"height":700}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'zacht',tv:1})); localStorage.setItem('hexstad-mensen','0')}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true; document.getElementById('menuBtn').click(); document.querySelector('[data-act=mall]').click()}"); await pg.wait_for_timeout(5000)
        # hal: vak (2,1)−(3,2) → verschoven (−1,−1)…(0,0)
        hx=[ (9*3**0.5*(q+r/2), 13.5*r) for q,r in [(-1,-1),(0,0)] ]
        cx=(hx[0][0]+hx[1][0])/2; cz=(hx[0][1]+hx[1][1])/2
        for name,(tx,ty,tz,th,ph,d) in {'vorm_overzicht':(cx,4,cz,-2.4,0.95,170),'vorm_hal':(cx,3,cz,-2.2,1.05,55)}.items():
            await pg.evaluate("([x,y,z,th,ph,d])=>{const S=window.__SC(); S.orbit.target.set(x,y,z); S.orbit.phi=ph; S.orbit.dist=d; S.orbit.theta=th; S.applyOrbit();}",[tx,ty,tz,th,ph,d]); await pg.wait_for_timeout(2500)
            await pg.screenshot(path=name+'.png',timeout=300000)
        await pg.evaluate("()=>{window.__SC().people.setOn(true)}"); await pg.wait_for_timeout(3000)
        await pg.evaluate("([x,z])=>{const S=window.__SC(); S.orbit.target.set(x-6,6,z+4); S.orbit.theta=-2.2; S.orbit.phi=0.9; S.orbit.dist=1; S.applyOrbit(); document.getElementById('modeBtn').click();}",[cx,cz])
        await pg.wait_for_timeout(1000)
        await pg.evaluate("([x,z])=>{const P=window.__SC().player; P.x=x; P.z=z; P.y=4; P.vy=0; P.dropping=false;}",[cx-4,cz+3])
        await pg.wait_for_timeout(3000)
        await pg.evaluate("([x,z])=>{const S=window.__SC(), P=S.player; P.yaw=Math.atan2(-(x-P.x), -(z-P.z)); P.pitch=0.05;}",[cx+8,cz-8]); await pg.wait_for_timeout(2500)
        print('speler', await pg.evaluate("()=>{const P=window.__SC().player; return [+P.x.toFixed(1),+P.y.toFixed(2),+P.z.toFixed(1)]}"))
        await pg.screenshot(path='vorm_lopen.png',timeout=300000)
        print('hal', cx, cz, 'fouten:',errs[:3]); await b.close()
asyncio.run(main())
