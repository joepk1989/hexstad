# Lopen mensen door? Na de muur- en randbewaking: hoeveel mensen staan lang stil, en op welke lagen lopen ze
import asyncio, os, json, sys
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","hexstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<head>","<head><meta charset=\"utf-8\">",1)); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":800,"height":500}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'uit',tv:1,res:'snel'})); localStorage.setItem('hexstad-mensen','1')}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        for act in ['mall','sample']:
            await pg.evaluate("(a)=>{const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true; window.__SC().doAct(a)}",act); await pg.wait_for_timeout(15000)
            await pg.evaluate("()=>{window.__P0=new Map(window.__SC().people.agents.map(a=>[a,[a.x,a.z,a.t]]))}")
            await pg.wait_for_timeout(30000)
            r=await pg.evaluate("""()=>{const A=window.__SC().people.agents; let still=0, walkStill=0, lv={}; const ex=[];
              for(const a of A){const p=window.__P0.get(a); if(!p) continue; const d=Math.hypot(a.x-p[0],a.z-p[1]); window.__ST=a.t-p[2]; const L=Math.round(a.y/3); lv[L]=(lv[L]||0)+1;
                if(d<0.3*(window.__ST||1)){still++; if(a.state==='walk'){walkStill++; if(ex.length<5) ex.push([+a.x.toFixed(1),+a.y.toFixed(1),+a.z.toFixed(1),a.node&&a.node.key])}}}
              return {sim:+(window.__ST||0).toFixed(1), n:A.length, still, walkStill, lv, ex}}""")
            print(act, json.dumps(r))
        print('fouten:',errs[:3]); await b.close()
asyncio.run(main())
