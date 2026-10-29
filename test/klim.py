# Zelf de oprit en de galerijtrappen op: stap voor stap met vloerhoogte en botsing, zoals de speler loopt
import asyncio, os, json, math
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","raatstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<head>","<head><meta charset=\"utf-8\">",1)); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":700,"height":500}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script("try{localStorage.setItem('raatstad-set',JSON.stringify({terr:'laag',shadow:'uit',tv:1,res:'snel'})); localStorage.setItem('raatstad-mensen','0')}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{window.__SC().doAct('mall')}"); await pg.wait_for_timeout(4000)
        await pg.evaluate("()=>{window.__SC().people.setOn(true)}"); await pg.wait_for_timeout(2000)
        r=await pg.evaluate("""()=>{const S=window.__SC(), G=S.people.graph(), D=window.__modDbg(); const res=[];
          // elke trap: van de onderste knoop naar de bovenste, en het stuk ervoor/erna
          const lows=[...G.values()].filter(n=>n.kind.stair==='low');
          for(const lo of lows){ const hi=[...lo.edges.values()].find(e=>e.climb).to; const nb=[...lo.edges.values()].find(e=>!e.climb); const nb2=[...hi.edges.values()].find(e=>!e.climb);
            const pts=[]; if(nb){ pts.push([nb.to.x,nb.to.z]); const back=[...nb.to.edges.values()].find(e=>e.to===lo); if(back&&back.via) pts.push(...back.via); } pts.push([lo.x,lo.z],[hi.x,hi.z]); if(nb2){ if(nb2.via) pts.push(...nb2.via); pts.push([nb2.to.x,nb2.to.z]); }
            let feet=lo.y-0.0, x=pts[0][0], z=pts[0][1]; feet=D.floorAt(x,z,(nb?nb.to.y:lo.y)+0.3); let ok=true, why=null, maxY=feet;
            for(let i=0;i<pts.length-1;i++){ const [ax,az]=pts[i],[bx,bz]=pts[i+1], L=Math.hypot(bx-ax,bz-az), n=Math.max(1,Math.ceil(L/0.15)); for(let j=1;j<=n;j++){ const nx=ax+(bx-ax)*j/n, nz=az+(bz-az)*j/n; if(D.blockedAt(nx,nz,feet)){ ok=false; why={at:[+nx.toFixed(1),+nz.toFixed(1),+feet.toFixed(2)], w:D.whyBlocked(nx,nz,feet)}; break;} const f=D.floorAt(nx,nz,feet); if(feet-f>0.8){ ok=false; why={val:[+nx.toFixed(1),+nz.toFixed(1),+feet.toFixed(2),+f.toFixed(2)]}; break;} feet=f; maxY=Math.max(maxY,feet);} if(!ok) break; }
            res.push({trap:lo.key, van:+lo.y.toFixed(1), naar:+hi.y.toFixed(1), ok, eind:+feet.toFixed(2), why}); }
          return res}""")
        for x in r: print(json.dumps(x)[:400])
        print('fouten:',errs[:3]); await b.close()
asyncio.run(main())
