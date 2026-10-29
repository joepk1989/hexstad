# Weer: elk weertype in de voorbeeldstad (bouwen) en in het winkelcentrum (lopen), shaderfouten, nat en sneeuw
import asyncio, os, json, sys
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","raatstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<head>","<head><meta charset=\"utf-8\">",1)); os.chdir(os.path.join(HERE,'out'))
WHICH=sys.argv[1:] or ['zon','bewolkt','regen','onweer','mist','sneeuw']
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1000,"height":640}); errs=[]; cons=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: cons.append(m.text) if m.type in ('error','warning') else None)
        await pg.add_init_script("try{localStorage.setItem('raatstad-set',JSON.stringify({terr:'laag',shadow:'zacht',tv:1,res:'normaal'})); localStorage.setItem('raatstad-mensen','1'); localStorage.setItem('raatstad.tod',JSON.stringify({tod:13,auto:false,speed:1}))}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true; window.__SC().doAct('sample')}"); await pg.wait_for_timeout(3000)
        for w in WHICH:
            await pg.evaluate("(w)=>{const S=window.__SC(); S.orbit.target.set(0,0,0); S.orbit.dist=150; S.orbit.phi=0.95; S.orbit.theta=0.7; S.applyOrbit(); window.__WX.snap(w, w==='regen'||w==='onweer'?1:0, w==='sneeuw'?1:0)}", w); await pg.wait_for_timeout(2500)
            d=await pg.evaluate("()=>window.__WX.debug()"); print(w, json.dumps(d))
            await pg.screenshot(path=f'weer_{w}.png',timeout=300000)
        # lopen in het winkelcentrum bij regen en sneeuw: onder de galerij droog
        await pg.evaluate("()=>{window.__SC().doAct('mall')}"); await pg.wait_for_timeout(3500)
        for w in ['regen','sneeuw']:
            await pg.evaluate("(w)=>{window.__WX.snap(w, w==='regen'?1:0, w==='sneeuw'?1:0); const S=window.__SC(); S.orbit.target.set(0,3,-20); S.orbit.dist=45; S.orbit.phi=1.15; S.orbit.theta=2.2; S.applyOrbit();}", w); await pg.wait_for_timeout(2500)
            await pg.screenshot(path=f'weer_mall_{w}.png',timeout=300000)
        sw=await pg.evaluate("()=>{const W=window.__WX; window.__DN.st.auto=true; window.__DN.st.speed=1; W.set('wissel'); const seen={}; for(let i=0;i<1500;i++){ W.update(0.5); seen[W.now]=(seen[W.now]||0)+1;} const d=W.debug(); W.set('zon'); return {seen, d}}")
        print('wisselend:', json.dumps(sw)[:400])
        await pg.evaluate("()=>{document.getElementById('menuBtn').click(); const b=[...document.querySelectorAll('#menuSheet button, .sheet button')].find(x=>/Instellingen/.test(x.textContent)); if(b) b.click()}"); await pg.wait_for_timeout(800)
        await pg.screenshot(path='weer_instellingen.png',timeout=300000)
        print('console:', [c[:300] for c in cons if 'shader' in c.lower() or 'error' in c.lower()][:5])
        print('fouten:',errs[:3]); await b.close()
asyncio.run(main())
