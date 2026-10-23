# Van bouwen naar lopen: je valt op de plek waar het midden van het bouwscherm naar kijkt
import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","hexstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<head>","<head><meta charset=\"utf-8\">",1)); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":900,"height":600}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'uit',tv:1,res:'snel'}))}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true; document.getElementById('menuBtn').click(); document.querySelector('[data-act=mall]').click()}"); await pg.wait_for_timeout(4000)
        # doelen: midden van het centrum, een dakpaviljoen, de straat ernaast
        for name,(x,y,z) in {'midden':(0,6,0),'paviljoen':(15.59,9,-27),'straat':(80,0,0)}.items():
            await pg.evaluate("([x,y,z])=>{const S=window.__SC(); S.orbit.target.set(x,y,z); S.orbit.dist=60; S.orbit.phi=0.8; S.orbit.theta=0.6; S.applyOrbit();}",[x,y,z]); await pg.wait_for_timeout(1200)
            await pg.evaluate("()=>document.getElementById('modeBtn').click()"); await pg.wait_for_timeout(300)
            st=await pg.evaluate("()=>{const P=window.__SC().player; return [+P.x.toFixed(1),+P.y.toFixed(1),+P.z.toFixed(1)]}")
            for _ in range(40):
                await pg.wait_for_timeout(1500)
                if await pg.evaluate('()=>window.__SC().player.grounded'): break
            en=await pg.evaluate("()=>{const P=window.__SC().player; return [+P.x.toFixed(1),+P.y.toFixed(2),+P.z.toFixed(1), P.grounded]}")
            print(name, 'start', st, 'geland', en)
            if name=='paviljoen': await pg.screenshot(path='vallen_paviljoen.png', timeout=300000)
            await pg.evaluate("()=>document.getElementById('modeBtn').click()"); await pg.wait_for_timeout(800)
        print('fouten:',errs[:3]); await b.close()
asyncio.run(main())
