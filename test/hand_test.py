import asyncio, json, os
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','hexstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.makedirs(os.path.join(HERE,'out'),exist_ok=True); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1000,"height":640}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        # muren op de rand: alle ringmodules compleet?
        r=await pg.evaluate("""()=>{const out={}; for(const m of window.__mods){ if(m.v!==2) continue; const n=Object.keys(m.lv[0].w).length; if(/^Rijtjeshuis|^Blok$|^Hek rondom|^Supermarkt/.test(m.name)) out[m.name]=n; } return out}""")
        print(r)
        await pg.evaluate("()=>window.__SC().doAct('sample')"); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>document.getElementById('modeBtn').click()"); await pg.wait_for_timeout(800)
        st=await pg.evaluate("()=>({hands:[...document.querySelectorAll('#hands button')].map(b=>b.textContent+':'+b.getAttribute('aria-pressed')), cls:document.body.className, cells:window.__SC().getCells().size})"); print(st)
        # hamer kiezen, naar een blok kijken en slaan
        await pg.evaluate("()=>document.querySelector('[data-hand=hamer]').click()"); await pg.wait_for_timeout(300)
        await pg.evaluate("()=>{const p=window.__SC().player; const c=window.__SC().getCells(); const k=[...c.keys()].find(k=>c.get(k)[0]==='woning'); const [q,r]=k.split(',').map(Number); const w=window.__SC().cellToWorld?window.__SC().cellToWorld(q,r):null; window.__tgt=k;}")
        n0=await pg.evaluate("()=>window.__SC().getCells().get(window.__tgt).join('+')")
        # draai naar het doelvak: zet speler 12 m ervoor
        await pg.evaluate("""()=>{const S=window.__SC(); const c=S.getCells(); const [q,r]=window.__tgt.split(',').map(Number); const R=9,SQ3=Math.sqrt(3); const x=R*SQ3*(q+r/2), z=1.5*R*r; const p=S.player; p.x=x-12; p.z=z; p.y=0; p.yaw=Math.atan2(-(1),0)+0.25; p.pitch=-0.05;}""")
        await pg.wait_for_timeout(5000); await pg.screenshot(path='hand_hamer.png')
        dbg=await pg.evaluate("()=>{const S=window.__SC(); const r=S.pick(innerWidth/2,innerHeight/2); return {hand:S.hand(), r:r?{place:r.place, erase:r.erase, pt:[r.point.x|0,r.point.y|0,r.point.z|0]}:null, player:[S.player.x|0,S.player.z|0], tgt:window.__tgt}}"); print('pick',dbg)
        await pg.evaluate("()=>window.__SC().walkAction(false)"); await pg.wait_for_timeout(300)
        await pg.evaluate("()=>{document.getElementById('placeBtn').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))}"); await pg.wait_for_timeout(4000)
        tt=await pg.evaluate("()=>document.getElementById('toast').textContent"); print('toast',tt)
        n1=await pg.evaluate("()=>(window.__SC().getCells().get(window.__tgt)||[]).join('+')"); print('stack',n0,'->',n1)
        # kijken: niets gebeurt
        await pg.evaluate("()=>document.querySelector('[data-hand=kijken]').click()"); await pg.wait_for_timeout(200)
        await pg.evaluate("()=>{document.getElementById('placeBtn').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))}"); await pg.wait_for_timeout(300)
        n2=await pg.evaluate("()=>(window.__SC().getCells().get(window.__tgt)||[]).join('+')"); print('kijken ongewijzigd', n1==n2)
        await pg.evaluate("()=>document.querySelector('[data-hand=bouwen]').click()"); await pg.wait_for_timeout(500); await pg.screenshot(path='hand_bouwen.png')
        print(errs[:3]); await b.close()
asyncio.run(main())
