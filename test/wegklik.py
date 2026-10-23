# Wegen klikken: knooppunt, voorbeeld bij hover, stuk weg per klik, stoppen op het knooppunt; slepen werkt nog
import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","hexstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<title>","<meta charset=\"utf-8\"><title>",1)); os.chdir(os.path.join(HERE,'out'))
W,H=1000,625
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":W,"height":H}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
        await pg.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'uit',tv:1,res:'normaal'})); localStorage.setItem('hexstad-mensen','0'); localStorage.setItem('hexstad-keys-seen','1')}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>window.__SC().doAct('empty')"); await pg.wait_for_timeout(800)
        await pg.evaluate("()=>document.getElementById('tool-vweg').click()"); await pg.wait_for_timeout(300)
        async def aim(q,r):   # camera recht boven het vak: het vak ligt in het midden van het scherm
            await pg.evaluate("([q,r])=>{const S=window.__SC(); const c=S.cellToWorld? S.cellToWorld(q,r):null; S.orbit.target.set(c.x,0,c.z); S.orbit.dist=70; S.orbit.phi=0.3; S.applyOrbit();}", [q,r]); await pg.wait_for_timeout(300)
            await pg.mouse.move(W/2, H/2); await pg.wait_for_timeout(600)
        paths=lambda: pg.evaluate("()=>window.__SC().getCells().paths.map(p=>({t:p.t,n:p.p.length}))")
        await aim(0,0); await pg.mouse.click(W/2,H/2); await pg.wait_for_timeout(500)
        s1=await paths(); print('na knooppunt', s1)
        await aim(3,0)   # hover: voorbeeld (tijdelijk pad)
        s2=await paths(); print('bij hover', s2)
        await pg.screenshot(path='wegklik_hover.png',timeout=300000)
        await pg.mouse.click(W/2,H/2); await pg.wait_for_timeout(600)
        s3=await paths(); print('na 2e klik', s3)
        await aim(3,-3); await pg.mouse.click(W/2,H/2); await pg.wait_for_timeout(600)
        s4=await paths(); print('na 3e klik (bocht)', s4)
        await pg.mouse.click(W/2,H/2); await pg.wait_for_timeout(400)   # nog eens op het knooppunt: stoppen
        s5=await paths(); print('na stop', s5)
        await pg.evaluate("()=>{const S=window.__SC(); S.orbit.target.set(20,0,-20); S.orbit.dist=140; S.orbit.phi=0.8; S.applyOrbit();}"); await pg.wait_for_timeout(1200)
        await pg.screenshot(path='wegklik_weg.png',timeout=300000)
        # slepen werkt nog: van (-3,3) naar (-3,0)
        await aim(-3,3); await pg.mouse.move(W/2,H/2); await pg.mouse.down(); await pg.wait_for_timeout(100)
        await pg.evaluate("()=>{const S=window.__SC(); const c=S.cellToWorld(-3,0); S.orbit.target.set(c.x,0,c.z); S.orbit.dist=70; S.orbit.phi=0.3; S.applyOrbit();}")
        for i in range(6): await pg.mouse.move(W/2+i, H/2+i*3); await pg.wait_for_timeout(80)
        await pg.mouse.up(); await pg.wait_for_timeout(600)
        s6=await paths(); print('na slepen', s6)
        ok = len(s1)==0 and len(s2)==1 and s3==[{'t':'weg','n':2}] and s4==[{'t':'weg','n':3}] and s5==s4 and len(s6)==2
        print('OK' if ok else 'FOUT', 'fouten:', errs[:3]); await b.close()
asyncio.run(main())
