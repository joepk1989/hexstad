# Elke Winkelcentrum-module apart bekijken (dichtbij), plus stapelen: winkel + galerij erop
import asyncio, os, json, sys
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","hexstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<head>","<head><meta charset=\"utf-8\">",1)); os.chdir(os.path.join(HERE,'out'))
NAMES=sys.argv[1:] or ['oprit','galerij · trap','doorgang','café · half','winkel · afgesneden','dakpaviljoen','galerij','winkel']
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":900,"height":620}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'uit',tv:1}))}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true; window.__SC().doAct('empty')}"); await pg.wait_for_timeout(800)
        for nm in NAMES:
            r=await pg.evaluate("""(nm)=>{const S=window.__SC(); const m=window.__mods.find(x=>x.name.startsWith('Winkelcentrum · '+nm)&&x.name.replace(/( · \\d+[Lv])+$/,'')==='Winkelcentrum · '+nm); if(!m) return 'niet gevonden';
              const c=new Map(); c.inst=[{mid:m.id,m:JSON.parse(JSON.stringify(m)),q:0,r:0,rot:0}]; if(nm==='winkel'){ const g=window.__mods.find(x=>x.name==='Winkelcentrum · galerij'); c.inst.push({mid:g.id,m:JSON.parse(JSON.stringify(g)),q:0,r:0,rot:0,lv:1}); }
              S.setCells({}, c.inst); 
              return 'ok'}""", nm)
            await pg.evaluate("()=>{const S=window.__SC(); S.orbit.target.set(0,2,0); S.orbit.phi=1.05; S.orbit.dist=38; S.orbit.theta=0.7; S.applyOrbit();}"); await pg.wait_for_timeout(2500)
            n=await pg.evaluate("()=>{const S=window.__SC(); return [S.getCells().inst?S.getCells().inst.length:0, S.scene.children.filter(o=>o.userData&&o.userData.inst).length]}")
            print(nm, r, n)
            await pg.screenshot(path='wc_'+nm.replace(' · ','_').replace(' ','_')+'.png', timeout=300000)
        print('fouten:',errs[:3]); await b.close()
asyncio.run(main())
