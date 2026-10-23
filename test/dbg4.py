import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","hexstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<head>","<head><meta charset=\"utf-8\">",1)); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":900,"height":600}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'uit',tv:1}))}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{window.__SC().doAct('mall')}"); await pg.wait_for_timeout(4000)
        await pg.evaluate("()=>{const S=window.__SC(), c=S.getCells(); c.paths=[{t:'weg',p:[[-90,-56],[90,-56]]}]; S.buildPathNet(); S.people.setOn(true);}"); await pg.wait_for_timeout(2500)
        r=await pg.evaluate("""()=>{const S=window.__SC(), G=S.people.graph(); const seen=new Set(); const comps=[]; for(const n of G.values()){ if(seen.has(n.key)) continue; const st=[n]; seen.add(n.key); const lv={}; let c=0, st2=0; while(st.length){ const x=st.pop(); c++; const l=x.lvW!==undefined?x.lvW:(x.kind.b==='vec'?'vec':'hex'); lv[l]=(lv[l]||0)+1; if(x.kind.stair) st2++; for(const e of x.edges.values()) if(!seen.has(e.to.key)){ seen.add(e.to.key); st.push(e.to);} } comps.push({c,lv,stairs:st2}); } comps.sort((a,b)=>b.c-a.c);
          const st=[...G.values()].filter(n=>n.kind.stair).map(n=>({k:n.key, lvW:n.lvW, s:n.kind.stair, x:+n.x.toFixed(1), z:+n.z.toFixed(1), e:[...n.edges.values()].map(e=>e.to.key)}));
          return {comps:comps.slice(0,6), st}}""")
        print(json.dumps(r)); print(errs[:3]); await b.close()
asyncio.run(main())
