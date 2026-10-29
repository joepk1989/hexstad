# Filestad: laadt, telt auto's, simuleert tot er een file staat en de Hulk komt
import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","raatstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<title>","<meta charset=\"utf-8\"><title>",1)); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1000,"height":625}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
        await pg.add_init_script("try{localStorage.setItem('raatstad-set',JSON.stringify({terr:'laag',shadow:'zacht',tv:1,res:'normaal'})); localStorage.setItem('raatstad-mensen','0'); localStorage.setItem('raatstad-keys-seen','1'); localStorage.setItem('raatstad.tod',JSON.stringify({tod:14,auto:false,speed:1}))}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>window.__SC().doAct('start')"); await pg.wait_for_timeout(3000)
        r=await pg.evaluate("""()=>{const S=window.__SC(); const o={}; o.sec=JSON.stringify(S.getCells().sec||null).slice(0,200); o.n=Object.keys(S.getCells().sec||{}).length; const s=null; o.ser=s?(JSON.parse(s).__s?Object.keys(JSON.parse(s).__s).length:0):'nofn'; S.orbit.target.set(-40,0,30); S.orbit.phi=0.9; S.orbit.dist=90; document.getElementById('welcomeSheet').hidden=true; S.applyOrbit(); return o}""")
        print(r); await pg.wait_for_timeout(2500)
        await pg.screenshot(path='/tmp/claude-0/-home-claude/a9c426b4-318e-5e8e-b268-3cfa354d5acb/scratchpad/sec1.png')
        print(errs)
        await b.close()
asyncio.run(main())
