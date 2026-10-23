# Weer tijdens het lopen: regen buiten en onder een dak in het winkelcentrum, natte straat, paraplu's
import asyncio, os, json, sys
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","hexstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<head>","<head><meta charset=\"utf-8\">",1)); os.chdir(os.path.join(HERE,'out'))
SPOTS={'straat':(30,0,-62,3.14),'hal':(0,0,0,0.5),'galerij':(-14,3,-20,2.0)}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1000,"height":640}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'zacht',tv:1,res:'normaal'})); localStorage.setItem('hexstad-mensen','1'); localStorage.setItem('hexstad.tod',JSON.stringify({tod:13,auto:false,speed:1}))}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true; document.getElementById('menuBtn').click(); document.querySelector('[data-act=mall]').click()}"); await pg.wait_for_timeout(3000)
        await pg.evaluate("()=>{const S=window.__SC(), c=S.getCells(); c.paths=[{t:'weg',p:[[-90,-56],[90,-56]]}]; S.buildPathNet(); window.__WX.snap('regen',1,0)}"); await pg.wait_for_timeout(1500)
        await pg.evaluate("()=>{const P=window.__SC().people; for(let i=0;i<200;i++) P.update(1/30)}")
        await pg.evaluate("()=>document.getElementById('modeBtn').click()"); await pg.wait_for_timeout(3000)
        for name,(x,y,z,yaw) in SPOTS.items():
            await pg.evaluate("([x,y,z,yaw])=>{const P=window.__SC().player; Object.assign(P,{x,z,y:y+0.05,vy:0,yaw,pitch:-0.05,grounded:true,dropping:false});}",[x,y,z,yaw]); await pg.wait_for_timeout(2500)
            u=await pg.evaluate("()=>{const A=window.__SC().people.agents; return {umb:A.filter(a=>a.umb).length, n:A.length}}")
            print(name, u); await pg.screenshot(path=f'weer_lopen_{name}.png',timeout=300000)
        print('fouten:',errs[:3]); await b.close()
asyncio.run(main())
