# De stad: ringweg, rotonde, zes buurten; overzicht, elke buurt van dichtbij, mensen en auto's, loopnetwerk
import asyncio, os, json, sys
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","hexstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<title>","<meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>",1)); os.chdir(os.path.join(HERE,'out'))
VIEWS={'overzicht':(0,0,0,620,0.95,0.5),'centrum':(0,0,0,150,0.9,0.5),'winkelcentrum':(165,0,95,170,0.85,0.6),'wonen':(0,0,200,170,0.85,1.6),'openbaar':(-165,0,95,170,0.85,2.6),'park':(-165,0,-95,170,0.85,3.7),'dijk':(0,0,-200,170,0.85,4.7),'werken':(165,0,-95,170,0.85,5.7),'snelweg':(300,0,0,200,0.8,0.3)}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1280,"height":800}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'zacht',tv:1,res:'normaal'})); localStorage.setItem('hexstad-mensen','1'); localStorage.setItem('hexstad-keys-seen','1'); localStorage.setItem('hexstad.tod',JSON.stringify({tod:14,auto:false,speed:1}))}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        t0=await pg.evaluate("()=>performance.now()")
        await pg.evaluate("()=>window.__SC().doAct('stad')"); await pg.wait_for_timeout(4000)
        info=await pg.evaluate("()=>{const S=window.__SC(), c=S.getCells(); let n=0; for(const st of c.values()) n+=st.length; return {cells:c.size, blokken:n, modules:(c.inst||[]).length, wegen:(c.paths||[]).length, terr:Object.keys(c.terr||{}).length, mensen:S.people.agents.length, autos:S.cars.list.length}}")
        print('stad', json.dumps(info))
        for name,(x,y,z,d,phi,th) in VIEWS.items():
            await pg.evaluate("([x,y,z,d,phi,th])=>{const S=window.__SC(); S.orbit.target.set(x,y,z); S.orbit.dist=d; S.orbit.phi=phi; S.orbit.theta=th; S.applyOrbit();}",[x,y,z,d,phi,th]); await pg.wait_for_timeout(1800)
            await pg.screenshot(path=f'stad_{name}.png',timeout=300000)
        # loopnetwerk: grootste component, dode stukken; mensen na 20 s
        await pg.wait_for_timeout(15000)
        r=await pg.evaluate("()=>{const S=window.__SC(), A=S.people.agents; const st={}; for(const a of A) st[a.state]=(st[a.state]||0)+1; const I=window.__INC; return {n:A.length, st, inc:I.counts, autos:S.cars.list.length}}")
        print('na 20 s', json.dumps(r))
        print('fouten:',errs[:3]); await b.close()
asyncio.run(main())
