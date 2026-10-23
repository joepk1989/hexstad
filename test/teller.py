# Ongelukjes-teller: winkelcentrum en voorbeeldstad een tijd laten lopen; tellers, laatste gebeurtenissen, knop en lijst
import asyncio, os, json, sys
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","hexstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<head>","<head><meta charset=\"utf-8\">",1)); os.chdir(os.path.join(HERE,'out'))
WAIT=int(sys.argv[1]) if len(sys.argv)>1 else 45
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1000,"height":640}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'uit',tv:1,res:'snel'})); localStorage.setItem('hexstad-mensen','1')}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        for act in ['mall','sample']:
            await pg.evaluate("(a)=>{const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true; document.getElementById('menuBtn').click(); document.querySelector('[data-act='+a+']').click()}",act); await pg.wait_for_timeout(3000)
            if act=='mall': await pg.evaluate("()=>{const S=window.__SC(), c=S.getCells(); c.paths=[{t:'weg',p:[[-90,-56],[90,-56]]}]; S.buildPathNet();}")
            await pg.evaluate("()=>window.__INC.reset()")
            await pg.wait_for_timeout(WAIT*1000)
            r=await pg.evaluate("()=>{const I=window.__INC; return {n:window.__SC().people.agents.length, counts:I.counts, laatste:I.list.slice(0,14).map(e=>[e.kind,+e.x.toFixed(1),+e.y.toFixed(1),+e.z.toFixed(1),e.detail])}}")
            print(act, json.dumps(r))
        await pg.evaluate("()=>document.getElementById('incBtn').click()"); await pg.wait_for_timeout(500)
        await pg.screenshot(path='teller.png',timeout=300000)
        print('fouten:',errs[:3]); await b.close()
asyncio.run(main())
