import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','raatstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":900,"height":600}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        r=await pg.evaluate("()=>{const out={}; for(const m of window.__mods){ if(m.v!==2||m.lv.length<2) continue; const st=m.lv.reduce((a,L)=>a+L.s.length,0); out[m.name]=st+'tr/'+m.lv.length+'lv'; } return out}")
        print(json.dumps(r,ensure_ascii=False))
        await pg.evaluate("()=>{window.__SC().doAct('empty'); const S=window.__SC(); S.renderer.render=()=>{}; document.querySelectorAll('.pal-tab')[5].click(); [...document.querySelectorAll('.modcard')].find(x=>x.title.startsWith('Rijhuis · baksteen · 3L')).click(); S.place(0,0);}")
        await pg.wait_for_timeout(500)
        await pg.evaluate("()=>document.getElementById('modeBtn').click()"); await pg.wait_for_timeout(500)
        # trap: start P(0,3)=(0,6.75) richting 3 (210°): loop vanaf (0.5,6.75) richting 210°
        await pg.evaluate("()=>{const p=window.__SC().player; p.x=1.0; p.z=7.33; p.y=0.05; const ux=Math.cos(210*Math.PI/180), uz=Math.sin(210*Math.PI/180); p.yaw=Math.atan2(-ux,-uz);}")
        await pg.keyboard.down('w'); tr=[]
        for i in range(10):
            await pg.wait_for_timeout(350); tr.append(await pg.evaluate("()=>{const p=window.__SC().player; return [+p.x.toFixed(1),+p.z.toFixed(1),+p.y.toFixed(2)]}"))
        await pg.keyboard.up('w'); print('trap', tr)
        # tweede trap terug (richting 30°) vanaf het eind
        await pg.evaluate("()=>{const p=window.__SC().player; const ux=Math.cos(30*Math.PI/180), uz=Math.sin(30*Math.PI/180); p.yaw=Math.atan2(-ux,-uz);}")
        await pg.keyboard.down('w'); tr=[]
        for i in range(10):
            await pg.wait_for_timeout(350); tr.append(await pg.evaluate("()=>{const p=window.__SC().player; return [+p.x.toFixed(1),+p.z.toFixed(1),+p.y.toFixed(2)]}"))
        await pg.keyboard.up('w'); print('trap2', tr)
        print(errs[:2]); await b.close()
asyncio.run(main())
