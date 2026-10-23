# Op ooghoogte: onderaan elke trap en de oprit, kijkend in de looprichting
import asyncio, os, json, math
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","hexstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<head>","<head><meta charset=\"utf-8\">",1)); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1000,"height":640}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'zacht',tv:1})); localStorage.setItem('hexstad-mensen','0')}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true; document.getElementById('menuBtn').click(); document.querySelector('[data-act=mall]').click()}"); await pg.wait_for_timeout(5000)
        await pg.evaluate("()=>{window.__SC().people.setOn(true)}"); await pg.wait_for_timeout(2000)
        st=await pg.evaluate("()=>{const G=window.__SC().people.graph(); return [...G.values()].filter(n=>n.kind.stair==='low').map(n=>{const h=[...n.edges.values()].find(e=>e.climb).to; return [n.x,n.z,n.y,h.x,h.z]})}")
        await pg.evaluate("()=>{window.__SC().people.setOn(false); document.getElementById('modeBtn').click()}"); await pg.wait_for_timeout(1500)
        for i,(x,z,y,hx,hz) in enumerate(st):
            ux,uz=hx-x,hz-z; L=math.hypot(ux,uz); ux/=L; uz/=L
            await pg.evaluate("([x,z,y,ux,uz])=>{const P=window.__SC().player; P.x=x-ux*3; P.z=z-uz*3; P.y=y; P.vy=0; P.dropping=false; P.yaw=Math.atan2(-ux,-uz); P.pitch=0.15; P.landT=0;}",[x,z,y,ux,uz]); await pg.wait_for_timeout(2500)
            await pg.evaluate("()=>{const P=window.__SC().player; P.pitch=0.15;}"); await pg.wait_for_timeout(800)
            await pg.screenshot(path='oog_%d.png'%i,timeout=300000)
        print(len(st),'fouten:',errs[:3]); await b.close()
asyncio.run(main())
