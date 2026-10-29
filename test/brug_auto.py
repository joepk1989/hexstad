# Auto's onder een brug door: springen ze niet op het brugdek? (weg op maaiveld, tweede weg er 5 m overheen)
import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","raatstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<title>","<meta charset=\"utf-8\"><title>",1)); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1000,"height":625}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
        await pg.add_init_script("try{localStorage.setItem('raatstad-set',JSON.stringify({terr:'laag',shadow:'uit',tv:1,res:'normaal'})); localStorage.setItem('raatstad-mensen','0'); localStorage.setItem('raatstad-keys-seen','1')}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>window.__SC().doAct('empty')"); await pg.wait_for_timeout(500)
        await pg.evaluate("""()=>{const S=window.__SC(), C=S.getCells(); C.paths=[]; C.paths.push({t:'weg',l:0,r:0,p:[[-120,0],[120,0]]}); C.paths.push({t:'weg',l:0,r:0,p:[[0,-120],[0,-40],[0,40],[0,120]], y:[0,5,5,0]}); S.buildPathNet(); S.cars.setForce(12); S.cars.update(0.05);}"""); await pg.wait_for_timeout(1500)
        r=await pg.evaluate("""()=>{const S=window.__SC(); const L=S.cars.list; let jumps=[], maxDy=0, t=0; const prev=new Map();
          for(let i=0;i<2400;i++){ S.cars.update(1/30); t+=1/30; for(const c of L){ const p=prev.get(c); if(p && !c.fly && Math.hypot(c.x-p[0],c.z-p[1])<2){ const dy=Math.abs(c.sy-p[2]); if(dy>maxDy) maxDy=dy; if(dy>1.0) jumps.push([+t.toFixed(1), c.id, +c.x.toFixed(1), +c.z.toFixed(1), +p[2].toFixed(2), +c.sy.toFixed(2)]); } prev.set(c,[c.x,c.z,c.sy]); } }
          return {n:L.length, maxDy:+maxDy.toFixed(2), jumps:jumps.slice(0,12), nJumps:jumps.length, st:S.cars.vecStats()}}""")
        print(json.dumps(r))
        await pg.evaluate("()=>{const S=window.__SC(); S.orbit.target.set(0,2,0); S.orbit.dist=60; S.orbit.phi=0.9; S.orbit.theta=0.7; S.applyOrbit();}"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='brug_auto.png',timeout=300000)
        print('OK' if r['nJumps']==0 else 'FOUT: auto springt', 'fouten:', errs[:3]); await b.close()
asyncio.run(main())
