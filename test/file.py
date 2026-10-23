# Filestad: laadt, telt auto's, simuleert tot er een file staat en de Hulk komt
import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","hexstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<title>","<meta charset=\"utf-8\"><title>",1)); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1000,"height":625}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
        await pg.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'zacht',tv:1,res:'normaal'})); localStorage.setItem('hexstad-mensen','0'); localStorage.setItem('hexstad-keys-seen','1'); localStorage.setItem('hexstad.tod',JSON.stringify({tod:14,auto:false,speed:1}))}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>window.__SC().doAct('file')"); await pg.wait_for_timeout(3000)
        st=await pg.evaluate("()=>{const S=window.__SC(); const C=S.getCells(); let homes=0,off=0; for(const v of C.values()) for(const t of v){ if(t.startsWith('woning')) homes++; else if(t.startsWith('kantoor')) off++; } return {cells:C.size, modules:C.inst.length, druk:C.druk, homes, off, autos:S.cars.list.length, wegen:C.paths.length}}")
        print('filestad', json.dumps(st))
        await pg.screenshot(path='file_stad.png',timeout=300000)
        # simuleren: auto's en Hulk, tot de Hulk komt (hooguit 240 s)
        r=await pg.evaluate("""()=>{const S=window.__SC(), H=window.__hulk; let t=0, firstJam=null, came=null, jamMax=0;
          while(t<240 && came===null){ S.cars.update(1/20); H.update(1/20); t+=1/20; if(Math.round(t*20)%20===0){ const J=S.cars.jams(); if(J.length){ jamMax=Math.max(jamMax,J[0].cars.length); if(firstJam===null) firstJam=+t.toFixed(0); } if(H.on) came=+t.toFixed(0); } }
          return {firstJam, came, jamMax, autos:S.cars.list.length, still:S.cars.list.filter(c=>(c.still||0)>6).length}}""")
        print('simulatie', json.dumps(r))
        await pg.evaluate("()=>{const S=window.__SC(); const st=window.__hulk.st; S.orbit.target.set(st.x,2,st.z); S.orbit.dist=40; S.orbit.phi=1.1; S.applyOrbit();}"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='file_hulk.png',timeout=300000)
        ok = r['firstJam'] is not None and r['came'] is not None and r['came'] <= 180
        print('OK' if ok else 'FOUT: geen file/Hulk binnen 3 minuten', 'fouten:', errs[:3]); await b.close()
asyncio.run(main())
