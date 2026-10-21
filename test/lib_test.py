import asyncio, json
from playwright.async_api import async_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','hexstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.makedirs(os.path.join(HERE,'out'),exist_ok=True); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1100,"height":700}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        r=await pg.evaluate("""()=>{const D=window.__modDbg(); const out={n:window.__mods.length, v2:window.__mods.filter(m=>m.v===2).length, bad:[], cats:{}, empty:[]};
          for(const m of window.__mods){ if(m.v!==2) continue; out.cats[m.cat]=(out.cats[m.cat]||0)+1; try{ const b=D.mv2Build(m,(x,z)=>[x,z]); let tri=0; b.group.traverse(o=>{if(o.isMesh) tri+=o.geometry.attributes.position.count/3}); if(tri<4) out.empty.push(m.name); }catch(e){ out.bad.push([m.name,e.message]); } }
          return out}""")
        print(json.dumps(r,ensure_ascii=False))
        await pg.evaluate("()=>document.querySelector('[data-act=empty]').click()"); await pg.wait_for_timeout(500)
        t0=await pg.evaluate("()=>performance.now()")
        await pg.evaluate("()=>document.querySelectorAll('.pal-tab')[5].click()"); await pg.wait_for_timeout(4000)
        n=await pg.evaluate("()=>document.querySelectorAll('.modcard').length"); print('cards',n)
        # plaats ~40 modules in een raster
        r2=await pg.evaluate("""()=>{const S=window.__SC(); const ms=window.__mods.filter(m=>m.v===2); let placed=0, fail=[]; let q=-12,r=-8; 
          for(let i=0;i<ms.length;i++){ const m=ms[i]; const k=m.k||0; const step=1+2*k+1; 
            const cs=[...document.querySelectorAll('.modcard')]; const c=cs.find(x=>x.title.startsWith(m.name)); if(!c){fail.push('nocard '+m.name); continue;} c.click();
            if(q+step>14){ q=-12; r+=4; } const ok=S.place(q+k, r); if(ok) placed++; else fail.push(m.name); q+=step; }
          return {placed, fail}}""")
        print(json.dumps(r2,ensure_ascii=False))
        await pg.evaluate("()=>{const S=window.__SC(); S.cars.setOn(false); S.people.setOn(false); S.orbit.target.set(0,0,0); S.orbit.phi=1.0; S.orbit.dist=330; S.orbit.theta=0.0; S.applyOrbit();}")
        await pg.wait_for_timeout(3000); await pg.screenshot(path='lib_all.png')
        await pg.evaluate("()=>{const S=window.__SC(); S.orbit.target.set(-80,0,-100); S.orbit.phi=0.8; S.orbit.dist=120; S.orbit.theta=0.5; S.applyOrbit();}")
        await pg.wait_for_timeout(2500); await pg.screenshot(path='lib_a.png')
        await pg.evaluate("()=>{const S=window.__SC(); S.orbit.target.set(60,0,-50); S.orbit.phi=0.8; S.orbit.dist=120; S.orbit.theta=0.5; S.applyOrbit();}")
        await pg.wait_for_timeout(2500); await pg.screenshot(path='lib_b.png')
        await pg.evaluate("()=>{const S=window.__SC(); S.orbit.target.set(0,0,40); S.orbit.phi=0.8; S.orbit.dist=120; S.orbit.theta=0.5; S.applyOrbit();}")
        await pg.wait_for_timeout(2500); await pg.screenshot(path='lib_c.png')
        print('errs',errs[:4]); await b.close()
asyncio.run(main())
