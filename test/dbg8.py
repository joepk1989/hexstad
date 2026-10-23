import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","hexstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<head>","<head><meta charset=\"utf-8\">",1)); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":700,"height":500}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'uit',tv:1,res:'snel'}))}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{document.getElementById('menuBtn').click(); document.querySelector('[data-act=mall]').click()}"); await pg.wait_for_timeout(4000)
        await pg.evaluate("()=>{const S=window.__SC(), c=S.getCells(); c.paths=[{t:'weg',p:[[-90,-56],[90,-56]]}]; S.buildPathNet(); S.people.setOn(true); window.__falls=[]; const P=S.people; const ag=P.agents; setInterval(()=>{ for(const a of ag){ if(a.state==='rag' && !a.__logged){ a.__logged=true; window.__falls.push({why:a.ragWhy, x:+a.x.toFixed(1), y:+a.y.toFixed(2), z:+a.z.toFixed(1), node:a.node&&a.node.key, prev:a.prev&&a.prev.key, wps:a.wps&&a.wps.length}); } } }, 300);}"); 
        await pg.wait_for_timeout(40000)
        r=await pg.evaluate("()=>window.__falls"); print(json.dumps(r))
        # welke module staat op de valplek
        if r:
            f=r[0]; print(await pg.evaluate("""([x,z,y])=>{const S=window.__SC(), ins=S.getCells().inst; const [q,r]=[Math.round((Math.sqrt(3)/3*x - z/3)/9), Math.round((2/3*z)/9)]; return {cell:[q,r], mods: ins.filter(I=>Math.hypot(9*Math.sqrt(3)*(I.q+I.r/2)-x, 13.5*I.r-z)<9).map(I=>[I.m.name,I.q,I.r,I.lv||0,I.rot]), floor: window.__modDbg().floorAt(x,z,y)}}""",[f['x'],f['z'],f['y']]))
        print(errs[:3]); await b.close()
asyncio.run(main())
