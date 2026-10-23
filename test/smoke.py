import asyncio, json
from playwright.async_api import async_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','hexstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.makedirs(os.path.join(HERE,'out'),exist_ok=True); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
TOOLS=['weg','laan','fietspad','randweg','randbreed','pad','looppad','randpad','trap','trappad','woning','kantoor','dak','park','water','kuil','heuvel','helling','hofhelling','blok','muur','tunnel','tribune','zuilen','hof','gum']
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1100,"height":720}); errs=[]; cons=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.on('console',lambda m: cons.append(m.text) if m.type in ('error','warning') else None)
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(3000)
        print('start ok, errs', errs)
        for act in ['ring']:
            await pg.evaluate(f"()=>window.__SC().doAct('{act}')"); await pg.wait_for_timeout(1500)
            print(act, 'errs', len(errs))
        await pg.evaluate("()=>{const S=window.__SC(); S.orbit.dist=120; S.orbit.phi=0.8; S.applyOrbit();}")
        W=await pg.evaluate("()=>{const S=window.__SC(); const out={}; for(const [x,z] of [[0,0],[15.6,0],[31.2,0],[7.8,13.5],[-15.6,0],[0,27],[23.4,13.5]]){const v=new S.camera.position.constructor(x,0,z).project(S.camera); out[x+','+z]=[(v.x+1)/2*innerWidth,(1-v.y)/2*innerHeight];} return out;}")
        pts=list(W.values())
        for t in TOOLS:
            ok=await pg.evaluate(f"()=>{{const b=document.querySelector('.tool[data-tool={t}]'); if(!b) return false; const tab=[...document.querySelectorAll('.pal-tab')]; b.click(); return true;}}")
            if not ok:
                # need tab switch: find tab containing tool
                await pg.evaluate(f"()=>{{for(const tb of document.querySelectorAll('.pal-tab')){{tb.click(); const b=document.querySelector('.tool[data-tool={t}]'); if(b){{b.click(); return;}}}}}}")
            n0=len(errs)
            for i,q in enumerate(pts[:4]):
                await pg.mouse.click(*q); await pg.wait_for_timeout(120)
            # drag for road tools
            await pg.mouse.move(*pts[0]); await pg.mouse.down(); await pg.mouse.move(*pts[2],steps=6); await pg.mouse.up(); await pg.wait_for_timeout(200)
            await pg.mouse.click(*pts[1], button='right'); await pg.wait_for_timeout(120)
            await pg.keyboard.press('r'); await pg.keyboard.press('z')
            if len(errs)>n0: print('TOOL',t,'ERR',errs[n0:])
        print('tools done, errs',len(errs))
        # walk mode
        await pg.evaluate("()=>document.getElementById('modeBtn')?.click()"); await pg.wait_for_timeout(500)
        for k in ['w','a','s','d',' ']: await pg.keyboard.down(k); await pg.wait_for_timeout(250); await pg.keyboard.up(k)
        await pg.wait_for_timeout(1500)
        await pg.evaluate("()=>document.getElementById('modeBtn')?.click()"); await pg.wait_for_timeout(500)
        await pg.evaluate("()=>{document.getElementById('recklessBtn').click(); document.getElementById('todBtn').click(); document.getElementById('todAutoBtn')?.click(); document.getElementById('soundBtn').click(); document.getElementById('scoreBtn').click(); document.getElementById('undoBtn').click();}"); await pg.wait_for_timeout(2500)
        print('walk done, errs',len(errs))
        # sketch: draw, save, place
        await pg.evaluate("()=>window.__SC().openSchets()"); await pg.wait_for_timeout(600)
        await pg.evaluate("()=>{const S=window.__SS; S.tris.set('0,0,0','muur@2'); S.tris.set('1,0,0','dak@1'); S.paths.push({t:'weg',l:0,r:3,p:[[-7.79,0],[7.79,0]]}); document.getElementById('s_name').value='Testmodule'; document.getElementById('s_bSave').click();}"); await pg.wait_for_timeout(400)
        print('modules', await pg.evaluate("()=>JSON.parse(localStorage.getItem('hexstad-modules')).map(m=>m.name)"))
        await pg.evaluate("()=>document.getElementById('s_bBack')?.click() || document.querySelector('#schetsApp button')?.click()"); await pg.wait_for_timeout(500)
        await pg.evaluate("()=>{document.querySelector('.pal-tab:last-child').click();}"); await pg.wait_for_timeout(400)
        await pg.mouse.click(*pts[4]); await pg.wait_for_timeout(300); await pg.mouse.click(*pts[5]); await pg.wait_for_timeout(300)
        await pg.mouse.click(*pts[4], button='right'); await pg.wait_for_timeout(300)
        print('inst', await pg.evaluate("()=>(window.__SC().getCells().inst||[]).length"))
        await pg.wait_for_timeout(4000)
        await pg.screenshot(path='smoke.png')
        print('ERRS', json.dumps(errs, indent=0)[:3000]); print('CONSOLE', cons[:20]); await b.close()
asyncio.run(main())
