# De stad: ringweg, rotonde, zes buurten; overzicht, elke buurt van dichtbij, mensen en auto's, loopnetwerk
import asyncio, os, json, sys
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","raatstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<title>","<meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>",1)); os.chdir(os.path.join(HERE,'out'))
VIEWS={'overzicht':(0,0,0,620,0.95,0.5),'centrum':(0,0,0,150,0.9,0.5),'winkelcentrum':(165,0,95,170,0.85,0.6),'wonen':(0,0,200,170,0.85,1.6),'openbaar':(-165,0,95,170,0.85,2.6),'park':(-185,0,0,170,0.85,3.3),'dijk':(-100,0,-173,190,0.85,4.3),'werken':(165,0,-95,170,0.85,5.7),'snelweg':(300,0,0,200,0.8,0.3)}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1280,"height":800}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)+' | '+str(getattr(e,'stack',''))[:500]))
        await pg.add_init_script("try{localStorage.setItem('raatstad-set',JSON.stringify({terr:'laag',shadow:'zacht',tv:1,res:'normaal'})); localStorage.setItem('raatstad-mensen','1'); localStorage.setItem('raatstad-keys-seen','1'); localStorage.setItem('raatstad.tod',JSON.stringify({tod:14,auto:false,speed:1}))}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        t0=await pg.evaluate("()=>performance.now()")
        await pg.evaluate("()=>window.__SC().doAct('stad')"); await pg.wait_for_timeout(4000)
        info=await pg.evaluate("()=>{const S=window.__SC(), c=S.getCells(); let n=0; for(const st of c.values()) n+=st.length; return {cells:c.size, blokken:n, modules:(c.inst||[]).length, wegen:(c.paths||[]).length, terr:Object.keys(c.terr||{}).length, mensen:S.people.agents.length, autos:S.cars.list.length}}")
        print('stad', json.dumps(info))
        d=await pg.evaluate("()=>{const S=window.__SC(), c=S.getCells(); const P=c.paths.find(p=>p.p&&p.p.length===2&&p.p[1][0]<-300); const sp=c.paths.find(p=>p.p&&p.p.length===2&&Math.abs(p.p[1][0]+167)<3&&p.p[1][1]<0); return {spaken:c.paths.filter(p=>p.p&&p.p.length===2).map(p=>[p.t,p.p[1]]), brugH:P?[S.pathH(P,-185,0),S.pathH(P,-150,0)]:null, dijkH:sp?[S.pathH(sp,-100,-173),S.pathH(sp,-60,-104),S.terrainHeightAt(-100,-173)]:null}}")
        print('hoogtes', json.dumps(d))
        near=await pg.evaluate("()=>{const S=window.__SC(), c=S.getCells(); return (c.inst||[]).map(I=>({n:I.m.name,q:I.q,r:I.r})).filter(o=>{const x=9*Math.sqrt(3)*(o.q+o.r/2), z=13.5*o.r; return Math.hypot(x+185,z)<70}).map(o=>o.n)}")
        print('bij het meer', near)
        # over de brug lopen
        await pg.evaluate("()=>document.getElementById('modeBtn').click()"); await pg.wait_for_timeout(1500)
        await pg.evaluate("()=>{const P=window.__SC().player; Object.assign(P,{x:-240,z:1.5,y:0.3,vy:0,yaw:-Math.PI/2,pitch:-0.1,grounded:true,dropping:false});}")
        await pg.keyboard.down('ShiftLeft'); await pg.keyboard.down('KeyW'); await pg.wait_for_timeout(14000); await pg.keyboard.up('KeyW'); await pg.keyboard.up('ShiftLeft')
        pl=await pg.evaluate("()=>{const P=window.__SC().player; return [+P.x.toFixed(1),+P.y.toFixed(2),+P.z.toFixed(1)]}")
        print('brug gelopen tot', pl)
        await pg.screenshot(path='stad_brug.png',timeout=300000)
        await pg.evaluate("()=>document.getElementById('modeBtn').click()"); await pg.wait_for_timeout(800)
        for name,(x,y,z,d,phi,th) in VIEWS.items():
            await pg.evaluate("([x,y,z,d,phi,th])=>{const S=window.__SC(); S.orbit.target.set(x,y,z); S.orbit.dist=d; S.orbit.phi=phi; S.orbit.theta=th; S.applyOrbit();}",[x,y,z,d,phi,th]); await pg.wait_for_timeout(1800)
            await pg.screenshot(path=f'stad_{name}.png',timeout=300000)
        # loopnetwerk: grootste component, dode stukken; mensen na 20 s
        await pg.wait_for_timeout(15000)
        r=await pg.evaluate("()=>{const S=window.__SC(), A=S.people.agents; const st={}; for(const a of A) st[a.state]=(st[a.state]||0)+1; const I=window.__INC; return {n:A.length, st, inc:I.counts, autos:S.cars.list.length}}")
        print('na 20 s', json.dumps(r))
        print('fouten:',errs[:3]); await b.close()
asyncio.run(main())
