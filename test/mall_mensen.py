# Voetgangers door het winkelcentrum: knopen in modules, ingangen aan de stoep, mensen op verdiepingen en op trappen
import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','raatstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.chdir(os.path.join(HERE,'out'))
open(EMB,'w',encoding='utf-8').write(open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1))
PATHS=[{"t":"weg","p":[[-90,-56],[90,-56]]}]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1100,"height":700}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script("try{localStorage.setItem('raatstad-set',JSON.stringify({terr:'laag',shadow:'uit',tv:1}))}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true; window.__SC().doAct('mall')}"); await pg.wait_for_timeout(4000)
        await pg.evaluate("(P)=>{const S=window.__SC(), c=S.getCells(); c.paths=JSON.parse(JSON.stringify(P)); S.buildPathNet(); S.people.setOn(true);}",PATHS); await pg.wait_for_timeout(3000)
        for i in range(6):
            await pg.wait_for_timeout(4000)
            r=await pg.evaluate("""()=>{const S=window.__SC(), P=S.people; const ag=P.agents||P.list||[]; const st={}; let hi=0, mod=0, stair=0, door=0; const lv={}; for(const a of ag){ st[a.state]=(st[a.state]||0)+1; if(a.y>2.5) hi++; const L=Math.round(a.y/3); lv[L]=(lv[L]||0)+1; if(a.node&&a.node.kind.b==='mod') mod++; if(a.node&&a.node.kind.stair) stair++; if(a.node&&a.node.kind.b==='mdoor') door++; } return {n:ag.length, st, lagen:lv, inModule:mod, opTrap:stair, ingang:door, rag:ag.filter(a=>a.state==='rag').map(a=>a.ragWhy)}}""")
            print(i, json.dumps(r))
        g=await pg.evaluate("""()=>{const S=window.__SC(); const G=S.people.graph? S.people.graph(): null; if(!G) return 'geen graph'; let mod=0,md=0,st=0,e=0,viaN=0; for(const n of G.values()){ if(n.kind.b==='mod') mod++; if(n.kind.b==='mdoor') md++; if(n.kind.stair) st++; for(const x of n.edges.values()){ e++; if(x.via) viaN++; } } const md2=[...G.values()].filter(n=>n.kind.b==='mdoor'&&[...n.edges.values()].some(x=>x.vecDoor)).length; return {mod, mdoor:md, mdoorStoep:md2, trapknopen:st, edges:e, viaEdges:viaN}}""")
        print('graph:', g)
        await pg.evaluate("()=>{const S=window.__SC(); S.orbit.target.set(-20,5,-10); S.orbit.dist=42; S.orbit.phi=1.15; S.orbit.theta=2.2; S.applyOrbit();}"); await pg.wait_for_timeout(2500)
        await pg.screenshot(path='mall_mensen.png', timeout=300000)
        print('fouten:',errs[:5]); await b.close()
asyncio.run(main())
